// src/routes/api/learning-stats/+server.js
import { json } from '@sveltejs/kit'
import { loadUserData } from '$lib/server/user-data/userStore'
import { loadProblems as loadAllProblems } from '$lib/server/problems-data/problemsStore'
import { units as allUnits } from '$lib/data/units'

// units.js から全てのユニットIDと、それが属するサブカテゴリー名を取得するヘルパー関数
function getFlatUnitsWithSubcategory(unitList, currentSubcategoryName = '未分類') {
	let flatUnits = []
	unitList.forEach((item) => {
		if (item.type === 'unit') {
			flatUnits.push({ id: item.id, name: item.name, subcategoryName: currentSubcategoryName })
		} else if (item.type === 'subcategory' && item.sub_units) {
			flatUnits = flatUnits.concat(getFlatUnitsWithSubcategory(item.sub_units, item.name))
		} else if (item.type === 'category' && item.sub_units) {
			flatUnits = flatUnits.concat(
				getFlatUnitsWithSubcategory(item.sub_units, currentSubcategoryName)
			)
		}
	})
	return flatUnits
}

// 全ての単元のID、名前、およびそれが属するサブカテゴリー名のリスト
const flatUnitListWithSubcategory = getFlatUnitsWithSubcategory(allUnits)
console.log('flatUnitListWithSubcategory initialized:', flatUnitListWithSubcategory)
console.log('--- Detailed flatUnitListWithSubcategory ---') // ★追加★
flatUnitListWithSubcategory.forEach((item) => console.log(item)) // ★追加★
console.log('------------------------------------------') // ★追加★

// 問題IDから単元ID (unit.id) をマッピングするマップを生成
let problemToUnitMap = {}
let allProblemIdsInUnits = new Set()
let isProblemToUnitMapInitialized = false

async function initializeProblemToUnitMap() {
	if (isProblemToUnitMapInitialized) return

	try {
		const problemsDataByUnit = await loadAllProblems()
		problemToUnitMap = {}
		allProblemIdsInUnits = new Set()

		for (const unitId in problemsDataByUnit) {
			if (Object.prototype.hasOwnProperty.call(problemsDataByUnit, unitId)) {
				problemsDataByUnit[unitId].forEach((problem) => {
					if (problem.id) {
						// problem.id が存在することを確認
						const problemIdentifier = problem.id
						problemToUnitMap[problemIdentifier] = unitId // 例: "algebra-001" -> "algebra"
						allProblemIdsInUnits.add(problemIdentifier)
					} else {
						console.warn(
							`[Problem Map Init] Problem missing 'id' property in unit: ${unitId}`,
							problem
						)
					}
				})
			}
		}
		isProblemToUnitMapInitialized = true
		console.log('Problem-to-Unit Map initialized successfully.')
		console.log('problemToUnitMap content:', problemToUnitMap)
	} catch (error) {
		console.error('Failed to initialize Problem-to-Unit Map:', error)
		problemToUnitMap = {}
		allProblemIdsInUnits = new Set()
	}
}

initializeProblemToUnitMap()

