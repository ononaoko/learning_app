// src/lib/server/user-data/userStore.js (SQLite データベースを利用するように修正)
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// データベースファイルのパスを解決
// アプリケーションルートの 'app.db' を指すように調整
const dbPath = path.resolve(process.cwd(), 'src', 'lib', 'server', 'app.db')

// データベースディレクトリが存在することを確認
const dbDir = path.dirname(dbPath)
if (!fs.existsSync(dbDir)) {
	fs.mkdirSync(dbDir, { recursive: true })
}

// データベースインスタンスの初期化
// production環境ではread-onlyモードなどを検討
const db = new Database(dbPath, { verbose: console.log }) // verboseでクエリログを出力（デバッグ用）

// データベーステーブルの初期化 (初回起動時のみ実行される)
function initializeDatabase() {
	db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY NOT NULL UNIQUE,
            nickname TEXT NOT NULL UNIQUE,
            pincode TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS user_data (
            user_id TEXT PRIMARY KEY NOT NULL UNIQUE,
            data TEXT NOT NULL, -- JSON文字列としてユーザーデータを保存
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `)
	console.log('Database initialized successfully (user_data table created/checked).')
}

// アプリケーション起動時に一度だけ初期化を実行
initializeDatabase()

/**
 * 指定されたユーザーのデータをデータベースから読み込む
 * @param {string} userId
 * @returns {object} ユーザーデータオブジェクト
 */
export async function loadUserData(userId) {
	try {
		// user_data テーブルからデータを取得
		const stmt = db.prepare('SELECT data FROM user_data WHERE user_id = ?')
		const row = stmt.get(userId)

		if (row) {
			return JSON.parse(row.data)
		} else {
			// ユーザーデータが存在しない場合、新しいデータオブジェクトを返す
			// users テーブルにuserIdが存在するか確認し、なければ初期データとしてユーザーも作成すべきロジックだが、
			// 現状はuser_idが存在しない場合は新しいデータオブジェクトを返すことで対応
			// もしusersテーブルにユーザーIDが登録されていないとエラーになる場合は、
			// ここでusersテーブルにもエントリを追加するロジックが必要になります。
			// 現状のAPIルートではuserIdは'anonymous'にもなるので、その場合はuser_dataテーブルのみの追加になります。
			return {
				totalLearningSessions: 0,
				consecutiveLearningDays: 0,
				unitStats: [],
				problemRecords: []
			}
		}
	} catch (error) {
		console.error(`Failed to load user data for ${userId} from DB:`, error)
		throw error // エラーを再スローしてAPIルートで捕捉させる
	}
}

/**
 * 指定されたユーザーのデータをデータベースに保存する
 * @param {string} userId
 * @param {object} userData - 保存するユーザーデータオブジェクト
 */
export async function saveUserData(userId, userData) {
	try {
		const jsonData = JSON.stringify(userData)
		// UPSERT (INSERT OR REPLACE) を使用して、データが存在すれば更新、なければ挿入
		const stmt = db.prepare(`
            INSERT INTO user_data (user_id, data) VALUES (?, ?)
            ON CONFLICT(user_id) DO UPDATE SET data=excluded.data
        `)
		stmt.run(userId, jsonData)
		console.log(`User data for ${userId} saved/updated successfully.`)
	} catch (error) {
		console.error(`Failed to save user data for ${userId} to DB:`, error)
		throw error // エラーを再スローしてAPIルートで捕捉させる
	}
}

// アプリケーション終了時にデータベースをクローズする（オプションだが推奨）
process.on('exit', () => db.close())
process.on('SIGHUP', () => process.exit(128 + 1))
process.on('SIGINT', () => process.exit(128 + 2))
process.on('SIGTERM', () => process.exit(128 + 15))
