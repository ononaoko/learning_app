<script>
	import { isLoggedIn, nickname } from '$lib/authStore';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let newUserNickname = '';
	let newUserPincode = '';
	let existingUserNickname = '';
	let existingUserPincode = '';
	let users = {}; // ユーザー情報を一時的に保存（実際にはlocalStorageなどを検討）
	let registrationError = '';
	let loginError = '';

	onMount(() => {
	  const storedUsers = localStorage.getItem('users');
	  if (storedUsers) {
		users = JSON.parse(storedUsers);
	  }
	});

	function generateAnonymousId() {
	  return `user_${Date.now()}`;
	}

	async function registerNewUser() {
	  // ... (registerNewUser 関数の内容は変更なし)
	}

	async function loginExistingUser() {
	  // ... (loginExistingUser 関数の内容は変更なし)
	}

	function goToStats() {
	  goto('/stats');
	}

	function logoutUser() {
	  isLoggedIn.set(false);
	  nickname.set('');
	  // 必要であれば、localStorageのユーザー情報もクリアする
	  localStorage.removeItem('users');
	}
  </script>

  <svelte:head>
	<title>算数学習アプリ</title>
  </svelte:head>

  <main class="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
	<header class="mb-8">
	  {#if $isLoggedIn}
		<button class="text-red-500 hover:underline" on:click={logoutUser}>ログアウト</button>
	  {:else}
		<button class="text-blue-500 hover:underline" on:click={() => goto('/')}>ホーム</button>
	  {/if}
	</header>

	<h1 class="text-5xl font-bold text-green-600 mb-8">算数学習アプリ</h1>

	{#if !$isLoggedIn}
	  <div class="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-md">
		<h2 class="text-2xl font-bold text-gray-700 mb-4">ユーザー選択</h2>

		<div class="mb-4">
		  <label class="block text-gray-700 text-sm font-bold mb-2" for="existing-nickname">
			既存のユーザー:
		  </label>
		  <select
			class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
			id="existing-nickname"
			bind:value={existingUserNickname}
		  >
			<option value="">選択してください</option>
			{#each Object.keys(users) as user}
			  <option value={user}>{user}</option>
			{/each}
		  </select>
		</div>
		<div class="mb-6">
		  <label class="block text-gray-700 text-sm font-bold mb-2" for="existing-pincode">
			ピンコード:
		  </label>
		  <input
			class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
			id="existing-pincode"
			type="text"
			pattern="\d{4}"
			placeholder="ピンコード（4桁）"
			bind:value={existingUserPincode}
		  />
		  {#if loginError}
			<p class="text-red-500 text-xs italic">{loginError}</p>
		  {/if}
		</div>
		<button
		  class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
		  type="button"
		  on:click={loginExistingUser}
		  disabled={!existingUserNickname}
		>
		  ログイン
		</button>

		<hr class="my-6 border-t" />

		<div class="mb-4">
		  <label class="block text-gray-700 text-sm font-bold mb-2" for="new-nickname">
			ニックネームを入力:
		  </label>
		  <input
			class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
			id="new-nickname"
			type="text"
			placeholder="ニックネームを入力"
			bind:value={newUserNickname}
		  />
		</div>
		<div class="mb-6">
		  <label class="block text-gray-700 text-sm font-bold mb-2" for="new-pincode">
			ピンコード（4桁）:
		  </label>
		  <input
			class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
			id="new-pincode"
			type="text"
			pattern="\d{4}"
			placeholder="ピンコード（4桁）"
			bind:value={newUserPincode}
		  />
		  {#if registrationError}
			<p class="text-red-500 text-xs italic">{registrationError}</p>
		  {/if}
		</div>
		<button
		  class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
		  type="button"
		  on:click={registerNewUser}
		>
		  新規登録
		</button>

		<p class="mt-4 text-center text-gray-600 text-sm">
		  または <button class="text-blue-500 hover:underline" on:click={() => { nickname.set(generateAnonymousId()); isLoggedIn.set(true); }}>匿名で始める</button>
		</p>
	  </div>
	{/if}

	{#if $isLoggedIn}
	  <div class="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-md text-center">
		<h2 class="text-2xl font-bold text-gray-700 mb-4">ようこそ、{$nickname} さん！</h2>
		<p class="text-gray-700 text-base mb-4">モードを選択してください。</p>
		<div class="flex justify-center space-x-4 mb-4">
		  <button
			class="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
			on:click={() => goto('/normal-mode')}
		  >
			通常モード
		  </button>
		  <button
			class="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
			on:click={() => goto('/review-mode')}
		  >
			復習モード
		  </button>
		</div>
	  </div>
	{/if}

	<button class="text-blue-500 hover:underline" on:click={goToStats}>学習統計を見る</button>
  </main>