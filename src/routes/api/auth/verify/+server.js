// src/routes/api/auth/verify/+server.js
import { json } from '@sveltejs/kit';

export async function GET({ cookies, request }) {
  try {
    // Cookieから認証情報を取得
    const userId = cookies.get('user_id');
    const nickname = cookies.get('nickname');
    const authToken = cookies.get('auth_token'); // もしトークンベース認証を使っている場合

    // 基本的な認証チェック
    if (!userId || !nickname) {
      return json({ isValid: false, message: '認証情報がありません' }, { status: 401 });
    }

    // ここでさらなる認証チェックを行う
    // 例：データベースでユーザーが存在するかチェック
    // 例：トークンの有効期限チェック
    // 例：セッションの有効性チェック

    // 簡単な例：匿名ユーザーかどうかチェック
    const isAnonymous = userId.startsWith('anonymous_user_');

    if (isAnonymous) {
      // 匿名ユーザーの場合、作成から24時間以内かチェック
      const timestamp = parseInt(userId.replace('anonymous_user_', ''));
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (now - timestamp > twentyFourHours) {
        // 24時間経過している場合は無効
        return json({ isValid: false, message: '匿名セッションが期限切れです' }, { status: 401 });
      }
    }

    // より高度な認証チェックの例（データベース使用）
    /*
    try {
      const user = await getUserFromDatabase(userId);
      if (!user || !user.isActive) {
        return json({ isValid: false, message: 'ユーザーが見つからないか無効です' }, { status: 401 });
      }
    } catch (dbError) {
      console.error('データベースエラー:', dbError);
      return json({ isValid: false, message: 'サーバーエラー' }, { status: 500 });
    }
    */

    // 認証成功
    return json({
      isValid: true,
      userId: userId,
      nickname: decodeURIComponent(nickname),
      isAnonymous: isAnonymous,
      message: '認証成功'
    });

  } catch (error) {
    console.error('認証確認エラー:', error);
    return json({ isValid: false, message: 'サーバーエラー' }, { status: 500 });
  }
}

// PUT/PATCH メソッドでセッション延長
export async function PUT({ cookies, request }) {
  try {
    const userId = cookies.get('user_id');

    if (userId && userId.startsWith('anonymous_user_')) {
      // 匿名ユーザーのセッションを延長（新しいタイムスタンプで更新）
      const newUserId = `anonymous_user_${Date.now()}`;
      const nickname = cookies.get('nickname');

      // 新しい期限でCookieを設定
      cookies.set('user_id', newUserId, {
        path: '/',
        maxAge: 60 * 60 * 24, // 24時間
        httpOnly: false
      });

      return json({
        success: true,
        newUserId: newUserId,
        message: 'セッションを延長しました'
      });
    }

    return json({ success: false, message: 'セッション延長不可' });

  } catch (error) {
    console.error('セッション延長エラー:', error);
    return json({ success: false, message: 'サーバーエラー' }, { status: 500 });
  }
}