<script>
    export let current = 0; // 現在の進捗（例: currentProblemIndex + 1）
    export let total = 1;   // 全体の数（例: problems.length）

    // 進捗率を計算
    $: progress = total > 0 ? (current / total) * 100 : 0;
  </script>

  {#if total > 0}
    <div class="fixed bottom-0 left-0 w-full h-2 bg-gray-200">
      <div class="h-full bg-teal-500 transition-all duration-300 ease-in-out" style="width: {progress}%;"></div>
    </div>
  {/if}