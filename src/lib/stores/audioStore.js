// $lib/stores/audioStore.js
import { writable } from 'svelte/store'

// 効果音の状態管理
const createAudioStore = () => {
	const { subscribe, set, update } = writable({
		sounds: {},
		isEnabled: true,
		volume: 1.0
	})

	return {
		subscribe,

		// 音声要素を登録
		registerSounds: (soundMap) => {
			update((state) => ({
				...state,
				sounds: { ...state.sounds, ...soundMap }
			}))
		},

		// 効果音を再生
		play: async (soundName, options = {}) => {
			const state = get(audioStore)

			if (!state.isEnabled) {
				console.log(`効果音が無効化されているため、${soundName}を再生しません`)
				return
			}

			const sound = state.sounds[soundName]
			if (!sound) {
				console.warn(`効果音 "${soundName}" が見つかりません`)
				return
			}

			try {
				// 音声を最初から再生
				sound.currentTime = 0

				// 音量設定（オプションで上書き可能）
				sound.volume = options.volume !== undefined ? options.volume : state.volume

				await sound.play()
				console.log(`効果音 "${soundName}" を再生しました`)
			} catch (error) {
				console.error(`効果音 "${soundName}" の再生に失敗:`, error)
			}
		},

		// 効果音を再生して遅延実行
		playWithDelay: async (soundName, callback, delay = 200, options = {}) => {
			await audioStore.play(soundName, options)

			if (callback) {
				setTimeout(callback, delay)
			}
		},

		// 効果音の有効/無効を切り替え
		toggle: () => {
			update((state) => ({
				...state,
				isEnabled: !state.isEnabled
			}))
		},

		// 音量を設定
		setVolume: (volume) => {
			update((state) => ({
				...state,
				volume: Math.max(0, Math.min(1, volume))
			}))
		},

		// 効果音を有効化
		enable: () => {
			update((state) => ({
				...state,
				isEnabled: true
			}))
		},

		// 効果音を無効化
		disable: () => {
			update((state) => ({
				...state,
				isEnabled: false
			}))
		}
	}
}

// get関数をインポート
import { get } from 'svelte/store'

export const audioStore = createAudioStore()
