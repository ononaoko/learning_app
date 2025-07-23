// src/routes/api/ebbinghaus-analytics/+server.js

import { json } from '@sveltejs/kit'
import redis from '$lib/server/database'

/**
 * エビングハウスモード専用の学習定着度分析API
 * 単元全体の学習定着率を評価
 */
export async function GET({ locals, url }) {
  try {
    const userId = locals.user.id;
    const analysisType = url.searchParams.get('type') || 'retention';
    const unitId = url.searchParams.get('unitId'); // 特定単元の分析用（オプション）

    if (!userId) {
      return new Response('User ID is required', { status: 400 });
    }

    console.log('=== エビングハウス学習定着度分析 ===');
    console.log('分析パラメータ:', { userId, analysisType, unitId });

    let analyticsData;

    switch (analysisType) {
      case 'retention':
        analyticsData = await generateUnitRetentionAnalytics(userId, unitId);
        break;
      case 'progress':
        analyticsData = await generateUnitProgressAnalytics(userId, unitId);
        break;
      case 'comparison':
        analyticsData = await generateStageComparisonAnalytics(userId, unitId);
        break;
      default:
        return new Response('Invalid analysis type', { status: 400 });
    }

    return json(analyticsData);

  } catch (error) {
    console.error('エビングハウス学習分析エラー:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * 単元ベースの学習定着度分析
 */
async function generateUnitRetentionAnalytics(userId, targetUnitId = null) {
  // エビングハウスモードの問題データを取得
  const pattern = targetUnitId
    ? `user:ebbinghaus_problems:${userId}:${targetUnitId}:*`
    : `user:ebbinghaus_problems:${userId}:*`;

  const keys = await redis.keys(pattern);
  const problemsData = [];

  for (const key of keys) {
    const problemData = await redis.get(key);
    if (problemData) {
      const parsed = JSON.parse(problemData);
      // キーから単元IDを抽出
      const keyParts = key.split(':');
      parsed.extractedUnitId = keyParts[3];
      problemsData.push(parsed);
    }
  }

  if (problemsData.length === 0) {
    return {
      message: 'エビングハウスモードの学習データが見つかりません。',
      totalUnits: 0,
      unitAnalysis: [],
      overallStats: getEmptyOverallStats()
    };
  }

  // 単元別にグループ化
  const unitMap = groupProblemsByUnit(problemsData);
  const unitAnalysis = [];
  let overallStats = initializeOverallStats();

  for (const [unitId, problems] of Object.entries(unitMap)) {
    const unitResult = analyzeUnitRetention(unitId, problems);
    unitAnalysis.push(unitResult);

    // 全体統計に加算
    updateOverallStats(overallStats, unitResult);
  }

  // 全体統計を計算
  finalizeOverallStats(overallStats, unitAnalysis.length);

  return {
    totalUnits: Object.keys(unitMap).length,
    unitAnalysis,
    overallStats,
    stageComparison: generateStageComparison(unitMap)
  };
}

/**
 * 問題データを単元別にグループ化
 */
function groupProblemsByUnit(problemsData) {
  const unitMap = {};

  problemsData.forEach(problem => {
    const unitId = problem.extractedUnitId || problem.unitId;

    if (!unitMap[unitId]) {
      unitMap[unitId] = [];
    }
    unitMap[unitId].push(problem);
  });

  return unitMap;
}

/**
 * 単元の学習定着度を分析
 */
function analyzeUnitRetention(unitId, problems) {
  const analysis = {
    unitId,
    totalProblems: problems.length,
    stageResults: {
      stage0: { attempted: 0, correct: 0, accuracy: 0, problems: [] },
      stage1: { attempted: 0, correct: 0, accuracy: 0, problems: [] },
      stage2: { attempted: 0, correct: 0, accuracy: 0, problems: [] },
      stage3: { attempted: 0, correct: 0, accuracy: 0, problems: [] }
    },
    retentionProgression: [0, 0, 0, 0], // 各段階の正解率
    unitRetentionScore: 0,
    completedProblems: 0,
    problemsInProgress: 0,
    problemsNotStarted: 0,
    completionStatus: 'incomplete',
    improvementRate: 0,
    averageAttemptsPerStage: {
      stage0: 0, stage1: 0, stage2: 0, stage3: 0
    },
    problemDistribution: {
      completed: 0,        // 全段階完了
      stage3_completed: 0, // stage3まで到達
      stage2_completed: 0, // stage2まで到達
      stage1_completed: 0, // stage1まで到達
      stage0_only: 0       // stage0のみ
    }
  };

  // 各問題を分析
  problems.forEach(problem => {
    analyzeProblemForUnit(problem, analysis);
  });

  // 各段階の正解率を計算
  for (let stage = 0; stage <= 3; stage++) {
    const stageKey = `stage${stage}`;
    const stageData = analysis.stageResults[stageKey];

    if (stageData.attempted > 0) {
      stageData.accuracy = (stageData.correct / stageData.attempted) * 100;
      analysis.retentionProgression[stage] = stageData.accuracy;
    }
  }

  // 単元全体の定着スコアを計算（問題の定着スコアの平均）
  analysis.unitRetentionScore = problems.length > 0
    ? problems.reduce((sum, p) => sum + (p.retentionScore || 0), 0) / problems.length
    : 0;

  // 完了問題数をカウント
  analysis.completedProblems = problems.filter(p => p.isCompleted).length;
  analysis.problemsInProgress = problems.filter(p => !p.isCompleted && p.attempts && p.attempts.length > 0).length;
  analysis.problemsNotStarted = problems.filter(p => !p.attempts || p.attempts.length === 0).length;

  // 改善率の計算（stage0からstage3への改善）
  if (analysis.retentionProgression[0] > 0 && analysis.retentionProgression[3] > 0) {
    analysis.improvementRate = ((analysis.retentionProgression[3] - analysis.retentionProgression[0]) / analysis.retentionProgression[0]) * 100;
  }

  // 完了状況の判定
  analysis.completionStatus = determineUnitCompletionStatus(analysis);

  return analysis;
}

/**
 * 問題を単元分析に反映
 */
function analyzeProblemForUnit(problem, analysis) {
  if (!problem.attempts || problem.attempts.length === 0) {
    return; // データなしの場合はスキップ
  }

  // 到達した最高段階を確認
  const maxStage = Math.max(...problem.attempts.map(a => a.stage));

  // 問題の分布を更新
  if (problem.isCompleted) {
    analysis.problemDistribution.completed++;
  } else if (maxStage >= 3) {
    analysis.problemDistribution.stage3_completed++;
  } else if (maxStage >= 2) {
    analysis.problemDistribution.stage2_completed++;
  } else if (maxStage >= 1) {
    analysis.problemDistribution.stage1_completed++;
  } else {
    analysis.problemDistribution.stage0_only++;
  }

  // 各段階の試行を分析
  problem.attempts.forEach(attempt => {
    const stageKey = `stage${attempt.stage}`;

    if (analysis.stageResults[stageKey]) {
      analysis.stageResults[stageKey].attempted++;
      analysis.stageResults[stageKey].problems.push({
        problemId: problem.problemId,
        isCorrect: attempt.isCorrect,
        timestamp: attempt.timestamp,
        duration: attempt.duration || 0,
        hintsUsed: attempt.hintsUsed || 0
      });

      if (attempt.isCorrect) {
        analysis.stageResults[stageKey].correct++;
      }
    }
  });
}

/**
 * 単元の完了状況を判定
 */
function determineUnitCompletionStatus(analysis) {
  const completionRate = analysis.totalProblems > 0
    ? (analysis.completedProblems / analysis.totalProblems) * 100
    : 0;

  const stage3Accuracy = analysis.retentionProgression[3];

  if (completionRate >= 90 && stage3Accuracy >= 80) {
    return 'mastered';
  } else if (completionRate >= 70 && stage3Accuracy >= 70) {
    return 'good';
  } else if (completionRate >= 50 || stage3Accuracy >= 60) {
    return 'fair';
  } else if (analysis.problemsInProgress > 0) {
    return 'in_progress';
  } else {
    return 'needs_attention';
  }
}

/**
 * 段階別比較分析を生成
 */
function generateStageComparison(unitMap) {
  const comparison = {
    stage0: { totalAttempts: 0, totalCorrect: 0, unitsCount: 0, avgAccuracy: 0 },
    stage1: { totalAttempts: 0, totalCorrect: 0, unitsCount: 0, avgAccuracy: 0 },
    stage2: { totalAttempts: 0, totalCorrect: 0, unitsCount: 0, avgAccuracy: 0 },
    stage3: { totalAttempts: 0, totalCorrect: 0, unitsCount: 0, avgAccuracy: 0 }
  };

  Object.values(unitMap).forEach(problems => {
    const unitStageData = { stage0: 0, stage1: 0, stage2: 0, stage3: 0 };
    let hasData = false;

    problems.forEach(problem => {
      if (problem.attempts && problem.attempts.length > 0) {
        hasData = true;
        problem.attempts.forEach(attempt => {
          const stageKey = `stage${attempt.stage}`;
          comparison[stageKey].totalAttempts++;

          if (attempt.isCorrect) {
            comparison[stageKey].totalCorrect++;
          }
        });
      }
    });

    if (hasData) {
      for (let stage = 0; stage <= 3; stage++) {
        const stageKey = `stage${stage}`;
        const hasStageData = problems.some(p =>
          p.attempts && p.attempts.some(a => a.stage === stage)
        );
        if (hasStageData) {
          comparison[stageKey].unitsCount++;
        }
      }
    }
  });

  // 各段階の平均正解率を計算
  Object.keys(comparison).forEach(stageKey => {
    const stage = comparison[stageKey];
    stage.avgAccuracy = stage.totalAttempts > 0
      ? (stage.totalCorrect / stage.totalAttempts) * 100
      : 0;
  });

  return comparison;
}

/**
 * 単元進捗分析を生成
 */
async function generateUnitProgressAnalytics(userId, targetUnitId = null) {
  const retentionData = await generateUnitRetentionAnalytics(userId, targetUnitId);

  // 復習が必要な問題を取得
  const dueProblems = await getDueProblemsAnalysis(userId, targetUnitId);

  const progressAnalytics = {
    ...retentionData,
    dueForReview: dueProblems,
    progressTimeline: generateProgressTimeline(retentionData.unitAnalysis),
    recommendations: generateUnitRecommendations(retentionData.unitAnalysis, dueProblems),
    nextActions: generateNextActions(retentionData.unitAnalysis, dueProblems)
  };

  return progressAnalytics;
}

/**
 * 復習が必要な問題の分析
 */
async function getDueProblemsAnalysis(userId, targetUnitId = null) {
  const pattern = targetUnitId
    ? `user:ebbinghaus_problems:${userId}:${targetUnitId}:*`
    : `user:ebbinghaus_problems:${userId}:*`;

  const keys = await redis.keys(pattern);
  const dueAnalysis = {
    totalDue: 0,
    byUnit: {},
    byStage: { stage1: 0, stage2: 0, stage3: 0 },
    overdue: { count: 0, problems: [] }
  };

  const currentDate = new Date();

  for (const key of keys) {
    const problemData = await redis.get(key);
    if (problemData) {
      const problem = JSON.parse(problemData);
      const keyParts = key.split(':');
      const unitId = keyParts[3];

      // 復習期日をチェック
      if (problem.nextReviewDate && !problem.isCompleted) {
        const reviewDate = new Date(problem.nextReviewDate);
        if (reviewDate <= currentDate) {
          dueAnalysis.totalDue++;

          // 単元別カウント
          if (!dueAnalysis.byUnit[unitId]) {
            dueAnalysis.byUnit[unitId] = 0;
          }
          dueAnalysis.byUnit[unitId]++;

          // 段階別カウント
          const nextStage = problem.currentStage + 1;
          if (nextStage >= 1 && nextStage <= 3) {
            dueAnalysis.byStage[`stage${nextStage}`]++;
          }

          // 期日超過チェック
          const daysOverdue = Math.floor((currentDate - reviewDate) / (1000 * 60 * 60 * 24));
          if (daysOverdue > 0) {
            dueAnalysis.overdue.count++;
            dueAnalysis.overdue.problems.push({
              unitId,
              problemId: problem.problemId,
              daysOverdue,
              currentStage: problem.currentStage
            });
          }
        }
      }
    }
  }

  // 期日超過問題を日数順でソート
  dueAnalysis.overdue.problems.sort((a, b) => b.daysOverdue - a.daysOverdue);

  return dueAnalysis;
}

/**
 * 段階別比較分析
 */
async function generateStageComparisonAnalytics(userId, targetUnitId = null) {
  const retentionData = await generateUnitRetentionAnalytics(userId, targetUnitId);

  return {
    stageComparison: retentionData.stageComparison,
    retentionCurve: generateRetentionCurve(retentionData.unitAnalysis),
    unitRankings: generateUnitRankings(retentionData.unitAnalysis),
    stageProgression: generateStageProgression(retentionData.unitAnalysis)
  };
}

/**
 * 進捗タイムラインを生成
 */
function generateProgressTimeline(unitAnalysis) {
  return unitAnalysis.map(unit => {
    const timeline = [];

    for (let stage = 0; stage <= 3; stage++) {
      const stageKey = `stage${stage}`;
      const stageData = unit.stageResults[stageKey];

      timeline.push({
        stage,
        completed: stageData.attempted > 0,
        accuracy: stageData.accuracy,
        problemsAttempted: stageData.attempted,
        problemsCorrect: stageData.correct
      });
    }

    return {
      unitId: unit.unitId,
      stages: timeline,
      overallProgress: (unit.completedProblems / unit.totalProblems) * 100
    };
  });
}

/**
 * 単元別推奨事項を生成
 */
function generateUnitRecommendations(unitAnalysis, dueProblems) {
  const recommendations = [];

  // 期日超過の警告
  if (dueProblems.overdue.count > 0) {
    recommendations.push({
      type: 'urgent',
      title: '期日超過の復習があります',
      description: `${dueProblems.overdue.count}個の問題が復習期日を過ぎています。優先的に復習しましょう。`,
      action: 'review_overdue',
      priority: 'high',
      data: dueProblems.overdue.problems.slice(0, 5) // 上位5件
    });
  }

  // 単元別の推奨事項
  unitAnalysis.forEach(unit => {
    if (unit.completionStatus === 'needs_attention') {
      recommendations.push({
        type: 'attention',
        unitId: unit.unitId,
        title: `単元${unit.unitId}の学習が停滞しています`,
        description: '学習が進んでいない問題があります。定期的に学習を進めましょう。',
        priority: 'medium'
      });
    } else if (unit.completionStatus === 'fair' && unit.improvementRate < 10) {
      recommendations.push({
        type: 'improvement',
        unitId: unit.unitId,
        title: `単元${unit.unitId}の定着率向上が必要`,
        description: '段階が進んでも正解率が上がっていません。復習方法を見直してみましょう。',
        priority: 'medium'
      });
    }
  });

  // 今日の復習があることを通知
  if (dueProblems.totalDue > dueProblems.overdue.count) {
    recommendations.push({
      type: 'today',
      title: '今日の復習があります',
      description: `${dueProblems.totalDue - dueProblems.overdue.count}個の問題が復習予定です。`,
      priority: 'normal'
    });
  }

  return recommendations;
}

/**
 * 次のアクションを生成
 */
function generateNextActions(unitAnalysis, dueProblems) {
  const actions = [];

  // 期日超過問題の復習アクション
  if (dueProblems.overdue.count > 0) {
    actions.push({
      type: 'review_overdue',
      title: '期日超過問題の復習',
      description: `${dueProblems.overdue.count}個の期日超過問題を復習`,
      priority: 1,
      estimatedTime: dueProblems.overdue.count * 3 // 1問3分と仮定
    });
  }

  // 今日の復習アクション
  const todaysDue = dueProblems.totalDue - dueProblems.overdue.count;
  if (todaysDue > 0) {
    actions.push({
      type: 'todays_review',
      title: '今日の復習',
      description: `${todaysDue}個の問題を復習`,
      priority: 2,
      estimatedTime: todaysDue * 3
    });
  }

  // 新しい学習の提案
  const unitsNeedingProgress = unitAnalysis.filter(u =>
    u.completionStatus === 'in_progress' || u.completionStatus === 'needs_attention'
  );

  if (unitsNeedingProgress.length > 0) {
    actions.push({
      type: 'continue_learning',
      title: '学習の継続',
      description: `${unitsNeedingProgress.length}個の単元で学習を継続`,
      priority: 3,
      units: unitsNeedingProgress.map(u => u.unitId)
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}

/**
 * 定着曲線を生成
 */
function generateRetentionCurve(unitAnalysis) {
  const stages = ['stage0', 'stage1', 'stage2', 'stage3'];
  const curveData = stages.map((stageKey, index) => {
    const accuracies = unitAnalysis
      .map(unit => unit.retentionProgression[index])
      .filter(acc => acc > 0);

    const avgAccuracy = accuracies.length > 0
      ? accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length
      : 0;

    return {
      stage: index,
      stageName: stageKey,
      averageAccuracy: avgAccuracy,
      unitsWithData: accuracies.length
    };
  });

  return curveData;
}

/**
 * 単元ランキングを生成
 */
function generateUnitRankings(unitAnalysis) {
  return unitAnalysis
    .sort((a, b) => b.unitRetentionScore - a.unitRetentionScore)
    .map((unit, index) => ({
      rank: index + 1,
      unitId: unit.unitId,
      retentionScore: unit.unitRetentionScore,
      completionStatus: unit.completionStatus,
      completedProblems: unit.completedProblems,
      totalProblems: unit.totalProblems,
      completionRate: (unit.completedProblems / unit.totalProblems) * 100
    }));
}

/**
 * 段階進行分析を生成
 */
function generateStageProgression(unitAnalysis) {
  const progression = {
    stage0to1: { units: 0, avgImprovement: 0 },
    stage1to2: { units: 0, avgImprovement: 0 },
    stage2to3: { units: 0, avgImprovement: 0 }
  };

  unitAnalysis.forEach(unit => {
    const stages = unit.retentionProgression;

    if (stages[0] > 0 && stages[1] > 0) {
      progression.stage0to1.units++;
      progression.stage0to1.avgImprovement += ((stages[1] - stages[0]) / stages[0]) * 100;
    }

    if (stages[1] > 0 && stages[2] > 0) {
      progression.stage1to2.units++;
      progression.stage1to2.avgImprovement += ((stages[2] - stages[1]) / stages[1]) * 100;
    }

    if (stages[2] > 0 && stages[3] > 0) {
      progression.stage2to3.units++;
      progression.stage2to3.avgImprovement += ((stages[3] - stages[2]) / stages[2]) * 100;
    }
  });

  // 平均を計算
  Object.keys(progression).forEach(key => {
    const data = progression[key];
    data.avgImprovement = data.units > 0 ? data.avgImprovement / data.units : 0;
  });

  return progression;
}

/**
 * 全体統計の初期化
 */
function initializeOverallStats() {
  return {
    averageRetentionScore: 0,
    totalProblems: 0,
    completedProblems: 0,
    completionDistribution: {
      mastered: 0,
      good: 0,
      fair: 0,
      in_progress: 0,
      needs_attention: 0
    },
    stageProgression: {
      stage0_reached: 0,
      stage1_reached: 0,
      stage2_reached: 0,
      stage3_reached: 0
    }
  };
}

/**
 * 空の全体統計を取得
 */
function getEmptyOverallStats() {
  return initializeOverallStats();
}

/**
 * 全体統計を更新
 */
function updateOverallStats(overallStats, unitResult) {
  overallStats.averageRetentionScore += unitResult.unitRetentionScore;
  overallStats.totalProblems += unitResult.totalProblems;
  overallStats.completedProblems += unitResult.completedProblems;
  overallStats.completionDistribution[unitResult.completionStatus]++;

  // 段階到達数を更新
  if (unitResult.stageResults.stage0.attempted > 0) overallStats.stageProgression.stage0_reached++;
  if (unitResult.stageResults.stage1.attempted > 0) overallStats.stageProgression.stage1_reached++;
  if (unitResult.stageResults.stage2.attempted > 0) overallStats.stageProgression.stage2_reached++;
  if (unitResult.stageResults.stage3.attempted > 0) overallStats.stageProgression.stage3_reached++;
}

/**
 * 全体統計を確定
 */
function finalizeOverallStats(overallStats, unitCount) {
  if (unitCount > 0) {
    overallStats.averageRetentionScore /= unitCount;
  }
}