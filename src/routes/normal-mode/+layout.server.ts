// src/routes/normal-mode/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  // locals.user が存在し、そこにidプロパティがあると仮定
  // 実際のユーザー認証の実装に合わせて、ユーザーIDの取得方法を調整してください
  const userId = locals.user?.id || 'default_user_id'; // 仮のユーザーID
  // ログインしていない場合のデフォルトID、またはエラーハンドリングを適切に行う

  return {
    userId: userId,
  };
};