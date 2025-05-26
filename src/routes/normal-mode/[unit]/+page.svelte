<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { slide, fly, scale } from 'svelte/transition';
  import IconClose from '$lib/components/IconClose.svelte';
  import IconCircle from '$lib/components/IconCircle.svelte';
  import IconHamburger from '$lib/components/IconHamburger.svelte';
  import AppNavigation from '$lib/components/AppNavigation.svelte';
  import KaTeXDisplay from '$lib/components/KaTeXDisplay.svelte'; // KaTeXDisplayをインポート

  let unit = $page.params.unit;
  let unitName = '';
  $: if (unit === 'algebra') {
    unitName = '代数';
  } else if (unit === 'geometry') {
    unitName = '図形';
  } else {
    unitName = '';
  }

  let problems = [];
  let currentProblemIndex = 0;
  let showAnswerArea = false;
  let currentHintIndex = 0; // 現在表示されているヒントの数
  let errorMessage = '';

  async function loadProblems(unit) {
    try {
      console.log('Fetching unit:', unit);
      const response = await fetch(`/api/problems/${unit}`); // .json を削除
      if (response.ok) {
        const data = await response.json();
        const shuffled = [...data].sort(() => 0.5 - Math.random());
        problems = shuffled.slice(0, Math.min(5, shuffled.length));
        console.log('Loaded problems for display:', problems);
      } else {
        errorMessage = `問題の読み込みに失敗しました: ${response.statusText}`;
      }
    } catch (error) {
      errorMessage = '問題の読み込み中にエラーが発生しました。';
      console.error('Error loading problems:', error);
    }
  }

  onMount(async () => {
    await loadProblems(unit);
  });

  let isOpen = false;
  function toggleMenu() {
    isOpen = !isOpen;
  }
  function goToTop() {
    goto('/');
    isOpen = false;
  }

  function showNextHint() {
    if (problems[currentProblemIndex].hints && currentHintIndex < problems[currentProblemIndex].hints.length) {
      currentHintIndex++; // 表示するヒントの数を増やす
    }
  }

  function showAnswer() {
    showAnswerArea = true;
    currentHintIndex = problems[currentProblemIndex].hints.length; // 解答表示時は全てのヒントを表示済みにする
  }

  let results = []; // 各問題の正誤を記録する配列

  function recordAnswer(isCorrect) {
    results = [...results, isCorrect]; // 結果を配列に追加
    nextProblem();
  }

  function nextProblem() {
    currentProblemIndex++;
    showAnswerArea = false;
    currentHintIndex = 0; // 次の問題のためにヒントカウンターをリセット
    if (currentProblemIndex >= problems.length) {
      goto('/normal-mode/result', { state: { results: results, totalQuestions: problems.length, unitName: unitName} });
    }
  }
</script>

<svelte:head>
  <title>通常モード ({unit}) - 算数学習アプリ</title>
</svelte:head>

