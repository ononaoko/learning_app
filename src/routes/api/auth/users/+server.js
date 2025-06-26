// src/routes/api/auth/users/+server.js
import { json } from '@sveltejs/kit'
import redisClient from '$lib/server/database' // Redisクライアントをインポート

export async function GET() {
	try {
		// RedisのSetから全ニックネームを取得
		const registeredNicknames = await redisClient.smembers('all_nicknames')

		// Redisから取得したニックネームリストは、すでにニックネーム自体なので、
		// ユーザーデータを再取得する必要はありません。

		return json({ nicknames: registeredNicknames }, { status: 200 })
	} catch (error) {
		console.error('登録済みユーザーニックネームの取得エラー:', error)
		console.error('Error details:', error.message, error.stack) // 詳細エラーログ
		return json(
			{ message: 'ユーザーニックネームの取得中にエラーが発生しました。' },
			{ status: 500 }
		)
	}
}
