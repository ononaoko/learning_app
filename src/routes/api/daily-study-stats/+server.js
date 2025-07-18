// src/routes/api/daily-study-stats/+server.js

import { json } from '@sveltejs/kit'
import redis from '$lib/server/database'

/**
 * 日別学習統計を取得するAPI
 */
export async function GET({ url }) {
	const userId = url.searchParams.get('userId')
	const days = parseInt(url.searchParams.get('days') || '7', 10) // デフォルト7日間

	if (!userId) {
		return new Response('User ID is required', { status: 400 })
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
			const date = new Date(today)
			date.setDate(today.getDate() - i)
			const dateString = date.toISOString().split('T')[0] // YYYY-MM-DD

			// その日の統計データを取得
			const dayData = await redis.hgetall(`${dailyStatsKey}:${dateString}`)

			const stats = {
				date: dateString,
				dateFormatted: date.toLocaleDateString('ja-JP', {
					month: 'short',
					day: 'numeric',
					weekday: 'short'
				}),
				problemsSolved: parseInt(dayData.problemsSolved || '0', 10),
				studyTimeMinutes: parseInt(dayData.studyTimeMinutes || '0', 10),
				sessionsCount: parseInt(dayData.sessionsCount || '0', 10),
				unitsCompleted: parseInt(dayData.unitsCompleted || '0', 10),
				correctAnswers: parseInt(dayData.correctAnswers || '0', 10),
				averageAccuracy: dayData.averageAccuracy ? parseFloat(dayData.averageAccuracy) : 0
			}

			dailyStats.push(stats)
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

		// 新しい統計を計算
		const newStats = {
			problemsSolved: parseInt(currentStats.problemsSolved || '0', 10) + problemsSolved,
			studyTimeMinutes: parseInt(currentStats.studyTimeMinutes || '0', 10) + studyTimeMinutes,
			sessionsCount: parseInt(currentStats.sessionsCount || '0', 10) + 1,
			unitsCompleted: parseInt(currentStats.unitsCompleted || '0', 10) + unitsCompleted,
			correctAnswers: parseInt(currentStats.correctAnswers || '0', 10) + correctAnswers,
			totalAnswers: parseInt(currentStats.totalAnswers || '0', 10) + totalAnswers
		}

		// 正解率を計算
		newStats.averageAccuracy =
			newStats.totalAnswers > 0
				? Math.round((newStats.correctAnswers / newStats.totalAnswers) * 100)
				: 0

		// Redisに保存
		await redis.hmset(dailyStatsKey, {
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
