<script>
  import { isLoggedIn, nickname } from '$lib/authStore';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import TealButton from '$lib/components/TealButton.svelte';

  let newUserNickname = '';
  let newUserPincode = '';
  let existingUserNickname = '';
  let existingUserPincode = '';
  let registrationError = '';
  let loginError = '';
  let registeredUserNicknames = [];

  // 効果音用の音声ファイル
  let buttonClickSound;
  let buttonSuccessSound;
  let buttonErrorSound;

  onMount(async () => {
      // 効果音の初期化
      buttonClickSound = new Audio('/sounds/click.mp3'); // クリック音
      buttonSuccessSound = new Audio('/sounds/success.mp3'); // 成功音
      buttonErrorSound = new Audio('/sounds/error.mp3'); // エラー音

      // 音量を調整（0.0〜1.0）
      buttonClickSound.volume = 0.5;
      buttonSuccessSound.volume = 0.3;
      buttonErrorSound.volume = 0.4;

      await fetchRegisteredUsers();

      if ($isLoggedIn) {
          goto('/dashboard');
      }
  });

  // 効果音を再生する関数
  async function playSound(audioElement) {
      try {
          audioElement.currentTime = 0; // 音声を最初から再生
          await audioElement.play();
      } catch (error) {
          console.log('音声再生に失敗しました:', error);
      }
  }

  // 遅延付きの処理実行関数
  async function executeWithDelay(soundType, callback) {
      // 効果音を再生
      switch (soundType) {
          case 'click':
              await playSound(buttonClickSound);
              break;
          case 'success':
              await playSound(buttonSuccessSound);
              break;
          case 'error':
              await playSound(buttonErrorSound);
              break;
      }

      // 200ms遅延
      await new Promise(resolve => setTimeout(resolve, 200));

      // コールバック実行
      if (callback) {
          callback();
      }
  }

  async function fetchRegisteredUsers() {
      try {
          const response = await fetch('/api/auth/users');
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

  // 新規ユーザー登録の処理（効果音付き）
  async function registerNewUser() {
      // クリック音を再生
      await playSound(buttonClickSound);

      registrationError = '';

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
                  // 成功音を再生して遅延後に画面遷移
                  await executeWithDelay('success', () => {
                      nickname.set(data.nickname);
                      isLoggedIn.set(true);
                      newUserNickname = '';
                      newUserPincode = '';
                      goto('/dashboard');
                  });

                  await fetchRegisteredUsers();
              } else {
                  // エラー音を再生
                  await playSound(buttonErrorSound);
                  registrationError = data.message;
              }
          } catch (error) {
              console.error('新規登録リクエストエラー:', error);
              await playSound(buttonErrorSound);
              registrationError = 'サーバーとの通信に失敗しました。';
          }
      } else {
          await playSound(buttonErrorSound);
          registrationError = 'ニックネームと4桁のピンコードを入力してください。';
      }
  }

  // 既存ユーザーログインの処理（効果音付き）
  async function loginExistingUser() {
      // クリック音を再生
      await playSound(buttonClickSound);

      loginError = '';

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
                  // 成功音を再生して遅延後に画面遷移
                  await executeWithDelay('success', () => {
                      nickname.set(data.nickname);
                      isLoggedIn.set(true);
                      existingUserPincode = '';
                      goto('/dashboard');
                  });
              } else {
                  // エラー音を再生
                  await playSound(buttonErrorSound);
                  loginError = data.message;
              }
          } catch (error) {
              console.error('ログインリクエストエラー:', error);
              await playSound(buttonErrorSound);
              loginError = 'サーバーとの通信に失敗しました。';
          }
      } else {
          await playSound(buttonErrorSound);
          loginError = 'ユーザーを選択し、4桁のピンコードを入力してください。';
      }
  }

  // 匿名ログインの処理（効果音付き）
  async function startAnonymousSession() {
      // 成功音を再生して遅延後に画面遷移
      await executeWithDelay('success', () => {
          const anonId = generateAnonymousId();
          nickname.set(anonId);
          isLoggedIn.set(true);
          document.cookie = `user_id=${anonId}; path=/; max-age=${60 * 60 * 24};`;
          document.cookie = `nickname=${anonId}; path=/; max-age=${60 * 60 * 24};`;
          goto('/dashboard');
      });
  }

  function generateAnonymousId() {
      return `anonymous_user_${Date.now()}`;
  }

  async function logoutUser() {
      try {
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
          goto('/login');
      }
  }
