// src/routes/dashboard/+page.server.js

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies }) {
	let userId = 'anonymous'
	const userIdFromCookie = cookies.get('user_id')

	if (userIdFromCookie) {
		userId = userIdFromCookie
	}

	console.log('ダッシュボード サーバー側で設定されたuserId:', userId)

	return {
		userId: userId
	}
}
