// src/routes/api/weak-problems/+server.js
import { json } from '@sveltejs/kit'
import { loadUserData } from '$lib/server/user-data/userStore'
import { loadProblems as loadAllProblems } from '$lib/server/problems-data/problemsStore'
import { units as allUnits } from '$lib/data/units'

// units.js や flatUnitListWithSubcategory は直接必要ないが、
// problemToUnitMap を初期化するために必要なので、learning-stats の初期化ロジックを再利用する。
// これらの変数はサーバーのライフサイクル中に一度だけ初期化される
let problemToUnitMap = {}
let isProblemToUnitMapInitialized = false

// units.js から全てのユニットIDと名前をフラットなリストとして取得するヘルパー関数 (再利用)
function getFlatUnits(unitList) {
	let flatUnits = []
	unitList.forEach((item) => {
		if (item.type === 'unit') {
			flatUnits.push({ id: item.id, name: item.name })
		} else if (item.sub_units) {
			flatUnits = flatUnits.concat(getFlatUnits(item.sub_units))
		}
	})
	return flatUnits
}
const flatUnitList = getFlatUnits(allUnits) // 問題の表示名を解決するために必要

// 問題IDから単元IDへのマップを初期化する関数 (再利用)
async function initializeProblemToUnitMap() {
	if (isProblemToUnitMapInitialized) return
	try {
		const problemsDataByUnit = await loadAllProblems()
		problemToUnitMap = {}
		for (const unitId in problemsDataByUnit) {
			if (Object.prototype.hasOwnProperty.call(problemsDataByUnit, unitId)) {
				problemsDataByUnit[unitId].forEach((problem) => {
					if (problem.id) {
						problemToUnitMap[problem.id] = unitId
					}
				})
			}
		}
		isProblemToUnitMapInitialized = true
		console.log('[Weak Problems API] Problem-to-Unit Map initialized successfully.')
	} catch (error) {
		console.error('[Weak Problems API] Failed to initialize Problem-to-Unit Map:', error)
		problemToUnitMap = {}
	}
}
initializeProblemToUnitMap() // サーバー起動時に初期化

/**
 * ユーザーの学習記録から最も正答率が低い問題をN問取得する
 * @param {string} userId
 * @param {number} limit - 取得する問題数
 * @returns {Promise<{ problems: Array<Object>, averageCorrectness: number }>} 弱点問題の配列と平均正答率
 */
