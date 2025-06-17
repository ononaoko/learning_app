<script>
	import '../app.css'; // グローバルCSS
	import { onMount } from 'svelte';
	import { isLoggedIn, nickname } from '$lib/authStore';

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

  </script>

  {@render children()}