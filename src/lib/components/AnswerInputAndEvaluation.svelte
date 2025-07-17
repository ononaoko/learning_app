<script>
  import { createEventDispatcher } from 'svelte';
  import { scale } from 'svelte/transition';
  import KaTeXDisplay from '$lib/components/KaTeXDisplay.svelte';
  import MicrophoneButton from '$lib/components/MicrophoneButton.svelte';
  import IconClose from '$lib/components/IconClose.svelte';
  import IconCircle from '$lib/components/IconCircle.svelte';
  import TealButton from '$lib/components/TealButton.svelte';
  import { audioStore } from '$lib/stores/audioStore.js';

  const dispatch = createEventDispatcher();

  export let currentProblemAnswer = []; // answer プロパティはオブジェクトの配列
  export let currentProblemAcceptableAnswers = []; // acceptableAnswers は文字列の配列

  let userAnswer = '';
  let showResult = false;
  let isCorrect = false;
  let feedbackMessage = '';

  // 削除: 個別の音声要素
  // let correctSound;
  // let incorrectSound;

  // currentProblemAnswer が変更されたときに数式部分を抽出する
  // このブロックはコンポーネトの状態をリセットするためにも使用します
  $: if (currentProblemAnswer && currentProblemAnswer.length > 0) {
    resetState(); // 新しい問題がロードされたときに状態をリセット
  }

  // 削除: 個別の効果音再生関数を統一システムに変更
  async function playSound(isCorrectAnswer) {
    if (isCorrectAnswer) {
      await audioStore.play('correct'); // 正解時はcorrect.mp3
    } else {
      await audioStore.play('incorrect'); // 不正解時はincorrect.mp3
    }
  }

  function handleSpeechRecognized(event) {
    userAnswer = event.detail.transcript;
  }

  // 効果音付き音声認識エラーハンドリング
  async function handleSpeechError(event) {
    console.error('MicrophoneButtonからのエラー:', event.detail.error);
    await audioStore.play('error'); // MicrophoneButtonエラー時にerror効果音
  }

  // MicrophoneButton録音開始時の効果音
  async function handleSpeechStart(event) {
    console.log('音声認識が開始されました');
    await audioStore.play('error'); // 録音開始時にerror効果音（名前がerrorですが気にしない）
  }

  async function evaluateAnswer() {
    // ユーザー入力を正規化
    const normalizedUserAnswer = userAnswer
      .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // 全角数字を半角に
      .replace(/[\s　\t\n]/g, '') // 全角/半角スペース、タブ、改行を除去
      .toLowerCase(); // 大文字小文字を区別しない

    // acceptableAnswers のみを参照して正誤判定を行う
    isCorrect = currentProblemAcceptableAnswers.some(acceptableAnswer => {
      const normalizedAcceptableAnswer = String(acceptableAnswer)
        .replace(/[\s　\t\n]/g, '') // 全角/半角スペース、タブ、改行を除去
        .toLowerCase(); // 大文字小文字を区別しない
      return normalizedUserAnswer === normalizedAcceptableAnswer;
    });

    showResult = true;
    await playSound(isCorrect); // 統一効果音システムを使用

    dispatch('recordAnswer', { isCorrect: isCorrect });
  }

  function resetState() {
    userAnswer = '';
    showResult = false;
    isCorrect = false;
    feedbackMessage = '';
  }

  // 効果音付き次の問題ボタン
  async function handleNextButtonClick() {
    await audioStore.play('click'); // TealButtonにclick効果音
    dispatch('nextProblem');
  }

  // 効果音付き回答送信ボタン
  async function handleSubmitAnswer() {
    await audioStore.play('click'); // TealButtonにclick効果音
    await evaluateAnswer();
  }
</script>

<!-- 削除: 個別のaudio要素 -->
<!-- <audio bind:this={correctSound} src="/sounds/correct.mp3" preload="auto"></audio> -->
<!-- <audio bind:this={incorrectSound} src="/sounds/incorrect.mp3" preload="auto"></audio> -->

<div in:scale={{ start: 0.5 }} class="rounded-md shadow-lg p-4 bg-white flex flex-col space-y-4 max-w-xl mx-auto">
  {#if !showResult}
    <h2 class="text-2xl font-bold text-stone-700 text-center">回答を入力してください</h2>
    <div class="flex items-center space-x-4">
      <input
        type="text"
        class="flex-grow p-3 border border-gray-300 rounded-md text-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        placeholder="ここに音声入力されます"
        bind:value={userAnswer}
        on:keydown={(e) => { if (e.key === 'Enter') handleSubmitAnswer(); }}
      />
      <MicrophoneButton
        on:recognized={handleSpeechRecognized}
        on:error={handleSpeechError}
        on:start={handleSpeechStart}
      />
    </div>

    <TealButton
      text="回答を送信"
      type="button"
      onClick={handleSubmitAnswer}
      disabled={!userAnswer.trim() || showResult}
    />

  {/if}

  {#if showResult}
    <div class="mt-4 rounded-md flex flex-col" in:scale={{ start: 0.5 }}>
      <div class="flex justify-center mb-4">
        {#if isCorrect}
          <IconCircle width="64" height="64" color="#ef4444" />
        {:else}
          <IconClose width="64" height="64" color="#3b82f6" />
        {/if}
      </div>
          {#if !isCorrect}
            <div class="text-lg text-stone-700 text-center mb-4">
              <KaTeXDisplay textContent={currentProblemAnswer} displayMode={false} fontSizeClass="text-2xl" textColor="text-stone-700" />
            </div>
          {/if}

        <TealButton text="次の問題へ" type="button" onClick={handleNextButtonClick} />
    </div>
  {/if}
</div>