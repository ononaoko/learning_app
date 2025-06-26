// src/routes/api/auth/login/+server.js
import { json } from '@sveltejs/kit'
import redisClient from '$lib/server/database' // Redisクライアントをインポート

export async function POST({ request, cookies }) {
	try {
		const { nickname, pincode } = await request.json()

		if (!nickname || pincode.length !== 4) {
			return json({ message: 'ニックネームと4桁のピンコードを入力してください。' }, { status: 400 })
		}

		// ニックネームからユーザーIDを取得
		const userId = await redisClient.get(`nickname:${nickname}`)
		if (!userId) {
			return json({ message: 'ニックネームまたはピンコードが間違っています。' }, { status: 401 }) // Unauthorized
		}

		// ユーザーデータを取得
		const user = await redisClient.get(`users:${userId}`)

		if (!user || user.pincode !== pincode) {
			return json({ message: 'ニックネームまたはピンコードが間違っています。' }, { status: 401 }) // Unauthorized
		}

		// ログイン時にも全ニックネームリストのSetにニックネームを追加（冪等性を持つので安全）
		await redisClient.sadd('all_nicknames', nickname)

		// ログイン成功時のCookie設定はそのまま
		cookies.set('user_id', user.id, {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 7 // 1週間
		})
		cookies.set('nickname', user.nickname, {
			path: '/',
			httpOnly: false, // UI表示用
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 7
		})

		return json(
			{ message: 'ログイン成功しました。', userId: user.id, nickname: user.nickname },
			{ status: 200 }
		)
	} catch (error) {
		console.error('ログインエラー:', error)
		return json({ message: 'ログイン中にエラーが発生しました。' }, { status: 500 })
	}
}
