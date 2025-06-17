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

  let modeName = '弱点克服モード';
  let unitName = 'あなたの苦手問題';
  let averageWeaknessCorrectness = 0;
  let currentProblemCorrectness = 0;

  let problems = []; // ロードされた問題の配列
  let currentProblemIndex = 0; // 現在表示中の問題のインデックス
  let showAnswerArea = false;
  let currentHintIndex = 0;
  let errorMessage = '';
  let showAllHints = false;
  let results = [];

  async function loadWeakProblems() {
    try {
      console.log('Fetching weak problems...');
      const response = await fetch('/api/weak-problems?limit=5');
      if (response.ok) {
        const data = await response.json();
        problems = data.problems; // 問題配列をロード
        averageWeaknessCorrectness = data.averageCorrectness;

        // ★修正: 問題がロードされたら、インデックスをリセットし、初回の正答率を設定★
        currentProblemIndex = 0; // 問題が再ロードされたら、必ず最初の問題から始める
        if (problems.length > 0) {
          currentProblemCorrectness = problems[currentProblemIndex].correctness;
          errorMessage = ''; // 成功したらエラーメッセージをクリア
        } else {
          errorMessage = 'まだ学習記録が少ないか、該当する弱点問題を特定できませんでした。演習モードで問題を解いてみましょう！';
        }
        console.log('Loaded weak problems for display:', problems);

      } else {
        errorMessage = `弱点問題の読み込みに失敗しました: ${response.statusText}`;
        problems = []; // 失敗したら problems を空にする
      }
    } catch (error) {
      errorMessage = '弱点問題の読み込み中にエラーが発生しました。';
      console.error('Error loading weak problems:', error);
      problems = []; // エラーが発生したら problems を空にする
    }
  }

  onMount(async () => {
    await loadWeakProblems();
  });

  let isOpen = false;
  function toggleMenu() {
    isOpen = !isOpen;
  }
  function goToTop() {
    goto('/');
    isOpen = false;
  }

  function handleShowNextHintEvent() {
    if (problems[currentProblemIndex].hints && currentHintIndex < problems[currentProblemIndex].hints.length) {
      currentHintIndex++;
    }
  }

  function showAnswerInput() {
    showAnswerArea = true;
  }

  async function handleRecordAnswer(event) {
    const isCorrect = event.detail.isCorrect;
    console.log('正解:', isCorrect);

    results = [...results, isCorrect];

    if (problems[currentProblemIndex]) {
      const currentProblem = problems[currentProblemIndex];
      // ★追加: 現在の問題の正答率を取得★
     const problemCorrectnessAtAttempt = currentProblem.correctness || 0;

      const recordData = {
        problemId: currentProblem.id, // problemIdを送信
        isCorrect: isCorrect,
        hintsUsedCount: currentHintIndex,
        duration: 0,
        problemCorrectnessAtAttempt: problemCorrectnessAtAttempt // ★追加: 正答率を記録データに含める★
      };

      console.log('Sending recordData to API:', recordData);

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

  async function nextProblem() {
    currentProblemIndex++;
    showAnswerArea = false;
    currentHintIndex = 0;
    showAllHints = false;
    if (currentProblemIndex < problems.length) {
      currentProblemCorrectness = problems[currentProblemIndex].correctness;
    } else {
      goto('/dashboard', { state: { results: results, totalQuestions: problems.length, mode: 'weakness' } });
      return;
    }
  }
</script>

<svelte:head>
  <title>{modeName} - 算数学習アプリ</title>
</svelte:head>

<main class="bg-stone-100 flex flex-col items-center min-h-screen p-4">
  <header class="bg-teal-300 shadow-lg w-full p-6 rounded-md relative">
    <div class="flex items-center justify-between">
      <h1 class="text-4xl font-bold text-stone-700">{modeName}：
      {#if problems.length > 0 && currentProblemIndex < problems.length}
        正答率 {currentProblemCorrectness}%
      {/if}</h1>
      <button class="focus:outline-none" on:click={toggleMenu} aria-label="メニューを開閉">
        <IconHamburger width="48" height="48" isOpen={isOpen} color="#374151" />
      </button>
    </div>
    <AppNavigation isOpen={isOpen} />
  </header>

  {#if errorMessage}
    <p class="text-red-500 text-center text-xl mt-8">{errorMessage}</p>
    <TealButton text="ダッシュボードへ戻る" onClick={() => goto('/dashboard')}
      buttonColorClass="bg-blue-500"
      borderColorClass="border-blue-700"
      shadowColorClass="[box-shadow:0_5px_0_0_#2563eb]"
      hoverShadowColorClass="hover:[box-shadow:0_0px_0_0_#2563eb]"
    />
  {:else if problems.length > 0 && currentProblemIndex < problems.length}
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
    <p class="text-xl font-semibold">全問クリア！お疲れ様でした。</p>
    <TealButton text="ダッシュボードへ戻る" onClick={() => goto('/dashboard')}
      buttonColorClass="bg-blue-500"
      borderColorClass="border-blue-700"
      shadowColorClass="[box-shadow:0_5px_0_0_#2563eb]"
      hoverShadowColorClass="hover:[box-shadow:0_0px_0_0_#2563eb]"
    />
  {:else}
    <p class="p-16">問題がありません。</p>
    <TealButton text="ダッシュボードへ戻る" onClick={() => goto('/dashboard')}
      buttonColorClass="bg-blue-500"
      borderColorClass="border-blue-700"
      shadowColorClass="[box-shadow:0_5px_0_0_#2563eb]"
      hoverShadowColorClass="hover:[box-shadow:0_0px_0_0_#2563eb]"
    />
  {/if}

  <ProgressBar current={currentProblemIndex + 1} total={problems.length} />
</main>

<style>
  :global(body) {
    overflow-x: hidden;
  }
</style>