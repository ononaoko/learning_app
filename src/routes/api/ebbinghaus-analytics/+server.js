// src/routes/api/ebbinghaus-analytics/+server.js

import { json } from '@sveltejs/kit'
import redisClient from '$lib/server/database'

/**
 * 既存のlearning-recordデータを使った簡易エビングハウス分析API
 */
export async function GET({ locals, url }) {
  try {
    const userId = locals.user.id;
    const analysisType = url.searchParams.get('type') || 'retention';

    if (!userId) {
      return new Response('User ID is required', { status: 400 });
    }

    console.log('=== エビングハウス学習分析（簡易版） ===');
    console.log('分析パラメータ:', { userId, analysisType });

    let analyticsData;

    switch (analysisType) {
      case 'retention':
        analyticsData = await generateSimpleRetentionAnalytics(userId);
        break;
      case 'progress':
        analyticsData = await generateSimpleProgressAnalytics(userId);
        break;
      case 'prediction':
        analyticsData = await generateSimplePredictionAnalytics(userId);
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
 * 既存データから簡易的な定着度分析を生成
 */
async function generateSimpleRetentionAnalytics(userId) {
  const recordKeys = await redisClient.keys(`learning_records:${userId}:*`);
  const problemRecords = [];

  for (const key of recordKeys) {
    const record = await redisClient.get(key);
    if (record) {
      problemRecords.push(record);
    }
  }

  const analytics = {
    overallRetentionScore: 0,
    totalProblems: 0,
    completedProblems: 0,
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
      perfect: 0,      // 高正解率
      improving: 0,    // 改善傾向
      declining: 0,    // 悪化傾向
      unstable: 0,     // バラつき
      consistent: 0    // 一貫性
    }
  };

  if (problemRecords.length === 0) {
    return {
      ...analytics,
      message: '学習データが見つかりません。まず問題を解いて学習記録を作成しましょう。'
    };
  }

  // 問題別に記録をグループ化
  const problemMap = {};
  problemRecords.forEach(record => {
    if (!problemMap[record.problemId]) {
      problemMap[record.problemId] = [];
    }
    problemMap[record.problemId].push(record);
  });

  analytics.totalProblems = Object.keys(problemMap).length;
  let totalRetentionScore = 0;

  // 各問題の分析
  Object.values(problemMap).forEach(records => {
    // 時間順にソート
    records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const correctCount = records.filter(r => r.isCorrect).length;
    const totalAttempts = records.length;
    const accuracy = totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 0;

    // 疑似的な定着度スコアを計算
    let retentionScore = accuracy;

    // 試行回数が多いほど定着度を下げる（復習の必要性を示す）
    if (totalAttempts > 3) {
      retentionScore *= 0.8;
    }

    // 最新の試行が正解なら定着度を上げる
    if (records[records.length - 1].isCorrect) {
      retentionScore = Math.min(100, retentionScore * 1.2);
    }

    totalRetentionScore += retentionScore;

    // 定着度分布
    if (retentionScore >= 90) analytics.retentionDistribution.excellent++;
    else if (retentionScore >= 70) analytics.retentionDistribution.good++;
    else if (retentionScore >= 50) analytics.retentionDistribution.fair++;
    else if (retentionScore >= 30) analytics.retentionDistribution.poor++;
    else analytics.retentionDistribution.critical++;

    // 疑似段階分析（試行回数に基づく）
    records.forEach((record, index) => {
      const stage = Math.min(3, Math.floor(index / 2)); // 2回ごとに段階を上げる
      const stageKey = `stage${stage}`;

      if (analytics.stageAnalysis[stageKey]) {
        analytics.stageAnalysis[stageKey].total++;
        if (record.isCorrect) {
          analytics.stageAnalysis[stageKey].correct++;
        }
      }
    });

    // パターン分析
    const pattern = analyzeSimplePattern(records);
    analytics.patternAnalysis[pattern]++;

    // 完了判定（正解率が80%以上で最後が正解）
    if (accuracy >= 80 && records[records.length - 1].isCorrect) {
      analytics.completedProblems++;
    }
  });

  // 段階別正解率を計算
  Object.keys(analytics.stageAnalysis).forEach(stage => {
    const stageData = analytics.stageAnalysis[stage];
    stageData.rate = stageData.total > 0 ? (stageData.correct / stageData.total) * 100 : 0;
  });

  analytics.overallRetentionScore = analytics.totalProblems > 0 ? totalRetentionScore / analytics.totalProblems : 0;

  return analytics;
}

/**
 * 簡易的な進捗分析を生成
 */
async function generateSimpleProgressAnalytics(userId) {
  const recordKeys = await redisClient.keys(`learning_records:${userId}:*`);
  const problemRecords = [];

  for (const key of recordKeys) {
    const record = await redisClient.get(key);
    if (record) {
      problemRecords.push(record);
    }
  }

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
    dailyProgress: []
  };

  if (problemRecords.length === 0) {
    analytics.dailyProgress = generateEmptyDailyProgress();
    return analytics;
  }

  // 問題別にグループ化
  const problemMap = {};
  problemRecords.forEach(record => {
    if (!problemMap[record.problemId]) {
      problemMap[record.problemId] = [];
    }
    problemMap[record.problemId].push(record);
  });

  analytics.totalProblems = Object.keys(problemMap).length;
  let totalAttempts = problemRecords.length;

  // 各問題の分析
  Object.values(problemMap).forEach(records => {
    records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const correctCount = records.filter(r => r.isCorrect).length;
    const accuracy = correctCount / records.length * 100;

    // 完了判定
    if (accuracy >= 80 && records[records.length - 1].isCorrect) {
      analytics.completedProblems++;
    } else {
      analytics.inProgressProblems++;

      // 疑似的な期日超過判定（最後の試行から7日以上経過）
      const lastAttempt = new Date(records[records.length - 1].timestamp);
      const daysSinceLastAttempt = (new Date() - lastAttempt) / (1000 * 60 * 60 * 24);

      if (daysSinceLastAttempt > 7) {
        analytics.overdueProblems++;
      }
    }
  });

  analytics.completionRate = analytics.totalProblems > 0 ? (analytics.completedProblems / analytics.totalProblems) * 100 : 0;
  analytics.averageAttemptsPerProblem = analytics.totalProblems > 0 ? totalAttempts / analytics.totalProblems : 0;

  // 日別進捗を生成
  analytics.dailyProgress = generateSimpleDailyProgress(problemRecords);

  return analytics;
}

/**
 * 簡易的な予測分析を生成
 */
async function generateSimplePredictionAnalytics(userId) {
  const recordKeys = await redisClient.keys(`learning_records:${userId}:*`);
  const problemRecords = [];

  for (const key of recordKeys) {
    const record = await redisClient.get(key);
    if (record) {
      problemRecords.push(record);
    }
  }

  const analytics = {
    forgettingCurve: generateSimpleForgettingCurve(problemRecords),
    reviewPrediction: generateSimpleReviewPrediction(problemRecords),
    learningEfficiency: calculateSimpleLearningEfficiency(problemRecords),
    recommendations: generateSimpleRecommendations(problemRecords)
  };

  return analytics;
}

/**
 * 学習パターンを簡易分析
 */
function analyzeSimplePattern(records) {
  if (records.length === 0) return 'unstable';

  const results = records.map(r => r.isCorrect);
  const correctCount = results.filter(r => r).length;
  const accuracy = correctCount / results.length;

  if (accuracy >= 0.9) return 'perfect';
  if (accuracy <= 0.3) return 'declining';

  // 改善傾向をチェック
  if (results.length >= 4) {
    const firstHalf = results.slice(0, Math.ceil(results.length / 2));
    const secondHalf = results.slice(Math.ceil(results.length / 2));

    const firstRate = firstHalf.filter(r => r).length / firstHalf.length;
    const secondRate = secondHalf.filter(r => r).length / secondHalf.length;

    if (secondRate > firstRate + 0.2) return 'improving';
    if (firstRate > secondRate + 0.2) return 'declining';
  }

  return accuracy > 0.6 ? 'consistent' : 'unstable';
}

/**
 * 空の日別進捗データを生成
 */
function generateEmptyDailyProgress() {
  const dailyData = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    dailyData.push({
      date: date.toISOString().split('T')[0],
      totalAttempts: 0,
      correctAttempts: 0,
      problemsWorked: 0,
      completedProblems: 0,
      accuracy: 0
    });
  }

  return dailyData;
}

