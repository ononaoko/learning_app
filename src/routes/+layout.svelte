<script>
	import '../app.css'; // グローバルCSS
	import { onMount } from 'svelte';
	import { isLoggedIn, nickname } from '$lib/authStore';
	import AudioManager from '$lib/components/AudioManager.svelte';
	import { audioStore } from '$lib/stores/audioStore.js';

	// ★重要: children プロパティを受け取る行を再追加します★
	let { children } = $props();

	// サーバーからのユーザー情報を受け取る (Hooksでevent.locals.userを設定した場合)
	// export let data; // layout.server.js からデータを渡す場合 (まだ未実装なのでコメントアウトでOK)

	onMount(() => {
	  // クライアントサイドでCookieから直接読み込むか、
	  // サーバーサイドのlayout.server.jsから渡されたデータを使う
	  const userIdFromCookie = document.cookie.split('; ').find(row => row.startsWith('user_id='))?.split('=')[1];
	  const nicknameFromCookie = document.cookie.split('; ').find(row => row.startsWith('nickname='))?.split('=')[1];

	  if (userIdFromCookie && nicknameFromCookie) {
		isLoggedIn.set(true);
		nickname.set(decodeURIComponent(nicknameFromCookie)); // エンコードされている可能性を考慮
	  } else {
		isLoggedIn.set(false);
		nickname.set('');
	  }
	});

	// 効果音設定の表示/非表示 - Svelte 5のリアクティブ変数
	let showAudioSettings = $state(false);

	function toggleAudioSettings() {
		showAudioSettings = !showAudioSettings;
	}
</script>

<!-- 全ページ共通で効果音システムを初期化 -->
<AudioManager />

<!-- 各ページのコンテンツがここに表示される -->
{@render children()}

<!-- 効果音設定パネル -->
<div class="fixed bottom-4 right-4 z-50">
	{#if showAudioSettings}
		<div class="bg-white rounded-lg shadow-lg p-4 mb-2 min-w-[200px] [box-shadow:var(--shadow-neumorphic-convex)]">
			<h3 class="text-sm font-bold text-stone-700 mb-3">効果音設定</h3>

			<div class="space-y-2">
				<label class="flex items-center justify-between text-sm text-stone-600">
					<span>効果音</span>
					<button
						class="relative inline-flex h-6 w-11 items-center rounded-full bg-stone-300 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
						class:bg-teal-500={$audioStore.isEnabled}
						onclick={() => audioStore.toggle()}
						aria-label="効果音のON/OFF切り替え"
					>
						<span
							class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
							class:translate-x-6={$audioStore.isEnabled}
							class:translate-x-1={!$audioStore.isEnabled}
						></span>
					</button>
				</label>

				<label class="flex items-center justify-between text-sm text-stone-600">
					<span>音量</span>
					<input
						type="range"
						min="0"
						max="1"
						step="0.1"
						value={$audioStore.volume}
						oninput={(e) => audioStore.setVolume(parseFloat(e.target.value))}
						class="w-16 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
						aria-label="音量調整"
					/>
				</label>
			</div>

			<div class="mt-3 pt-2 border-t border-stone-200">
				<button
					class="text-xs text-teal-600 hover:text-teal-800"
					onclick={() => audioStore.play('click')}
					aria-label="効果音のテスト再生"
				>
					🔊 テスト再生
				</button>
			</div>
		</div>
	{/if}

	<button
		class="bg-stone-100 hover:bg-stone-200 p-3 rounded-full shadow-lg transition-all duration-200 [box-shadow:var(--shadow-neumorphic-convex)]"
		class:bg-stone-200={showAudioSettings}
		onclick={toggleAudioSettings}
		aria-label="効果音設定を開く"
	>
		<span class="text-lg">🔊</span>
	</button>
</div>