function calculateStats(userData) {
	const stats = {
		totalLearningSessions: userData.totalLearningSessions || 0,
		consecutiveLearningDays: userData.consecutiveLearningDays || 0,
		unitStats: [], // これをsubcategory単位で集計
		problemCorrectness: [],
		learningTime: {
			'2025/06/15': '0分',
			average: '0分'
		},
		achievements: [],
		progressRates: [],
		weakestProblems: []
	}

	// まず、全てのサブカテゴリーを初期化
	const subcategoryStatsMap = new Map()
	flatUnitListWithSubcategory.forEach((unitInfo) => {
		// unitInfo は {id, name, subcategoryName}
		if (!subcategoryStatsMap.has(unitInfo.subcategoryName)) {
			subcategoryStatsMap.set(unitInfo.subcategoryName, {
				subcategory: unitInfo.subcategoryName, // 表示用のサブカテゴリー名
				sessions: 0,
				correctCount: 0,
				totalHintsUsed: 0,
				uniqueProblemsAttempted: new Set()
				// totalProblemsInSubcategory は後で正確に計算
			})
		}
	})
	console.log('Subcategory Stats Map Initialized (Keys):', Array.from(subcategoryStatsMap.keys()))
	console.log('--- Subcategory Stats Map Initialized (Full) ---') // ★追加★
	subcategoryStatsMap.forEach((value, key) => console.log(`  ${key}:`, value)) // ★追加★
	console.log('------------------------------------------------') // ★追加★

	// 各サブカテゴリー内の総問題数を事前に計算しておく
	const totalProblemsInSubcategoryMap = new Map()
	flatUnitListWithSubcategory.forEach((unitInfo) => {
		const unitId = unitInfo.id // 例: 'algebra'
		const subcategoryName = unitInfo.subcategoryName // 例: 'テスト'

		let problemCountForThisUnit = 0
		for (const problemId in problemToUnitMap) {
			if (
				Object.prototype.hasOwnProperty.call(problemToUnitMap, problemId) &&
				problemToUnitMap[problemId] === unitId
			) {
				problemCountForThisUnit++
			}
		}
		// ★追加: totalProblemsInSubcategoryMap への加算ログ★
		console.log(
			`Unit: ${unitId} (Subcategory: ${subcategoryName}) has ${problemCountForThisUnit} problems. Adding to total.`
		)

		totalProblemsInSubcategoryMap.set(
			subcategoryName,
			(totalProblemsInSubcategoryMap.get(subcategoryName) || 0) + problemCountForThisUnit
		)
	})
	console.log(
		'Total Problems In Subcategory Map:',
		Array.from(totalProblemsInSubcategoryMap.entries())
	)

	userData.problemRecords.forEach((record) => {
		const unitId = problemToUnitMap[record.problemId] // 学習記録の問題IDから unit.id を取得

		console.log(`Processing Record: problemId=${record.problemId}, resolved unitId=${unitId}`)

		if (unitId) {
			const unitInfo = flatUnitListWithSubcategory.find((u) => u.id === unitId)

			console.log(`  -> unitInfo found:`, unitInfo)

			if (unitInfo && subcategoryStatsMap.has(unitInfo.subcategoryName)) {
				const subcategoryStat = subcategoryStatsMap.get(unitInfo.subcategoryName)
				subcategoryStat.sessions++
				if (record.isCorrect) {
					subcategoryStat.correctCount++
				}
				subcategoryStat.totalHintsUsed += record.hintsUsedCount || 0
				subcategoryStat.uniqueProblemsAttempted.add(record.problemId)
				console.log(
					`  -> Aggregated for subcategory: ${unitInfo.subcategoryName}, current sessions: ${subcategoryStat.sessions}`
				)
			} else {
				console.warn(
					`[Learning Stats] Problem ID "${record.problemId}" was resolved to unit ID "${unitId}", but this unit ID's subcategory ("${unitInfo ? unitInfo.subcategoryName : 'N/A'}") is not found in subcategoryStatsMap or unitInfo is null.`
				)
			}
		} else {
			console.warn(
				`[Learning Stats] Problem ID "${record.problemId}" not found in problem-to-unit map.`
			)
		}
	})

	// 集計結果を整形して stats.unitStats に代入
	stats.unitStats = Array.from(subcategoryStatsMap.values())
		.map((stat) => {
			console.log(`Final Unit Stat for ${stat.subcategory}:`, stat)
			const correctness =
				stat.sessions > 0 ? ((stat.correctCount / stat.sessions) * 100).toFixed(1) : '0.0'
			const hintsUsed = stat.sessions > 0 ? (stat.totalHintsUsed / stat.sessions).toFixed(1) : '0.0'
			return {
				unit: stat.subcategory, // サブカテゴリー名を表示
				sessions: stat.sessions,
				correctness: parseFloat(correctness),
				hintsUsed: parseFloat(hintsUsed)
			}
		})
		.sort((a, b) => a.unit.localeCompare(b.unit, 'ja'))

	// problemCorrectness の計算
	const problemMap = {}
	userData.problemRecords.forEach((record) => {
		if (!problemMap[record.problemId]) {
			problemMap[record.problemId] = { correctCount: 0, totalAttempts: 0 }
		}
		problemMap[record.problemId].totalAttempts++
		if (record.isCorrect) {
			problemMap[record.problemId].correctCount++
		}
	})

	stats.problemCorrectness = Object.keys(problemMap).map((probId) => {
		const pStat = problemMap[probId]
		return {
			problem: probId,
			correctness:
				pStat.totalAttempts > 0
					? parseFloat(((pStat.correctCount / pStat.totalAttempts) * 100).toFixed(0))
					: 0
		}
	})

	// 苦手問題ランキング
	stats.weakestProblems = [...stats.problemCorrectness]
		.sort((a, b) => a.correctness - b.correctness)
		.slice(0, 3)
		.map((p) => {
			const unitId = problemToUnitMap[p.problem]
			const unitInfo = unitId ? flatUnitListWithSubcategory.find((u) => u.id === unitId) : null

			let problemContent = p.problem // デフォルトはID
			// ここで問題のquestion[0].valueなどを取得して、より分かりやすい問題名に変換することも可能

			return {
				...p,
				unit: unitInfo ? unitInfo.subcategoryName : '不明', // サブカテゴリー名を追加
				problemContent: problemContent // 問題の冒頭文など
			}
		})

	// 進捗率の計算
	stats.progressRates = Array.from(subcategoryStatsMap.values())
		.map((subcategoryStat) => {
			const total = totalProblemsInSubcategoryMap.get(subcategoryStat.subcategory) || 0
			const covered = subcategoryStat.uniqueProblemsAttempted.size
			return {
				unit: subcategoryStat.subcategory, // サブカテゴリー名を表示
				covered: covered,
				total: total
			}
		})
		.sort((a, b) => a.unit.localeCompare(b.unit, 'ja'))

	// 達成バッジは仮のまま
	stats.achievements = ['初回ログイン', '学習開始']

	return stats
}

export async function GET({ locals }) {
	const userId = locals.user.id

	if (!userId) {
		return json({ message: '認証されていません。' }, { status: 401 })
	}

	try {
		if (!isProblemToUnitMapInitialized) {
			console.log('Problem-to-Unit Map not initialized yet. Initializing now...')
			await initializeProblemToUnitMap()
		}

		const userData = await loadUserData(userId)
		const stats = calculateStats(userData)
		return json(stats)
	} catch (error) {
		console.error(`Failed to load learning stats for user ${userId}:`, error)
		return json(
			{ message: '学習統計のロードに失敗しました。', details: error.message },
			{ status: 500 }
		)
	}
}
