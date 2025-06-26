<script>
    import { onMount } from 'svelte';
    import ProblemDisplay from '$lib/components/ProblemDisplay.svelte';
    import KaTeXDisplay from '$lib/components/KaTeXDisplay.svelte'; // 数式表示コンポーネント
    // TealButton や他のボタンコンポーネントはここでは不要です
    // 匿名ユーザーでデータをロードするため、authStoreは不要

    let problems = [];
    let errorMessage = '';
    let selectedUnit = 'algebra'; // 初期表示する単元
    let availableUnits = [ // 利用可能な単元リスト (必要に応じて追加)
      { id: 'algebra', name: '代数' },
      { id: 'geometry', name: '図形' },
      { id: 'basic_ratio_proportion', name: '比と割合' }, // 新しく追加した単元があれば追加
      { id: 'concentration', name: '濃度' } // 新しく追加した単元があれば追加
    ];

    // 全問題データをロードする関数
    async function loadAllProblems(unit) {
      try {
        errorMessage = ''; // エラーメッセージをリセット
        const response = await fetch(`/api/problems/${unit}`);
        if (response.ok) {
          problems = await response.json();
          console.log(`Loaded all problems for ${unit}:`, problems);
        } else {
          errorMessage = `問題の読み込みに失敗しました: ${response.statusText}`;
        }
      } catch (error) {
        errorMessage = '問題の読み込み中にエラーが発生しました。';
        console.error('Error loading problems:', error);
      }
    }

    // 単元が変更されたら問題を再ロード
    $: selectedUnit, loadAllProblems(selectedUnit);

    onMount(() => {
      // コンポーネントマウント時に初期単元の問題をロード
      loadAllProblems(selectedUnit);
    });
  </script>

  <svelte:head>
    <title>問題表示デバッグ - 算数学習アプリ</title>
  </svelte:head>

  <main class="bg-stone-100 min-h-screen p-4">
    <header class="bg-blue-300 shadow-lg w-full p-6 rounded-md mb-8 text-center">
      <h1 class="text-4xl font-bold text-stone-700">問題表示デバッグモード</h1>
      <p class="text-lg text-stone-600 mt-2">すべての問題の表示を確認できます</p>
    </header>

    <section class="mb-6 flex justify-center items-center gap-4">
      <label for="unit-select" class="text-xl font-semibold text-stone-700">単元を選択:</label>
      <select
        id="unit-select"
        class="p-2 border border-gray-300 rounded-md text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        bind:value={selectedUnit}
      >
        {#each availableUnits as unitOption}
          <option value={unitOption.id}>{unitOption.name}</option>
        {/each}
      </select>
    </section>

    {#if errorMessage}
      <p class="text-red-500 text-center text-xl font-semibold mt-4">{errorMessage}</p>
    {:else if problems.length === 0}
      <p class="text-gray-600 text-center text-xl mt-4">問題をロード中...</p>
    {:else}
      <div class="space-y-12">
        {#each problems as problem, index}
          <div class="bg-white shadow-lg rounded-lg p-6 mb-8 border-2 border-blue-200">
            <h2 class="text-2xl font-bold text-blue-700 mb-4">問題 #{index + 1}</h2>

            <div class="mb-6">
              <ProblemDisplay problemNumber={index + 1} questionContent={problem.question} source={problem.source} tag={problem.tag}/>
            </div>

            {#if problem.hints && problem.hints.length > 0}
              <div class="p-4 bg-yellow-50 rounded-md border border-yellow-200 mb-6">
                <h3 class="text-xl font-semibold text-yellow-600 mb-4">ヒント・解説:</h3>
                {#each problem.hints as hint, hintIndex}
                  <div class="flex items-start py-2">
                    <div class="w-1/2 ml-4">
                      <p class="text-xl text-yellow-600 leading-loose">
                        <KaTeXDisplay textContent={hint.expression} displayMode={false} fontSizeClass="text-2xl" textColor="text-yellow-700" />
                      </p>
                    </div>
                    <div class="w-1/2 text-left bg-white rounded-md p-2 ml-4 shadow-sm">
                      <p class="text-lg text-stone-700 leading-loose">
                        <KaTeXDisplay textContent={hint.explanation} displayMode={false} fontSizeClass="text-lg" textColor="text-stone-700" />
                      </p>
                    </div>
                  </div>
                  {#if hintIndex < problem.hints.length - 1}
                    <hr class="border-t border-dashed my-2 border-gray-300" />
                  {/if}
                {/each}
              </div>
            {:else}
              <p class="text-gray-500 text-center mt-4">この問題にはヒントがありません。</p>
            {/if}

            <div class="p-4 bg-blue-50 rounded-md border border-blue-200">
                <h3 class="text-xl font-semibold text-blue-600 mb-2">答え:</h3>
                <p class="leading-loose text-center font-light">
                  <KaTeXDisplay textContent={problem.answer} displayMode={false} fontSizeClass="text-2xl" textColor="text-blue-700" />
                </p>
                {#if problem.acceptableAnswers && problem.acceptableAnswers.length > 0}
                <p class="text-sm text-blue-500 mt-2">
                    (許容される回答: {problem.acceptableAnswers.join(', ')})
                </p>
                {/if}
              </div>

          </div>
        {/each}
      </div>
    {/if}
  </main>