</script>

<svelte:head>
  <title>算数学習アプリ - ログイン</title>
</svelte:head>

<main class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-stone-100 via-stone-100 to-stone-200 sm:p-16 p-4">
  <div class="bg-stone-100 rounded-lg p-8 w-full max-w-5xl min-h-[500px] [box-shadow:var(--shadow-neumorphic-convex)]">
      <h1><img src="/img/logo.svg" alt="ONOTE.APP" class="max-w-80 mx-auto mb-8"></h1>
      <div class="md:flex md:space-x-8 md:max-w-4xl md:mx-auto">
          <div class="md:w-1/2 flex flex-col items-center gap-4">
              <div class="w-full text-center bg-teal-400 rounded-full">
                  <h2 class="text-2xl font-bold text-white font-sans p-1">ログイン</h2>
              </div>
              <div class="w-full px-4">
                  <label class="block text-stone-700 text-sm font-bold mb-2" for="existing-nickname">
                      ニックネームを選択:
                  </label>
                  <select
                      class="rounded-md w-full py-2 px-3 leading-tight font-sans bg-stone-100 [box-shadow:var(--shadow-neumorphic-concave)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                      class:text-stone-400={!existingUserNickname}
                      class:text-stone-700={existingUserNickname}
                      id="existing-nickname"
                      bind:value={existingUserNickname}
                  >
                      <option value="" disabled class="text-stone-400">選択してください</option>
                      {#each registeredUserNicknames as userNickname}
                          <option value={userNickname} class="text-stone-700">{userNickname}</option>
                      {/each}
                  </select>
              </div>
              <div class="w-full px-4">
                  <label class="block text-stone-700 text-sm font-bold mb-2" for="existing-pincode">
                      ピンコード:
                  </label>
                  <input
                      class="rounded-md w-full py-2 px-3 text-stone-700 placeholder:text-stone-400 leading-tight font-sans bg-stone-100 [box-shadow:var(--shadow-neumorphic-concave)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
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
              <TealButton
                  text="ログイン"
                  onClick={loginExistingUser}
                  disabled={!existingUserNickname}
                  widthClass="w-1/2"
              />
          </div>

          <hr class="my-8 border-t border-stone-400 border-dashed md:hidden w-full" />
          <div class="hidden md:block border-l border-stone-400 border-dashed h-auto"></div>

          <div class="mt-8 md:mt-0 md:w-1/2 flex flex-col items-center gap-4">
              <div class="w-full text-center bg-stone-400 rounded-full">
                  <h2 class="text-2xl font-bold text-white p-1 font-sans">新規登録</h2>
              </div>
              <div class="w-full px-4">
                  <label class="block text-stone-700 text-sm font-bold mb-2" for="new-nickname">
                      ニックネームを入力:
                  </label>
                  <input
                      class="rounded-md w-full py-2 px-3 text-stone-700 placeholder:text-stone-400 leading-tight font-sans bg-stone-100 [box-shadow:var(--shadow-neumorphic-concave)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                      id="new-nickname"
                      type="text"
                      placeholder="ニックネームを入力"
                      bind:value={newUserNickname}
                  />
              </div>
              <div class="w-full px-4">
                  <label class="block text-stone-700 text-sm font-bold mb-2" for="new-pincode">
                      ピンコード（4桁）:
                  </label>
                  <input
                      class="rounded-md w-full py-2 px-3 text-stone-700 placeholder:text-stone-400 leading-tight font-sans bg-stone-100 [box-shadow:var(--shadow-neumorphic-concave)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
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
              <TealButton
                  text="新規登録"
                  onClick={registerNewUser}
                  disabled={!newUserNickname || !newUserPincode}
                  widthClass="w-1/2"
                  buttonColorClass="bg-stone-400"
                  borderColorClass="border-stone-600"
                  shadowColorClass="[box-shadow:0_5px_0_0_#78716c,0_10px_0_0_#d1d5db]"
                  hoverShadowColorClass="hover:[box-shadow:0_0_0_0_#78716c,0_0_0_0_#d1d5db]"
                  textColorClass="text-white"
              />
          </div>
      </div>
      <p class="mt-4 text-center text-stone-700 text-sm">
          または <button class="text-teal-500 hover:underline" on:click={startAnonymousSession}>匿名で始める</button>
          <br><span class="text-stone-700 text-xs">※匿名では学習データが蓄積されません。</span>
      </p>
  </div>
</main>