<main class="bg-stone-100 flex flex-col items-center min-h-screen p-4">
  <header class="bg-teal-300 shadow-lg w-full p-6 rounded-md relative">
    <div class="flex items-center justify-between">
      <h1 class="text-4xl font-bold text-stone-700">演習 : {unitName}</h1>
      <button class="focus:outline-none" on:click={toggleMenu} aria-label="メニューを開閉">
        <IconHamburger width="48" height="48" isOpen={isOpen} color="#374151" />
      </button>
    </div>
    <AppNavigation isOpen={isOpen} />
  </header>

  {#if problems.length > 0 && currentProblemIndex < problems.length}
    <div class="w-full h-full">
      <div class="flex items-center mt-6 mb-6">
        <span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-teal-300 text-stone-700 text-3xl font-thin mr-4">
          {currentProblemIndex + 1}
        </span>
        <p class="text-2xl text-stone-700 font-light">
          {#each problems[currentProblemIndex].question as part}
            {#if part.type === 'text'}
              {part.value}
            {:else if part.type === 'math'}
              <KaTeXDisplay textContent={part.value} displayMode={false} fontSizeClass="text-2xl" textColor="text-stone-700" />
            {/if}
          {/each}
        </p>
      </div>

      <div class="mb-4">
        {#each problems[currentProblemIndex].hints as hint, index}
          <div class="flex items-start mb-3"
               style="display: {index < currentHintIndex ? 'flex' : 'none'};"
          >
            <div class="w-1/2 ml-14">
              <p class="text-2xl text-teal-500">
                {#if hint.expression && hint.expression.value}
                  <KaTeXDisplay textContent={hint.expression.value} displayMode={false} fontSizeClass="text-2xl" textColor="text-teal-500" />
                {/if}
              </p>
            </div>
            <div class="w-1/2 text-left bg-white rounded-md p-3 ml-4 shadow-md">
              <p class="text-lg text-stone-700">
                {#each hint.explanation as part}
                  {#if part.type === 'text'}
                    {part.value}
                  {:else if part.type === 'math'}
                    <KaTeXDisplay textContent={part.value} displayMode={false} fontSizeClass="text-lg" textColor="text-stone-700" />
                  {/if}
                {/each}
              </p>
            </div>
          </div>
          {#if index < problems[currentProblemIndex].hints.length - 1}
            <hr class="border-t border-dashed my-2 border-gray-400"
                style="display: {index < currentHintIndex - 1 ? 'block' : 'none'};"
            />
          {/if}
        {/each}
      </div>

      <div class="flex justify-end space-x-4 mb-4 text-lg self-end">
        {#if !showAnswerArea && currentHintIndex < problems[currentProblemIndex].hints.length}
          <button
            class="w-[calc(25%-1.5rem)] bg-yellow-300 border-yellow-500 border-b-[1px] transition-all duration-150 [box-shadow:0_5px_0_0_#facc15] hover:[box-shadow:0_0px_0_0_#facc15] hover:border-b-[0px] hover:translate-y-2 text-stone-800 text-2xl font-bold py-4 px-4 rounded-md focus:outline-none focus:shadow-outline"
            on:click={showNextHint}
          >
            ヒント
          </button>
        {/if}
        {#if !showAnswerArea}
          <button
            class="w-[calc(25%-1.5rem)] bg-teal-300 border-teal-500 border-b-[1px] transition-all duration-150 [box-shadow:0_5px_0_0_#14b8a6] hover:[box-shadow:0_0px_0_0_#14b8a6] hover:border-b-[0px] hover:translate-y-2 text-stone-800 text-2xl font-bold py-4 px-4 rounded-md focus:outline-none focus:shadow-outline"
            on:click={showAnswer}
          >
            解答を見る
          </button>
        {/if}
      </div>

      {#if showAnswerArea}
        <div in:scale={{ start: 0.5 }} class="rounded-md shadow-lg p-4 mt-4 bg-white flex flex-row space-x-8">
          <div class="ml-10 text-2xl w-1/2">
            <h3 class="font-bold text-teal-500">解答</h3>
            <hr class="border-t border-solid my-2 border-teal-400" />
            <p class="text-stone-600 mb-2">
              {#each problems[currentProblemIndex].answer as part}
                {#if part.type === 'text'}
                  {part.value}
                {:else if part.type === 'math'}
                  <KaTeXDisplay textContent={part.value} displayMode={false} fontSizeClass="text-stone-600" textColor="text-stone-600" />
                {/if}
              {/each}
            </p>
          </div>
          <div class="w-1/2 flex flex-grow flex-col items-center justify-center">
            <h2 class="text-2xl font-bold text-stone-700">正誤を記録してください。</h2>
            <div class="flex justify-center space-x-4 my-2 w-full">
              <button
                class="bg-red-400 border-b-[1px] transition-all duration-150 [box-shadow:0_10px_0_0_#ef4444,0_15px_0_0_#e5e7eb] hover:[box-shadow:0_0px_0_0_#1b6ff8,0_0px_0_0_#1b70f841] hover:border-b-[0px] hover:translate-y-2 border-red-500 text-white font-bold py-4 rounded-md focus:outline-none focus:shadow-outline flex items-center justify-center flex-grow"
                on:click={() => recordAnswer(true)}><IconCircle width="48" height="48" /></button
              >
              <button
                class="bg-blue-400 border-b-[1px] transition-all duration-150 [box-shadow:0_10px_0_0_#1b6ff8,0_15px_0_0_#e5e7eb] hover:[box-shadow:0_0px_0_0_#1b6ff8,0_0px_0_0_#1b70f841] hover:border-b-[0px] hover:translate-y-2 border-blue-500 text-white font-bold py-4 rounded-md focus:outline-none focus:shadow-outline flex items-center justify-center flex-grow"
                on:click={() => recordAnswer(false)}><IconClose width="48" height="48" /></button
              >
            </div>
          </div>
        </div>
      {/if}
    </div>
  {:else if problems.length > 0}
    <p class="text-xl font-semibold">単元クリア！お疲れ様でした。</p>
    <button class="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" on:click={goToTop}>トップへ戻る</button>
  {:else}
    <p class="p-16">問題がありません。</p>
  {/if}
</main>