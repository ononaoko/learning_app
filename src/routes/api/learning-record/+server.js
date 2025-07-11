// src/routes/api/learning-record/+server.js

import { json } from '@sveltejs/kit'
import redisClient, { generateId } from '$lib/server/database'

export async function POST({ request }) {
	try {
		const record = await request.json()
		const { userId, problemId, isCorrect, hintsUsedCount, duration } = record

		if (!userId || !problemId || typeof isCorrect === 'undefined') {
			return json({ message: 'Missing required fields' }, { status: 400 })
		}

		const recordId = generateId()

		const newRecord = {
			id: recordId,
			userId,
			problemId,
			isCorrect: !!isCorrect, // boolean に強制変換
			hintsUsedCount: hintsUsedCount || 0,
			durationSeconds: duration || 0,
			timestamp: new Date().toISOString()
		}

		// 個別の学習記録をRedisに保存 (これはOK)
		await redisClient.set(`learning_records:${userId}:${recordId}`, JSON.stringify(newRecord))

		// ユーザーデータを取得
		let userData = await redisClient.get(`user_data:${userId}`)

		if (userData) {
			// 既存のユーザーデータを更新
			userData.totalLearningSessions = (userData.totalLearningSessions || 0) + 1
			// ★ここを修正/追加: problemRecords に新しい記録を追加する★
			userData.problemRecords = userData.problemRecords || []
			userData.problemRecords.push(newRecord) // 新しい記録を追加
			await redisClient.set(`user_data:${userId}`, JSON.stringify(userData))
		} else {
			// 新しいユーザーデータを作成
			const initialUserData = {
				totalLearningSessions: 1,
				consecutiveLearningDays: 0,
				unitStats: [], // 必要に応じて初期化
				// ★ここを修正/追加: 新しいユーザーデータの作成時にも problemRecords を初期化し、最初の記録を追加する★
				problemRecords: [newRecord] // 最初の記録を追加
			}
			await redisClient.set(`user_data:${userId}`, JSON.stringify(initialUserData))
		}

		return json({ message: 'Learning record saved successfully' }, { status: 200 })
	} catch (error) {
		console.error('Error saving learning record:', error)
		return json({ message: 'Failed to save learning record' }, { status: 500 })
	}
}
