<script>
    import KaTeXDisplay from '$lib/components/KaTeXDisplay.svelte';

    export let problemNumber = 0; // 問題番号 (例: currentProblemIndex + 1)
    export let questionContent = []; // 問題文のtextContent配列
    export let source;
  </script>

 <div class="flex flex-col items-center justify-centermx-auto">
   <div class="flex my-6">
     <span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-stone-700 text-white text-3xl font-thin mt-2 mr-4 flex-shrink-0">
       {problemNumber}
     </span>
     <p class="text-2xl text-stone-700 font-light leading-loose flex-grow">
       <KaTeXDisplay textContent={questionContent} displayMode={false} fontSizeClass="text-2xl" textColor="text-stone-700" />
     </p>
   </div>
  <div class="w-full flex justify-end mt-4">
    <span class="text-white text-xs bg-stone-700 py-2 px-4 rounded-full">{source}</span>
  </div>
 </div>