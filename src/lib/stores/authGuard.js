// $lib/stores/authGuard.js
import { writable } from 'svelte/store'
import { goto } from '$app/navigation'
import { browser } from '$app/environment'
import { isLoggedIn, nickname } from '$lib/authStore.js'

// 認証チェックの状態管理
const createAuthGuard = () => {
	const { subscribe, set, update } = writable({
		isChecking: false,
		lastCheck: null,
		checkInterval: null
	})

	return {
		subscribe,

		// ログイン情報をチェック
		checkAuthStatus: async () => {
			if (!browser) return true

			try {
				const response = await fetch('/api/auth/verify', {
					method: 'GET',
					credentials: 'include'
				})

				if (response.ok) {
					const data = await response.json()
					if (data.isValid) {
						// ログイン情報が有効
						isLoggedIn.set(true)
						nickname.set(data.nickname || '')
						return true
					} else {
						// ログイン情報が無効
						await authGuard.logout()
						return false
					}
				} else {
					// サーバーエラーまたは認証失敗
					await authGuard.logout()
					return false
				}
			} catch (error) {
				console.error('認証チェックエラー:', error)
				// ネットワークエラーの場合は現状維持
				return null
			}
		},

		// 定期的な認証チェックを開始
		startPeriodicCheck: (intervalMinutes = 5) => {
			if (!browser) return

			update((state) => {
				// 既存のインターバルをクリア
				if (state.checkInterval) {
					clearInterval(state.checkInterval)
				}

				// 新しいインターバルを設定
				const intervalId = setInterval(
					async () => {
						console.log('定期認証チェック実行中...')
						const isValid = await authGuard.checkAuthStatus()
						if (isValid === false) {
							console.log('認証が無効になりました。ログイン画面に遷移します。')
						}
					},
					intervalMinutes * 60 * 1000
				)

				return {
					...state,
					checkInterval: intervalId,
					lastCheck: new Date()
				}
			})
		},

		// 定期チェックを停止
		stopPeriodicCheck: () => {
			update((state) => {
				if (state.checkInterval) {
					clearInterval(state.checkInterval)
				}
				return {
					...state,
					checkInterval: null
				}
			})
		},

		// ページ可視化時の認証チェック
		checkOnVisibilityChange: () => {
			if (!browser) return

			const handleVisibilityChange = async () => {
				if (!document.hidden) {
					console.log('ページが表示されました。認証チェック実行中...')
					const isValid = await authGuard.checkAuthStatus()
					if (isValid === false) {
						console.log('認証が無効になりました。ログイン画面に遷移します。')
					}
				}
			}

			document.addEventListener('visibilitychange', handleVisibilityChange)

			// クリーンアップ関数を返す
			return () => {
				document.removeEventListener('visibilitychange', handleVisibilityChange)
			}
		},

		// ログアウト処理
		logout: async () => {
			try {
				// サーバーサイドのログアウトAPIを呼ぶ
				await fetch('/api/auth/logout', {
					method: 'POST',
					credentials: 'include'
				})
			} catch (error) {
				console.error('ログアウトAPIエラー:', error)
			} finally {
				// クライアントサイドの状態をクリア
				isLoggedIn.set(false)
				nickname.set('')

				// Cookieを削除
				if (browser) {
					document.cookie = 'user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
					document.cookie = 'nickname=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
					document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
				}

				// ログイン画面に遷移
				goto('/')
			}
		},

		// 手動での認証チェック（ページ遷移時など）
		verifyAndRedirect: async (currentPath = '') => {
			const isValid = await authGuard.checkAuthStatus()

			if (isValid === false) {
				console.log(`認証が無効です。${currentPath}からログイン画面に遷移します。`)
				return false
			}

			return isValid
		}
	}
}

export const authGuard = createAuthGuard()
