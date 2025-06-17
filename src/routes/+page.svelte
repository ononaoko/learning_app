<script>
    import { isLoggedIn, nickname } from '$lib/authStore';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    let newUserNickname = '';
    let newUserPincode = '';
    let existingUserNickname = '';
    let existingUserPincode = '';
    let registrationError = '';
    let loginError = '';

    // ★ユーザーリストはサーバーから取得するように変更するが、最初は空でOK★
    // let users = {}; // LocalStorageから読み込むための変数は不要になるが、
                     // セレクトボックスのオプションのために、最初は空配列/オブジェクトを定義

    let registeredUserNicknames = []; // 登録済みユーザーのニックネームリスト

    onMount(async () => {
      // LocalStorageからの読み込みは不要になるが、既存ユーザー選択のためにニックネームリストは必要
      // 登録済みユーザーのニックネームをAPIから取得
      await fetchRegisteredUsers();

      // ログイン済みであればダッシュボードへリダイレクト（Cookieベースの認証を想定）
      // このロジックはhook.server.jsと連携してより堅牢になる
      if ($isLoggedIn) {
        goto('/dashboard');
      }
    });

    // ★登録済みユーザーのニックネームを取得する関数★
    async function fetchRegisteredUsers() {
        try {
            const response = await fetch('/api/auth/users'); // 新しいAPIエンドポイント (後で作成)
            if (response.ok) {
                const data = await response.json();
                registeredUserNicknames = data.nicknames;
            } else {
                console.error('登録済みユーザーの取得に失敗しました:', response.statusText);
            }
        } catch (error) {
            console.error('登録済みユーザーの取得中にエラーが発生しました:', error);
        }
    }


    // 新規ユーザー登録の処理
    async function registerNewUser() {
      registrationError = ''; // エラーをリセット

      if (newUserNickname && newUserPincode.length === 4) {
        try {
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nickname: newUserNickname, pincode: newUserPincode })
          });

          const data = await response.json();

          if (response.ok) {
            // 登録成功
            nickname.set(data.nickname); // APIから返されたニックネームを使用 (ここでは不要かも)
            isLoggedIn.set(true);

            // ニックネームリストを更新（即時反映のため）
            await fetchRegisteredUsers();

            // 入力フィールドをリセット
            newUserNickname = '';
            newUserPincode = '';

            goto('/dashboard'); // ダッシュボードへ遷移
          } else {
            // 登録失敗（例: ニックネーム重複など）
            registrationError = data.message;
          }
        } catch (error) {
          console.error('新規登録リクエストエラー:', error);
          registrationError = 'サーバーとの通信に失敗しました。';
        }
      } else {
        registrationError = 'ニックネームと4桁のピンコードを入力してください。';
      }
    }

    // 既存ユーザーログインの処理
    async function loginExistingUser() {
      loginError = ''; // エラーをリセット

      if (existingUserNickname && existingUserPincode.length === 4) {
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nickname: existingUserNickname, pincode: existingUserPincode })
          });

          const data = await response.json();

          if (response.ok) {
            // ログイン成功
            nickname.set(data.nickname); // APIから返されたニックネームを使用
            isLoggedIn.set(true);

            // 入力フィールドをリセット
            existingUserPincode = '';

            goto('/dashboard'); // ダッシュボードへ遷移
          } else {
            // ログイン失敗
            loginError = data.message;
          }
        } catch (error) {
          console.error('ログインリクエストエラー:', error);
          loginError = 'サーバーとの通信に失敗しました。';
        }
      } else {
        loginError = 'ユーザーを選択し、4桁のピンコードを入力してください。';
      }
    }

    // ログアウト処理 (ダッシュボードからのログアウトに使う)
    async function logoutUser() {
      try {
        // サーバーサイドのログアウトAPIを呼ぶ (まだ作成していないが、将来的に必要)
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (response.ok) {
          console.log('サーバーサイドでログアウト');
        } else {
          console.error('サーバーサイドログアウト失敗:', response.statusText);
        }
      } catch (error) {
        console.error('ログアウトリクエストエラー:', error);
      } finally {
        isLoggedIn.set(false);
        nickname.set('');
        // localStorage.removeItem('users'); // LocalStorageはもう使わない
        goto('/login'); // ログインページに留まる
      }
    }

    // 匿名IDを生成する関数（匿名ログイン用）
    // 匿名ユーザーのデータはDBには保存しないため、このIDは学習記録には使わない
    // または、専用の匿名ユーザーIDを生成し、一時的なセッションとして扱うことも可能
    function generateAnonymousId() {
      return `anonymous_user_${Date.now()}`;
    }

    // 匿名で始めるボタンの処理
    function startAnonymousSession() {
      const anonId = generateAnonymousId();
      nickname.set(anonId); // ニックネームストアに匿名IDを設定
      isLoggedIn.set(true); // ログイン状態にする
      // クッキーに匿名IDを設定 (セッション管理の一環)
      document.cookie = `user_id=${anonId}; path=/; max-age=${60 * 60 * 24};`; // 1日有効
      document.cookie = `nickname=${anonId}; path=/; max-age=${60 * 60 * 24};`; // 1日有効

      goto('/dashboard');
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
              {#each registeredUserNicknames as userNickname}
                <option value={userNickname}>{userNickname}</option>
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
          class=" bg-teal-400 text-white w-1/2 border-b-[1px] transition-all duration-150 [box-shadow:0_5px_0_0_#14b8a6,0_10px_0_0_#d1d5db] hover:[box-shadow:0_0px_0_0_#14b8a6,0_0px_0_0_#d1d5db] hover:border-b-[0px] hover:translate-y-2 border-teal-500  font-bold py-4 rounded-md focus:outline-none focus:shadow-outline"
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
        または <button class="text-teal-500 hover:underline" on:click={startAnonymousSession}>匿名で始める</button>
        <br><span class="text-stone-700 text-xs">※匿名では学習データが蓄積されません。</span>
      </p>
    </main>