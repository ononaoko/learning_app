// src/routes/api/ebbinghaus-record/+server.js

import { json } from '@sveltejs/kit'
import redis from '$lib/server/database'

/**
 * エビングハウス復習記録の保存・取得API
 */

// 復習段階の定義
const REVIEW_STAGES = {
  INITIAL: 0,      // 初回学習
  DAY_1: 1,        // 1日後復習
  DAY_7: 2,        // 7日後復習
  DAY_28: 3        // 28日後復習
};

// 次回復習日の計算（日数）
const NEXT_REVIEW_DAYS = [1, 7, 28, null]; // null = 復習完了

/**
 * 次回復習日を計算
 */
function calculateNextReviewDate(currentStage, baseDate = new Date()) {
  const nextStage = currentStage + 1;
  if (nextStage >= NEXT_REVIEW_DAYS.length || NEXT_REVIEW_DAYS[nextStage] === null) {
    return null; // 復習完了
  }

  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + NEXT_REVIEW_DAYS[nextStage]);
  return nextDate.toISOString();
}

/**
 * 復習記録を保存
 */
export async function POST({ request }) {
  try {
    const {
      userId,
      unitId,
      problemId,
      problemIndex,
      stage,
      isCorrect,
      hintsUsedCount = 0,
      duration = 0,
      mode = 'normal-mode'
    } = await request.json();

    if (!userId || !unitId || !problemId || stage === undefined) {
      return new Response('Required fields missing', { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const problemKey = `user:ebbinghaus_problems:${userId}:${unitId}:${problemId}`;

    console.log('=== エビングハウス復習記録保存 ===');
    console.log('保存データ:', {
      userId, unitId, problemId, problemIndex, stage, isCorrect, hintsUsedCount, duration, mode
    });

    // 既存の問題データを取得
    const existingData = await redis.get(problemKey);
    let problemData;

    if (existingData) {
      problemData = JSON.parse(existingData);
    } else {
      // 新規問題データを初期化
      problemData = {
        problemId,
        problemIndex,
        unitId,
        attempts: [],
        currentStage: 0,
        nextReviewDate: null,
        retentionScore: 0,
        isCompleted: false,
        createdAt: timestamp,
        lastUpdated: timestamp
      };
    }

    // 新しい試行を追加
    const newAttempt = {
      stage,
      isCorrect,
      timestamp,
      hintsUsed: hintsUsedCount,
      duration,
      mode
    };

    // 同じステージの既存記録を更新するか追加
    const existingAttemptIndex = problemData.attempts.findIndex(a => a.stage === stage);
    if (existingAttemptIndex !== -1) {
      problemData.attempts[existingAttemptIndex] = newAttempt;
    } else {
      problemData.attempts.push(newAttempt);
    }

    // ステージ順にソート
    problemData.attempts.sort((a, b) => a.stage - b.stage);

    // 現在のステージを更新
    problemData.currentStage = Math.max(problemData.currentStage, stage);

    // 次回復習日を計算
    if (isCorrect) {
      problemData.nextReviewDate = calculateNextReviewDate(stage, new Date(timestamp));
      if (problemData.nextReviewDate === null) {
        problemData.isCompleted = true;
      }
    } else {
      // 間違えた場合は同じステージを再復習
      const retryDate = new Date(timestamp);
      retryDate.setDate(retryDate.getDate() + 1); // 1日後に再挑戦
      problemData.nextReviewDate = retryDate.toISOString();
    }

    // 定着度スコアを計算
    problemData.retentionScore = calculateRetentionScore(problemData.attempts);
    problemData.lastUpdated = timestamp;

    // Redisに保存
    await redis.setex(problemKey, 86400 * 90, JSON.stringify(problemData)); // 90日間保持

    // 単元全体の統計を更新
    await updateUnitStatistics(userId, unitId);

    console.log('更新された問題データ:', problemData);
    return json({
      success: true,
      problemData,
      message: '復習記録が保存されました'
    });

  } catch (error) {
    console.error('エビングハウス復習記録保存エラー:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * 復習記録を取得
 */
export async function GET({ url }) {
  try {
    const userId = url.searchParams.get('userId');
    const unitId = url.searchParams.get('unitId');
    const problemId = url.searchParams.get('problemId');
    const getDueProblems = url.searchParams.get('getDueProblems') === 'true';

    if (!userId) {
      return new Response('User ID is required', { status: 400 });
    }

    console.log('=== エビングハウス復習記録取得 ===');
    console.log('取得パラメータ:', { userId, unitId, problemId, getDueProblems });

    if (getDueProblems) {
      // 復習が必要な問題一覧を取得
      const dueProblems = await getDueProblemsForReview(userId, unitId);
      return json(dueProblems);
    }

    if (problemId && unitId) {
      // 特定の問題の記録を取得
      const problemKey = `user:ebbinghaus_problems:${userId}:${unitId}:${problemId}`;
      const problemData = await redis.get(problemKey);

      if (problemData) {
        return json(JSON.parse(problemData));
      } else {
        return json(null);
      }
    }

    if (unitId) {
      // 単元の全問題記録を取得
      const unitProblems = await getUnitProblems(userId, unitId);
      return json(unitProblems);
    }

    // ユーザーの全記録を取得
    const allProblems = await getAllUserProblems(userId);
    return json(allProblems);

  } catch (error) {
    console.error('エビングハウス復習記録取得エラー:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * 定着度スコアを計算
 */
function calculateRetentionScore(attempts) {
  const weights = [0.1, 0.2, 0.3, 0.4]; // 各段階の重み
  let score = 0;

  attempts.forEach(attempt => {
    if (attempt.isCorrect && attempt.stage < weights.length) {
      score += weights[attempt.stage] * 100;
    }
  });

  return Math.min(score, 100);
}

/**
 * 復習が必要な問題を取得
 */
async function getDueProblemsForReview(userId, unitId = null) {
  const pattern = unitId
    ? `user:ebbinghaus_problems:${userId}:${unitId}:*`
    : `user:ebbinghaus_problems:${userId}:*`;

  const keys = await redis.keys(pattern);
  const dueProblems = [];
  const currentDate = new Date();

  for (const key of keys) {
    const problemData = await redis.get(key);
    if (problemData) {
      const problem = JSON.parse(problemData);

      // 復習期日をチェック
      if (problem.nextReviewDate && !problem.isCompleted) {
        const reviewDate = new Date(problem.nextReviewDate);
        if (reviewDate <= currentDate) {
          dueProblems.push({
            ...problem,
            daysOverdue: Math.floor((currentDate - reviewDate) / (1000 * 60 * 60 * 24))
          });
        }
      }
    }
  }

  // 期日超過日数でソート（緊急度順）
  dueProblems.sort((a, b) => b.daysOverdue - a.daysOverdue);

  return dueProblems;
}

/**
 * 単元の全問題を取得
 */
async function getUnitProblems(userId, unitId) {
  const pattern = `user:ebbinghaus_problems:${userId}:${unitId}:*`;
  const keys = await redis.keys(pattern);
  const problems = [];

  for (const key of keys) {
    const problemData = await redis.get(key);
    if (problemData) {
      problems.push(JSON.parse(problemData));
    }
  }

  return problems.sort((a, b) => a.problemIndex - b.problemIndex);
}

/**
 * ユーザーの全問題を取得
 */
async function getAllUserProblems(userId) {
  const pattern = `user:ebbinghaus_problems:${userId}:*`;
  const keys = await redis.keys(pattern);
  const problems = [];

  for (const key of keys) {
    const problemData = await redis.get(key);
    if (problemData) {
      problems.push(JSON.parse(problemData));
    }
  }

  // 単元別にグループ化
  const groupedProblems = {};
  problems.forEach(problem => {
    if (!groupedProblems[problem.unitId]) {
      groupedProblems[problem.unitId] = [];
    }
    groupedProblems[problem.unitId].push(problem);
  });

  // 各単元内で問題インデックス順にソート
  Object.keys(groupedProblems).forEach(unitId => {
    groupedProblems[unitId].sort((a, b) => a.problemIndex - b.problemIndex);
  });

  return groupedProblems;
}

/**
 * 単元統計を更新
 */
async function updateUnitStatistics(userId, unitId) {
  try {
    const unitProblems = await getUnitProblems(userId, unitId);

    if (unitProblems.length === 0) return;

    const stats = {
      totalProblems: unitProblems.length,
      completedProblems: unitProblems.filter(p => p.isCompleted).length,
      averageRetentionScore: unitProblems.reduce((sum, p) => sum + p.retentionScore, 0) / unitProblems.length,
      problemsNeedingReview: unitProblems.filter(p =>
        p.nextReviewDate && new Date(p.nextReviewDate) <= new Date() && !p.isCompleted
      ).length,
      lastUpdated: new Date().toISOString()
    };

    const unitStatsKey = `user:ebbinghaus_unit_stats:${userId}:${unitId}`;
    await redis.setex(unitStatsKey, 86400 * 30, JSON.stringify(stats)); // 30日間保持

    console.log(`単元統計更新: ${unitId}`, stats);

  } catch (error) {
    console.error('単元統計更新エラー:', error);
  }
}

// src/routes/api/ebbinghaus-analytics/+server.js

import { json } from '@sveltejs/kit'
import redis from '$lib/server/database'

/**
 * エビングハウス学習分析API
 */
export async function GET({ url }) {
  try {
    const userId = url.searchParams.get('userId');
    const unitId = url.searchParams.get('unitId');
    const analysisType = url.searchParams.get('type') || 'retention'; // retention, progress, prediction

    if (!userId) {
      return new Response('User ID is required', { status: 400 });
    }

    console.log('=== エビングハウス学習分析 ===');
    console.log('分析パラメータ:', { userId, unitId, analysisType });

    let analyticsData;

    switch (analysisType) {
      case 'retention':
        analyticsData = await generateRetentionAnalytics(userId, unitId);
        break;
      case 'progress':
        analyticsData = await generateProgressAnalytics(userId, unitId);
        break;
      case 'prediction':
        analyticsData = await generatePredictionAnalytics(userId, unitId);
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
 * 定着度分析データを生成
 */
async function generateRetentionAnalytics(userId, unitId) {
  const problems = unitId
    ? await getUnitProblems(userId, unitId)
    : await getAllUserProblems(userId);

  const analytics = {
    overallRetentionScore: 0,
    retentionDistribution: {
      excellent: 0,    // 90-100%
      good: 0,         // 70-89%
      fair: 0,         // 50-69%
      poor: 0,         // 30-49%
      critical: 0      // 0-29%
    },
    stageAnalysis: {
      stage0: { total: 0, correct: 0, rate: 0 },
      stage1: { total: 0, correct: 0, rate: 0 },
      stage2: { total: 0, correct: 0, rate: 0 },
      stage3: { total: 0, correct: 0, rate: 0 }
    },
    patternAnalysis: {
      perfect: 0,      // 全段階正解
      improving: 0,    // 後半で改善
      declining: 0,    // 後半で悪化
      unstable: 0,     // バラつき
      consistent: 0    // 一貫性あり
    }
  };

  const flatProblems = unitId ? problems : Object.values(problems).flat();

  if (flatProblems.length === 0) return analytics;

  let totalRetentionScore = 0;

  flatProblems.forEach(problem => {
    // 定着度分布
    const score = problem.retentionScore;
    totalRetentionScore += score;

    if (score >= 90) analytics.retentionDistribution.excellent++;
    else if (score >= 70) analytics.retentionDistribution.good++;
    else if (score >= 50) analytics.retentionDistribution.fair++;
    else if (score >= 30) analytics.retentionDistribution.poor++;
    else analytics.retentionDistribution.critical++;

    // 段階別分析
    problem.attempts.forEach(attempt => {
      const stage = `stage${attempt.stage}`;
      if (analytics.stageAnalysis[stage]) {
        analytics.stageAnalysis[stage].total++;
        if (attempt.isCorrect) {
          analytics.stageAnalysis[stage].correct++;
        }
      }
    });

    // パターン分析
    const pattern = analyzePattern(problem.attempts);
    analytics.patternAnalysis[pattern]++;
  });

  // 正解率を計算
  Object.keys(analytics.stageAnalysis).forEach(stage => {
    const stageData = analytics.stageAnalysis[stage];
    stageData.rate = stageData.total > 0 ? (stageData.correct / stageData.total) * 100 : 0;
  });

  analytics.overallRetentionScore = totalRetentionScore / flatProblems.length;

  return analytics;
}

/**
 * 進捗分析データを生成
 */
async function generateProgressAnalytics(userId, unitId) {
  const problems = unitId
    ? await getUnitProblems(userId, unitId)
    : await getAllUserProblems(userId);

  const analytics = {
    totalProblems: 0,
    completedProblems: 0,
    inProgressProblems: 0,
    overdueProblems: 0,
    completionRate: 0,
    averageAttemptsPerProblem: 0,
    timeToCompletion: {
      average: 0,
      median: 0,
      min: 0,
      max: 0
    },
    dailyProgress: generateDailyProgress(problems, unitId)
  };

  const flatProblems = unitId ? problems : Object.values(problems).flat();
  const currentDate = new Date();

  if (flatProblems.length === 0) return analytics;

  analytics.totalProblems = flatProblems.length;

  const completionTimes = [];
  let totalAttempts = 0;

  flatProblems.forEach(problem => {
    totalAttempts += problem.attempts.length;

    if (problem.isCompleted) {
      analytics.completedProblems++;

      // 完了までの時間を計算
      const startDate = new Date(problem.createdAt);
      const endDate = new Date(problem.lastUpdated);
      const daysToComplete = (endDate - startDate) / (1000 * 60 * 60 * 24);
      completionTimes.push(daysToComplete);

    } else {
      analytics.inProgressProblems++;

      // 期日超過をチェック
      if (problem.nextReviewDate && new Date(problem.nextReviewDate) < currentDate) {
        analytics.overdueProblems++;
      }
    }
  });

  analytics.completionRate = (analytics.completedProblems / analytics.totalProblems) * 100;
  analytics.averageAttemptsPerProblem = totalAttempts / analytics.totalProblems;

  // 完了時間の統計
  if (completionTimes.length > 0) {
    completionTimes.sort((a, b) => a - b);
    analytics.timeToCompletion.average = completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;
    analytics.timeToCompletion.median = completionTimes[Math.floor(completionTimes.length / 2)];
    analytics.timeToCompletion.min = completionTimes[0];
    analytics.timeToCompletion.max = completionTimes[completionTimes.length - 1];
  }

  return analytics;
}

/**
 * 予測分析データを生成
 */
async function generatePredictionAnalytics(userId, unitId) {
  const problems = unitId
    ? await getUnitProblems(userId, unitId)
    : await getAllUserProblems(userId);

  const analytics = {
    forgettingCurve: generateForgettingCurveData(problems, unitId),
    reviewPrediction: generateReviewPrediction(problems, unitId),
    learningEfficiency: calculateLearningEfficiency(problems, unitId),
    recommendations: generateRecommendations(problems, unitId)
  };

  return analytics;
}

/**
 * 学習パターンを分析
 */
function analyzePattern(attempts) {
  if (attempts.length === 0) return 'unstable';

  const results = attempts.map(a => a.isCorrect);
  const correctCount = results.filter(r => r).length;
  const totalCount = results.length;

  if (correctCount === totalCount) return 'perfect';
  if (correctCount === 0) return 'declining';

  // 改善傾向をチェック
  const firstHalf = results.slice(0, Math.ceil(totalCount / 2));
  const secondHalf = results.slice(Math.ceil(totalCount / 2));

  const firstHalfRate = firstHalf.filter(r => r).length / firstHalf.length;
  const secondHalfRate = secondHalf.filter(r => r).length / secondHalf.length;

  if (secondHalfRate > firstHalfRate + 0.2) return 'improving';
  if (firstHalfRate > secondHalfRate + 0.2) return 'declining';

  return correctCount / totalCount > 0.7 ? 'consistent' : 'unstable';
}

/**
 * 日別進捗を生成
 */
function generateDailyProgress(problems, unitId) {
  const dailyData = {};
  const flatProblems = unitId ? problems : Object.values(problems).flat();

  flatProblems.forEach(problem => {
    problem.attempts.forEach(attempt => {
      const date = attempt.timestamp.split('T')[0];

      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          totalAttempts: 0,
          correctAttempts: 0,
          problemsWorked: new Set(),
          completedProblems: 0
        };
      }

      dailyData[date].totalAttempts++;
      if (attempt.isCorrect) {
        dailyData[date].correctAttempts++;
      }
      dailyData[date].problemsWorked.add(problem.problemId);
    });

    if (problem.isCompleted) {
      const completionDate = problem.lastUpdated.split('T')[0];
      if (dailyData[completionDate]) {
        dailyData[completionDate].completedProblems++;
      }
    }
  });

  // Setを数値に変換
  Object.values(dailyData).forEach(day => {
    day.problemsWorked = day.problemsWorked.size;
    day.accuracy = day.totalAttempts > 0 ? (day.correctAttempts / day.totalAttempts) * 100 : 0;
  });

  return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 忘却曲線データを生成
 */
function generateForgettingCurveData(problems, unitId) {
  // エビングハウスの忘却曲線と実際のデータを比較
  const theoreticalCurve = [100, 58, 44, 35, 26];
  const flatProblems = unitId ? problems : Object.values(problems).flat();

  const actualData = [0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0];

  flatProblems.forEach(problem => {
    problem.attempts.forEach(attempt => {
      if (attempt.stage < 4) {
        actualData[attempt.stage] += attempt.isCorrect ? 100 : 0;
        counts[attempt.stage]++;
      }
    });
  });

  // 平均を計算
  for (let i = 0; i < 4; i++) {
    actualData[i] = counts[i] > 0 ? actualData[i] / counts[i] : 0;
  }

  return {
    theoretical: theoreticalCurve,
    actual: actualData,
    stages: ['初回', '1日後', '7日後', '28日後']
  };
}

/**
 * 復習予測を生成
 */
function generateReviewPrediction(problems, unitId) {
  const flatProblems = unitId ? problems : Object.values(problems).flat();
  const currentDate = new Date();

  const prediction = {
    today: 0,
    tomorrow: 0,
    thisWeek: 0,
    nextWeek: 0,
    thisMonth: 0,
    nextMonth: 0
  };

  flatProblems.forEach(problem => {
    if (problem.nextReviewDate && !problem.isCompleted) {
      const reviewDate = new Date(problem.nextReviewDate);
      const daysUntilReview = Math.ceil((reviewDate - currentDate) / (1000 * 60 * 60 * 24));

      if (daysUntilReview <= 0) prediction.today++;
      else if (daysUntilReview === 1) prediction.tomorrow++;
      else if (daysUntilReview <= 7) prediction.thisWeek++;
      else if (daysUntilReview <= 14) prediction.nextWeek++;
      else if (daysUntilReview <= 30) prediction.thisMonth++;
      else if (daysUntilReview <= 60) prediction.nextMonth++;
    }
  });

  return prediction;
}

/**
 * 学習効率を計算
 */
function calculateLearningEfficiency(problems, unitId) {
  const flatProblems = unitId ? problems : Object.values(problems).flat();

  if (flatProblems.length === 0) return { efficiency: 0, details: {} };

  let totalTime = 0;
  let totalAttempts = 0;
  let successfulCompletions = 0;

  flatProblems.forEach(problem => {
    problem.attempts.forEach(attempt => {
      totalTime += attempt.duration || 0;
      totalAttempts++;
    });

    if (problem.isCompleted) {
      successfulCompletions++;
    }
  });

  const efficiency = totalAttempts > 0 ? (successfulCompletions / totalAttempts) * 100 : 0;
  const averageTimePerProblem = totalTime / flatProblems.length;

  return {
    efficiency,
    details: {
      totalTime,
      totalAttempts,
      successfulCompletions,
      averageTimePerProblem,
      timePerSuccess: successfulCompletions > 0 ? totalTime / successfulCompletions : 0
    }
  };
}

/**
 * 推奨事項を生成
 */
function generateRecommendations(problems, unitId) {
  const flatProblems = unitId ? problems : Object.values(problems).flat();
  const recommendations = [];

  // 期日超過の問題をチェック
  const overdueProblems = flatProblems.filter(p =>
    p.nextReviewDate && new Date(p.nextReviewDate) < new Date() && !p.isCompleted
  );

  if (overdueProblems.length > 0) {
    recommendations.push({
      type: 'urgent',
      title: '期日超過の復習があります',
      description: `${overdueProblems.length}問の復習が期日を過ぎています。早急に復習を行いましょう。`,
      action: 'review_overdue',
      priority: 'high'
    });
  }

  // 定着度が低い問題をチェック
  const lowRetentionProblems = flatProblems.filter(p => p.retentionScore < 50);

  if (lowRetentionProblems.length > 0) {
    recommendations.push({
      type: 'improvement',
      title: '定着度の低い問題があります',
      description: `${lowRetentionProblems.length}問の定着度が低い状態です。追加の復習をお勧めします。`,
      action: 'review_weak',
      priority: 'medium'
    });
  }

  // 学習効率の評価
  const efficiency = calculateLearningEfficiency(problems, unitId);

  if (efficiency.efficiency < 60) {
    recommendations.push({
      type: 'strategy',
      title: '学習効率の改善が必要です',
      description: '現在の学習効率は低い状態です。ヒントの活用や学習時間の調整を検討してください。',
      action: 'improve_efficiency',
      priority: 'medium'
    });
  }

  return recommendations;
}