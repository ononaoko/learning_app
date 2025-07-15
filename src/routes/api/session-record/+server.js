import { json } from '@sveltejs/kit'
// ★ここを修正します:
// import { redis } from '$lib/server/redis'; // 古い（削除）
import redisClient from '$lib/server/database' // 新しい（追加）

/**
 * @typedef {Object} SessionRecordPayload
 * @property {string} userId - ユーザーID
 * @property {string} mode - 学習モード (例: 'normal-mode', 'ebbinghaus-mode', 'review-mode')
 * @property {string} unitId - 学習した単元ID (normal-modeの場合)
 * @property {number} duration - セッションの合計学習時間 (秒)
 * @property {string} timestamp - 記録された日時 (ISO 8601形式)
 */

/**
 * POST /api/session-record
 * セッション全体の学習記録を保存
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function POST({ request }) {
	try {
		/** @type {SessionRecordPayload} */
		const { userId, mode, unitId, duration, timestamp } = await request.json()

		// 必須データのバリデーション
		if (!userId || !mode || duration === undefined || duration === null || !timestamp) {
			return json({ error: 'Missing required session record data' }, { status: 400 })
		}

		// Redisに保存するためのキーを生成
		const datePart = timestamp.split('T')[0]
		const sessionRecordKey = `user_session_records:${userId}:${datePart}`

		// 保存するセッション記録データ
		const sessionData = {
			mode,
			unitId: unitId || 'N/A',
			duration,
			timestamp
		}

		// ★ここを修正します:
		// await redis.lpush(sessionRecordKey, JSON.stringify(sessionData)); // 古い
		await redisClient.lpush(sessionRecordKey, JSON.stringify(sessionData)) // 新しい

		console.log('Session record saved successfully:', sessionData)
		return json({ message: 'Session record saved successfully' }, { status: 200 })
	} catch (error) {
		console.error('Error saving session record:', error)
		return json({ error: 'Failed to save session record' }, { status: 500 })
	}
}
