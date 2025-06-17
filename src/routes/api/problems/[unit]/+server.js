import { json } from '@sveltejs/kit'
import { loadProblems as loadAllProblems } from '$lib/server/problems-data/problemsStore' // ★修正: problemsStore をインポート★

// サーバー起動時に一度だけ全ての問題をロードしてキャッシュする（パフォーマンスのため）
// または、必要に応じてリクエストごとにロードすることも可能だが、キャッシュ推奨
let allProblemsByUnit = {}
let isProblemsLoaded = false

async function initializeProblemsCache() {
	if (isProblemsLoaded) return
	try {
		allProblemsByUnit = await loadAllProblems()
		isProblemsLoaded = true
		console.log('[API Problems] All problems loaded and cached.')
	} catch (error) {
		console.error('[API Problems] Failed to load all problems:', error)
		allProblemsByUnit = {} // 失敗しても空にしておく
	}
}
initializeProblemsCache() // サーバー起動時に初期化

export async function GET({ params }) {
	const { unit } = params
	console.log('API called with unit:', unit) // デバッグ用ログ
	// ★修正: 問題キャッシュが初期化されているか確認し、必要なら待機する★
	if (!isProblemsLoaded) {
		console.log('[API Problems] Cache not initialized yet. Initializing now...')
		await initializeProblemsCache()
	}

	const data = allProblemsByUnit[unit] // ★修正: キャッシュからデータを取得★
	if (data) {
		console.log('Returning data:', data) // デバッグ用ログ
		return json(data)
	}
	console.log(`Unit "${unit}" not found`) // デバッグ用ログ
	return new Response(`Unit "${unit}" not found`, { status: 404 })
}
