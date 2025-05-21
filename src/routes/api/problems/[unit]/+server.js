import { json } from '@sveltejs/kit'
import algebraData from '$lib/data/algebra.json'
import geometryData from '$lib/data/geometry.json'

const dataMap = {
	algebra: algebraData,
	geometry: geometryData
};

export async function GET({ params }) {
	const { unit } = params
	console.log('API called with unit:', unit) // デバッグ用ログ
	const data = dataMap[unit]
	if (data) {
		console.log('Returning data:', data) // デバッグ用ログ
		return json(data)
	}
	console.log(`Unit "${unit}" not found`) // デバッグ用ログ
	return new Response(`Unit "${unit}" not found`, { status: 404 })
}
