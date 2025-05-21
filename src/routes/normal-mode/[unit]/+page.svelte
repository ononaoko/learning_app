<script>
import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { slide } from 'svelte/transition';
  import { fly } from 'svelte/transition';
  import { scale } from 'svelte/transition';
  import IconClose from '$lib/components/IconClose.svelte'; // コンポーネントをインポート
  import IconCircle from '$lib/components/IconCircle.svelte'; // コンポーネントをインポート
  import IconHamburger from '$lib/components/IconHamburger.svelte';


  let unit = $page.params.unit;
  let unitName = ''; // 日本語名を表示するための変数
 // unit の値が変更されたときに unitName を更新
 $: if (unit === 'algebra') {
    unitName = '代数';
  } else if (unit === 'geometry') {
    unitName = '図形';
  } else {
    unitName = ''; // デフォルト
  }

  let problems = [];
  let currentProblemIndex = 0;
  let showAnswerArea = false;
  let currentHintIndex = 0;
  let stepExpressions = [];
  let hintTexts = [];
  let correctAnswers = 0; // 正解数を追跡する変数

  async function loadProblems(unit) {
    try {
      console.log('Fetching unit:', unit);
      const response = await fetch(`/api/problems/${unit}`); // .json を削除
      console.log('Response:', { status: response.status, statusText: response.statusText });
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched data:', data);
        const shuffled = [...data].sort(() => 0.5 - Math.random());
        problems = shuffled.slice(0, Math.min(5, shuffled.length));
        console.log('Shuffled problems:', problems);
      } else {
        problems = [];
      }
    } catch (error) {
      problems = [];
      errorMessage = '問題の読み込みに失敗しました。後でもう一度お試しください。';
    }
  }

  onMount(async () => {
    await loadProblems(unit)
  });
  let animationPlaying = false;
  let svgElement; // SVG 要素への参照

  function playAnimation() {
    animationPlaying = true;
    if (svgElement) {
      const animates = svgElement.querySelectorAll('animate');
      animates.forEach(animate => {
        animate.beginElement();
      });
    }
  }

  function stopAnimation() {
    animationPlaying = false;
    if (svgElement) {
      const animates = svgElement.querySelectorAll('animate');
      animates.forEach(animate => {
        animate.pauseElement();
      });
    }
  }
  console.log('svgElement:', svgElement)
  onMount(() => {
    // ページ読み込み時にアニメーションを停止
    stopAnimation();
  });
  let isOpen = false;
  function toggleMenu() {
    isOpen = !isOpen;
  }
  function goToTop() {
    goto('/');
    isOpen = false; // メニューを閉じる
  }

  function showNextHint() {
    if (problems[currentProblemIndex].hints && currentHintIndex < problems[currentProblemIndex].hints.length) {
      stepExpressions = [...stepExpressions, problems[currentProblemIndex].hints[currentHintIndex].expression];
      hintTexts = [...hintTexts, problems[currentProblemIndex].hints[currentHintIndex].explanation];
      if (problems[currentProblemIndex].hints[currentHintIndex].isLast) {
      }
      currentHintIndex++;
    }
  }

  function showAnswer() {
    showAnswerArea = true
  }

  let results = []; // 各問題の正誤を記録する配列

  function recordAnswer(isCorrect) {
    console.log('正解:', isCorrect);
    results = [...results, isCorrect]; // 結果を配列に追加
    nextProblem();
  }

  function nextProblem() {
    currentProblemIndex++;
    showAnswerArea = false;
    currentHintIndex = 0;
    stepExpressions = [];
    hintTexts = [];
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
    {#if isOpen}
      <nav transition:slide={{ duration: 200 }} class="absolute top-[calc(100%-1rem)] right-[1rem] w-1/3 bg-white shadow-lg rounded-md z-10">
        <button class="block text-stone-700 py-4 px-6 hover:bg-stone-200 rounded-md w-full text-left" on:click={goToTop}>ホーム</button>
        </nav>
    {/if}
  </header>

  {#if problems.length > 0 && currentProblemIndex < problems.length}
  <div class="w-full h-full">
    <div class="flex items-center mt-6 mb-6">
      <span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-teal-300 text-stone-700 text-3xl font-thin mr-4">
        {currentProblemIndex + 1}
      </span>
      <p class="text-2xl text-stone-700 font-light">{problems[currentProblemIndex].question}</p>
    </div>

    <div class="mb-4">
      {#each stepExpressions as expression, index}
        <div class="flex items-start mb-3" transition:slide={{ duration: 300 }}  >
          <div class="w-1/2 ml-14">
            <p class="text-2xl text-teal-500">{expression}</p>
          </div>
          <div transition:fly="{{x: 200}}" class="w-1/2 text-left bg-white rounded-md p-3 ml-4 shadow-md">
            <p class="text-lg  text-stone-700 ">
              {hintTexts[index]}
            </p>
          </div>
        </div>
        {#if index < stepExpressions.length - 1}
          <hr class="border-t border-dashed my-2 border-gray-400" />
        {/if}
      {/each}
      {#if showAnswerArea}
      <div in:scale={{ start: 0.5 }} class="rounded-md shadow-lg p-4 mt-4 bg-white flex flex-row space-x-8">
        <div class="ml-10 text-2xl w-1/2">
          <h3 class="font-bold text-teal-500">解答</h3>
          <hr class="border-t border-solid my-2 border-teal-400" />
          <p class="text-stone-600 mb-2">{problems[currentProblemIndex].answer}</p>
        </div>
        <div class="w-1/2 flex flex-grow flex-col items-center justify-center">
          <h2 class="text-2xl font-bold text-stone-700">正誤を記録してください。</h2>
          <div class="flex justify-center space-x-4 my-2 w-full">
            <button class="bg-red-400 border-b-[1px] transition-all duration-150 [box-shadow:0_10px_0_0_#ef4444,0_15px_0_0_#e5e7eb] hover:[box-shadow:0_0px_0_0_#1b6ff8,0_0px_0_0_#1b70f841] hover:border-b-[0px] hover:translate-y-2 border-red-500 text-white font-bold py-4 rounded-md focus:outline-none focus:shadow-outline flex items-center justify-center flex-grow" on:click={() => recordAnswer(true)}><IconCircle width="48" height="48" /></button>
            <button class="bg-blue-400 border-b-[1px] transition-all duration-150 [box-shadow:0_10px_0_0_#1b6ff8,0_15px_0_0_#e5e7eb] hover:[box-shadow:0_0px_0_0_#1b6ff8,0_0px_0_0_#1b70f841] hover:border-b-[0px] hover:translate-y-2 border-blue-500 text-white font-bold py-4 rounded-md focus:outline-none focus:shadow-outline flex items-center justify-center flex-grow" on:click={() => recordAnswer(false)}><IconClose width="48" height="48" /></button>
          </div>
        </div>
      </div>
      {/if}
    </div>

    <div class="flex justify-end space-x-4 mb-4 text-lg">
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

  </div>
{:else if problems.length > 0}
  <p class="text-xl font-semibold">単元クリア！お疲れ様でした。</p>
  <button class="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" on:click={goToTop}>トップへ戻る</button>
{:else}
  <p>問題がありません。</p>
{/if}
</main>