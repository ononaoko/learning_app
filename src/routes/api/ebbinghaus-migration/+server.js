// src/routes/api/ebbinghaus-migration/+server.js

import { json } from '@sveltejs/kit'
import redis from '$lib/server/database'

/**
 * 既存データをエビングハウスシステムに移行するAPI
 */
export async function POST({ request }) {
  try {
    const { userId, dryRun = false } = await request.json();

    if (!userId) {
      return new Response('User ID is required', { status: 400 });
    }

    console.log('=== エビングハウス移行開始 ===');
    console.log('userId:', userId);
    console.log('dryRun:', dryRun);

    const migrationResult = await migrateUserData(userId, dryRun);

    return json({
      success: true,
      migrationResult,
      message: dryRun ? '移行プレビュー完了' : '移行完了'
    });

  } catch (error) {
    console.error('移行エラー:', error);
    return new Response('Migration failed', { status: 500 });
  }
}

/**
 * ユーザーデータを移行
 */
async function migrateUserData(userId, dryRun) {
  const result = {
    processedUnits: 0,
    processedProblems: 0,
    migratedRecords: 0,
    errors: [],
    preview: []
  };

  try {
    // 1. 既存の進捗データを取得
    const progressData = await redis.hgetall(`user:progress:${userId}`);

    if (!progressData || Object.keys(progressData).length === 0) {
      return {
        ...result,
        message: '移行対象のデータが見つかりません'
      };
    }

    // 2. 単元別にデータを整理
    const unitData = {};

    for (const [key, value] of Object.entries(progressData)) {
      const [unitId, field] = key.split(':');

      if (!unitData[unitId]) {
        unitData[unitId] = {
          unitId,
          lastProblemIndex: 0,
          isCompleted: false,
          ebbinghausReviewCount: 0,
          lastEbbinghausReview: null,
          completionDate: null
        };
      }

      unitData[unitId][field] = value;
    }

    result.processedUnits = Object.keys(unitData).length;

    // 3. 各単元の問題データを移行
    for (const [unitId, unit] of Object.entries(unitData)) {
      try {
        const problemResults = await redis.get(`user:problem_results:${userId}:${unitId}`);

        if (problemResults) {
          const results = JSON.parse(problemResults);

          for (const [problemIndex, problemResult] of Object.entries(results)) {
            const problemData = {
              problemId: problemResult.problemId,
              problemIndex: parseInt(problemIndex),
              unitId,
              attempts: [{
                stage: 0, // 初回学習として記録
                isCorrect: problemResult.isCorrect,
                timestamp: problemResult.timestamp,
                hintsUsed: 0,
                duration: 0,
                mode: 'normal-mode'
              }],
              currentStage: 0,
              nextReviewDate: problemResult.isCorrect ? calculateNextReviewDate(0, new Date(problemResult.timestamp)) : null,
              retentionScore: problemResult.isCorrect ? 10 : 0, // 初回のみなので低スコア
              isCompleted: false,
              createdAt: problemResult.timestamp,
              lastUpdated: problemResult.timestamp
            };

            result.processedProblems++;

            if (dryRun) {
              result.preview.push({
                unitId,
                problemId: problemResult.problemId,
                problemIndex,
                originalResult: problemResult,
                migratedData: problemData
              });
            } else {
              // 実際に移行データを保存
              const problemKey = `user:ebbinghaus_problems:${userId}:${unitId}:${problemResult.problemId}`;
              await redis.setex(problemKey, 86400 * 90, JSON.stringify(problemData)); // 90日間保持
              result.migratedRecords++;
            }
          }
        }

        // 単元統計を更新
        if (!dryRun) {
          await updateUnitStatistics(userId, unitId);
        }

      } catch (error) {
        result.errors.push({
          unitId,
          error: error.message
        });
      }
    }

    // 4. 移行完了フラグを設定
    if (!dryRun) {
      await redis.setex(`user:ebbinghaus_migrated:${userId}`, 86400 * 365, 'true');
    }

    return result;

  } catch (error) {
    throw error;
  }
}

/**
 * 次回復習日を計算
 */
function calculateNextReviewDate(currentStage, baseDate) {
  const nextReviewDays = [1, 7, 28, null];
  const nextStage = currentStage + 1;

  if (nextStage >= nextReviewDays.length || nextReviewDays[nextStage] === null) {
    return null;
  }

  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + nextReviewDays[nextStage]);
  return nextDate.toISOString();
}

/**
 * 単元統計を更新
 */
