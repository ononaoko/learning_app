<script>
	import '../app.css'; // グローバルCSS
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { isLoggedIn, nickname } from '$lib/authStore';
	import AudioManager from '$lib/components/AudioManager.svelte';
	import AuthGuard from '$lib/components/AuthGuard.svelte';
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

	// 戻るボタンの表示判定 - Svelte 5 runes mode
	let showBackButton = $derived(browser && $page.url.pathname !== '/');

	// 効果音付き戻るボタン
	async function goBack() {
		await audioStore.play('click');

		// 戻る履歴があるかチェック
		if (window.history.length > 1) {
			window.history.back();
		} else {
			// 履歴がない場合はホームに遷移
			goto('/');
		}
	}
</script>

<!-- 全ページ共通で効果音システムを初期化 -->
<AudioManager />

<!-- 全ページ共通で認証ガードを初期化 -->
<AuthGuard />

<!-- 各ページのコンテンツがここに表示される -->
{@render children()}

<!-- 曲線的な戻るボタン（画面右端に固定） -->
{#if showBackButton}
<div class="fixed right-0 bottom-1/20 transform -translate-y-1/2 z-40 flex flex-col items-end">
	<span class="bg-teal-400 w-4 h-4 top-curve"></span>
	<button
		class="rounded-l-4xl bg-teal-400 text-white"
		onclick={goBack}
		aria-label="戻る"
		style="
			padding: 1rem 0.75rem;
		"
	>
		<!-- 戻るアイコン（矢印） -->
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="3"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M19 12H5"/>
			<path d="m12 19-7-7 7-7"/>
		</svg>
	</button>
	<span class="bottom-curve bg-teal-400 w-4 h-4"></span>
</div>
{/if}

<style>

.top-curve {
  mask: radial-gradient(circle at top left, transparent 70%, black 71%);
  -webkit-mask: radial-gradient(circle at top left, transparent 70%, black 71%);
}
.bottom-curve {
  mask: radial-gradient(circle at top left, transparent 70%, black 71%);
  -webkit-mask: radial-gradient(circle at bottom left, transparent 70%, black 71%);
}
</style>