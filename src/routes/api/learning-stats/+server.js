// src/routes/api/learning-stats/+server.js

import { json } from '@sveltejs/kit'
import redisClient from '$lib/server/database'
import { units } from '$lib/data/units' // units.js から単元構造をインポート

// ★修正: fs と path のインポートは不要になるので削除★
// import fs from 'fs/promises';
// import path from 'path';

// ★追加: problemsStore から problemsByUnit をインポート★
import { problemsByUnit } from '$lib/problems-data/problemsStore'

// 英語単元IDと日本語名のマップ (変更なし)
function createUnitNameMap(unitsData) {
	const map = {}
	unitsData.forEach((category) => {
		if (category.sub_units) {
			category.sub_units.forEach((subCategory) => {
				if (subCategory.sub_units) {
					subCategory.sub_units.forEach((unit) => {
						if (unit.type === 'unit' && unit.id && unit.name) {
							map[unit.id] = unit.name
						}
					})
				}
			})
		}
	})
	return map
}
const unitNameMap = createUnitNameMap(units)

// ★削除: loadUnitJsonData 関数は不要になるので削除★
// async function loadUnitJsonData(unitId) {
//     const jsonPath = path.resolve(process.cwd(), `src/lib/data/${unitId}.json`);
//     try {
//         const data = await fs.readFile(jsonPath, 'utf-8');
//         return JSON.parse(data);
//     } catch (error) {
//         console.error(`Failed to load JSON data for unit ${unitId} at ${jsonPath}:`, error);
//         return [];
//     }
// }

// ★修正: 全ての単元の総問題数を事前に読み込み、マップとして保持する★
// problemsByUnit が同期的に利用可能なので、非同期の初期化はよりシンプルになります。
let allUnitsTotalProblems = {}
let isTotalProblemsInitialized = false // 初期化状態を追跡するフラグ

async function initializeTotalProblems() {
	if (isTotalProblemsInitialized) {
		return // すでに初期化済みなら何もしない
	}

	// units.js の構造から全ての単元IDを抽出する (変更なし)
	const allKnownUnitIds = []
	units.forEach((category) => {
		if (category.sub_units) {
			category.sub_units.forEach((subCategory) => {
				if (subCategory.sub_units) {
					subCategory.sub_units.forEach((unit) => {
						if (unit.type === 'unit' && unit.id) {
							allKnownUnitIds.push(unit.id)
						}
					})
				}
			})
		}
	})

	// ★修正: loadUnitJsonData の呼び出しを problemsByUnit からの直接取得に置き換え★
	for (const unitId of allKnownUnitIds) {
		const problemsInUnit = problemsByUnit[unitId]
		if (problemsInUnit) {
			allUnitsTotalProblems[unitId] = problemsInUnit.length
		} else {
			console.warn(
				`[Learning Stats API] No problem data found in problemsByUnit for unit: ${unitId}. Setting total to 0.`
			)
			allUnitsTotalProblems[unitId] = 0
		}
	}

	isTotalProblemsInitialized = true
	console.log('Total problems initialized for all units:', allUnitsTotalProblems)
}

// サーバー起動時に一度だけ総問題数を初期化する (そのまま残す)
// ★注意: initializeTotalProblems() は非同期関数なので、この場所で呼び出すと
// モジュールロード時に非同期処理が走り、その結果を待たずに次のコードが実行される可能性があります。
// しかし、GETハンドラ内で isTotalProblemsInitialized をチェックして await するロジックがあるため、
// 今回は問題ありません。
initializeTotalProblems()

