<script>
  import { onMount } from 'svelte';
  import KaTeXDisplay from '$lib/components/KaTeXDisplay.svelte'; // KaTeXDisplayコンポーネントをインポート

  let problemData = { // 初期値を新しいJSON構造に合わせて仮定義
    question: [{ type: 'text', value: '読み込み中...' }], // 配列形式
    answer: [{ type: 'text', value: '読み込み中...' }], // 配列形式
    hints: []
  };
  let errorMessage = '';
  let selectedUnit = 'algebra'; // テスト用に'algebra'を固定

  onMount(async () => {
    console.log('Test Page: Component mounted.');
    try {
      const response = await fetch(`/api/problems/${selectedUnit}`);
      if (response.ok) {
        const data = await response.json();
        problemData = data[0]; // 最初の問題を取得
      } else {
        errorMessage = `問題の読み込みに失敗しました: ${response.statusText}`;
      }
    } catch (error) {
      errorMessage = '問題の読み込み中にエラーが発生しました。';
      console.error('Fetch error:', error);
    }
  });
</script>

<svelte:head>
  <title>KaTeXDisplay テストページ</title>
</svelte:head>

<main class="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
  <h1 class="text-3xl font-bold text-gray-700 mb-6">KaTeXDisplay テスト</h1>

  {#if errorMessage}
    <p class="text-red-500">{errorMessage}</p>
  {/if}

  {#if problemData.question && problemData.question.length > 0}
    <div class="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
      <h2 class="text-2xl font-semibold text-teal-500 mb-4">テスト問題</h2>

      <p class="text-xl text-gray-800 mb-4">
        **問題:** <KaTeXDisplay textContent={problemData.question} displayMode={false} fontSizeClass="text-xl" textColor="text-gray-800" />
      </p>
      <p class="text-xl text-gray-800 mb-4">
        **解答:** <KaTeXDisplay textContent={problemData.answer} displayMode={false} fontSizeClass="text-xl" textColor="text-gray-800" />
      </p>
      <h3 class="text-lg font-semibold text-gray-700 mt-4 mb-2">ヒント:</h3>
      {#if problemData.hints?.length > 0}
        {#each problemData.hints as hint}
          <p class="text-gray-600 mb-2">
            <KaTeXDisplay textContent={hint.explanation} displayMode={false} fontSizeClass="text-gray-600" textColor="text-gray-600" />
            {#if hint.expression && hint.expression.length > 0 && hint.expression[0].value !== ""}
              (<KaTeXDisplay textContent={hint.expression} displayMode={false} fontSizeClass="text-gray-600" textColor="text-gray-600" />)
            {/if}
          </p>
        {/each}
      {:else}
        <p class="text-gray-600">ヒントはありません。</p>
      {/if}
    </div>
  {:else}
    <p>問題データを読み込み中...</p>
  {/if}
</main>