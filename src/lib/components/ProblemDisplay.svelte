<script>
    import KaTeXDisplay from '$lib/components/KaTeXDisplay.svelte';

    export let problemNumber = 0; // 問題番号 (例: currentProblemIndex + 1)
    export let questionContent = []; // 問題文のtextContent配列
    export let source;
    export let tag;

  $: tagColorClass = (tag) => {
    switch (tag) {
      case '重要':
        return 'bg-red-500'; // 「重要」は赤色
      case '応用':
        return 'bg-yellow-500'; // 「応用」は青色
      default:
        return 'bg-stone-700'; // デフォルトの色（現在の灰色）
    }
  };
  </script>

 <div class="flex flex-col">
   <div class="flex">
     <span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-stone-700 text-white text-xl font-thin mt-2 mr-4 flex-shrink-0 font-sans">
       {problemNumber}
     </span>
     <p class="text-xl text-stone-700 leading-loose flex-grow">
       <KaTeXDisplay textContent={questionContent} displayMode={false} fontSizeClass="text-2xl" textColor="text-stone-700" />
     </p>
   </div>
  <div class="w-full flex justify-end">
    {#if tag}
    <span class="text-white text-xs font-sans {tagColorClass(tag)} py-2 px-4 rounded-full mr-2">{tag}</span>
    {/if}
    <span class="text-white text-xs font-sans bg-stone-700 py-2 px-4 rounded-full">{source}</span>
  </div>
 </div>