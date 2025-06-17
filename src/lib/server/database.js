// src/lib/server/database.js
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// データベースファイルが保存されるディレクトリ
const dbDir = path.resolve(process.cwd(), 'src/lib/server')
// データベースファイルのパス
const dbPath = path.join(dbDir, 'app.db')

// ディレクトリが存在しない場合は作成
if (!fs.existsSync(dbDir)) {
	fs.mkdirSync(dbDir, { recursive: true })
}

// データベースインスタンスの作成
// verbose: true を設定すると、実行されたSQLクエリがコンソールに出力されデバッグに便利です。
const db = new Database(dbPath, { verbose: console.log })

// データベースの初期化
// テーブルが存在しない場合に作成します
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL UNIQUE,
    nickname TEXT NOT NULL UNIQUE,
    pincode TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS learning_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    problem_id TEXT NOT NULL,
    is_correct INTEGER NOT NULL, -- 0 for false, 1 for true
    hints_used_count INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`)

console.log('Database initialized successfully at:', dbPath)

// エクスポートして他のファイルで利用できるようにする
export default db
