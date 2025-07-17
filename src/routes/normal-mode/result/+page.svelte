<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import { audioStore } from '$lib/stores/audioStore.js';
  import IconHamburger from '$lib/components/IconHamburger.svelte';
  import AppNavigation from '$lib/components/AppNavigation.svelte';
  import DiagonalFraction from '$lib/components/DiagonalFraction.svelte';
  import AvatarMessage from '$lib/components/AvatarMessage.svelte';
  import IconCircle2 from '$lib/components/IconCircle2.svelte';
  import IconClose2 from '$lib/components/IconClose2.svelte';

  // page.state からデータを取得
  $: unitName = $page.state.unitName || '';
  $: results = $page.state.results || []; // 例: [{ isCorrect: true, tag: '重要' }, { isCorrect: false, tag: '応用' }, ...]
  $: totalAnsweredQuestions = results.length; // 回答した問題の総数
  $: correctAnswers = results.filter(r => r.isCorrect).length; // 全体の正解数

  // 基礎問題と応用問題の正答数を計算
  $: basicCorrectAnswers = results.filter(r => r.isCorrect && r.tag === '重要').length;
  $: applicationCorrectAnswers = results.filter(r => r.isCorrect && r.tag === '応用').length;

  let isOpen = false;

  // 効果音付きメニュートグル
  async function toggleMenu() {
    await audioStore.play('menu');
    isOpen = !isOpen;
  }

  // 効果音付きダッシュボード遷移
  async function goToDashboard() {
    await audioStore.playWithDelay('click', () => {
      goto('/dashboard');
      isOpen = false; // メニューを閉じる
    }, 200);
  }

  // 効果音付きユニット選択遷移
  async function goToNormalMode() {
    await audioStore.playWithDelay('click', () => {
      goto('/normal-mode'); // ユニット選択ページへの遷移
      isOpen = false;
    }, 200);
  }

  // 効果音付きトップ遷移
  async function goToTop() {
    await audioStore.playWithDelay('click', () => {
      goto('/');
      isOpen = false;
    }, 200);
  }

  // メッセージのロジック
  let resultMessage = '';
  $: resultMessage = (() => {
    if (totalAnsweredQuestions === 0) return 'まだ問題がありません。';

    if (correctAnswers === totalAnsweredQuestions) {
      return '全問正解！素晴らしい！🎉';
    } else if (correctAnswers >= totalAnsweredQuestions / 2) {
      return 'よくできました！もう少しで完璧！';
    } else if (correctAnswers < totalAnsweredQuestions / 2) {
      return '練習すればもっと上達するよ！';
    }
  })();

  // ページマウント時に効果音を再生
  onMount(async () => {
    try {
      // 少し遅延を入れてページが完全に読み込まれてから効果音を再生
      setTimeout(async () => {
        await audioStore.play('result');
        console.log('結果ページ - result音を再生');
      }, 300);
    } catch (error) {
      console.warn('効果音再生に失敗:', error);
    }
  });
</script>

<main class="bg-stone-100 flex flex-col items-center min-h-screen p-4">
  <header class="
  w-full p-6 rounded-md relative
  bg-stone-100 /* stone-200を直接指定 */
  [box-shadow:var(--shadow-neumorphic-convex)] /* CSS変数を直接参照 */
  mb-8
">
    <div class="flex items-center justify-between">
      <h1 class="text-4xl font-bold text-stone-700">演習 : {unitName}</h1>
      <button class="focus:outline-none" on:click={toggleMenu} aria-label="メニューを開閉">
        <IconHamburger width="48" height="48" isOpen={isOpen} color="#374151" />
      </button>
    </div>
    <AppNavigation isOpen={isOpen} />
  </header>
  <div class="w-full h-full my-6">
    {#if results.length > 0}
      <div class="mb-6 w-full bg-white rounded-md shadow-lg">
        <div class="flex justify-center bg-teal-100 rounded-t-lg overflow-x-auto whitespace-nowrap">
          {#each results as _, i}
            <span class="w-1/5 text-center font-bold text-stone-700 text-xl py-2 last:border-r-0">
              {i + 1}
            </span>
          {/each}
        </div>
        <div class="flex justify-center overflow-x-auto whitespace-nowrap">
          {#each results as result}
          <span class="w-1/5 py-2 border-r-2 border-gray-100 last:border-r-0 flex justify-center">
            {#if result.isCorrect}
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
            denominator={totalAnsweredQuestions}
            textColor="text-teal-500"
            fontSize="text-3xl"
            separatorColor="border-gray-700"
          />
        </div>

        <div class="flex flex-col items-center bg-white p-4 rounded-lg shadow-md w-1/3">
          <p class="text-lg font-bold text-stone-700 mb-2">基礎問題正答数</p>
          <DiagonalFraction
            numerator={basicCorrectAnswers}
            denominator={results.filter(r => r.tag === '重要').length}
            textColor="text-teal-500"
            fontSize="text-3xl"
            separatorColor="border-gray-700"
          />
        </div>
        <div class="flex flex-col items-center bg-white p-4 rounded-lg shadow-md w-1/3">
          <p class="text-lg font-bold text-stone-700 mb-4">応用問題正答数</p>
          <DiagonalFraction
            numerator={applicationCorrectAnswers}
            denominator={results.filter(r => r.tag === '応用').length}
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
          <button on:click={goToNormalMode} class=" bg-teal-400 text-white w-1/2 border-b-[1px] transition-all duration-150 [box-shadow:0_10px_0_0_#14b8a6,0_15px_0_0_#d1d5db] hover:[box-shadow:0_0px_0_0_#14b8a6,0_0px_0_0_#d1d5db] hover:border-b-[0px] hover:translate-y-2 border-teal-400 text-2xl font-bold py-4 rounded-md focus:outline-none focus:shadow-outline flex items-center justify-center flex-grow">
            ユニット選択へ戻る
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