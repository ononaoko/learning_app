<script>
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { slide } from 'svelte/transition';
    import IconHamburger from '$lib/components/IconHamburger.svelte';
    import DiagonalFraction from '$lib/components/DiagonalFraction.svelte';
    import AvatarMessage from '$lib/components/AvatarMessage.svelte';
    import IconCircle2 from '$lib/components/IconCircle2.svelte';
    import IconClose2 from '$lib/components/IconClose2.svelte';

    // page.state からデータを取得
    // 弱点克服モードではunitNameは不要なので、modeを直接使う
    $: mode = $page.state.mode || 'weakness'; // "weakness" または "normal" など、遷移元から受け取るモード
    $: results = $page.state.results || []; // 例: [true, true, false, true, false]
    $: totalQuestions = $page.state.totalQuestions || 0;
    $: correctAnswers = results.filter(Boolean).length; // 正解数（true の数）

    let isOpen = false;

    function toggleMenu() {
      isOpen = !isOpen;
    }

    function goToDashboard() {
      goto('/dashboard');
      isOpen = false; // メニューを閉じる
    }

    function goToWeaknessMode() {
      // 弱点克服モードの開始ページに戻る
      goto('/review-mode'); // 弱点克服モードのルートページ
      isOpen = false; // メニューを閉じる
    }

    // メッセージのロジック
    let resultMessage = '';
    $: resultMessage = (() => {
      if (correctAnswers === totalQuestions) {
        return '全問正解！素晴らしい！🎉';
      } else if (correctAnswers >= totalQuestions / 2) {
        return 'よくできました！もう少しで完璧！';
      } else {
        return '練習すればもっと上達するよ！';
      }
    })();

  </script>

  <main class="bg-stone-100 flex flex-col items-center min-h-screen p-4">
    <header class="
    w-full p-6 rounded-md relative
    bg-stone-100 /* stone-200を直接指定 */
    [box-shadow:var(--shadow-neumorphic-convex)] /* CSS変数を直接参照 */
    mb-8
  ">
      <div class="flex items-center justify-between">
        <h1 class="text-4xl font-bold text-stone-700">弱点克服モード リザルト</h1>
        <button class="focus:outline-none" on:click={toggleMenu} aria-label="メニューを開閉">
          <IconHamburger width="48" height="48" isOpen={isOpen} color="#374151" />
        </button>
      </div>
      {#if isOpen}
        <nav transition:slide={{ duration: 200 }} class="absolute top-[calc(100%-1rem)] right-[1rem] w-1/3 bg-white shadow-lg rounded-md z-10">
          <button class="block text-stone-700 py-4 px-6 hover:bg-stone-200 rounded-md w-full text-left" on:click={goToDashboard}>ホーム</button>
        </nav>
      {/if}
    </header>
    <div class="w-full h-full my-6">
      {#if results.length > 0}
        <div class="mb-6 w-full bg-white rounded-md shadow-lg">
          <div class="flex justify-center bg-teal-100 rounded-t-lg">
            {#each results as _, i}
              <span class="w-1/5 text-center font-bold text-stone-700 text-xl py-2 last:border-r-0">
                {i + 1}
              </span>
            {/each}
          </div>
          <div class="flex justify-center">
            {#each results as result}
            <span class="w-1/5 py-2 border-r-2 border-gray-100 last:border-r-0 flex justify-center">
              {#if result}
                <IconCircle2 width="48" height="48"/>
              {:else}
                <IconClose2 width="48" height="48"/>
              {/if}
            </span>
            {/each}
          </div>
        </div>

        <div class="flex justify-center space-x-4 mt-6 mb-6 w-full">
          <div class="flex flex-col items-center bg-white p-4 rounded-lg shadow-md w-1/3">
            <p class="text-lg font-bold text-stone-700 mb-2">正答数</p>
            <DiagonalFraction
              numerator={correctAnswers}
              denominator={totalQuestions}
              textColor="text-teal-500"
              fontSize="text-3xl"
              separatorColor="border-gray-700"
            />
          </div>

          <div class="flex flex-col items-center bg-white p-4 rounded-lg shadow-md w-1/3">
            <p class="text-lg font-bold text-stone-700 mb-2">基礎問題正答数</p>
            <DiagonalFraction
              numerator={results.filter(Boolean).length}
              denominator={totalQuestions}
              textColor="text-teal-500"
              fontSize="text-3xl"
              separatorColor="border-gray-700"
            />
          </div>
          <div class="flex flex-col items-center bg-white p-4 rounded-lg shadow-md w-1/3">
            <p class="text-lg font-bold text-stone-700 mb-4">応用問題正答数</p>
            <DiagonalFraction
              numerator={results.filter(Boolean).length}
              denominator={totalQuestions}
              textColor="text-teal-500"
              fontSize="text-3xl"
              separatorColor="border-gray-700"
            />
          </div>
        </div>
        <div class="flex justify-between">
          <div class="text-2xl">
            <AvatarMessage message={resultMessage} />
          </div>
          <div class="w-[calc(33.33%-1rem)] space-x-4 flex">
            <button on:click={goToWeaknessMode} class=" bg-teal-400 text-white w-1/2 border-b-[1px] transition-all duration-150 [box-shadow:0_10px_0_0_#14b8a6,0_15px_0_0_#d1d5db] hover:[box-shadow:0_0px_0_0_#14b8a6,0_0px_0_0_#d1d5db] hover:border-b-[0px] hover:translate-y-2 border-teal-400 text-2xl font-bold py-4 rounded-md focus:outline-none focus:shadow-outline flex items-center justify-center flex-grow">
              弱点克服モードへ戻る
          </button>
          <button on:click={goToDashboard} class=" bg-teal-600 text-white w-1/2 border-b-[1px] transition-all duration-150 [box-shadow:0_10px_0_0_#0f766e,0_15px_0_0_#a8a29e] hover:[box-shadow:0_0px_0_0_#0f766e,0_0px_0_0_#1b70f841] hover:border-b-[0px] hover:translate-y-2 border-teal-600 text-2xl font-bold py-4 rounded-md focus:outline-none focus:shadow-outline flex items-center justify-center flex-grow">
            トップへ戻る
          </button></div>
        </div>
      {:else}
        <p class="text-red-500 mb-4">結果データがありません。</p>
      {/if}
    </div>
  </main>