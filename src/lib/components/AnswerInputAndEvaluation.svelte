<script>
  import { createEventDispatcher } from 'svelte';
  import { scale } from 'svelte/transition';
  import KaTeXDisplay from '$lib/components/KaTeXDisplay.svelte';
  import MicrophoneButton from '$lib/components/MicrophoneButton.svelte';
  import IconClose from '$lib/components/IconClose.svelte';
  import IconCircle from '$lib/components/IconCircle.svelte';
  import TealButton from '$lib/components/TealButton.svelte';

  const dispatch = createEventDispatcher();

  export let currentProblemAnswer = [];
  export let handleProceedToNextProblem; // 親から受け取る「次の問題へ進む」関数
  export let currentProblemAcceptableAnswers = [];

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
    const normalizedUserAnswer = userAnswer.trim().toLowerCase().replace(/\s/g, '');

    isCorrectAnswer = currentProblemAcceptableAnswers.some(acceptableAnswer => {
      const normalizedAcceptableAnswer = acceptableAnswer.trim().toLowerCase().replace(/\s/g, '');
      return normalizedUserAnswer === normalizedAcceptableAnswer;
    });

    showResult = true; // ★正解・不正解にかかわらず結果を表示する★
    // ここではまだ dispatch('recordAnswer') しない。
    // ボタンがクリックされたときに dispatch して親に伝える。
  }

  function resetState(){ // 新しい関数
    userAnswer = '';
    showResult = false;
    isCorrectAnswer = false;
  }

  function handleNextButtonClick() {
    dispatch('recordAnswer', { isCorrect: isCorrectAnswer });
    handleProceedToNextProblem(); // 親から渡された次の問題へ進む関数を実行
    resetState(); // このコンポーネントの状態をリセット
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

    <TealButton
  text="回答を送信"
  onClick={checkAnswer}
  disabled={!userAnswer.trim() || showResult}
/>

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
        <TealButton text="次の問題へ" onClick={handleNextButtonClick} />
      {:else}
      <TealButton text="次の問題へ" onClick={handleNextButtonClick} />
      {/if}
    </div>
  {/if}
</div>