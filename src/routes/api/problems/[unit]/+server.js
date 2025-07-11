// src/routes/api/problems/[unit]/+server.js
import { json } from '@sveltejs/kit';
// 古いインポートは削除またはコメントアウト
// import { loadProblems as loadAllProblems } from '$lib/server/problems-data/problemsStore';

// 新しい problemsByUnit オブジェクトをインポートします
// problemsStore.js が src/lib/problems-data/ にあると仮定します
import { problemsByUnit } from '$lib/problems-data/problemsStore';

// サーバー起動時に一度だけ全ての問題をロードしてキャッシュする（パフォーマンスのため）
// ★修正: problemsByUnit はすでに同期的にロードされているため、initializeProblemsCache は不要です★
// let allProblemsByUnit = {}; // 不要
// let isProblemsLoaded = false; // 不要

// async function initializeProblemsCache() { // この関数全体が不要
//     if (isProblemsLoaded) return;
//     try {
//         allProblemsByUnit = await loadAllProblems();
//         isProblemsLoaded = true;
//         console.log('[API Problems] All problems loaded and cached.');
//     } catch (error) {
//         console.error('[API Problems] Failed to load all problems:', error);
//         allProblemsByUnit = {};
//     }
// }
// initializeProblemsCache(); // 不要

export async function GET({ params }) {
    const { unit } = params;
    console.log('API called with unit:', unit); // デバッグ用ログ

    // ★修正: problemsByUnit はすでにロード済みなので、await や initializeCache は不要です★
    // if (!isProblemsLoaded) { // 不要
    //     console.log('[API Problems] Cache not initialized yet. Initializing now...'); // 不要
    //     await initializeProblemsCache(); // 不要
    // }

    // problemsByUnit オブジェクトから直接データを取得します
    const data = problemsByUnit[unit]; // ★修正: problemsByUnit からデータを直接取得★

    if (data) {
        console.log('Returning data:', data); // デバッグ用ログ
        return json(data);
    }

    console.log(`Unit "${unit}" not found`); // デバッグ用ログ
    return new Response(`Unit "${unit}" not found`, { status: 404 });
}