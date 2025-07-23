// src/routes/api/daily-study-stats/+server.js

import { json } from '@sveltejs/kit'
import redis from '$lib/server/database'

/**
 * 日別学習統計を取得するAPI
 */
export async function GET({ url }) {
	const userId = url.searchParams.get('userId')
	const days = parseInt(url.searchParams.get('days') || '7', 10) // デフォルト7日間

	console.log('=== 日別学習統計取得開始 ===')
	console.log('受信したuserId:', userId)
	console.log('受信したdays:', days)

	if (!userId || userId === 'null' || userId === 'undefined') {
		console.error('Invalid userId:', userId)
		return new Response('Valid User ID is required', { status: 400 })
	}

	try {
		console.log('=== 日別学習統計取得開始 ===')
		console.log('userId:', userId)
		console.log('取得日数:', days)

		const dailyStatsKey = `user:daily_stats:${userId}`
		const today = new Date()
		const dailyStats = []

		// 指定日数分の統計データを取得
		for (let i = days - 1; i >= 0; i--) {
			try {
				const date = new Date(today)
				date.setDate(today.getDate() - i)
				const dateString = date.toISOString().split('T')[0] // YYYY-MM-DD

				// その日の統計データを取得
				const dayData = await redis.hgetall(`${dailyStatsKey}:${dateString}`)

				console.log(`${dateString} のデータ:`, dayData)

				// dayDataがnullまたは空オブジェクトかチェック
				const hasData = dayData && typeof dayData === 'object' && Object.keys(dayData).length > 0

				const stats = {
					date: dateString,
					dateFormatted: date.toLocaleDateString('ja-JP', {
						month: 'numeric',
						day: 'numeric'
					}),
					problemsSolved: hasData ? parseInt(dayData.problemsSolved || '0', 10) : 0,
					studyTimeMinutes: hasData ? parseInt(dayData.studyTimeMinutes || '0', 10) : 0,
					sessionsCount: hasData ? parseInt(dayData.sessionsCount || '0', 10) : 0,
					unitsCompleted: hasData ? parseInt(dayData.unitsCompleted || '0', 10) : 0,
					correctAnswers: hasData ? parseInt(dayData.correctAnswers || '0', 10) : 0,
					averageAccuracy:
						hasData && dayData.averageAccuracy ? parseFloat(dayData.averageAccuracy) : 0
				}

				dailyStats.push(stats)
			} catch (error) {
				console.error(`${dateString} のデータ取得でエラー:`, error)

				// エラーが発生した場合はデフォルト値で統計を作成
				const date = new Date(today)
				date.setDate(today.getDate() - i)
				const dateString = date.toISOString().split('T')[0]

				const defaultStats = {
					date: dateString,
					dateFormatted: date.toLocaleDateString('ja-JP', {
						month: 'numeric',
						day: 'numeric'
					}),
					problemsSolved: 0,
					studyTimeMinutes: 0,
					sessionsCount: 0,
					unitsCompleted: 0,
					correctAnswers: 0,
					averageAccuracy: 0
				}

				dailyStats.push(defaultStats)
			}
		}

		console.log('取得した日別統計:', dailyStats)
		return json(dailyStats)
	} catch (error) {
		console.error('日別学習統計の取得に失敗:', error)
		return new Response('Internal Server Error', { status: 500 })
	}
}

/**
 * 日別学習統計を更新するAPI（学習セッション終了時に呼び出される）
 */
export async function POST({ request }) {
	try {
		const {
			userId,
			sessionData: {
				problemsSolved,
				studyTimeMinutes,
				unitsCompleted = 0,
				correctAnswers = 0,
				totalAnswers = 0
			}
		} = await request.json()

		if (!userId || !problemsSolved) {
			return new Response('User ID and problems solved are required', { status: 400 })
		}

		const today = new Date().toISOString().split('T')[0]
		const dailyStatsKey = `user:daily_stats:${userId}:${today}`

		console.log('=== 日別学習統計更新 ===')
		console.log('userId:', userId)
		console.log('date:', today)
		console.log('sessionData:', {
			problemsSolved,
			studyTimeMinutes,
			unitsCompleted,
			correctAnswers,
			totalAnswers
		})

		// 現在の統計を取得
		const currentStats = await redis.hgetall(dailyStatsKey)
		console.log('現在の統計:', currentStats)

		// 🔧 currentStatsがnullの場合の対応
		const safeCurrentStats = currentStats || {}

		// 新しい統計を計算
		const newStats = {
			problemsSolved: parseInt(safeCurrentStats.problemsSolved || '0', 10) + problemsSolved,
			studyTimeMinutes: parseInt(safeCurrentStats.studyTimeMinutes || '0', 10) + studyTimeMinutes,
			sessionsCount: parseInt(safeCurrentStats.sessionsCount || '0', 10) + 1,
			unitsCompleted: parseInt(safeCurrentStats.unitsCompleted || '0', 10) + unitsCompleted,
			correctAnswers: parseInt(safeCurrentStats.correctAnswers || '0', 10) + correctAnswers,
			totalAnswers: parseInt(safeCurrentStats.totalAnswers || '0', 10) + totalAnswers
		}

		// 正解率を計算
		newStats.averageAccuracy =
			newStats.totalAnswers > 0
				? Math.round((newStats.correctAnswers / newStats.totalAnswers) * 100)
				: 0

		// 🔧 hmset を hset に変更
		await redis.hset(dailyStatsKey, {
			problemsSolved: newStats.problemsSolved.toString(),
			studyTimeMinutes: newStats.studyTimeMinutes.toString(),
			sessionsCount: newStats.sessionsCount.toString(),
			unitsCompleted: newStats.unitsCompleted.toString(),
			correctAnswers: newStats.correctAnswers.toString(),
			totalAnswers: newStats.totalAnswers.toString(),
			averageAccuracy: newStats.averageAccuracy.toString(),
			lastUpdated: new Date().toISOString()
		})

		console.log('更新後の統計:', newStats)
		return json(newStats)
	} catch (error) {
		console.error('日別学習統計の更新に失敗:', error)
		return new Response('Internal Server Error', { status: 500 })
	}
}