// src/routes/api/problem-results/+server.js

import { json } from '@sveltejs/kit'
import redis from '$lib/server/database'

/**
 * ユーザーの問題結果を取得するAPI
 */
export async function GET({ url }) {
  const userId = url.searchParams.get('userId')
  const unitId = url.searchParams.get('unitId')

  if (!userId || !unitId) {
    return new Response('User ID and Unit ID are required', { status: 400 })
  }

  try {
    const resultsKey = `user:problem_results:${userId}:${unitId}`
    const resultsData = await redis.get(resultsKey)

    if (resultsData) {
      const parsedResults = JSON.parse(resultsData)
      return json({ results: parsedResults })
    } else {
      return json({ results: {} })
    }
  } catch (error) {
    console.error('Failed to get problem results:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

/**
 * ユーザーの問題結果を保存するAPI
 */
export async function POST({ request }) {
  try {
    const { userId, unitId, results } = await request.json()

    if (!userId || !unitId) {
      return new Response('User ID and Unit ID are required', { status: 400 })
    }

    const resultsKey = `user:problem_results:${userId}:${unitId}`

    // 結果をJSONとしてRedisに保存
    await redis.set(resultsKey, JSON.stringify(results))

    console.log('問題結果を保存しました:', resultsKey, results)

    return json({ success: true })
  } catch (error) {
    console.error('Failed to save problem results:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

/**
 * ユーザーの問題結果を削除するAPI
 */
export async function DELETE({ url }) {
  const userId = url.searchParams.get('userId')
  const unitId = url.searchParams.get('unitId')

  if (!userId || !unitId) {
    return new Response('User ID and Unit ID are required', { status: 400 })
  }

  try {
    const resultsKey = `user:problem_results:${userId}:${unitId}`
    await redis.del(resultsKey)

    console.log('問題結果を削除しました:', resultsKey)

    return json({ success: true })
  } catch (error) {
    console.error('Failed to delete problem results:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}