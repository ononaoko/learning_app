<script>
  import { slide, fly } from 'svelte/transition';
  import KaTeXDisplay from '$lib/components/KaTeXDisplay.svelte';
  import { onMount } from 'svelte';

  export let hints = [];
  export let currentHintIndex = 0;
  export let showAnswerArea = false;
  export let showAllHints = false;

  let slideSound;
  let previousHintIndex = 0;
  let wasShowAllHints = false;

  // ヒント音を再生する関数
  function playSlideSound() {
    if (slideSound) {
      slideSound.currentTime = 0;
      slideSound.play().catch(e => console.error("スライド音の再生エラー:", e));
    }
  }

  // currentHintIndexが変化したときに効果音を鳴らす
  $: if (currentHintIndex > previousHintIndex) {
    playSlideSound();
    previousHintIndex = currentHintIndex;
  }

  // showAllHintsがtrueに変化したときにも効果音を鳴らす
  $: if (showAllHints && !wasShowAllHints) {
    playSlideSound();
    wasShowAllHints = showAllHints;
  }

  // コンポーネントがマウントされたときの処理
  onMount(() => {
    // 初期状態をセット
    previousHintIndex = currentHintIndex;
    wasShowAllHints = showAllHints;
  });
</script>

<!-- 効果音のaudio要素 -->
<audio bind:this={slideSound} src="/sounds/slide.mp3" preload="auto"></audio>

<div transition:slide={{ duration: 300 }}>
  {#each hints as hint, index}
    {#if showAllHints || index < currentHintIndex}
      <div
        class="flex flex-col lg:flex-row items-center py-4 gap-8"
        in:slide={{ duration: 300 }}
        out:slide={{ duration: 300 }}
      >
        <div class="w-full lg:w-1/2 gap-8">
          <div class="flex flex-col items-start text-teal-500 leading-loose ml-4">
            <KaTeXDisplay textContent={hint.expression} displayMode={true} fontSizeClass="text-xl" textColor="text-teal-500" />
          </div>
        </div>
        <div
          class="w-full lg:w-1/2 text-left bg-white rounded-md p-3 gap-8 shadow-md"
          in:fly="{{ x: 200, duration: 400 }}"
        >
          <p class="text-stone-700 leading-loose">
            <KaTeXDisplay textContent={hint.explanation} displayMode={false} fontSizeClass="text-lg" textColor="text-stone-700" />
          </p>
        </div>
      </div>
      {#if index < hints.length - 1 && (showAllHints || index < currentHintIndex - 1)}
        <hr class="border-t border-dashed my-2 border-gray-400"/>
      {/if}
    {/if}
  {/each}
</div>

<style>
  /* 既存のKaTeXスタイルや、HintSection固有のスタイル */
</style>