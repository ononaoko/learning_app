// src/routes/ebbinghaus-mode/+page.server.js

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