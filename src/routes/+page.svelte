<script>
	import { isLoggedIn, nickname } from '$lib/authStore';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// フォームの入力値とエラーメッセージを管理するリアクティブ変数
	let newUserNickname = '';
	let newUserPincode = '';
	let existingUserNickname = '';
	let existingUserPincode = '';
	let registrationError = '';
	let loginError = '';

	// アプリに登録されているユーザー情報を一時的に保持するオブジェクト
	// 実際にはLocalStorageやバックエンドのデータベースを使用します
	let users = {};

	// コンポーネントがDOMにマウントされたときに実行されるライフサイクル関数
	onMount(() => {
	  // LocalStorageから既存のユーザー情報を読み込む（永続化のための一時的な実装）
	  const storedUsers = localStorage.getItem('users');
	  if (storedUsers) {
		users = JSON.parse(storedUsers);
	  }
	  // ログイン済みであればダッシュボードへリダイレクト
	  if ($isLoggedIn) { // ストアの値を直接参照
		goto('/dashboard');
	  }
	});

	// 匿名IDを生成する関数（例: "user_1678888888888"のような形式）
	function generateAnonymousId() {
	  return `user_${Date.now()}`;
	}

	// 新規ユーザー登録の処理
	async function registerNewUser() {
	  // ニックネームと4桁のピンコードが入力されているか確認
	  if (newUserNickname && newUserPincode.length === 4) {
		// ニックネームがすでに使われているか確認
		if (users[newUserNickname]) {
		  registrationError = 'このニックネームは既に使われています。';
		} else {
		  // ユーザー情報を登録（一時的にオブジェクトに保存し、LocalStorageにも保存）
		  users[newUserNickname] = newUserPincode;
		  localStorage.setItem('users', JSON.stringify(users));

		  // ストアのログイン状態とニックネームを更新
		  nickname.set(newUserNickname);
		  isLoggedIn.set(true);

		  // エラーメッセージをクリアし、入力フィールドをリセット
		  registrationError = '';
		  newUserNickname = '';
		  newUserPincode = '';

		  // ダッシュボードページへ自動遷移
		  goto('/dashboard');
		}
	  } else {
		registrationError = 'ニックネームと4桁のピンコードを入力してください。';
	  }
	}

	// 既存ユーザーログインの処理
	async function loginExistingUser() {
	  // ユーザー選択と4桁のピンコードが入力されているか確認
	  if (existingUserNickname && existingUserPincode.length === 4) {
		// 入力されたピンコードが登録されているピンコードと一致するか確認
		if (users[existingUserNickname] === existingUserPincode) {
		  // ストアのログイン状態とニックネームを更新
		  nickname.set(existingUserNickname);
		  isLoggedIn.set(true);

		  // エラーメッセージをクリアし、入力フィールドをリセット
		  loginError = '';
		  existingUserPincode = '';

		  // ダッシュボードページへ自動遷移
		  goto('/dashboard');
		} else {
		  loginError = 'ピンコードが間違っています。';
		}
	  } else {
		loginError = 'ユーザーを選択し、4桁のピンコードを入力してください。';
	  }
	}

	// ログアウト処理（このページではボタンを配置しないが、他のページからの遷移で呼び出される可能性を考慮）
	function logoutUser() {
	  isLoggedIn.set(false);
	  nickname.set('');
	  localStorage.removeItem('users'); // LocalStorageのユーザー情報もクリア
	  // ログインページなので、ログアウト後はこのページに留まる
	}
  </script>

  <svelte:head>
	<title>算数学習アプリ - ログイン</title>
  </svelte:head>
  <main class="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-16">
	<header class="mb-8 w-full max-w-md flex justify-between items-center">
	  {#if $isLoggedIn}
		<button class="text-red-500 hover:underline" on:click={logoutUser}>ログアウト</button>
	  {/if}
	</header>

	<div class="bg-white shadow-lg rounded-lg p-8 w-full max-w-5xl min-h-[500px]">
	  <h1 class="text-5xl font-bold text-stone-700 text-center mb-8">ONO学習アプリ</h1>

	  <div class="md:flex md:space-x-16 md:max-w-4xl md:mx-auto">

		<div class="md:w-1/2 flex flex-col items-center">
			<div class="w-full text-left">
						  <h2 class="text-2xl font-bold text-teal-500 mb-2 ">ログイン:</h2>
			</div>
		  <div class="mb-4 w-full">
			<label class="block text-stone-700 text-sm font-bold mb-2" for="existing-nickname">
			  ニックネームを選択:
			</label>
			<select
			class="shadow appearance-none border rounded w-full py-2 px-3 text-stone-700 leading-tight focus:outline-none focus:shadow-outline"
			id="existing-nickname"
			  bind:value={existingUserNickname}
			>
			  <option value="">選択してください</option>
			  {#each Object.keys(users) as user}
				<option value={user}>{user}</option>
			  {/each}
			</select>
		  </div>
		  <div class="mb-6 w-full">
			<label class="block text-stone-700 text-sm font-bold mb-2" for="existing-pincode">
			  ピンコード:
			</label>
			<input
			class="shadow appearance-none border rounded w-full py-2 px-3 text-stone-700 leading-tight focus:outline-none focus:shadow-outline"
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
		  class=" bg-teal-400 text-white w-1/2 border-b-[1px] transition-all duration-150 [box-shadow:0_5px_0_0_#14b8a6,0_10px_0_0_#d1d5db] hover:[box-shadow:0_0px_0_0_#14b8a6,0_0px_0_0_#d1d5db] hover:border-b-[0px] hover:translate-y-2 border-teal-400  font-bold py-4 rounded-md focus:outline-none focus:shadow-outline"
		  			type="button"
			on:click={loginExistingUser}
			disabled={!existingUserNickname}
		  >
			ログイン
		  </button>
		</div>

		<hr class="my-8 border-t border-stone-400 border-dashed md:hidden w-full" />

		<div class="hidden md:block border-l border-stone-400 border-dashed h-auto"></div>

		<div class="mt-8 md:mt-0 md:w-1/2 flex flex-col items-center">
			<div class="w-full text-left">
				<h2 class="text-2xl font-bold text-stone-500 mb-2">新規登録:</h2>
			</div>

		  <div class="mb-4 w-full">
			<label class="block text-stone-700 text-sm font-bold mb-2" for="new-nickname">
			  ニックネームを入力:
			</label>
			<input
			  class="shadow appearance-none border rounded w-full py-2 px-3 text-stone-700 leading-tight focus:outline-none focus:shadow-outline"
			  id="new-nickname"
			  type="text"
			  placeholder="ニックネームを入力"
			  bind:value={newUserNickname}
			/>
		  </div>
		  <div class="mb-6 w-full">
			<label class="block text-stone-700 text-sm font-bold mb-2" for="new-pincode">
			  ピンコード（4桁）:
			</label>
			<input
			  class="shadow appearance-none border rounded w-full py-2 px-3 text-stone-700 leading-tight focus:outline-none focus:shadow-outline"
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
			class=" bg-stone-400 text-white w-1/2 border-b-[1px] transition-all duration-150 [box-shadow:0_5px_0_0_#57534e,0_10px_0_0_#d1d5db] hover:[box-shadow:0_0px_0_0_#14b8a6,0_0px_0_0_#d1d5db] hover:border-b-[0px] hover:translate-y-2 border-stone-400  font-bold py-4 rounded-md focus:outline-none focus:shadow-outline"
			type="button"
			  on:click={registerNewUser}
			>
			  新規登録
			</button>
		  </div>
		</div>
	  </div>
	  <p class="mt-4 text-center text-stone-700 text-sm">
		または <button class="text-teal-500 hover:underline" on:click={() => { nickname.set(generateAnonymousId()); isLoggedIn.set(true); goto('/dashboard'); }}>匿名で始める</button>
		<br><span class="text-stone-700 text-xs">※匿名では学習データが蓄積されません。</span>
	  </p>
	</main>
