<script>
    import { goto } from '$app/navigation';
    import { slide } from 'svelte/transition';
    import { isLoggedIn, nickname } from '$lib/authStore'; // ログイン状態とニックネームのストアをインポート

    export let isOpen = false; // メニューの開閉状態を親から受け取る

    // メニュー項目を配列で定義
    const menuItems = [
      { name: 'ホーム', path: '/dashboard', requiresLogin: true },
      { name: '演習モード', path: '/normal-mode', requiresLogin: true },
      { name: 'エビングハウス モード', path: '/ebbinghaus-mode', requiresLogin: true },
      { name: '弱点克服モード', path: '/review-mode', requiresLogin: true } // 弱点克服モードは /review-mode へ
    ];

    // 各メニュー項目をクリックしたときの処理
    function handleNavigation(path) {
      goto(path);
      isOpen = false; // メニューを閉じる
    }

    // ログアウト処理
    function logout() {
      isLoggedIn.set(false);
      nickname.set('');
      localStorage.removeItem('users'); // ローカルストレージのユーザー情報をクリア
      goto('/login'); // ログアウトしたらログインページへ遷移
      isOpen = false; // メニューを閉じる
    }
  </script>

  {#if isOpen}
    <nav
      transition:slide={{ duration: 200 }}
      class="absolute top-[calc(100%-1rem)] right-[1rem] w-1/3 bg-white shadow-lg rounded-md z-10"
    >
      <ul class="flex flex-col py-2">
        {#each menuItems as item}
          {#if item.requiresLogin ? $isLoggedIn : true}
            <li>
              <button
                class="block text-gray-700 py-4 px-6 hover:bg-stone-200 rounded-md w-full text-left text-lg font-semibold"
                on:click={() => handleNavigation(item.path)}
              >
                {item.name}
              </button>
            </li>
          {/if}
        {/each}
        {#if $isLoggedIn}
          <li>
            <button
              class="block text-red-500 py-4 px-6 hover:bg-stone-200 rounded-md w-full text-left text-lg font-semibold border-t border-gray-200 mt-2 pt-2"
              on:click={logout}
            >
              ログアウト
            </button>
          </li>
        {/if}
      </ul>
    </nav>
  {/if}