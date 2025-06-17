// src/routes/api/auth/register/+server.js

import { json } from '@sveltejs/kit'
import db from '$lib/server/database'
import { v4 as uuidv4 } from 'uuid'

// request オブジェクトに cookies オブジェクトが追加されるように変更
export async function POST({ request, cookies }) {
	try {
		const { nickname, pincode } = await request.json()

		if (!nickname || pincode.length !== 4) {
			return json({ message: 'ニックネームと4桁のピンコードを入力してください。' }, { status: 400 })
		}

		const existingUser = db.prepare('SELECT id FROM users WHERE nickname = ?').get(nickname)
		if (existingUser) {
			return json({ message: 'このニックネームは既に使われています。' }, { status: 409 })
		}

		const userId = uuidv4()

		db.prepare('INSERT INTO users (id, nickname, pincode) VALUES (?, ?, ?)').run(
			userId,
			nickname,
			pincode
		)

		// ★追加: 新規登録成功時にCookieを設定する★
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
