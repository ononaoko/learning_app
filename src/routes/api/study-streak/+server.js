// src/routes/api/study-streak/+server.js

import { json } from '@sveltejs/kit'
import redis from '$lib/server/database'

/**
 * 連続学習記録を取得するAPI
 */
export async function GET({ url }) {
	const userId = url.searchParams.get('userId')

	if (!userId) {
		return new Response('User ID is required', { status: 400 })
	}

	try {
		const streakKey = `user:study_streak:${userId}`
		const streakData = await redis.hgetall(streakKey)

		console.log('取得した連続学習データ:', streakData)

		if (streakData && Object.keys(streakData).length > 0) {
			const studyStreak = {
				currentStreak: parseInt(streakData.currentStreak || '0', 10),
				maxStreak: parseInt(streakData.maxStreak || '0', 10),
				lastStudyDate: streakData.lastStudyDate || null,
				totalStudyDays: parseInt(streakData.totalStudyDays || '0', 10),
				firstStudyDate: streakData.firstStudyDate || null,
				todayProblems: parseInt(streakData.todayProblems || '0', 10),
				totalProblems: parseInt(streakData.totalProblems || '0', 10)
			}

			return json(studyStreak)
		} else {
			// 初回ユーザーのデフォルト値
			const defaultStreak = {
				currentStreak: 0,
				maxStreak: 0,
				lastStudyDate: null,
				totalStudyDays: 0,
				firstStudyDate: null,
				todayProblems: 0,
				totalProblems: 0
			}

			return json(defaultStreak)
		}
	} catch (error) {
		console.error('連続学習記録の取得に失敗:', error)
		return new Response('Internal Server Error', { status: 500 })
	}
}

/**
 * 連続学習記録を更新するAPI（問題を解いた時に呼び出される）
 */
export async function POST({ request }) {
	try {
		const { userId, problemsSolved = 1 } = await request.json()

		if (!userId) {
			return new Response('User ID is required', { status: 400 })
		}

		const streakKey = `user:study_streak:${userId}`
		const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD形式

		console.log('=== 連続学習記録更新 ===')
		console.log('userId:', userId)
		console.log('今日の日付:', today)
		console.log('解いた問題数:', problemsSolved)

		// 現在の記録を取得
		const currentData = await redis.hgetall(streakKey)
		console.log('現在の連続学習データ:', currentData)

		const lastStudyDate = currentData.lastStudyDate || null
		const currentStreak = parseInt(currentData.currentStreak || '0', 10)
		const maxStreak = parseInt(currentData.maxStreak || '0', 10)
		const totalStudyDays = parseInt(currentData.totalStudyDays || '0', 10)
		const firstStudyDate = currentData.firstStudyDate || null
		const todayProblems = parseInt(currentData.todayProblems || '0', 10)
		const totalProblems = parseInt(currentData.totalProblems || '0', 10)

		// 今日の問題数を更新
		let newTodayProblems = todayProblems
		let newTotalProblems = totalProblems + problemsSolved

		if (lastStudyDate === today) {
			// 今日既に学習している場合
			newTodayProblems = todayProblems + problemsSolved
			console.log('今日の学習継続中:', newTodayProblems, '問')
		} else {
			// 日付が変わった場合
			newTodayProblems = problemsSolved
			console.log('新しい日の学習開始:', newTodayProblems, '問')
		}

		// 学習記録の更新
		let newCurrentStreak = currentStreak
		let newMaxStreak = maxStreak
		let newTotalStudyDays = totalStudyDays
		let newFirstStudyDate = firstStudyDate
		let isNewStudyDay = false

		// 3問以上解いた場合の連続学習判定
		if (newTodayProblems >= 3 && lastStudyDate !== today) {
			console.log('3問以上達成！連続学習判定開始')
			isNewStudyDay = true
			newTotalStudyDays += 1

			if (lastStudyDate) {
				const lastDate = new Date(lastStudyDate)
				const todayDate = new Date(today)
				const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24))

				console.log('前回学習からの経過日数:', diffDays)

				if (diffDays === 1) {
					// 連続学習継続
					newCurrentStreak += 1
					console.log('連続学習継続:', newCurrentStreak)
				} else if (diffDays > 1) {
					// 連続学習途切れ
					newCurrentStreak = 1
					console.log('連続学習途切れ、リセット')
				}
			} else {
				// 初回学習
				newCurrentStreak = 1
				newFirstStudyDate = today
				console.log('初回学習')
			}

			// 最大記録を更新
			if (newCurrentStreak > newMaxStreak) {
				newMaxStreak = newCurrentStreak
				console.log('最大記録更新:', newMaxStreak)
			}
		}

		// データベースに保存
		const updateData = {
			currentStreak: newCurrentStreak.toString(),
			maxStreak: newMaxStreak.toString(),
			lastStudyDate:
				lastStudyDate === today
					? lastStudyDate
					: newTodayProblems >= 3
						? today
						: lastStudyDate || '',
			totalStudyDays: newTotalStudyDays.toString(),
			firstStudyDate: newFirstStudyDate || '',
			todayProblems: newTodayProblems.toString(),
			totalProblems: newTotalProblems.toString()
		}

		await redis.hmset(streakKey, updateData)
		console.log('更新されたデータ:', updateData)

		return json({
			currentStreak: newCurrentStreak,
			maxStreak: newMaxStreak,
			lastStudyDate: updateData.lastStudyDate,
			totalStudyDays: newTotalStudyDays,
			firstStudyDate: newFirstStudyDate,
			todayProblems: newTodayProblems,
			totalProblems: newTotalProblems,
			isNewStudyDay: isNewStudyDay,
			needsMoreProblems: newTodayProblems < 3
		})
	} catch (error) {
		console.error('連続学習記録の更新に失敗:', error)
		return new Response('Internal Server Error', { status: 500 })
	}
}

/**
 * 連続学習記録をリセットするAPI（管理用）
 */
export async function DELETE({ url }) {
	const userId = url.searchParams.get('userId')

	if (!userId) {
		return new Response('User ID is required', { status: 400 })
	}

	try {
		const streakKey = `user:study_streak:${userId}`
		await redis.del(streakKey)

		console.log('連続学習記録をリセット:', userId)
		return json({ success: true })
	} catch (error) {
		console.error('連続学習記録のリセットに失敗:', error)
		return new Response('Internal Server Error', { status: 500 })
	}
}
