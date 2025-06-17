// src/routes/api/auth/logout/+server.js
import { json } from '@sveltejs/kit'

export async function POST({ cookies }) {
	// ユーザーIDとニックネームのCookieを削除する
	cookies.delete('user_id', { path: '/' })
	cookies.delete('nickname', { path: '/' })

	return json({ message: 'ログアウトしました。' }, { status: 200 })
}
