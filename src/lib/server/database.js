// src/lib/server/database.js

import { Redis } from '@upstash/redis';
import { createId } from '@paralleldrive/cuid2'; // ユニークID生成ライブラリ
import { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } from '$env/static/private'; // SvelteKitの環境変数読み込み

// Redis クライアントの初期化
const redis = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN,
});

// Redis クライアントインスタンスを直接エクスポート
export default redis;

// --- スキーマの定義 (参考用) ---
// これらのオブジェクトは、データベース操作関数の型チェックや、
// データ構造の理解を助けるために存在しますが、Drizzle ORMの機能は使いません。
export const usersSchema = {
  id: 'string', // ユーザーの一意なID (cuid2)
  nickname: 'string', // ニックネーム
  pincode: 'string', // ピンコード
};

export const learningRecordsSchema = {
  id: 'string', // 学習記録の一意なID (cuid2)
  userId: 'string', // どのユーザーの記録かを示すID
  problemId: 'string', // どの問題の記録か
  isCorrect: 'number', // 0 for false, 1 for true
  hintsUsedCount: 'number',
  durationSeconds: 'number',
  timestamp: 'string', // ISO形式のタイムスタンプ文字列
};

// ヘルパー関数
export const generateId = createId;