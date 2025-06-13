<script>
    import { createEventDispatcher } from 'svelte';
    import { slide, fly } from 'svelte/transition'; // slideとflyをインポート
    import KaTeXDisplay from '$lib/components/KaTeXDisplay.svelte';

    const dispatch = createEventDispatcher();

    export let hints = []; // 親からヒントの配列を受け取る
    export let currentHintIndex = 0; // 親から現在のヒントインデックスを受け取る
    export let showAnswerArea = false; // 親から解答表示エリアの状態を受け取る（ヒントボタンの表示制御用）
    export let showAllHints = false; // すべてのヒントと途中式を表示するかどうかのフラグ

    // 親に「次のヒントを表示」イベントをディスパッチ
    function dispatchShowNextHint() {
      dispatch('showNextHint');
    }
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
        {#if index < hints.length - 1}
          <hr class="border-t border-dashed my-2 border-gray-400"
              style="display: {index < currentHintIndex - 1 ? 'block' : 'none'};"
          />
        {/if}
      {/if}
    {/each}
  </div>

  <div class="flex justify-end space-x-4 mb-4 text-lg self-end">
    {#if !showAnswerArea && currentHintIndex < hints.length && !showAllHints}
      <button
        class="w-[calc(25%-1.5rem)] bg-yellow-300 border-yellow-500 border-b-[1px] transition-all duration-150 [box-shadow:0_5px_0_0_#facc15] hover:[box-shadow:0_0px_0_0_#facc15] hover:border-b-[0px] hover:translate-y-2 text-stone-800 text-2xl font-bold py-4 px-4 rounded-md focus:outline-none focus:shadow-outline"
        on:click={dispatchShowNextHint}
      >
        ヒント
      </button>
    {/if}
  </div>