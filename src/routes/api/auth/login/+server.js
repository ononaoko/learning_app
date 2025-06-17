// src/routes/api/auth/login/+server.js
import { json } from '@sveltejs/kit'
import db from '$lib/server/database' // データベースインスタンスをインポート

export async function POST({ request, cookies }) {
	// cookiesオブジェクトを受け取る
	try {
		const { nickname, pincode } = await request.json()

		if (!nickname || pincode.length !== 4) {
			return json({ message: 'ニックネームと4桁のピンコードを入力してください。' }, { status: 400 })
		}

		// ユーザーをデータベースから取得
		const user = db
			.prepare('SELECT id, nickname, pincode FROM users WHERE nickname = ?')
			.get(nickname)

		if (!user || user.pincode !== pincode) {
			return json({ message: 'ニックネームまたはピンコードが間違っています。' }, { status: 401 }) // Unauthorized
		}

		// ログイン成功
		// ここでユーザーIDをCookieに設定します
		cookies.set('user_id', user.id, {
			path: '/',
			httpOnly: true, // JavaScriptからアクセス不可にする
			secure: process.env.NODE_ENV === 'production', // HTTPSのみ (本番環境)
			maxAge: 60 * 60 * 24 * 7 // 1週間
		})
		cookies.set('nickname', user.nickname, {
			// ニックネームもCookieに保存 (UI表示用、安全ではない)
			path: '/',
			httpOnly: false, // JavaScriptからアクセス可能にする (UI表示用)
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
