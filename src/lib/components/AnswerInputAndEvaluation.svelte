<script>
  import { createEventDispatcher } from 'svelte';
  import { scale } from 'svelte/transition';
  import KaTeXDisplay from '$lib/components/KaTeXDisplay.svelte';
  import MicrophoneButton from '$lib/components/MicrophoneButton.svelte';
  // IconClose と IconCircle はもう使わないので、IconClose2 と IconCircle2 をインポートします
  import IconClose from '$lib/components/IconClose.svelte';
  import IconCircle from '$lib/components/IconCircle.svelte';

  const dispatch = createEventDispatcher();

  export let currentProblemAnswer = [];
  export let handleProceedToNextProblem; // 親から受け取る「次の問題へ進む」関数
  export let handleShowAllHints; // 親から受け取る「すべてのヒントを表示する」関数

  let userAnswer = '';
  let showResult = false;
  let isCorrectAnswer = false;

  function handleSpeechRecognized(event) {
    userAnswer = event.detail.transcript;
  }

  function handleSpeechError(event) {
    console.error('MicrophoneButtonからのエラー:', event.detail.error);
  }

  function checkAnswer() {
    const correctAnswerParts = currentProblemAnswer;
    let normalizedCorrectAnswer = '';

    correctAnswerParts.forEach(part => {
        normalizedCorrectAnswer += part.value;
    });

    const normalizedUserAnswer = userAnswer.trim().toLowerCase().replace(/\s/g, '');
    const normalizedProblemAnswer = normalizedCorrectAnswer.trim().toLowerCase().replace(/\s/g, '');

    if (normalizedUserAnswer === normalizedProblemAnswer) {
        isCorrectAnswer = true;
    } else {
        isCorrectAnswer = false;
    }

    showResult = true;
  }

  function resetState(){ // 新しい関数
    userAnswer = '';
    showResult = false;
    isCorrectAnswer = false;
  }

  $: currentProblemAnswer, resetState();
</script>

<div in:scale={{ start: 0.5 }} class="rounded-md shadow-lg p-4 bg-white flex flex-col space-y-4 max-w-xl mx-auto">
  {#if !showResult}
    <h2 class="text-2xl font-bold text-stone-700 text-center">回答を入力してください</h2>
    <div class="flex items-center space-x-4">
      <input
        type="text"
        class="flex-grow p-3 border border-gray-300 rounded-md text-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        placeholder="ここに音声入力されます"
        bind:value={userAnswer}
      />
      <MicrophoneButton
        on:recognized={handleSpeechRecognized}
        on:error={handleSpeechError}
      />
    </div>

    <button
    class="bg-teal-400 border-teal-500 border-b-[1px] transition-all duration-150 [box-shadow:0_5px_0_0_#14b8a6] hover:[box-shadow:0_0px_0_0_#14b8a6] hover:border-b-[0px] hover:translate-y-2 text-white text-2xl font-bold py-4 px-4 rounded-md focus:outline-none focus:shadow-outline"
    on:click={checkAnswer}
      disabled={!userAnswer.trim() || showResult}
    >
      回答を送信
    </button>
  {/if}

  {#if showResult}
    <div class="mt-4 rounded-md flex flex-col">
      <div class="flex justify-center">
        {#if isCorrectAnswer}
        <IconCircle width="64" height="64" color="#ef4444" />
      {:else}
        <IconClose width="64" height="64" color="#3b82f6" />
      {/if}
      </div>
      <hr class="border-t border-dashed my-2 border-gray-400"/>
        <div class="text-center py-8">
          <p class="leading-loose text-center font-light">
            <KaTeXDisplay textContent={currentProblemAnswer} displayMode={false} fontSizeClass="text-2xl" textColor="text-stone-700" />
          </p>
        </div>
        {#if isCorrectAnswer}
      <button
        class=" bg-teal-400 border-teal-500 border-b-[1px] transition-all duration-150 [box-shadow:0_5px_0_0_#14b8a6] hover:[box-shadow:0_0px_0_0_#14b8a6] hover:border-b-[0px] hover:translate-y-2 text-white text-2xl font-bold py-4 px-4 rounded-md focus:outline-none focus:shadow-outline"
        on:click={() => { dispatch('recordAnswer', { isCorrect: true }); handleProceedToNextProblem(); resetState(); }}
      >
        次の問題へ
      </button>
      {:else}
            <button
        class="bg-blue-400 border-blue-500 border-b-[1px] transition-all duration-150 [box-shadow:0_5px_0_0_#2563eb] hover:[box-shadow:0_0px_0_0_#2563eb] hover:border-b-[0px] hover:translate-y-2 text-white text-2xl font-bold py-4 px-4 rounded-md focus:outline-none focus:shadow-outline"
        on:click={() => { handleShowAllHints(); resetState(); }}
      >
        解説を見る
      </button>
      <button
        class="mt-4 bg-gray-400 border-gray-500 border-b-[1px] transition-all duration-150 [box-shadow:0_5px_0_0_#6b7280] hover:[box-shadow:0_0px_0_0_#6b7280] hover:border-b-[0px] hover:translate-y-2 text-white text-2xl font-bold py-4 px-4 rounded-md focus:outline-none focus:shadow-outline"
        on:click={() => { handleProceedToNextProblem(); resetState(); }}
      >
        次の問題へ
      </button>
      {/if}
    </div>
  {/if}
</div>