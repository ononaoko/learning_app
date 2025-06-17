<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { slide, fly, scale } from 'svelte/transition';
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
  import { nickname } from '$lib/authStore';

  // ★変更点1: data から userId を受け取る部分をコメントアウト★
  export let data;
  let currentUserId = data.userId;

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

  // デバッグ用: showAnswerArea の状態を監視
  $: console.log('showAnswerArea is now:', showAnswerArea);

  async function loadProblems(unit) {
    try {
      console.log('Fetching unit:', unit);
      const response = await fetch(`/api/problems/${unit}`);
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
    if (problems[currentProblemIndex].hints && currentHintIndex < problems[currentProblemIndex].hints.length) {
      currentHintIndex++;
    }
  }

  // 回答入力エリアを表示する関数
  function showAnswerInput(event) {
    event.preventDefault();
    console.log('showAnswerInput called. Setting showAnswerArea to true.');
    showAnswerArea = true;
  }

  // AnswerInputAndEvaluation からの 'recordAnswer' イベントを受け取る
  async function handleRecordAnswer(event) {
    const isCorrect = event.detail.isCorrect;
    console.log('正解:', isCorrect);

    results = [...results, isCorrect];
    console.log('Current Problem object being processed:', JSON.parse(JSON.stringify(problems[currentProblemIndex])));

    // 学習記録をサーバーに送信
    if (problems[currentProblemIndex]) {
      const currentProblem = problems[currentProblemIndex];

      const recordData = {
        userId: currentUserId, // userIdを送信
        problemId: currentProblem.id, // problemIdを送信
        isCorrect: isCorrect,
        hintsUsedCount: currentHintIndex,
        duration: 0
      };

      console.log('Saving record with problemId:', recordData.problemId);

      try {
        const response = await fetch('/api/learning-record', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(recordData)
        });

        if (response.ok) {
          console.log('学習記録を保存しました。');
        } else {
          console.error('学習記録の保存に失敗しました:', response.statusText);
        }
      } catch (error) {
        console.error('学習記録の送信中にエラーが発生しました:', error);
      }
    }

    if (!isCorrect) {
      showAllHints = true;
    }
  }

  // AnswerInputAndEvaluation からの 'nextProblem' イベントを受け取る
  async function nextProblem() {
    console.log('nextProblem called. Setting showAnswerArea to false.');
    currentProblemIndex++;
    showAnswerArea = false;
    currentHintIndex = 0;
    showAllHints = false;
    if (currentProblemIndex >= problems.length) {
      await goto('/normal-mode/result', { state: { results: results, totalQuestions: problems.length, unitName: unitName} });
      return;
    }
  }
</script>

<svelte:head>
  <title>演習モード：{unitName} - 算数学習アプリ</title>
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
              shadowColorClass="[box-shadow:0_5px_0_0_#eab308]"
              hoverShadowColorClass="hover:[box-shadow:0_0px_0_0_#eab308]"
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
          on:recordAnswer={handleRecordAnswer}
          on:nextProblem={nextProblem}
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