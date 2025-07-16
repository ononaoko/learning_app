// src/routes/api/user-progress/+server.js

import { json } from '@sveltejs/kit'
import redis from '$lib/server/database'

/**
 * 安全なboolean変換関数
 */
function parseBoolean(value) {
	if (value === true || value === 'true') return true
	if (value === false || value === 'false') return false
	return false // デフォルト値
}

/**
 * 特定のユーザーの単元学習進行状況を取得するAPI
 */
export async function GET({ url }) {
	const userId = url.searchParams.get('userId')
	const unitId = url.searchParams.get('unitId')

	console.log('=== API GET request ===');
	console.log('userId:', userId);
	console.log('unitId:', unitId);

	if (!userId) {
		return new Response('User ID is required', { status: 400 })
	}

	try {
		const progressKey = `user:progress:${userId}`
		console.log('Redis key:', progressKey);

		if (unitId) {
			// 単一の単元の進捗を取得
			const allUnitProgressFields = await redis.hgetall(progressKey)
			console.log('Redis raw data:', allUnitProgressFields);

			if (allUnitProgressFields && Object.keys(allUnitProgressFields).length > 0) {
				const lastProblemIndexKey = `${unitId}:lastProblemIndex`;
				const isCompletedKey = `${unitId}:isCompleted`;
				const isPerfectKey = `${unitId}:isPerfect`;

				console.log('Looking for keys:', {
					lastProblemIndexKey,
					isCompletedKey,
					isPerfectKey
				});

				console.log('Raw values:', {
					lastProblemIndex: allUnitProgressFields[lastProblemIndexKey],
					isCompleted: allUnitProgressFields[isCompletedKey],
					isPerfect: allUnitProgressFields[isPerfectKey]
				});

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
					),
					correctCount: parseInt(allUnitProgressFields[`${unitId}:correctCount`] || '0', 10),
					totalCount: parseInt(allUnitProgressFields[`${unitId}:totalCount`] || '0', 10),
					isPerfect: parseBoolean(allUnitProgressFields[`${unitId}:isPerfect`])
				}

				console.log('Processed unit progress:', unitProgress);
				return json(unitProgress)
			} else {
				console.log('No progress data found, returning default');
				const defaultProgress = {
					unitId: unitId,
					lastProblemIndex: 0,
					isCompleted: false,
					completionDate: null,
					lastEbbinghausReview: null,
					ebbinghausReviewCount: 0,
					correctCount: 0,
					totalCount: 0,
					isPerfect: false
				}
				return json(defaultProgress)
			}
		} else {
			// 全ての単元の進捗を取得
			const allProgressFields = await redis.hgetall(progressKey)

			if (allProgressFields && Object.keys(allProgressFields).length > 0) {
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
					const correctCountField = `${currentUnitId}:correctCount`
					const totalCountField = `${currentUnitId}:totalCount`
					const isPerfectField = `${currentUnitId}:isPerfect`

					// 少なくとも1つのフィールドが存在する場合のみ処理
					if (
						allProgressFields[lastProblemIndexField] !== undefined ||
						allProgressFields[isCompletedField] !== undefined ||
						allProgressFields[completionDateField] !== undefined ||
						allProgressFields[lastEbbinghausReviewField] !== undefined ||
						allProgressFields[ebbinghausReviewCountField] !== undefined ||
						allProgressFields[correctCountField] !== undefined ||
						allProgressFields[totalCountField] !== undefined ||
						allProgressFields[isPerfectField] !== undefined
					) {
						const unitProgress = {
							unitId: currentUnitId,
							lastProblemIndex: parseInt(allProgressFields[lastProblemIndexField] || '0', 10),
							isCompleted: parseBoolean(allProgressFields[isCompletedField]),
							completionDate:
								allProgressFields[completionDateField] === 'null'
									? null
									: allProgressFields[completionDateField] || null,
							lastEbbinghausReview:
								allProgressFields[lastEbbinghausReviewField] === 'null'
									? null
									: allProgressFields[lastEbbinghausReviewField] || null,
							ebbinghausReviewCount: parseInt(
								allProgressFields[ebbinghausReviewCountField] || '0',
								10
							),
							correctCount: parseInt(allProgressFields[correctCountField] || '0', 10),
							totalCount: parseInt(allProgressFields[totalCountField] || '0', 10),
							isPerfect: parseBoolean(allProgressFields[isPerfectField])
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
		const progressData = await request.json()
		const {
			userId,
			unitId,
			lastProblemIndex,
			isCompleted,
			isPerfect,
			ebbinghausReviewCount
		} = progressData

		// デバッグ用ログ
		console.log('=== API側で受信したデータ ===')
		console.log('受信データ:', progressData)
		console.log('isPerfect:', isPerfect)

		if (!userId || !unitId) {
			return new Response('User ID and Unit ID are required', { status: 400 })
		}

		const progressKey = `user:progress:${userId}`
		const updateData = {}

		// 各フィールドを設定
		if (lastProblemIndex !== undefined) {
			updateData[`${unitId}:lastProblemIndex`] = lastProblemIndex.toString()
		}

		if (isCompleted !== undefined) {
			updateData[`${unitId}:isCompleted`] = isCompleted.toString()

			// 完了時に完了日時を設定
			if (isCompleted === true) {
				updateData[`${unitId}:completionDate`] = new Date().toISOString()
			}
		}

		// isPerfectが明示的に指定された場合のみ更新
		if (isPerfect !== undefined) {
			updateData[`${unitId}:isPerfect`] = isPerfect.toString()
			console.log('isPerfectをRedisに保存:', isPerfect)
		}

		if (ebbinghausReviewCount !== undefined) {
			updateData[`${unitId}:ebbinghausReviewCount`] = ebbinghausReviewCount.toString()
		}

		// Redisに一括更新
		if (Object.keys(updateData).length > 0) {
			await redis.hmset(progressKey, updateData)
			console.log('Redisに保存されたデータ:', updateData)
		}

		// 更新後のデータを取得して返却
		const updatedFields = await redis.hmget(
			progressKey,
			`${unitId}:lastProblemIndex`,
			`${unitId}:isCompleted`,
			`${unitId}:isPerfect`,
			`${unitId}:completionDate`,
			`${unitId}:ebbinghausReviewCount`
		)

		const responseData = {
			userId,
			unitId,
			lastProblemIndex: parseInt(updatedFields[0] || '0', 10),
			isCompleted: parseBoolean(updatedFields[1]),
			isPerfect: parseBoolean(updatedFields[2]),
			completionDate: updatedFields[3] || null,
			ebbinghausReviewCount: parseInt(updatedFields[4] || '0', 10),
			updatedAt: new Date().toISOString()
		}

		console.log('API応答データ:', responseData)

		return json(responseData, { status: 200 })

	} catch (error) {
		console.error('[API] Progress update failed:', error)
		return new Response(
			JSON.stringify({ error: 'Failed to update progress', details: error.message }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		)
	}
}