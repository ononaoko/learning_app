<script>
  import { createEventDispatcher } from 'svelte';
  import { scale } from 'svelte/transition';
  import KaTeXDisplay from '$lib/components/KaTeXDisplay.svelte';
  import MicrophoneButton from '$lib/components/MicrophoneButton.svelte';
  import IconClose from '$lib/components/IconClose.svelte';
  import IconCircle from '$lib/components/IconCircle.svelte';
  import TealButton from '$lib/components/TealButton.svelte';
  import { tick } from 'svelte';

  const dispatch = createEventDispatcher();

  export let currentProblemAnswer = []; // answer プロパティはオブジェクトの配列
  export let currentProblemAcceptableAnswers = []; // acceptableAnswers は文字列の配列

  let userAnswer = '';
  let showResult = false;
  let isCorrect = false;
  let feedbackMessage = '';
  let correctSound;
  let incorrectSound;

  // currentProblemAnswer が変更されたときに数式部分を抽出する
  // このブロックはコンポーネトの状態をリセットするためにも使用します
  $: if (currentProblemAnswer && currentProblemAnswer.length > 0) {
    resetState(); // 新しい問題がロードされたときに状態をリセット
  }

  function playSound(isCorrect) {
    if (isCorrect) {
      if (correctSound) {
        correctSound.currentTime = 0;
        correctSound.play().catch(e => console.error("正解音の再生エラー:", e));
      }
    } else { // 不正解の場合のみ再生
      if (incorrectSound) {
        incorrectSound.currentTime = 0;
        incorrectSound.play().catch(e => console.error("不正解音の再生エラー:", e));
      }
    }
  }

  function handleSpeechRecognized(event) {
    userAnswer = event.detail.transcript;
  }

  function handleSpeechError(event) {
    console.error('MicrophoneButtonからのエラー:', event.detail.error);
  }

  function evaluateAnswer() {
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
    playSound(isCorrect);

    dispatch('recordAnswer', { isCorrect: isCorrect });
  }

  function resetState() {
    userAnswer = '';
    showResult = false;
    isCorrect = false;
    feedbackMessage = '';
  }

  // イベントオブジェクトを受け取り、preventDefault() を呼び出す
  function handleNextButtonClick() { // event 引数を削除
    dispatch('nextProblem');
  }

  // 「ここまで」ボタンが押された時のハンドラ
  async function handleFinishSessionClick() {
    // showResult が true の状態を確実に解除してからイベントをディスパッチ
    showResult = false;
    await tick(); // DOMの更新を待つ
    dispatch('finishSession');
  }
</script>

<audio bind:this={correctSound} src="/sounds/correct.mp3" preload="auto"></audio>
<audio bind:this={incorrectSound} src="/sounds/incorrect.mp3" preload="auto"></audio>

<div in:scale={{ start: 0.5 }} class="rounded-md p-4 bg-stone-50 [box-shadow:var(--shadow-neumorphic-convex)] flex flex-col space-y-4 max-w-xl mx-auto mb-8">
  {#if !showResult}
    <h2 class="text-2xl font-bold text-stone-700 text-center font-sans">回答を入力してください</h2>
    <div class="flex items-center space-x-4">
      <input
        type="text"
        class="flex-grow p-3 border border-stone-300 rounded-md text-xl font-sans text-stone-700 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white [box-shadow:var(--shadow-neumorphic-concave)]"
        placeholder="ここに音声入力されます"
        bind:value={userAnswer}
        on:keydown={(e) => { if (e.key === 'Enter') evaluateAnswer(); }}
      />
      <MicrophoneButton
        on:recognized={handleSpeechRecognized}
        on:error={handleSpeechError}
      />
    </div>

    <TealButton
      text="回答を送信"
      type="button"
      onClick={evaluateAnswer}
      disabled={!userAnswer.trim() || showResult}
    />

  {/if}

  {#if showResult}
    <div class="px-8 pb-8 rounded-md flex flex-col gap-4" in:scale={{ start: 0.5 }}>
      <div class="flex justify-center">
        {#if isCorrect}
          <IconCircle width="64" height="64" color="#ef4444" />
        {:else}
          <IconClose width="64" height="64" color="#3b82f6" />
        {/if}
      </div>
          {#if !isCorrect}
            <div class="text-lg text-stone-700 text-center">
              <KaTeXDisplay textContent={currentProblemAnswer} displayMode={false} fontSizeClass="text-2xl" textColor="text-stone-700" />
            </div>
          {/if}
          <div class="flex flex-col lg:flex-row-reverse gap-8">
        <TealButton
        text="次の問題へ"
        type="button"
        onClick={handleNextButtonClick}
        widthClass="w-full lg:flex-1"
        />
        <TealButton
        text="ここまで"
        onClick={handleFinishSessionClick}
        widthClass="w-full lg:flex-1"
        buttonColorClass="bg-gray-400"
        borderColorClass="border-gray-600"
        shadowColorClass="[box-shadow:0_5px_0_0_#6b7280]"
        hoverShadowColorClass="hover:[box-box-shadow:0_0px_0_0_#6b7280]"
        textColorClass="text-white"
      />
          </div>
    </div>
  {/if}
</div>