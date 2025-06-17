// src/lib/server/problems-data/problemsStore.js
import { promises as fs } from 'fs'
import path from 'path'

// 問題データが保存されているディレクトリのパス
// process.cwd() はアプリケーションのルートディレクトリを指します
const problemsDir = path.resolve(process.cwd(), 'src', 'lib', 'data')

/**
 * 全ての単元の問題データをロードし、単元IDをキーとするオブジェクトとして返す。
 * 各単元の問題データはJSONファイルからパースされる。
 * @returns {Promise<Object.<string, Array<Object>>>} 例: { algebra: [...], geometry: [...] }
 */
export async function loadProblems() {
	const problemsByUnit = {}
	try {
		// 問題データディレクトリ内のファイルを読み込む
		const files = await fs.readdir(problemsDir)

		for (const file of files) {
			// .json ファイルのみを対象とする
			if (file.endsWith('.json')) {
				// ファイル名から単元IDを抽出 (例: 'algebra.json' -> 'algebra')
				const unitId = path.basename(file, '.json')
				const filePath = path.join(problemsDir, file)

				// ファイルの内容を読み込み、JSONとしてパースする
				const data = await fs.readFile(filePath, 'utf-8')
				problemsByUnit[unitId] = JSON.parse(data)
			}
		}
	} catch (error) {
		console.error('Error loading problems data from file system:', error)
		// エラーが発生した場合でも、空のオブジェクトを返すか、エラーを再スローするか、
		// アプリケーションの要件に応じてハンドリングします。
		// ここではエラーをログに出し、空のオブジェクトを返すことで、
		// 他の処理が中断されないようにしています。
		return {}
	}
	return problemsByUnit
}
