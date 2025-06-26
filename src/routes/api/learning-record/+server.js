// src/routes/api/learning-record/+server.js
import { json } from '@sveltejs/kit'
import redisClient, { generateId } from '$lib/server/database' // RedisクライアントとgenerateIdをインポート

export async function POST({ request }) {
	try {
		const record = await request.json()
		const { userId, problemId, isCorrect, hintsUsedCount, duration } = record

		if (!userId || !problemId || typeof isCorrect === 'undefined') {
			return json({ message: 'Missing required fields' }, { status: 400 })
		}

		const recordId = generateId() // 学習記録にもユニークIDを付与

		const newRecord = {
			id: recordId,
			userId,
			problemId,
			isCorrect,
			hintsUsedCount: hintsUsedCount || 0,
			durationSeconds: duration || 0,
			timestamp: new Date().toISOString()
		}

		// Redisでは、"learning_records:<userId>:<recordId>" のようなキーで保存
		await redisClient.set(`learning_records:${userId}:${recordId}`, newRecord)

		// 累計学習回数を更新 (ユーザーデータの一部として管理)
		const userData = await redisClient.get(`users:${userId}`)
		if (userData) {
			userData.totalLearningSessions = (userData.totalLearningSessions || 0) + 1
			await redisClient.set(`users:${userId}`, userData)
		}

		return json({ message: 'Learning record saved successfully' }, { status: 200 })
	} catch (error) {
		console.error('Error saving learning record:', error)
		return json({ message: 'Failed to save learning record' }, { status: 500 })
	}
}
