<script>
    import KaTeXDisplay from '$lib/components/KaTeXDisplay.svelte';

    export let problemNumber = 0; // 問題番号 (例: currentProblemIndex + 1)
    export let questionContent = []; // 問題文のtextContent配列
  </script>

  <div class="flex items-center mt-6 mb-6">
    <span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-teal-300 text-stone-700 text-3xl font-thin mr-4">
      {problemNumber}
    </span>
    <p class="text-2xl text-stone-700 font-light leading-loose">
      <KaTeXDisplay textContent={questionContent} displayMode={false} fontSizeClass="text-2xl" textColor="text-stone-700" />
    </p>
  </div>