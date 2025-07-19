// src/routes/api/learning-stats/+server.js

import { json } from '@sveltejs/kit'
import redisClient from '$lib/server/database'
import { units } from '$lib/data/units'
import { problemsByUnit } from '$lib/problems-data/problemsStore'

// 英語単元IDと日本語名のマップ
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

// 全ての単元の総問題数を事前に読み込み
let allUnitsTotalProblems = {}
let isTotalProblemsInitialized = false

async function initializeTotalProblems() {
	if (isTotalProblemsInitialized) {
		return
	}

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

	for (const unitId of allKnownUnitIds) {
		const problemsInUnit = problemsByUnit[unitId]
		if (problemsInUnit) {
			allUnitsTotalProblems[unitId] = problemsInUnit.length
		} else {
			console.warn(`No problem data found in problemsByUnit for unit: ${unitId}. Setting total to 0.`)
			allUnitsTotalProblems[unitId] = 0
		}
	}

	isTotalProblemsInitialized = true
	console.log('Total problems initialized for all units:', allUnitsTotalProblems)
}

initializeTotalProblems()

// ★新規追加: 日別学習統計を計算★
async function calculateDailyStats(userId, days = 7) {
	console.log('=== 日別学習統計取得開始 ===');
	console.log('userId:', userId);
	console.log('取得日数:', days);

	const recordKeys = await redisClient.keys(`learning_records:${userId}:*`)
	const problemRecords = []

	for (const key of recordKeys) {
		const record = await redisClient.get(key)
		if (record) {
			problemRecords.push(record)
		}
	}

	console.log('取得したレコード数:', problemRecords.length);

	const dailyStats = []
	const today = new Date()

	// 過去N日分の統計を生成
	for (let i = days - 1; i >= 0; i--) {
		const targetDate = new Date(today)
		targetDate.setDate(today.getDate() - i)
		const dateString = targetDate.toISOString().split('T')[0]

		console.log(`${dateString} のデータ:`, problemRecords.filter(record =>
			record.timestamp && record.timestamp.split('T')[0] === dateString
		).length, '件');

		const dayRecords = problemRecords.filter(record =>
			record.timestamp && record.timestamp.split('T')[0] === dateString
		)

		const dayStats = {
			date: dateString,
			studyCount: dayRecords.length,
			totalTime: dayRecords.reduce((sum, record) => sum + (record.durationSeconds || 0), 0),
			correctAnswers: dayRecords.filter(record => record.isCorrect).length,
			totalAnswers: dayRecords.length,
			accuracy: dayRecords.length > 0 ? (dayRecords.filter(record => record.isCorrect).length / dayRecords.length) * 100 : 0,
			completedProblems: new Set(dayRecords.map(record => record.problemId)).size,
			reviewCount: 0, // 既存システムでは復習の区別ができないため0
			newProblems: new Set(dayRecords.map(record => record.problemId)).size
		}

		dailyStats.push(dayStats)
	}

	console.log('生成された日別統計:', dailyStats);
	return dailyStats
}

