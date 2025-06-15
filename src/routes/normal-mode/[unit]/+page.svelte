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
  import TealButton from '$lib/components/TealButton.svelte';

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

   function recordAnswer(event) {
    const isCorrect = event.detail.isCorrect;
    console.log('正解:', isCorrect);

    results = [...results, isCorrect]; // 正誤を記録する行は共通化

    if (isCorrect) {
      showAllHints = true;
    }
  }


  // AnswerInputAndEvaluation から呼ばれる nextProblem 関数 (AnswerInputAndEvaluation内からは直接呼ばれない)
  function nextProblem() {
    currentProblemIndex++;
    showAnswerArea = false; // 次の問題へ進む際に回答エリアを非表示
    currentHintIndex = 0; // 次の問題のためにヒントカウンターをリセット
    showAllHints = false; // 次の問題のために全てのヒント表示フラグをリセット
    // AnswerInputAndEvaluation 内で showResult はリセットされるため、ここでは不要
    // showResult = false;
    if (currentProblemIndex >= problems.length) {
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
      <ProblemDisplay
        problemNumber={currentProblemIndex + 1}
        questionContent={problems[currentProblemIndex].question}
      />
      <div class="flex-grow min-w-0">
        <HintSection
          hints={problems[currentProblemIndex].hints}
          currentHintIndex={currentHintIndex}
          showAnswerArea={showAnswerArea}
          showAllHints={showAllHints}
          on:showNextHint={handleShowNextHintEvent}
        />
      </div>
      <div class="flex items-start justify-end w-full gap-4 mt-4">
          {#if !showAnswerArea && currentHintIndex < problems[currentProblemIndex].hints.length && !showAllHints}
            <TealButton
              text="ヒント"
              onClick={handleShowNextHintEvent} widthClass="w-[calc(25%-1.5rem)]"
              buttonColorClass="bg-yellow-300"
              borderColorClass="border-yellow-500"
              shadowColorClass="[box-shadow:0_5px_0_0_#facc15]"
              hoverShadowColorClass="hover:[box-shadow:0_0px_0_0_#facc15]"
              textColorClass="text-stone-800"
            />
          {/if}

          {#if !showAnswerArea && !showAllHints}
            <TealButton
              text="回答をする"
              onClick={showAnswerInput}
              widthClass="w-[calc(25%-1.5rem)]"
              buttonColorClass="bg-teal-300"
              borderColorClass="border-teal-500"
              shadowColorClass="[box-shadow:0_5px_0_0_#14b8a6]"
              hoverShadowColorClass="hover:[box-shadow:0_0px_0_0_#14b8a6]"
              textColorClass="text-stone-800"
            />
          {/if}

      </div>
      {#if showAnswerArea}
        <AnswerInputAndEvaluation
          currentProblemAnswer={problems[currentProblemIndex].answer}
          currentProblemAcceptableAnswers={problems[currentProblemIndex].acceptableAnswers || []}
          handleProceedToNextProblem={proceedToNextProblem}
          on:recordAnswer={recordAnswer}
        />
      {/if}

    </div>
  {:else if problems.length > 0}
    <p class="text-xl font-semibold">単元クリア！お疲れ様でした。</p>
    <TealButton text="トップへ戻る" onClick={goToTop}
      buttonColorClass="bg-blue-500"
      borderColorClass="border-blue-700"
      shadowColorClass="[box-shadow:0_5px_0_0_#2563eb]"
      hoverShadowColorClass="hover:[box-shadow:0_0px_0_0_#2563eb]"
    />
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