/**
 * 簡易日別進捗を生成
 */
function generateSimpleDailyProgress(problemRecords) {
  const dailyData = {};

  problemRecords.forEach(record => {
    const date = record.timestamp.split('T')[0];

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
    if (record.isCorrect) {
      dailyData[date].correctAttempts++;
    }
    dailyData[date].problemsWorked.add(record.problemId);
  });

  // Setを数値に変換し、正解率を計算
  Object.values(dailyData).forEach(day => {
    day.problemsWorked = day.problemsWorked.size;
    day.accuracy = day.totalAttempts > 0 ? (day.correctAttempts / day.totalAttempts) * 100 : 0;
  });

  const result = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

  // データが少ない場合は空のデータで補完
  if (result.length < 7) {
    return generateEmptyDailyProgress();
  }

  return result;
}

/**
 * 簡易忘却曲線データを生成
 */
function generateSimpleForgettingCurve(problemRecords) {
  const theoreticalCurve = [100, 58, 44, 35, 26];
  const actualData = [100, 70, 60, 50, 45]; // デモデータ

  return {
    theoretical: theoreticalCurve,
    actual: actualData,
    stages: ['初回', '1日後', '7日後', '28日後', '長期記憶']
  };
}

/**
 * 簡易復習予測を生成
 */
