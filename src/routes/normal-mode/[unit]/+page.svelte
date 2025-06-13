<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { slide, fly, scale } from 'svelte/transition'; // slide, fly, scaleをインポート
  import IconClose from '$lib/components/IconClose.svelte';
  import IconCircle from '$lib/components/IconCircle.svelte';
  import IconHamburger from '$lib/components/IconHamburger.svelte';
  import AppNavigation from '$lib/components/AppNavigation.svelte';
  import KaTeXDisplay from '$lib/components/KaTeXDisplay.svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte';
  import SpeechInputButton from '$lib/components/SpeechInputButton.svelte';
  import ProblemDisplay from '$lib/components/ProblemDisplay.svelte';
  import HintSection from '$lib/components/HintSection.svelte';
  import AnswerInputAndEvaluation from '$lib/components/AnswerInputAndEvaluation.svelte';

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
  let showAllHints = false;
  let results = []; // 各問題の正誤を記録する配列

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

    // HintSection からのイベントハンドラ
    function handleShowNextHintEvent() {
    // currentHintIndex の更新は、引き続きこの親コンポーネントで行います
    if (problems[currentProblemIndex].hints && currentHintIndex < problems[currentProblemIndex].hints.length) {
      currentHintIndex++; // 表示するヒントの数を増やす
    }
  }

  // 回答入力エリアを表示する関数
  function showAnswerInput() {
    showAnswerArea = true;
    // AnswerInputAndEvaluation 内で状態がリセットされるため、ここでは不要
    // userAnswer = '';
    // showResult = false;
    // recognitionError = '';
  }

  // AnswerInputAndEvaluation から呼ばれる recordAnswer 関数
  function recordAnswer(event) {
    const isCorrect = event.detail.isCorrect;
    console.log('正解:', isCorrect);

    if (!isCorrect) {
      results = [...results, isCorrect];
      nextProblem(); // 正解の場合のみ次の問題へ
    } else {

      }
  }
  // AnswerInputAndEvaluation から呼ばれる nextProblem 関数 (AnswerInputAndEvaluation内からは直接呼ばれない)
  function nextProblem() {
    currentProblemIndex++;
    showAnswerArea = false; // 次の問題へ進む際に回答エリアを非表示
    currentHintIndex = 0; // 次の問題のためにヒントカウンターをリセット
    // AnswerInputAndEvaluation 内で showResult はリセットされるため、ここでは不要
    // showResult = false;
    if (currentProblemIndex >= problems.length) {
      showAllHints = false;
      goto('/normal-mode/result', { state: { results: results, totalQuestions: problems.length, unitName: unitName} });
    }
  }

  function proceedToNextProblem() { // 関数名を変更し、より明確に
    nextProblem();
  }
</script>

<svelte:head>
  <title>通常モード ({unit}) - 算数学習アプリ</title>
</svelte:head>

<main class="bg-stone-100 flex flex-col items-center min-h-screen p-4">
  <!-- ヘッダー -->
  <header class="bg-teal-300 shadow-lg w-full p-6 rounded-md relative">
    <div class="flex items-center justify-between">
      <h1 class="text-4xl font-bold text-stone-700">演習 : {unitName}</h1>
      <button class="focus:outline-none" on:click={toggleMenu} aria-label="メニューを開閉">
        <IconHamburger width="48" height="48" isOpen={isOpen} color="#374151" />
      </button>
    </div>
    <AppNavigation isOpen={isOpen} />
  </header>

  <!-- 問題表示 -->
  {#if problems.length > 0 && currentProblemIndex < problems.length}
    <div class="w-full h-full">
      <ProblemDisplay
        problemNumber={currentProblemIndex + 1}
        questionContent={problems[currentProblemIndex].question}
      />

      <HintSection
        hints={problems[currentProblemIndex].hints}
        currentHintIndex={currentHintIndex}
        showAnswerArea={showAnswerArea}
        showAllHints={showAllHints}
        on:showNextHint={handleShowNextHintEvent}
      />
      <!-- 回答ボタン -->
      <div class="flex justify-end space-x-4 mb-4 text-lg self-end">
        {#if !showAnswerArea}
          <button
            class="w-[calc(25%-1.5rem)] bg-teal-300 border-teal-500 border-b-[1px] transition-all duration-150 [box-shadow:0_5px_0_0_#14b8a6] hover:[box-shadow:0_0px_0_0_#14b8a6] hover:border-b-[0px] hover:translate-y-2 text-stone-800 text-2xl font-bold py-4 px-4 rounded-md focus:outline-none focus:shadow-outline"
            on:click={showAnswerInput}
          >
            回答をする
          </button>
        {/if}
      </div>

      <!-- 回答入力 -->
      {#if showAnswerArea}
        <AnswerInputAndEvaluation
          currentProblemAnswer={problems[currentProblemIndex].answer}
          handleProceedToNextProblem={proceedToNextProblem}
          handleShowAllHints={() => { showAllHints = true; showAnswerArea = false; }}
          on:recordAnswer={recordAnswer}
        />
      {/if}

    </div>
  {:else if problems.length > 0}
    <p class="text-xl font-semibold">単元クリア！お疲れ様でした。</p>
    <button class="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" on:click={goToTop}>トップへ戻る</button>
  {:else}
    <p class="p-16">問題がありません。</p>
  {/if}

  <ProgressBar current={currentProblemIndex + 1} total={problems.length} />
</main>

<style>
  :global(body) {
    overflow-x: hidden;
  }
</style>