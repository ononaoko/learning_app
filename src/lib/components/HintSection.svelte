<script>
  import { slide, fly } from 'svelte/transition';
  import KaTeXDisplay from '$lib/components/KaTeXDisplay.svelte';

  export let hints = [];
  export let currentHintIndex = 0;
  export let showAnswerArea = false;
  export let showAllHints = false;

  // 「次のヒントを見る」ボタンがないため、ディスパッチャー関連のコードは不要
  // import { createEventDispatcher } from 'svelte';
  // const dispatch = createEventDispatcher();
  // function showNextHint() {
  //   dispatch('showNextHint');
  // }
</script>

<div transition:slide={{ duration: 300 }}>
  {#each hints as hint, index}
    {#if showAllHints || index < currentHintIndex}
      <div
        class="flex items-center py-4"
        in:slide={{ duration: 300 }}
        out:slide={{ duration: 300 }}
      >
        <div class="w-1/2 ml-14">
          <div class="flex flex-col items-start text-teal-500 leading-loose">
            <KaTeXDisplay textContent={hint.expression} displayMode={true} fontSizeClass="text-xl" textColor="text-teal-500" />
          </div>
        </div>
        <div
          class="w-1/2 text-left bg-white rounded-md p-3 ml-4 shadow-md"
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