function generateSimpleReviewPrediction(problemRecords) {
  const prediction = {
    today: 0,
    tomorrow: 0,
    thisWeek: 0,
    nextWeek: 0,
    thisMonth: 0,
    nextMonth: 0
  };

  // 問題別にグループ化
  const problemMap = {};
  problemRecords.forEach(record => {
    if (!problemMap[record.problemId]) {
      problemMap[record.problemId] = [];
    }
    problemMap[record.problemId].push(record);
  });

  const currentDate = new Date();

  Object.values(problemMap).forEach(records => {
    records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const lastRecord = records[records.length - 1];
    const lastAttemptDate = new Date(lastRecord.timestamp);
    const daysSinceLastAttempt = Math.floor((currentDate - lastAttemptDate) / (1000 * 60 * 60 * 24));

    const correctCount = records.filter(r => r.isCorrect).length;
    const accuracy = correctCount / records.length;

    // 復習が必要な問題かどうかを判定
    if (accuracy < 0.8 || (!lastRecord.isCorrect)) {
      // 疑似的な復習予測
      if (daysSinceLastAttempt >= 7) {
        prediction.today++;
      } else if (daysSinceLastAttempt >= 3) {
        prediction.tomorrow++;
      } else if (daysSinceLastAttempt >= 1) {
        prediction.thisWeek++;
      } else {
        prediction.nextWeek++;
      }
    }
  });

  return prediction;
}

/**
 * 簡易学習効率を計算
 */
function calculateSimpleLearningEfficiency(problemRecords) {
  if (problemRecords.length === 0) {
    return { efficiency: 0, details: {} };
  }

  const problemMap = {};
  let totalTime = 0;
  let totalAttempts = problemRecords.length;
  let successfulProblems = 0;

  problemRecords.forEach(record => {
    totalTime += record.durationSeconds || 0;

    if (!problemMap[record.problemId]) {
      problemMap[record.problemId] = [];
    }
    problemMap[record.problemId].push(record);
  });

  // 各問題の成功判定
  Object.values(problemMap).forEach(records => {
    const correctCount = records.filter(r => r.isCorrect).length;
    const accuracy = correctCount / records.length;

    if (accuracy >= 0.8) {
      successfulProblems++;
    }
  });

  const efficiency = Object.keys(problemMap).length > 0
    ? (successfulProblems / Object.keys(problemMap).length) * 100
    : 0;

  const averageTimePerProblem = Object.keys(problemMap).length > 0
    ? totalTime / Object.keys(problemMap).length
    : 0;

  return {
    efficiency,
    details: {
      totalTime,
      totalAttempts,
      successfulProblems,
      averageTimePerProblem,
      timePerSuccess: successfulProblems > 0 ? totalTime / successfulProblems : 0
    }
  };
}

/**
 * 簡易推奨事項を生成
 */
function generateSimpleRecommendations(problemRecords) {
  const recommendations = [];

  if (problemRecords.length === 0) {
    recommendations.push({
      type: 'start',
      title: '学習を開始しましょう',
      description: '学習データがありません。まず問題を解いて学習記録を作成しましょう。',
      action: 'start_learning',
      priority: 'high'
    });
    return recommendations;
  }

  // 問題別にグループ化
  const problemMap = {};
  problemRecords.forEach(record => {
    if (!problemMap[record.problemId]) {
      problemMap[record.problemId] = [];
    }
    problemMap[record.problemId].push(record);
  });

  // 苦手問題を特定
  const weakProblems = [];
  const overdueProblems = [];
  const currentDate = new Date();

  Object.entries(problemMap).forEach(([problemId, records]) => {
    records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const correctCount = records.filter(r => r.isCorrect).length;
    const accuracy = correctCount / records.length;
    const lastRecord = records[records.length - 1];
    const daysSinceLastAttempt = Math.floor((currentDate - new Date(lastRecord.timestamp)) / (1000 * 60 * 60 * 24));

    if (accuracy < 0.5) {
      weakProblems.push(problemId);
    }

    if (daysSinceLastAttempt > 7 && accuracy < 0.8) {
      overdueProblems.push(problemId);
    }
  });

  // 推奨事項を生成
  if (overdueProblems.length > 0) {
    recommendations.push({
      type: 'urgent',
      title: '復習が必要な問題があります',
      description: `${overdueProblems.length}問の復習が必要です。忘れる前に復習しましょう。`,
      action: 'review_overdue',
      priority: 'high'
    });
  }

  if (weakProblems.length > 0) {
    recommendations.push({
      type: 'improvement',
      title: '苦手な問題があります',
      description: `${weakProblems.length}問の正解率が低い状態です。重点的に学習しましょう。`,
      action: 'review_weak',
      priority: 'medium'
    });
  }

  const efficiency = calculateSimpleLearningEfficiency(problemRecords);
  if (efficiency.efficiency < 60) {
    recommendations.push({
      type: 'strategy',
      title: '学習効率の改善が必要です',
      description: '現在の学習効率は低い状態です。ヒントの活用や学習方法の見直しを検討してください。',
      action: 'improve_efficiency',
      priority: 'medium'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'continue',
      title: '学習順調です！',
      description: '現在の学習ペースを維持して、継続的に学習を行いましょう。',
      action: 'continue_learning',
      priority: 'low'
    });
  }

  return recommendations;
}