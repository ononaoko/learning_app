// src/routes/api/auth/users/+server.js
import { json } from '@sveltejs/kit'
import db from '$lib/server/database' // データベースインスタンスをインポート

export async function GET() {
	try {
		const users = db.prepare('SELECT nickname FROM users').all()
		const nicknames = users.map((user) => user.nickname)
		return json({ nicknames }, { status: 200 })
	} catch (error) {
		console.error('登録済みユーザーニックネームの取得エラー:', error)
		return json(
			{ message: 'ユーザーニックネームの取得中にエラーが発生しました。' },
			{ status: 500 }
		)
	}
}
