// src/routes/review-mode/+page.server.js

import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies }) { // locals ではなく cookies を受け取る
    let userId = 'anonymous'; // デフォルト値を設定
    const userIdFromCookie = cookies.get('user_id'); // クッキーからユーザーIDを取得

    if (userIdFromCookie) {
        userId = userIdFromCookie;
    } else {
        // user_id クッキーがない場合は、ログインページにリダイレクトするか、
        // 適切なエラーハンドリングを行う
        console.warn('User ID cookie not found for review mode. Redirecting to login.');
        throw redirect(302, '/login'); // 未ログインならリダイレクト
    }

    return {
        userId: userId // 取得したユーザーIDを返す
    };
}