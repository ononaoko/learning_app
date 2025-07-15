// src/lib/server/user-data/userStore.js

import redisClient from '$lib/server/database'

/**
 * 指定されたユーザーのデータをデータベースから読み込む (Redisを利用)
 * @param {string} userId
 * @returns {object} ユーザーデータオブジェクト
 */
export async function loadUserData(userId) {
	// ★この関数が定義されていることを確認★
	try {
		// Redisからユーザーデータを取得。@upstash/redis が自動的にパースするため、JSON.parse は不要。
		const data = await redisClient.get(`user_data:${userId}`)

		if (data) {
			return data // data は既にオブジェクト
		} else {
			console.log(`[userStore] No user data found for ${userId}. Returning default.`)
			return {
				totalLearningSessions: 0,
				consecutiveLearningDays: 0,
				unitStats: [],
				problemRecords: []
			}
		}
	} catch (error) {
		console.error(`[userStore] Failed to load user data for ${userId} from Redis:`, error)
		throw error
	}
}

/**
 * 指定されたユーザーのデータをデータベースに保存する (Redisを利用)
 * @param {string} userId
 * @param {object} userData - 保存するユーザーデータオブジェクト
 */
export async function saveUserData(userId, userData) {
	try {
		const jsonData = JSON.stringify(userData)
		await redisClient.set(`user_data:${userId}`, jsonData)
		console.log(`[userStore] User data for ${userId} saved/updated successfully in Redis.`)
	} catch (error) {
		console.error(`[userStore] Failed to save user data for ${userId} to Redis:`, error)
		throw error
	}
}