// 統計計算ロジック (変更なし: problemsByUnit への直接的な依存はここにはない)
async function calculateStats(userId) {
    const recordKeys = await redisClient.keys(`learning_records:${userId}:*`)
    const problemRecords = []
    for (const key of recordKeys) {
        // record は既にオブジェクトとして取得される
        const record = await redisClient.get(key)
        if (record) {
            // ★修正: JSON.parse(record) の呼び出しを削除！★
            problemRecords.push(record)
        }
    }

    const stats = {
        totalLearningSessions: 0,
        consecutiveLearningDays: 0,
        unitStats: [],
        problemCorrectness: [],
        learningTime: {
            '2025/06/26': '0分',
            average: '0分'
        },
        achievements: [],
        progressRates: [],
        weakestProblems: []
    }

    // userData は既にオブジェクトとして取得される
    const userData = await redisClient.get(`user_data:${userId}`)
    if (userData) {
        // ★修正: JSON.parse(userData) の呼び出しを削除！★
        stats.totalLearningSessions = userData.totalLearningSessions || 0
    }


	const unitMap = {}
	const coveredProblemIdsByUnit = {}

	problemRecords.forEach((record) => {
		// problemId が存在しない場合や形式が不適切な場合に対応
		if (!record.problemId || typeof record.problemId !== 'string') {
			console.warn(`[Learning Stats API] Skipping record due to invalid problemId:`, record)
			return
		}
		const unitId = record.problemId.split('-')[0]

		if (!unitMap[unitId]) {
			unitMap[unitId] = { sessions: 0, correctCount: 0, totalProblems: 0, hintCount: 0 }
		}
		unitMap[unitId].sessions++
		unitMap[unitId].totalProblems++
		if (record.isCorrect) {
			unitMap[unitId].correctCount++
		}
		unitMap[unitId].hintCount += record.hintsUsedCount

		if (!coveredProblemIdsByUnit[unitId]) {
			coveredProblemIdsByUnit[unitId] = new Set()
		}
		coveredProblemIdsByUnit[unitId].add(record.problemId)
	})

	// unitStats の計算 (変更なし)
	for (const unitId in unitMap) {
		const unitStat = unitMap[unitId]
		stats.unitStats.push({
			unit: unitNameMap[unitId] || unitId.charAt(0).toUpperCase() + unitId.slice(1),
			sessions: unitStat.sessions,
			correctness:
				unitStat.totalProblems > 0
					? ((unitStat.correctCount / unitStat.totalProblems) * 100).toFixed(0)
					: 0,
			hintsUsed:
				unitStat.totalProblems > 0 ? (unitStat.hintCount / unitStat.totalProblems).toFixed(1) : 0
		})
	}

	// progressRates の計算 (変更なし)
	for (const unitId in unitNameMap) {
		const total = allUnitsTotalProblems[unitId] || 0 // 事前に読み込んだ総問題数
		const covered = coveredProblemIdsByUnit[unitId] ? coveredProblemIdsByUnit[unitId].size : 0

		if (total > 0) {
			stats.progressRates.push({
				unit: unitNameMap[unitId],
				covered: covered,
				total: total
			})
		}
	}
	stats.progressRates.sort((a, b) => a.unit.localeCompare(b.unit, 'ja'))

	// problemCorrectness の計算 (変更なし)
	const problemMap = {}
	problemRecords.forEach((record) => {
		if (!problemMap[record.problemId]) {
			problemMap[record.problemId] = { correctCount: 0, totalAttempts: 0 }
		}
		problemMap[record.problemId].totalAttempts++
		if (record.isCorrect) {
			problemMap[record.problemId].correctCount++
		}
	})

	for (const probId in problemMap) {
		const pStat = problemMap[probId]
		stats.problemCorrectness.push({
			problem: probId,
			correctness:
				pStat.totalAttempts > 0 ? ((pStat.correctCount / pStat.totalAttempts) * 100).toFixed(0) : 0
		})
	}

	// 苦手問題ランキング (変更なし)
	stats.weakestProblems = [...stats.problemCorrectness]
		.sort((a, b) => a.correctness - b.correctness)
		.slice(0, 3)

	stats.achievements = ['初回ログイン', '学習開始'] // これはダミーデータかもしれません

	return stats
}

export async function GET({ locals }) {
	const userId = locals.user.id

	if (!userId) {
		return json({ message: '認証されていません。' }, { status: 401 })
	}

	try {
		// ★修正: initializeTotalProblems が完了していることを確認★
		if (!isTotalProblemsInitialized) {
			console.log('[Learning Stats API] Total problems not initialized yet. Initializing now...')
			await initializeTotalProblems()
		}

		const stats = await calculateStats(userId)
		return json(stats)
	} catch (error) {
		console.error(`Failed to load learning stats for user ${userId}:`, error)
		return json(
			{ message: '学習統計のロードに失敗しました。', details: error.message },
			{ status: 500 }
		)
	}
}
