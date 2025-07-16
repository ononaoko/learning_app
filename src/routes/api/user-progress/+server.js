// src/routes/api/user-progress/+server.js

import { json } from '@sveltejs/kit'
import redis from '$lib/server/database'

/**
 * 安全なboolean変換関数
 */
function parseBoolean(value) {
	if (value === true || value === 'true') return true;
	if (value === false || value === 'false') return false;
	return false; // デフォルト値
}

/**
 * 特定のユーザーの単元学習進行状況を取得するAPI
 */
export async function GET({ url }) {
	const userId = url.searchParams.get('userId')
	const unitId = url.searchParams.get('unitId')

	if (!userId) {
		return new Response('User ID is required', { status: 400 })
	}

	try {
		const progressKey = `user:progress:${userId}`

		if (unitId) {
			// 単一の単元の進捗を取得
			const allUnitProgressFields = await redis.hgetall(progressKey)

			if (allUnitProgressFields) {
				const unitProgress = {
					unitId: unitId,
					lastProblemIndex: parseInt(
						allUnitProgressFields[`${unitId}:lastProblemIndex`] || '0',
						10
					),
					isCompleted: parseBoolean(allUnitProgressFields[`${unitId}:isCompleted`]),
					completionDate: allUnitProgressFields[`${unitId}:completionDate`] || null,
					lastEbbinghausReview: allUnitProgressFields[`${unitId}:lastEbbinghausReview`] || null,
					ebbinghausReviewCount: parseInt(
						allUnitProgressFields[`${unitId}:ebbinghausReviewCount`] || '0',
						10
					)
				}
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
				return json(defaultProgress)
			}
		} else {
			// 全ての単元の進捗を取得
			const allProgressFields = await redis.hgetall(progressKey)

			if (allProgressFields) {
				const groupedProgress = {}

				// 最初に全てのunitIdを特定
				const unitIds = new Set()
				for (const field in allProgressFields) {
					const [currentUnitId, fieldType] = field.split(':')
					if (currentUnitId && fieldType) {
						unitIds.add(currentUnitId)
					}
				}

				// 各unitIdについて、実際のデータがある場合のみ処理
				for (const currentUnitId of unitIds) {
					const lastProblemIndexField = `${currentUnitId}:lastProblemIndex`
					const isCompletedField = `${currentUnitId}:isCompleted`
					const completionDateField = `${currentUnitId}:completionDate`
					const lastEbbinghausReviewField = `${currentUnitId}:lastEbbinghausReview`
					const ebbinghausReviewCountField = `${currentUnitId}:ebbinghausReviewCount`

					// 少なくとも1つのフィールドが存在する場合のみ処理
					if (allProgressFields[lastProblemIndexField] !== undefined ||
						allProgressFields[isCompletedField] !== undefined ||
						allProgressFields[completionDateField] !== undefined ||
						allProgressFields[lastEbbinghausReviewField] !== undefined ||
						allProgressFields[ebbinghausReviewCountField] !== undefined) {

						const unitProgress = {
							unitId: currentUnitId,
							lastProblemIndex: parseInt(
								allProgressFields[lastProblemIndexField] || '0',
								10
							),
							isCompleted: parseBoolean(allProgressFields[isCompletedField]),
							completionDate: allProgressFields[completionDateField] === 'null' ? null : (allProgressFields[completionDateField] || null),
							lastEbbinghausReview: allProgressFields[lastEbbinghausReviewField] === 'null' ? null : (allProgressFields[lastEbbinghausReviewField] || null),
							ebbinghausReviewCount: parseInt(
								allProgressFields[ebbinghausReviewCountField] || '0',
								10
							)
						}

						groupedProgress[currentUnitId] = unitProgress
					}
				}

				const progressArray = Object.values(groupedProgress)
				return json(progressArray)
			} else {
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
 */
export async function POST({ request }) {
	try {
		const {
			userId,
			unitId,
			lastProblemIndex,
			isCompleted = undefined,
			ebbinghausReviewCount = undefined
		} = await request.json()

		if (!userId || !unitId || lastProblemIndex === undefined) {
			return new Response('Missing required fields: userId, unitId, lastProblemIndex', {
				status: 400
			})
		}

		const progressKey = `user:progress:${userId}`
		const updates = {}

		// lastProblemIndexの更新は常に実行
		updates[`${unitId}:lastProblemIndex`] = lastProblemIndex.toString()

		if (isCompleted !== undefined) {
			// 既存の値を取得
			const existingIsCompleted = await redis.hget(progressKey, `${unitId}:isCompleted`);
			const existingBool = parseBoolean(existingIsCompleted);

			// 一度trueになった後にfalseに戻さないようにする保護ロジック
			if (isCompleted === false && existingBool === true) {
				// falseに戻そうとする場合は更新しない
			} else {
				updates[`${unitId}:isCompleted`] = isCompleted.toString();
			}
		}

		// completionDateの処理
		if (isCompleted === true) {
			const existingIsCompleted = await redis.hget(progressKey, `${unitId}:isCompleted`)
			const existingCompletionDate = await redis.hget(progressKey, `${unitId}:completionDate`)
			const existingBool = parseBoolean(existingIsCompleted);

			if (!existingBool || !existingCompletionDate || existingCompletionDate === 'null') {
				updates[`${unitId}:completionDate`] = new Date().toISOString()
			}
		} else if (isCompleted === false) {
			const existingIsCompleted = await redis.hget(progressKey, `${unitId}:isCompleted`)
			const existingBool = parseBoolean(existingIsCompleted);
			if (existingBool === true) {
				updates[`${unitId}:completionDate`] = 'null'
			}
		}

		// ebbinghausReviewCountが存在する場合のみ更新
		if (ebbinghausReviewCount !== undefined && ebbinghausReviewCount !== null) {
			updates[`${unitId}:ebbinghausReviewCount`] = ebbinghausReviewCount.toString()
			updates[`${unitId}:lastEbbinghausReview`] = new Date().toISOString()
		}

		// 更新するフィールドがある場合のみRedisを更新
		if (Object.keys(updates).length > 0) {
			await redis.hmset(progressKey, updates)
		}

		return json({ message: 'Progress updated successfully' })
	} catch (error) {
		console.error('[API] Failed to update user progress:', error)
		return new Response('Internal Server Error', { status: 500 })
	}
}