// ★新規追加: 連続学習日数を計算★
async function calculateLearningStreak(userId) {
	console.log('=== 連続学習記録取得開始 ===');
	console.log('userId:', userId);

	const recordKeys = await redisClient.keys(`learning_records:${userId}:*`)
	const studyDates = new Set()

	for (const key of recordKeys) {
		const record = await redisClient.get(key)
		if (record && record.timestamp) {
			studyDates.add(record.timestamp.split('T')[0])
		}
	}

	const sortedDates = Array.from(studyDates).sort()
	console.log('学習日一覧:', sortedDates);

	const result = {
		currentStreak: 0,
		longestStreak: 0,
		lastStudyDate: sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null,
		totalStudyDays: sortedDates.length,
		streakHistory: [],
		weeklyGoal: 7,
		weeklyProgress: 0,
		isOnTrack: false
	}

	if (sortedDates.length === 0) {
		console.log('学習データがありません');
		return result
	}

	// 現在の連続学習日数を計算
	const today = new Date()
	const yesterday = new Date(today)
	yesterday.setDate(today.getDate() - 1)

	const todayStr = today.toISOString().split('T')[0]
	const yesterdayStr = yesterday.toISOString().split('T')[0]

	// 今日または昨日に学習していない場合は連続記録は0
	if (!studyDates.has(todayStr) && !studyDates.has(yesterdayStr)) {
		console.log('今日も昨日も学習していないため、連続記録は0です');
		return result
	}

	let currentStreak = 0
	let checkDate = studyDates.has(todayStr) ? today : yesterday

	// 連続する日付を遡って数える
	while (true) {
		const checkDateStr = checkDate.toISOString().split('T')[0]

		if (studyDates.has(checkDateStr)) {
			currentStreak++
			checkDate.setDate(checkDate.getDate() - 1)
		} else {
			break
		}
	}

	result.currentStreak = currentStreak

	// 最長連続学習日数を計算
	let longestStreak = 1
	let tempStreak = 1

	for (let i = 1; i < sortedDates.length; i++) {
		const prevDate = new Date(sortedDates[i - 1])
		const currentDate = new Date(sortedDates[i])

		const diffInDays = (currentDate - prevDate) / (1000 * 60 * 60 * 24)

		if (diffInDays === 1) {
			tempStreak++
			longestStreak = Math.max(longestStreak, tempStreak)
		} else {
			tempStreak = 1
		}
	}

	result.longestStreak = longestStreak

	// 週間進捗（過去7日間の学習日数）
	const weekAgo = new Date(today)
	weekAgo.setDate(today.getDate() - 6)

	let weeklyDays = 0
	for (let i = 0; i < 7; i++) {
		const checkDate = new Date(weekAgo)
		checkDate.setDate(weekAgo.getDate() + i)
		const checkDateStr = checkDate.toISOString().split('T')[0]

		if (studyDates.has(checkDateStr)) {
			weeklyDays++
		}
	}

	result.weeklyProgress = weeklyDays
	result.isOnTrack = weeklyDays >= result.weeklyGoal

	console.log('計算された連続学習データ:', result);
	return result
}

// 既存の統計計算ロジック
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

	const userData = await redisClient.get(`user_data:${userId}`)
	if (userData) {
		stats.totalLearningSessions = userData.totalLearningSessions || 0
	}

	const unitMap = {}
	const coveredProblemIdsByUnit = {}

	problemRecords.forEach((record) => {
		if (!record.problemId || typeof record.problemId !== 'string') {
			console.warn(`Skipping record due to invalid problemId:`, record)
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

	// unitStats の計算
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

	// progressRates の計算
	for (const unitId in unitNameMap) {
		const total = allUnitsTotalProblems[unitId] || 0
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

	// problemCorrectness の計算
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

	// 苦手問題ランキング
	stats.weakestProblems = [...stats.problemCorrectness]
		.sort((a, b) => a.correctness - b.correctness)
		.slice(0, 3)

	stats.achievements = ['初回ログイン', '学習開始']

	return stats
}

export async function GET({ locals, url }) {
	const userId = locals.user.id

	if (!userId) {
		return json({ message: '認証されていません。' }, { status: 401 })
	}

	try {
		// ★新規追加: クエリパラメータで動作を制御★
		const requestType = url.searchParams.get('type') || 'full'
		const days = parseInt(url.searchParams.get('days')) || 7

		if (!isTotalProblemsInitialized) {
			console.log('Total problems not initialized yet. Initializing now...')
			await initializeTotalProblems()
		}

		if (requestType === 'daily') {
			// 日別統計のみを返す
			const dailyStats = await calculateDailyStats(userId, days)
			return json(dailyStats)
		} else if (requestType === 'streak') {
			// 連続学習記録のみを返す
			const streakData = await calculateLearningStreak(userId)
			return json(streakData)
		} else {
			// 従来の全統計を返す
			const stats = await calculateStats(userId)
			return json(stats)
		}
	} catch (error) {
		console.error(`Failed to load learning stats for user ${userId}:`, error)
		return json(
			{ message: '学習統計のロードに失敗しました。', details: error.message },
			{ status: 500 }
		)
	}
}