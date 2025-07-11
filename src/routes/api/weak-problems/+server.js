// src/routes/api/weak-problems/+server.js
import { json } from '@sveltejs/kit'
import { loadUserData } from '$lib/server/user-data/userStore'

// 古いインポートは削除またはコメントアウト
// import { loadProblems as loadAllProblems } from '$lib/server/problems-data/problemsStore';

// 新しい problemsByUnit オブジェクトをインポートします
import { problemsByUnit } from '$lib/problems-data/problemsStore' // ★修正: 新しいパスとオブジェクト名を指定★

import { units as allUnits } from '$lib/data/units'

// problemsByUnit が同期的にロードされるため、これらの変数は直接初期化できます。
// problemToUnitMap は、全ての JSON データがロードされた後に一度だけ構築されます。
let problemToUnitMap = {}
// isProblemToUnitMapInitialized は不要になりますが、ロジック維持のため残す場合は、
// 初期化時にtrueに設定するロジックを修正します。
// ここでは、GET リクエスト時にマップが構築済みであることを確認するロジックは残します。
let isProblemToUnitMapInitialized = false

// units.js から全てのユニットIDと名前をフラットなリストとして取得するヘルパー関数 (変更なし)
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
const flatUnitList = getFlatUnits(allUnits) // 問題の表示名を解決するために必要 (変更なし)

// 問題IDから単元IDへのマップを初期化する関数
// ★修正: loadAllProblems() の呼び出しを problemsByUnit の直接利用に置き換える★
async function initializeProblemToUnitMap() {
	if (isProblemToUnitMapInitialized) return
	try {
		// problemsDataByUnit はすでに problemsByUnit オブジェクトそのものになります
		const problemsDataByUnit = problemsByUnit // ★修正: problemsByUnit を直接参照★

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
// サーバー起動時に初期化 (そのまま残す。非同期処理を含むため)
initializeProblemToUnitMap()

/**
 * ユーザーの学習記録から最も正答率が低い問題をN問取得する (変更なし)
 * @param {string} userId
 * @param {number} limit - 取得する問題数
 * @returns {Promise<{ problems: Array<Object>, averageCorrectness: number }>} 弱点問題の配列と平均正答率
 */
async function getWeakestProblems(userId, limit = 5) {
	const userData = await loadUserData(userId)
	const problemRecords = userData.problemRecords || []

	console.log(`[DEBUG Weak] User ${userId} has ${problemRecords.length} problem records.`)
	problemRecords.forEach((record, index) => {
		console.log(
			`[DEBUG Weak] Record ${index}: problemId=${record.problemId}, isCorrect=${record.isCorrect}, hintsUsed=${record.hintsUsedCount}, correctnessAtAttempt=${record.problemCorrectnessAtAttempt}`
		)
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
		if (record.isCorrect === true || record.isCorrect === 1) {
			stats.correctCount++
		}
		console.log(
			`[DEBUG Weak] Aggregating ${record.problemId}: totalAttempts=${stats.totalAttempts}, correctCount=${stats.correctCount}`
		)
	})
	console.log(`[DEBUG Weak] Final problemStats map:`, Array.from(problemStats.entries()))

	const calculatedWeakness = Array.from(problemStats.entries()).map(([problemId, stats]) => {
		const correctness = stats.totalAttempts > 0 ? stats.correctCount / stats.totalAttempts : 1.0
		return {
			problemId,
			correctness: parseFloat((correctness * 100).toFixed(1)),
			totalAttempts: stats.totalAttempts
		}
	})
	console.log(`[DEBUG Weak] Calculated Weakness (before sort/slice):`, calculatedWeakness)

	calculatedWeakness.sort((a, b) => {
		if (a.correctness === b.correctness) {
			return Math.random() - 0.5
		}
		return a.correctness - b.correctness
	})

	const weakestProblemIds = calculatedWeakness.slice(0, limit).map((p) => p.problemId)

	// 弱点問題の実際のデータを problemsStore からロード
	// ★修正: loadAllProblems() を呼び出す代わりに problemsByUnit を直接参照★
	const problemsDataByUnit = problemsByUnit // ★修正: problemsByUnit を直接参照★

	const weakestProblemsData = []

	for (const problemId of weakestProblemIds) {
		const unitId = problemToUnitMap[problemId]
		if (unitId && problemsDataByUnit[unitId]) {
			const problem = problemsDataByUnit[unitId].find((p) => p.id === problemId)
			if (problem) {
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

	const orderedWeakestProblems = weakestProblemIds
		.map((id) => weakestProblemsData.find((p) => p.id === id))
		.filter(Boolean)

	let totalCorrectnessSum = 0
	let totalProblemsCount = 0

	orderedWeakestProblems.forEach((problem) => {
		totalCorrectnessSum += problem.correctness
		totalProblemsCount++
	})

	const averageCorrectness = totalProblemsCount > 0 ? totalCorrectnessSum / totalProblemsCount : 0

	return {
		problems: orderedWeakestProblems,
		averageCorrectness: parseFloat(averageCorrectness.toFixed(1))
	}
}

// GETリクエストを処理 (変更なし)
export async function GET({ locals, url }) {
	const userId = locals.user.id
	const limit = parseInt(url.searchParams.get('limit') || '5', 10)

	if (!userId) {
		return json({ message: '認証されていません。' }, { status: 401 })
	}

	try {
		// initializeProblemToUnitMap() は非同期なので、GETリクエストごとに await するのはパフォーマンス的に良くありません。
		// SvelteKitのサーバーが起動した際に一度だけ実行されるように、ファイルのトップレベルで呼び出しておくのが理想です。
		// ただし、初回リクエスト時にマップが未初期化の場合に備えて await しておくのは安全策としてはアリです。
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
