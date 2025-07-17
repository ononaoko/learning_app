// src/routes/api/ebbinghaus-review/+server.js

import { json } from '@sveltejs/kit'
import redis from '$lib/server/database'

/**
 * エビングハウス復習データを取得するAPI
 */
export async function GET({ url }) {
	const userId = url.searchParams.get('userId')

	if (!userId) {
		return new Response('User ID is required', { status: 400 })
	}

	try {
		console.log('=== エビングハウス復習データ取得開始 ===')
		console.log('userId:', userId)

		// ユーザーの進捗データを取得
		const progressKey = `user:progress:${userId}`
		const allProgressFields = await redis.hgetall(progressKey)

		console.log('取得した進捗データ:', allProgressFields)

		if (!allProgressFields || Object.keys(allProgressFields).length === 0) {
			console.log('進捗データがありません')
			return json({
				review1: [],
				review2: [],
				review3: []
			})
		}

		const currentDate = new Date()
		const reviewData = {
			review1: [],
			review2: [],
			review3: []
		}

		// 単元IDごとにデータを整理
		const unitIds = new Set()
		for (const field in allProgressFields) {
			const [unitId, fieldType] = field.split(':')
			if (unitId && fieldType) {
				unitIds.add(unitId)
			}
		}

		console.log('処理対象の単元:', Array.from(unitIds))

		for (const unitId of unitIds) {
			const isCompleted = allProgressFields[`${unitId}:isCompleted`] === 'true'
			const completionDate = allProgressFields[`${unitId}:completionDate`]
			const lastProblemIndex = parseInt(allProgressFields[`${unitId}:lastProblemIndex`] || '0', 10)
			const ebbinghausReviewCount = parseInt(
				allProgressFields[`${unitId}:ebbinghausReviewCount`] || '0',
				10
			)
			const lastEbbinghausReview = allProgressFields[`${unitId}:lastEbbinghausReview`]

			console.log(`単元 ${unitId}:`, {
				isCompleted,
				completionDate,
				lastProblemIndex,
				ebbinghausReviewCount,
				lastEbbinghausReview
			})

			// 学習済みの問題がある場合のみ復習対象とする
			if (lastProblemIndex >= 0 || isCompleted) {
				console.log(
					`単元 ${unitId} は学習済み (lastProblemIndex: ${lastProblemIndex}, isCompleted: ${isCompleted})`
				)

				// 問題数を取得
				const problemCount = await getProblemCount(unitId, lastProblemIndex, isCompleted)

				console.log(`単元 ${unitId} の問題数: ${problemCount}`)

				if (problemCount > 0) {
					// 学習日を決定（完了日がある場合はそれを使用、なければ現在日の1日前をテスト用に設定）
					let studyDate = completionDate
					if (!studyDate && lastProblemIndex > 0) {
						// テスト用：completionDateがない場合は1日前に設定
						const testDate = new Date(currentDate)
						testDate.setDate(testDate.getDate() - 1)
						studyDate = testDate.toISOString()
						console.log(`テスト用学習日を設定: ${studyDate}`)
					} else if (!studyDate) {
						// 本当に学習データがない場合は現在日を使用
						studyDate = currentDate.toISOString()
					}

					const reviewItem = {
						unitId,
						problemCount,
						lastStudied: studyDate,
						lastReviewed: lastEbbinghausReview || null,
						reviewCount: ebbinghausReviewCount
					}

					// 復習レベルを判定
					const reviewLevel = determineReviewLevel(
						studyDate,
						lastEbbinghausReview,
						ebbinghausReviewCount,
						currentDate
					)

					console.log(`単元 ${unitId} の復習レベル: ${reviewLevel}`)

					if (reviewLevel === 1) {
						reviewData.review1.push(reviewItem)
					} else if (reviewLevel === 2) {
						reviewData.review2.push(reviewItem)
					} else if (reviewLevel === 3) {
						reviewData.review3.push(reviewItem)
					}
				} else {
					console.log(`単元 ${unitId} は問題数が0のためスキップ`)
				}
			} else {
				console.log(`単元 ${unitId} は学習していないためスキップ`)
			}
		}

		console.log('最終的な復習データ:', reviewData)
		return json(reviewData)
	} catch (error) {
		console.error('エビングハウス復習データの取得に失敗:', error)
		return new Response('Internal Server Error', { status: 500 })
	}
}

/**
 * 問題数を取得する関数
 */
async function getProblemCount(unitId, lastProblemIndex, isCompleted) {
	try {
		// サーバー内部でのAPI呼び出しのため、外部URLではなく内部的に処理
		// 実際の実装では、問題データを直接取得する方法を使用
		console.log(
			`問題数を取得中: ${unitId}, lastProblemIndex: ${lastProblemIndex}, isCompleted: ${isCompleted}`
		)

		if (isCompleted) {
			// 完了している場合は学習済み問題数（推定）
			const problemCount = lastProblemIndex + 1
			console.log(`完了済み単元 ${unitId}: ${problemCount}問`)
			return problemCount
		} else {
			// 未完了の場合は学習済みの問題数
			const problemCount = Math.max(1, lastProblemIndex + 1)
			console.log(`未完了単元 ${unitId}: ${problemCount}問`)
			return problemCount
		}
	} catch (error) {
		console.error(`問題数の取得に失敗 (${unitId}):`, error)
		return 1 // 最低1問は返す
	}
}

/**
 * 復習レベルを判定する関数
 */
function determineReviewLevel(completionDate, lastEbbinghausReview, reviewCount, currentDate) {
	const studyDate = new Date(completionDate)
	const daysSinceStudy = Math.floor((currentDate - studyDate) / (1000 * 60 * 60 * 24))

	console.log(`=== 復習レベル判定 ===`)
	console.log(`学習日: ${studyDate.toISOString()}`)
	console.log(`現在日: ${currentDate.toISOString()}`)
	console.log(`学習からの経過日数: ${daysSinceStudy}日`)
	console.log(`復習回数: ${reviewCount}回`)
	console.log(`前回復習日: ${lastEbbinghausReview}`)

	if (reviewCount === 0) {
		// 1回目の復習判定（学習から1日後）
		console.log(`1回目の復習判定: ${daysSinceStudy >= 1 ? '対象' : '対象外'}`)
		if (daysSinceStudy >= 1) {
			return 1
		}
	} else if (reviewCount === 1 && lastEbbinghausReview) {
		// 2回目の復習判定（前回復習から1週間後）
		const lastReviewDate = new Date(lastEbbinghausReview)
		const daysSinceLastReview = Math.floor((currentDate - lastReviewDate) / (1000 * 60 * 60 * 24))
		console.log(`2回目の復習判定: 前回復習からの経過日数: ${daysSinceLastReview}日`)
		console.log(`2回目の復習判定: ${daysSinceLastReview >= 7 ? '対象' : '対象外'}`)

		if (daysSinceLastReview >= 7) {
			return 2
		}
	} else if (reviewCount === 2 && lastEbbinghausReview) {
		// 3回目の復習判定（前回復習から1ヶ月後）
		const lastReviewDate = new Date(lastEbbinghausReview)
		const daysSinceLastReview = Math.floor((currentDate - lastReviewDate) / (1000 * 60 * 60 * 24))
		console.log(`3回目の復習判定: 前回復習からの経過日数: ${daysSinceLastReview}日`)
		console.log(`3回目の復習判定: ${daysSinceLastReview >= 30 ? '対象' : '対象外'}`)

		if (daysSinceLastReview >= 30) {
			return 3
		}
	}

	console.log(`復習対象外`)
	return 0 // 復習対象外
}
