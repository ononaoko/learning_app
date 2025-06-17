// src/routes/normal-mode/[unit]/+page.server.js
import { error } from '@sveltejs/kit'

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies }) {
	let userId = 'anonymous'
	const userIdFromCookie = cookies.get('user_id')

	if (userIdFromCookie) {
		userId = userIdFromCookie
	}

	return {
		userId: userId
	}
}
