<script>
  import { slide, fly } from 'svelte/transition';
  import KaTeXDisplay from '$lib/components/KaTeXDisplay.svelte';
  import { onMount } from 'svelte';

  export let hints = [];
  export let currentHintIndex = 0;
  export let showAnswerArea = false;
  export let showAllHints = false;

  // 削除: 個別の音声要素と効果音関連のコード
  // let slideSound;
  // let previousHintIndex = 0;
  // let wasShowAllHints = false;

  // 削除: 効果音再生関数
  // function playSlideSound() { ... }

  // 削除: リアクティブ効果音処理
  // $: if (currentHintIndex > previousHintIndex) { ... }
  // $: if (showAllHints && !wasShowAllHints) { ... }

  // コンポーネントがマウントされたときの処理（簡略化）
  onMount(() => {
    // 効果音関連の初期化は不要になったため、削除
    console.log('HintSection mounted');
  });
</script>

<!-- 削除: 効果音のaudio要素 -->
<!-- <audio bind:this={slideSound} src="/sounds/slide.mp3" preload="auto"></audio> -->

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