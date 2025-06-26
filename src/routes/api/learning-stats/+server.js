// src/routes/api/learning-stats/+server.js

import { json } from '@sveltejs/kit'
import redisClient from '$lib/server/database'
import { units } from '$lib/data/units' // units.js から単元構造をインポート
import fs from 'fs/promises'
import path from 'path'

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

// 各単元のJSONデータを動的に読み込む関数 (変更なし)
async function loadUnitJsonData(unitId) {
	const jsonPath = path.resolve(process.cwd(), `src/lib/data/${unitId}.json`)
	try {
		const data = await fs.readFile(jsonPath, 'utf-8')
		return JSON.parse(data)
	} catch (error) {
		// ログは残しつつ、エラー時は空の配列を返す
		console.error(`Failed to load JSON data for unit ${unitId} at ${jsonPath}:`, error)
		return []
	}
}

// ★追加: 全ての単元の総問題数を事前に読み込み、マップとして保持する★
let allUnitsTotalProblems = {}
async function initializeTotalProblems() {
	// units.js から全ての単元IDを取得
	const allUnitIds = Object.values(unitNameMap) // unitNameMapのキー（ID）を取得

	// units.js の構造から直接IDを抽出する方が正確
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

	const totalProblemsPromises = allKnownUnitIds.map(async (unitId) => {
		const data = await loadUnitJsonData(unitId)
		return { unitId, total: data.length }
	})

	const results = await Promise.all(totalProblemsPromises)
	results.forEach((item) => {
		allUnitsTotalProblems[item.unitId] = item.total
	})
	console.log('Total problems initialized for all units:', allUnitsTotalProblems)
}

// サーバー起動時に一度だけ総問題数を初期化する
// これをGETハンドラ内で毎回やると遅いので、モジュールのトップレベルで実行
initializeTotalProblems()

// 統計計算ロジック
async function calculateStats(userId) {
	const recordKeys = await redisClient.keys(`learning_records:${userId}:*`)
	const problemRecords = []
	for (const key of recordKeys) {
		const record = await redisClient.get(key)
		if (record) {
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

	const userData = await redisClient.get(`users:${userId}`)
	if (userData) {
		stats.totalLearningSessions = userData.totalLearningSessions || 0
	}

	const unitMap = {}
	const coveredProblemIdsByUnit = {}

	problemRecords.forEach((record) => {
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

	// ★修正: progressRates の計算 (問題総数をallUnitsTotalProblemsから取得)★
	// ユーザーがまだ解いていない単元も含むように、unitMapのキーではなくunitNameMapのキーをループする
	for (const unitId in unitNameMap) {
		// 全ての既知の単元をループ
		const total = allUnitsTotalProblems[unitId] || 0 // 事前に読み込んだ総問題数
		const covered = coveredProblemIdsByUnit[unitId] ? coveredProblemIdsByUnit[unitId].size : 0 // カバーした問題数

		if (total > 0) {
			stats.progressRates.push({
				unit: unitNameMap[unitId], // 日本語名
				covered: covered,
				total: total
			})
		}
	}
	// ソートすると表示順が綺麗になる
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

	stats.achievements = ['初回ログイン', '学習開始']

	return stats
}

export async function GET({ locals }) {
	const userId = locals.user.id

	if (!userId) {
		return json({ message: '認証されていません。' }, { status: 401 })
	}

	try {
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
