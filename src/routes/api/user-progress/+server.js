// src/routes/api/user-progress/+server.js

import { json } from '@sveltejs/kit'
import redis from '$lib/server/database' // Redisクライアントをインポート

/**
 * 特定のユーザーの単元学習進行状況を取得するAPI
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ url }) {
	const userId = url.searchParams.get('userId')
	const unitId = url.searchParams.get('unitId') // 特定の単元IDが指定された場合

	if (!userId) {
		return new Response('User ID is required', { status: 400 })
	}

	try {
		const progressKey = `user:progress:${userId}`

		if (unitId) {
			const allUnitProgressFields = await redis.hgetall(progressKey)

			if (allUnitProgressFields) {
				const unitProgress = {
					unitId: unitId,
					lastProblemIndex: parseInt(
						allUnitProgressFields[`${unitId}:lastProblemIndex`] || '0',
						10
					),
					isCompleted: allUnitProgressFields[`${unitId}:isCompleted`] === 'true',
					completionDate: allUnitProgressFields[`${unitId}:completionDate`] || null,
					lastEbbinghausReview: allUnitProgressFields[`${unitId}:lastEbbinghausReview`] || null,
					ebbinghausReviewCount: parseInt(
						allUnitProgressFields[`${unitId}:ebbinghausReviewCount`] || '0',
						10
					)
				}
				console.log(`[API] Returning progress for unit ${unitId} for user ${userId}:`, unitProgress)
				return json(unitProgress)
			} else {
				const defaultProgress = {
					unitId: unitId,
					lastProblemIndex: 0,
					isCompleted: false,
					completionDate: null,
					lastEbbinghausReview: null,
					ebbinghausReviewCount: 0
				}
				console.log(
					`[API] No progress found for unit ${unitId} for user ${userId}. Returning default.`,
					defaultProgress
				)
				return json(defaultProgress)
			}
		} else {
			const allProgressFields = await redis.hgetall(progressKey)

			if (allProgressFields) {
				const groupedProgress = {}
				for (const field in allProgressFields) {
					const [currentUnitId, fieldType] = field.split(':')
					if (!groupedProgress[currentUnitId]) {
						groupedProgress[currentUnitId] = {
							unitId: currentUnitId,
							lastProblemIndex: 0,
							isCompleted: false,
							completionDate: null,
							lastEbbinghausReview: null,
							ebbinghausReviewCount: 0
						}
					}
					if (fieldType === 'lastProblemIndex') {
						groupedProgress[currentUnitId].lastProblemIndex = parseInt(allProgressFields[field], 10)
					} else if (fieldType === 'isCompleted') {
						groupedProgress[currentUnitId].isCompleted = (allProgressFields[field] === 'true');
					} else if (fieldType === 'completionDate') {
						groupedProgress[currentUnitId].completionDate = allProgressFields[field] === 'null' ? null : allProgressFields[field];
					} else if (fieldType === 'lastEbbinghausReview') {
						groupedProgress[currentUnitId].lastEbbinghausReview = allProgressFields[field] === 'null' ? null : allProgressFields[field];
					} else if (fieldType === 'ebbinghausReviewCount') {
						groupedProgress[currentUnitId].ebbinghausReviewCount = parseInt(
							allProgressFields[field],
							10
						)
					}
				}
				const progressArray = Object.values(groupedProgress)
				console.log(`[API] Returning all progress for user ${userId}:`, progressArray)
				return json(progressArray)
			} else {
				console.log(`[API] No overall progress found for user ${userId}. Returning empty array.`)
				return json([])
			}
		}
	} catch (error) {
		console.error(`[API] Failed to retrieve user progress for ${userId}:`, error)
		return new Response('Internal Server Error', { status: 500 })
	}
}

/**
 * ユーザーの単元学習進行状況を更新するAPI
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request }) {
	try {
		// isCompleted と ebbinghausReviewCount をオプションにするため、初期値 undefined を設定
		const {
			userId,
			unitId,
			lastProblemIndex,
			isCompleted = undefined,
			ebbinghausReviewCount = undefined
		} = await request.json()

		if (!userId || !unitId || lastProblemIndex === undefined) {
			// isCompleted は必須ではなくなった
			return new Response('Missing required fields: userId, unitId, lastProblemIndex', {
				status: 400
			})
		}

		const progressKey = `user:progress:${userId}`
		const updates = {}

		// lastProblemIndexの更新は常に実行
		updates[`${unitId}:lastProblemIndex`] = lastProblemIndex.toString()

		// isCompletedが明確に指定された場合のみ更新、undefinedの場合は既存の値を維持
		if (isCompleted !== undefined) {
			updates[`${unitId}:isCompleted`] = isCompleted.toString()
		}

		// 単元が完了した場合、completionDateを現在時刻に設定
		if (isCompleted === true) {
			// isCompletedがtrueの場合のみ
			const existingIsCompleted = await redis.hget(progressKey, `${unitId}:isCompleted`)
			// 既存のisCompletedが'true'でない、または存在しない場合のみcompletionDateを設定
			if (existingIsCompleted !== 'true') {
				updates[`${unitId}:completionDate`] = new Date().toISOString()
				console.log(`[API] Setting completionDate for ${unitId} for user ${userId}`)
			}
		} else if (isCompleted === false) {
			// isCompletedがfalseになった場合
			const existingIsCompleted = await redis.hget(progressKey, `${unitId}:isCompleted`)
			// 既存が'true'の場合のみcompletionDateをnullにリセット（再学習開始時など）
			if (existingIsCompleted === 'true') {
				updates[`${unitId}:completionDate`] = 'null'
				console.log(`[API] Resetting completionDate for ${unitId} for user ${userId}`)
			}
		}

		// ebbinghausReviewCountが存在する場合のみ更新
		if (ebbinghausReviewCount !== undefined && ebbinghausReviewCount !== null) {
			updates[`${unitId}:ebbinghausReviewCount`] = ebbinghausReviewCount.toString()
			// エビングハウス復習回数が更新されたら、最終復習日時も更新
			updates[`${unitId}:lastEbbinghausReview`] = new Date().toISOString()
		} else {
			// ebbinghausReviewCountが明示的にnullまたはundefinedの場合、lastEbbinghausReviewもリセットしない
			// ここでは明示的に指定がない場合は既存の値を維持する
		}

		// Redisハッシュにまとめて更新を適用
		await redis.hmset(progressKey, updates)

		console.log(`[API] User progress updated for ${userId}, unit ${unitId}.`, updates)
		return json({ message: 'Progress updated successfully' })
	} catch (error) {
		console.error('[API] Failed to update user progress:', error)
		return new Response('Internal Server Error', { status: 500 })
	}
}
