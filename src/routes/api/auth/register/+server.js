// src/routes/api/auth/register/+server.js

import { json } from '@sveltejs/kit'
import redisClient, { generateId } from '$lib/server/database' // RedisクライアントとgenerateIdをインポート

export async function POST({ request, cookies }) {
	try {
		const { nickname, pincode } = await request.json()

		if (!nickname || pincode.length !== 4) {
			return json({ message: 'ニックネームと4桁のピンコードを入力してください。' }, { status: 400 })
		}

		// ニックネームの重複チェック (Redisのキーでチェック)
		const existingUserKey = `nickname:${nickname}`
		const existingUserId = await redisClient.get(existingUserKey)
		if (existingUserId) {
			return json({ message: 'このニックネームは既に使われています。' }, { status: 409 }) // Conflict
		}

		const userId = generateId() // generateIdを使用

		// ユーザーデータを保存
		const user = { id: userId, nickname, pincode }
		await redisClient.set(`users:${userId}`, user) // redisClientを使用
		await redisClient.set(existingUserKey, userId) // redisClientを使用

		// 全ニックネームリストのSetにニックネームを追加
		await redisClient.sadd('all_nicknames', nickname)

		// 登録成功時にCookieを設定する部分はそのまま
		cookies.set('user_id', userId, {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 7 // 1週間
		})
		cookies.set('nickname', nickname, {
			path: '/',
			httpOnly: false, // UI表示用
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 7
		})

		return json(
			{ message: 'ユーザー登録が完了しました。', userId: userId, nickname: nickname },
			{ status: 201 }
		)
	} catch (error) {
		console.error('ユーザー登録エラー:', error)
		return json({ message: 'ユーザー登録中にエラーが発生しました。' }, { status: 500 })
	}
}
