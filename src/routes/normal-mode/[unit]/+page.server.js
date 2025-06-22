// src/routes/normal-mode/[unit]/+page.server.js
import { error } from '@sveltejs/kit'
import { units as allUnits } from '$lib/data/units' // units.js をインポート

// units.js から全てのユニットIDと、それが属するサブカテゴリー名を取得するヘルパー関数
// (learning-stats/+server.js と同じロジックを再利用)
function getFlatUnitsWithSubcategory(unitList, currentSubcategoryName = '未分類') {
	let flatUnits = []
	unitList.forEach((item) => {
		if (item.type === 'unit') {
			flatUnits.push({ id: item.id, name: item.name, subcategoryName: currentSubcategoryName })
		} else if (item.type === 'subcategory' && item.sub_units) {
			flatUnits = flatUnits.concat(getFlatUnitsWithSubcategory(item.sub_units, item.name))
		} else if (item.type === 'category' && item.sub_units) {
			flatUnits = flatUnits.concat(
				getFlatUnitsWithSubcategory(item.sub_units, currentSubcategoryName)
			)
		}
	})
	return flatUnits
}

// 全ての単元のID、名前、およびそれが属するサブカテゴリー名のリスト
const flatUnitListWithSubcategory = getFlatUnitsWithSubcategory(allUnits)

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, cookies }) {
	// params を追加で受け取る
	let userId = 'anonymous'
	const userIdFromCookie = cookies.get('user_id')

	if (userIdFromCookie) {
		userId = userIdFromCookie
	}

	// ★修正: $page.params.unit に対応する unitName を units.js から取得★
	const unitId = params.unit // URLパラメータからunitIdを取得
	const unitInfo = flatUnitListWithSubcategory.find((u) => u.id === unitId)

	let unitDisplayName = ''
	let subcategoryDisplayName = ''

	if (unitInfo) {
		unitDisplayName = unitInfo.name // 例: '代数'
		subcategoryDisplayName = unitInfo.subcategoryName // 例: 'デバック用'
	} else {
		// 見つからない場合はエラーまたはデフォルト値を設定
		console.warn(`Unit ID "${unitId}" not found in units.js for normal mode.`)
		throw error(404, 'Unit not found') // 404エラーを返す
	}

	return {
		userId: userId,
		unitDisplayName: unitDisplayName, // '代数'
		subcategoryDisplayName: subcategoryDisplayName // 'デバック用'
	}
}
