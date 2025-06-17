// src/routes/api/learning-record/+server.js
import { json } from '@sveltejs/kit'
import { loadUserData, saveUserData } from '$lib/server/user-data/userStore'

// POSTリクエストを受け付ける
export async function POST({ request, locals }) {
	try {
		// リクエストボディから学習記録データを取得
		const record = await request.json()
		// ★追加: 受け取ったrecordオブジェクト全体をログ出力★
		console.log('Received record from client:', record)

		const { problemId, isCorrect, hintsUsedCount, duration, problemCorrectnessAtAttempt } = record // ★修正: userId を削除★
		const userId = locals.user.id // ★修正: locals から userId を取得★
		if (!userId) {
			// 認証されていない場合
			return json({ message: 'Authentication required' }, { status: 401 })
		}

		if (!userId || !problemId || typeof isCorrect === 'undefined') {
			console.warn('Bad Request: Missing required fields in learning record:', {
				userId,
				problemId,
				isCorrect
			})
			return json({ message: 'Missing required fields' }, { status: 400 })
		}

		// ユーザーデータをロード
		const userData = await loadUserData(userId)

		// 新しい学習記録を履歴に追加
		userData.problemRecords.push({
			problemId,
			isCorrect,
			hintsUsedCount: hintsUsedCount || 0,
			duration: duration || 0, // 秒単位など
			timestamp: new Date().toISOString(),
			problemCorrectnessAtAttempt: problemCorrectnessAtAttempt // ★追加: 新しいフィールドを保存★
		})

		// 累計学習回数を更新 (仮のロジック: 毎回増加)
		userData.totalLearningSessions = (userData.totalLearningSessions || 0) + 1

		// TODO: 連続学習日数のロジックはより複雑なので後で実装

		// 更新されたデータを保存
		await saveUserData(userId, userData)

		return json({ message: 'Learning record saved successfully' }, { status: 200 })
	} catch (error) {
		console.error('Error saving learning record:', error)
		return json({ message: 'Failed to save learning record' }, { status: 500 })
	}
}
