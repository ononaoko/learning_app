<script>
  import { createEventDispatcher } from 'svelte'; // dispatchはもう使わないが、念のため残す
  import { slide, fly } from 'svelte/transition';
  import KaTeXDisplay from '$lib/components/KaTeXDisplay.svelte';
  // TealButtonはもう使わないのでインポートも削除
  // import TealButton from '$lib/components/TealButton.svelte';

  // const dispatch = createEventDispatcher(); // dispatchはもう使わないのでコメントアウトか削除

  export let hints = [];
  export let currentHintIndex = 0;
  export let showAnswerArea = false;
  export let showAllHints = false;

  // dispatchShowNextHint関数も削除
  // function dispatchShowNextHint() {
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
          <p class="text-2xl text-teal-500 leading-loose">
            <KaTeXDisplay textContent={hint.expression} displayMode={false} fontSizeClass="text-2xl" textColor="text-teal-500" />
          </p>
        </div>
        <div
          class="w-1/2 text-left bg-white rounded-md p-3 ml-4 shadow-md"
          in:fly="{{ x: 200, duration: 400 }}"
        >
          <p class="text-lg text-stone-700 leading-loose">
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