async function updateUnitStatistics(userId, unitId) {
  try {
    const pattern = `user:ebbinghaus_problems:${userId}:${unitId}:*`;
    const keys = await redis.keys(pattern);
    const problems = [];

    for (const key of keys) {
      const problemData = await redis.get(key);
      if (problemData) {
        problems.push(JSON.parse(problemData));
      }
    }

    if (problems.length === 0) return;

    const stats = {
      totalProblems: problems.length,
      completedProblems: problems.filter(p => p.isCompleted).length,
      averageRetentionScore: problems.reduce((sum, p) => sum + p.retentionScore, 0) / problems.length,
      problemsNeedingReview: problems.filter(p =>
        p.nextReviewDate && new Date(p.nextReviewDate) <= new Date() && !p.isCompleted
      ).length,
      lastUpdated: new Date().toISOString()
    };

    const unitStatsKey = `user:ebbinghaus_unit_stats:${userId}:${unitId}`;
    await redis.setex(unitStatsKey, 86400 * 30, JSON.stringify(stats));

  } catch (error) {
    console.error('単元統計更新エラー:', error);
  }
}

/**
 * 移行状況を確認
 */
export async function GET({ url }) {
  try {
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return new Response('User ID is required', { status: 400 });
    }

    const migrationStatus = await checkMigrationStatus(userId);

    return json(migrationStatus);

  } catch (error) {
    console.error('移行状況確認エラー:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * 移行状況を確認
 */
async function checkMigrationStatus(userId) {
  const status = {
    isMigrated: false,
    migrationDate: null,
    oldDataExists: false,
    newDataExists: false,
    oldDataCount: 0,
    newDataCount: 0
  };

  try {
    // 移行完了フラグを確認
    const migrationFlag = await redis.get(`user:ebbinghaus_migrated:${userId}`);
    if (migrationFlag) {
      status.isMigrated = true;
      status.migrationDate = new Date().toISOString(); // 実際の移行日時が必要な場合は別途保存
    }

    // 旧データの存在確認
    const oldProgressData = await redis.hgetall(`user:progress:${userId}`);
    if (oldProgressData && Object.keys(oldProgressData).length > 0) {
      status.oldDataExists = true;
      status.oldDataCount = Object.keys(oldProgressData).length;
    }

    // 新データの存在確認
    const newDataKeys = await redis.keys(`user:ebbinghaus_problems:${userId}:*`);
    if (newDataKeys.length > 0) {
      status.newDataExists = true;
      status.newDataCount = newDataKeys.length;
    }

    return status;

  } catch (error) {
    console.error('移行状況確認エラー:', error);
    return status;
  }
}

// src/lib/utils/ebbinghausHelper.js

/**
 * エビングハウス学習システムのヘルパー関数
 */

export const REVIEW_STAGES = {
  INITIAL: 0,
  DAY_1: 1,
  DAY_7: 2,
  DAY_28: 3
};

export const STAGE_NAMES = {
  0: '初回学習',
  1: '1日後復習',
  2: '7日後復習',
  3: '28日後復習'
};

export const NEXT_REVIEW_DAYS = [1, 7, 28, null];

/**
 * 次回復習日を計算
 */
export function calculateNextReviewDate(currentStage, baseDate = new Date()) {
  const nextStage = currentStage + 1;

  if (nextStage >= NEXT_REVIEW_DAYS.length || NEXT_REVIEW_DAYS[nextStage] === null) {
    return null; // 復習完了
  }

  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + NEXT_REVIEW_DAYS[nextStage]);
  return nextDate.toISOString();
}

/**
 * 復習が必要かどうかを判定
 */
export function isReviewDue(nextReviewDate, currentDate = new Date()) {
  if (!nextReviewDate) return false;

  const reviewDate = new Date(nextReviewDate);
  return reviewDate <= currentDate;
}

/**
 * 期日超過日数を計算
 */
export function calculateOverdueDays(nextReviewDate, currentDate = new Date()) {
  if (!nextReviewDate) return 0;

  const reviewDate = new Date(nextReviewDate);
  const diffTime = currentDate - reviewDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * 復習の緊急度を計算
 */
export function calculateUrgency(problem, currentDate = new Date()) {
  if (!problem.nextReviewDate || problem.isCompleted) return 0;

  const overdueDays = calculateOverdueDays(problem.nextReviewDate, currentDate);
  const retentionScore = problem.retentionScore || 0;

  // 期日超過日数と定着度の低さを考慮
  const urgency = overdueDays * 10 + (100 - retentionScore) * 0.5;

  return Math.min(100, urgency);
}

/**
 * 学習効率を計算
 */
export function calculateEfficiency(attempts) {
  if (!attempts || attempts.length === 0) return 0;

  const correctAttempts = attempts.filter(a => a.isCorrect).length;
  const totalAttempts = attempts.length;

  // 正解率と試行回数の少なさを考慮
  const accuracy = correctAttempts / totalAttempts;
  const efficiency = accuracy * (1 - (totalAttempts - 1) * 0.1); // 試行回数が多いほど効率が下がる

  return Math.max(0, efficiency * 100);
}

/**
 * 定着パターンを分析
 */
export function analyzeRetentionPattern(attempts) {
  if (!attempts || attempts.length === 0) {
    return { type: 'unknown', description: 'データなし' };
  }

  const results = attempts.map(a => a.isCorrect);
  const correctCount = results.filter(r => r).length;

  if (correctCount === results.length) {
    return { type: 'perfect', description: '完全定着' };
  }

  if (correctCount === 0) {
    return { type: 'weak', description: '要強化' };
  }

  // 改善傾向を分析
  const firstHalf = results.slice(0, Math.ceil(results.length / 2));
  const secondHalf = results.slice(Math.ceil(results.length / 2));

  const firstRate = firstHalf.filter(r => r).length / firstHalf.length;
  const secondRate = secondHalf.filter(r => r).length / secondHalf.length;

  if (secondRate > firstRate + 0.25) {
    return { type: 'improving', description: '改善中' };
  }

  if (firstRate > secondRate + 0.25) {
    return { type: 'declining', description: '悪化傾向' };
  }

  return { type: 'stable', description: '安定' };
}

/**
 * 推奨復習スケジュールを生成
 */
export function generateReviewSchedule(problems, currentDate = new Date()) {
  const schedule = {
    today: [],
    tomorrow: [],
    thisWeek: [],
    nextWeek: [],
    later: []
  };

  problems.forEach(problem => {
    if (problem.isCompleted || !problem.nextReviewDate) return;

    const reviewDate = new Date(problem.nextReviewDate);
    const daysUntilReview = Math.ceil((reviewDate - currentDate) / (1000 * 60 * 60 * 24));

    const problemWithUrgency = {
      ...problem,
      urgency: calculateUrgency(problem, currentDate),
      overdueDays: calculateOverdueDays(problem.nextReviewDate, currentDate)
    };

    if (daysUntilReview <= 0) {
      schedule.today.push(problemWithUrgency);
    } else if (daysUntilReview === 1) {
      schedule.tomorrow.push(problemWithUrgency);
    } else if (daysUntilReview <= 7) {
      schedule.thisWeek.push(problemWithUrgency);
    } else if (daysUntilReview <= 14) {
      schedule.nextWeek.push(problemWithUrgency);
    } else {
      schedule.later.push(problemWithUrgency);
    }
  });

  // 緊急度順にソート
  Object.keys(schedule).forEach(period => {
    schedule[period].sort((a, b) => b.urgency - a.urgency);
  });

  return schedule;
}

/**
 * 学習統計を計算
 */
export function calculateLearningStats(problems) {
  const stats = {
    totalProblems: problems.length,
    completedProblems: 0,
    averageRetentionScore: 0,
    averageEfficiency: 0,
    totalAttempts: 0,
    totalCorrectAttempts: 0,
    patternDistribution: {
      perfect: 0,
      improving: 0,
      stable: 0,
      declining: 0,
      weak: 0,
      unknown: 0
    }
  };

  if (problems.length === 0) return stats;

  let totalRetentionScore = 0;
  let totalEfficiency = 0;

  problems.forEach(problem => {
    if (problem.isCompleted) {
      stats.completedProblems++;
    }

    totalRetentionScore += problem.retentionScore || 0;
    totalEfficiency += calculateEfficiency(problem.attempts);

    const attempts = problem.attempts || [];
    stats.totalAttempts += attempts.length;
    stats.totalCorrectAttempts += attempts.filter(a => a.isCorrect).length;

    const pattern = analyzeRetentionPattern(attempts);
    stats.patternDistribution[pattern.type]++;
  });

  stats.averageRetentionScore = totalRetentionScore / problems.length;
  stats.averageEfficiency = totalEfficiency / problems.length;

  return stats;
}

/**
 * データベースからユーザーの全エビングハウスデータを取得
 */
export async function fetchUserEbbinghausData(userId, unitId = null) {
  try {
    const params = new URLSearchParams({ userId });
    if (unitId) params.append('unitId', unitId);

    const response = await fetch(`/api/ebbinghaus-record?${params}`);

    if (!response.ok) {
      throw new Error(`データ取得エラー: ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('エビングハウスデータ取得エラー:', error);
    throw error;
  }
}

/**
 * 復習記録を保存
 */
export async function saveReviewRecord(reviewData) {
  try {
    const response = await fetch('/api/ebbinghaus-record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reviewData)
    });

    if (!response.ok) {
      throw new Error(`記録保存エラー: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('復習記録保存エラー:', error);
    throw error;
  }
}