async function getWeakestProblems(userId, limit = 5) {
	const userData = await loadUserData(userId)
	const problemRecords = userData.problemRecords || []

	console.log(`[DEBUG Weak] User ${userId} has ${problemRecords.length} problem records.`) // ★追加★
	problemRecords.forEach((record, index) => {
		// ★追加★
		console.log(
			`[DEBUG Weak] Record ${index}: problemId=${record.problemId}, isCorrect=${record.isCorrect}, hintsUsed=${record.hintsUsedCount}, correctnessAtAttempt=${record.problemCorrectnessAtAttempt}`
		) // ★追加★
	})

	if (problemRecords.length === 0) {
		return { problems: [], averageCorrectness: 0 } // 記録がない場合は空と0を返す
	}

	const problemStats = new Map() // problemId -> { correctCount, totalAttempts }

	problemRecords.forEach((record) => {
		if (!problemStats.has(record.problemId)) {
			problemStats.set(record.problemId, { correctCount: 0, totalAttempts: 0 })
		}
		const stats = problemStats.get(record.problemId)
		stats.totalAttempts++
		// ★修正: isCorrect が真偽値か数値かを確認し、正しくカウント★
		if (record.isCorrect === true || record.isCorrect === 1) {
			// isCorrect が true または 1 の場合にカウント
			stats.correctCount++
		}
		console.log(
			`[DEBUG Weak] Aggregating ${record.problemId}: totalAttempts=${stats.totalAttempts}, correctCount=${stats.correctCount}`
		) // ★追加★
	})
	console.log(`[DEBUG Weak] Final problemStats map:`, Array.from(problemStats.entries())) // ★追加★

	const calculatedWeakness = Array.from(problemStats.entries()).map(([problemId, stats]) => {
		const correctness = stats.totalAttempts > 0 ? stats.correctCount / stats.totalAttempts : 1.0
		return {
			problemId,
			correctness: parseFloat((correctness * 100).toFixed(1)),
			totalAttempts: stats.totalAttempts
		} // 正答率をパーセントで返す
	})
	console.log(`[DEBUG Weak] Calculated Weakness (before sort/slice):`, calculatedWeakness) // ★追加★

	calculatedWeakness.sort((a, b) => {
		if (a.correctness === b.correctness) {
			// 正答率が同じ場合はランダム
			return Math.random() - 0.5
		}
		return a.correctness - b.correctness // 正答率が低い方を優先
	})

	// 弱点問題のIDリストを取得
	const weakestProblemIds = calculatedWeakness.slice(0, limit).map((p) => p.problemId)

	// 弱点問題の実際のデータを problemsStore からロード
	const problemsDataByUnit = await loadAllProblems()
	const weakestProblemsData = []

	for (const problemId of weakestProblemIds) {
		const unitId = problemToUnitMap[problemId]
		if (unitId && problemsDataByUnit[unitId]) {
			const problem = problemsDataByUnit[unitId].find((p) => p.id === problemId)
			if (problem) {
				// 問題データに正答率を追加してプッシュ
				const statsForThisProblem = problemStats.get(problem.id)
				const problemCorrectnessPercentage = statsForThisProblem
					? parseFloat(
							(
								(statsForThisProblem.correctCount / statsForThisProblem.totalAttempts) *
								100
							).toFixed(1)
						)
					: 0
				weakestProblemsData.push({ ...problem, correctness: problemCorrectnessPercentage })
			} else {
				console.warn(
					`[Weak Problems API] Problem data not found for ID: ${problemId} in unit: ${unitId}`
				)
			}
		} else {
			console.warn(`[Weak Problems API] Unit ID not found for Problem ID: ${problemId}`)
		}
	}

	// 取得した問題の順序を弱点順に維持するため、weakestProblemIdsの順序で並び替える
	const orderedWeakestProblems = weakestProblemIds
		.map((id) => weakestProblemsData.find((p) => p.id === id))
		.filter(Boolean) // undefinedを除外

	// ★弱点問題の平均正答率を計算するロジックをここに挿入★
	let totalCorrectnessSum = 0
	let totalProblemsCount = 0

	// `orderedWeakestProblems` は既に `correctness` プロパティ（パーセント値）を持っている
	orderedWeakestProblems.forEach((problem) => {
		// problem.correctness は既にパーセント値なので、そのまま加算
		totalCorrectnessSum += problem.correctness
		totalProblemsCount++
	})

	const averageCorrectness = totalProblemsCount > 0 ? totalCorrectnessSum / totalProblemsCount : 0

	return {
		problems: orderedWeakestProblems,
		averageCorrectness: parseFloat(averageCorrectness.toFixed(1))
	}
}

// GETリクエストを処理
export async function GET({ locals, url }) {
	const userId = locals.user.id
	const limit = parseInt(url.searchParams.get('limit') || '5', 10) // クエリパラメータで問題数を指定可能

	if (!userId) {
		return json({ message: '認証されていません。' }, { status: 401 })
	}

	try {
		if (!isProblemToUnitMapInitialized) {
			console.log('[Weak Problems API] Map not initialized. Initializing...')
			await initializeProblemToUnitMap()
		}
		const { problems, averageCorrectness } = await getWeakestProblems(userId, limit)
		return json({ problems, averageCorrectness }, { status: 200 })
	} catch (error) {
		console.error('[Weak Problems API] Error fetching weakest problems:', error)
		return json(
			{ message: '弱点問題の取得に失敗しました。', details: error.message },
			{ status: 500 }
		)
	}
}
