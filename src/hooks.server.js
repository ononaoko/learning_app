// src/hooks.server.js
import { redirect } from '@sveltejs/kit'
import { nickname as nicknameStore } from '$lib/authStore' // nicknameストアをインポート

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	// リクエストからCookieを読み取る
	const userId = event.cookies.get('user_id')
	const nickname = event.cookies.get('nickname')

	// event.locals にユーザー情報を設定
	// これにより、+server.js や +page.server.js、他のフックでユーザー情報にアクセスできる
	event.locals.user = {
		id: userId,
		nickname: nickname,
		isLoggedIn: !!userId // userIdがあればログイン済みと判断
	}

	// 認証が必要なルートを保護する (例: /dashboard)
	// ページコンポーネント (.svelte) でのロード関数は直接アクセスできないため、
	// +page.server.js や +server.js での認証チェックも必要になる
	if (!event.locals.user.isLoggedIn && event.url.pathname.startsWith('/dashboard')) {
		// ログインページへのリダイレクト
		throw redirect(302, '/login')
	}

	// クライアントサイドの authStore にログイン状態を同期
	// これは+page.svelteなどで onMount 時に行うのが一般的だが、
	// SSR時の初期状態を合わせるためにhooksで行うこともできる（ただし、非推奨の場合もある）
	// 厳密には、+layout.svelte の load 関数で isLoggedin/nickname ストアを初期化するのがSvelteKitのやり方
	// ここではサーバーサイドからクライアントサイドへのデータ渡しの一例としてevent.locals.userを設定

	const response = await resolve(event)

	return response
}
