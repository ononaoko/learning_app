<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import IconHamburger from '$lib/components/IconHamburger.svelte';
  import AppNavigation from '$lib/components/AppNavigation.svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte'; // .svelte 拡張子を確認
  import ProblemDisplay from '$lib/components/ProblemDisplay.svelte';
  import HintSection from '$lib/components/HintSection.svelte';
  import AnswerInputAndEvaluation from '$lib/components/AnswerInputAndEvaluation.svelte';
  import TealButton from '$lib/components/TealButton.svelte';
  // ★削除: authStoreとgetのインポートは不要★
  // import { userId as currentUserIdStore } from '$lib/authStore';
  // import { get } from 'svelte/store';

  // ★変更: +page.server.js からデータを受け取る★
  export let data;
  let currentUserId = data.userId; // サーバーから渡されたuserIdを使用

  let modeName = '弱点克服モード';
  let averageWeaknessCorrectness = 0;
  let currentProblemCorrectness = 0;

  // ★削除: ストアからのcurrentUserId定義とリアクティブ更新は不要★
  // let currentUserId;
  // $: currentUserId = get(currentUserIdStore);

  let problems = [];
  let currentProblemIndex = 0;
  let showAnswerArea = false;
  let currentHintIndex = 0;
  let errorMessage = '問題の読み込み中にエラーが発生しました。インターネット接続を確認するか、時間をおいて再度お試しください。';
  let showAllHints = false;
  let results = [];

  let problemStartTime = 0;
  let sessionStartTime = 0;

  async function loadWeakProblems() {
    try {
      console.log('Fetching weak problems...');
      // ★修正: userIdのチェックは不要だが、APIへの渡すのは必要★
      const response = await fetch(`/api/weak-problems?limit=5&userId=${currentUserId}`);
      if (response.ok) {
        const data = await response.json();
        problems = data.problems;
        averageWeaknessCorrectness = data.averageCorrectness;

        currentProblemIndex = 0;
        if (problems.length > 0) {
          currentProblemCorrectness = problems[currentProblemIndex].correctness;
          errorMessage = '';
          problemStartTime = Date.now();
          if (sessionStartTime === 0) {
            sessionStartTime = Date.now();
            console.log('Weakness mode session started at:', new Date(sessionStartTime).toLocaleString());
          }
        } else {
          errorMessage = 'まだ学習記録が少ないか、該当する弱点問題を特定できませんでした。演習モードで問題を解いてみましょう！';
        }
        console.log('Loaded weak problems for display:', problems);

      } else {
        errorMessage = `弱点問題の読み込みに失敗しました: ${response.statusText}`;
        problems = [];
      }
    } catch (error) {
      errorMessage = '弱点問題の読み込み中にエラーが発生しました。';
      console.error('Error loading weak problems:', error);
      problems = [];
    }
  }

  onMount(async () => {
    // ★修正: data.userId は onMount 時点ですでに利用可能なので、直接ロードを呼び出す★
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
    if (currentProblem && currentProblem.hints && currentHintIndex < currentProblem.hints.length) {
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

    const durationSeconds = Math.round((Date.now() - problemStartTime) / 1000);

    if (problems[currentProblemIndex]) {
      const currentProblem = problems[currentProblemIndex];
      const problemCorrectnessAtAttempt = currentProblem.correctness || 0;

      const recordData = {
        userId: currentUserId, // これで定義済み
        problemId: currentProblem.id,
        isCorrect: isCorrect,
        hintsUsedCount: currentHintIndex,
        duration: durationSeconds,
        problemCorrectnessAtAttempt: problemCorrectnessAtAttempt
      };

      console.log('Sending recordData to API:', recordData, 'Duration:', durationSeconds, 'seconds');

      try {
        const response = await fetch('/api/learning-record', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(recordData)
        });

        if (response.ok) {
          console.log('個別問題の学習記録を保存しました。');
        } else {
          console.error('個別問題の学習記録の保存に失敗しました:', response.statusText);
        }
      } catch (error) {
        console.error('個別問題の学習記録の送信中にエラーが発生しました:', error);
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
      problemStartTime = Date.now();
    } else {
      const sessionEndTime = Date.now();
      const totalSessionDurationSeconds = Math.round((sessionEndTime - sessionStartTime) / 1000);

      console.log('Weakness mode session completed. Total duration:', totalSessionDurationSeconds, 'seconds');

      try {
        const sessionRecordResponse = await fetch('/api/session-record', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
                userId: currentUserId,
                mode: 'weakness-mode',
                unitId: 'N/A',
                duration: totalSessionDurationSeconds,
                timestamp: new Date().toISOString()
            })
        });

        if (sessionRecordResponse.ok) {
          console.log('弱点克服モードセッション全体の学習記録を保存しました。');
        } else {
          console.error('弱点克服モードセッション全体の学習記録の保存に失敗しました:', sessionRecordResponse.statusText);
        }
      } catch (error) {
        console.error('弱点克服モードセッション全体の学習記録の送信中にエラーが発生しました:', error);
      }
      goto('/review-mode/result', { state: { results: results, totalQuestions: problems.length, mode: 'weakness' } });
      return;
    }
  }
</script>

<svelte:head>
  <title>{modeName} - 算数学習アプリ</title>
</svelte:head>

<main class="bg-stone-100 flex flex-col items-center min-h-screen p-4">
  <header class="
  w-full p-6 rounded-md relative
  bg-stone-100 /* stone-200を直接指定 */
  [box-shadow:var(--shadow-neumorphic-convex)] /* CSS変数を直接参照 */
  mb-8
">
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
    />
  {:else if problems.length > 0 && currentProblemIndex < problems.length}
    <div class="w-full h-full">
      <ProblemDisplay
        problemNumber={currentProblemIndex + 1}
        questionContent={problems[currentProblemIndex].question}
        source={problems[currentProblemIndex].source}
        tag={problems[currentProblemIndex].tag}
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
    {:else if problems.length === 0 && !errorMessage}
    <p class="p-16">問題がありません。</p>
  {:else}
    {/if}

  <ProgressBar current={currentProblemIndex + 1} total={problems.length} />
</main>

<style>
  :global(body) {
    overflow-x: hidden;
  }
</style>