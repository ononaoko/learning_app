<script>
    import { isLoggedIn, nickname } from '$lib/authStore';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { slide } from 'svelte/transition';
    import IconGhost from '$lib/components/IconGhost.svelte'


    // ユーザー表示欄の仮データ（後で実際のデータに置き換えます）
    let totalLearningSessions = 15; // 累計学習回数
    let consecutiveLearningDays = 7; // 連続学習日数

    // 学習統計データ表示欄の仮データ（後でChart.jsなどと連携します）
    let unitStats = [
      { unit: '代数', sessions: 10, correctness: 70, hintsUsed: 1.5 },
      { unit: '図形', sessions: 5, correctness: 85, hintsUsed: 0.8 }
    ];
    let problemCorrectness = [
      { problem: '問題1', correctness: 80 },
      { problem: '問題2', correctness: 20 }, // 苦手問題の例
      { problem: '問題3', correctness: 95 }
    ];
    let learningTime = {
      '2025/05/15': '30分',
      '2025/05/16': '25分',
      average: '15分'
    };
    let achievements = ['5回連続正解', '代数マスター']; // 達成バッジ
    let progressRates = [{ unit: '代数', covered: 8, total: 10 }]; // 進捗率
    let weakestProblems = [
      { problem: '問題2', correctness: 20 },
      { problem: '問題4', correctness: 40 }
    ]; // 苦手問題ランキング

    onMount(() => {
      // ダッシュボードロード時に必要なデータをフェッチまたは計算する
      // 例: updateLearningStats(); // 後で実装
    });

    let showEbbinghausList = false; // リストの表示/非表示を管理する変数

function toggleEbbinghausList() {
  showEbbinghausList = !showEbbinghausList; // クリックで表示状態を反転
}

    function goToNormalMode() {
      goto('/normal-mode'); // 通常モード（単元選択ページ）へ遷移
    }

    function goToReviewMode() {
      goto('/review-mode'); // 復習モードページへ遷移
    }

    function goToStats() {
      goto('/stats'); // 学習統計詳細ページへ遷移
    }

    function logoutUser() {
      isLoggedIn.set(false);
      nickname.set('');
      localStorage.removeItem('users');
      goto('/login'); // ログアウトしたらログインページへ
    }
  </script>

  <svelte:head>
    <title>算数学習アプリ - ダッシュボード</title>
  </svelte:head>

  <main class="flex flex-col items-center min-h-screen bg-gray-100 p-4">
    <header class="bg-teal-300 shadow-lg w-full p-6 mb-6 rounded-md relative">
      <div class="flex items-center justify-between">
        <div class="flex flex-row">
          <IconGhost width="48" height="48"/>
          <h1 class="text-4xl font-bold text-stone-700">{$nickname} <span class="text-base">さん</span></h1>
        </div>
        {#if $isLoggedIn}
        <button
        class=" bg-teal-600 text-white transition-all duration-150 hover:bg-teal-500  font-bold p-4 rounded-md focus:outline-none"
              type="button"
        on:click={logoutUser}
        >
        ログアウト
        </button>
        {/if}
      </div>
    </header>

    <section class="w-full bg-teal-100 p-6 flex flex-col items-center space-y-2 border-b border-gray-200">
      <button class="w-full text-3xl font-bold text-stone-700 cursor-pointer" on:click={toggleEbbinghausList}>
        エビングハウス通知
        {#if showEbbinghausList}
          <span class="ml-2">▲</span>
        {:else}
          <span class="ml-2">▼</span>
        {/if}
        <br>
        <span class="text-base font-normal">忘却曲線に基づいて復習が必要な単元を表示</span>
      </button>
      {#if showEbbinghausList}
        <ul transition:slide={{ duration: 300 }} class="flex flex-col space-y-4 w-full max-w-xl">
          <li class="flex items-center justify-between border border-solid border-stone-400 bg-stone-50 hover:bg-stone-100 rounded-full py-2 pl-6 pr-2">
            <p class="text-gray-700">1回目の復習単元が○個あります</p>
            <button class="bg-teal-500 hover:bg-teal-600 text-white font-bold py-1 px-3 rounded-full text-sm">復習</button>
          </li>
          <li class="flex items-center justify-between border border-solid border-stone-400 bg-stone-50 hover:bg-stone-100 rounded-full py-2 px-6 pr-2">
            <p class="text-gray-700">2回目の復習単元の○個あります</p>
            <button class="bg-teal-500 hover:bg-teal-600 text-white font-bold py-1 px-3 rounded-full text-sm">復習</button>
          </li>
          <li class="flex items-center justify-between border border-solid border-stone-400 bg-stone-50 hover:bg-stone-100 rounded-full py-2 px-6 pr-2">
            <p class="text-gray-700">3回目の復習単元が○個あります</p>
            <button class="bg-teal-500 hover:bg-teal-600 text-white font-bold py-1 px-3 rounded-full text-sm">復習</button>
          </li>
          <li class="flex items-center justify-between border border-solid border-stone-400 bg-stone-50 hover:bg-stone-100 rounded-full py-2 px-6 pr-2">
            <p class="text-gray-700">4回目の復習単元が○個あります</p>
            <button class="bg-teal-500 hover:bg-teal-600 text-white font-bold py-1 px-3 rounded-full text-sm">復習</button>
          </li>
        </ul>
      {/if}
    </section>

    <div class="w-full bg-white shadow-lg rounded-lg p-8 space-y-8">



      <section class="w-full flex flex-col items-center space-y-6 pb-6 border-b border-gray-200">
        <div class="w-xl h-20 flex flex-row space-x-6 items-center">
          <button
          class=" bg-teal-400 text-white w-1/2 border-b-[1px] transition-all duration-150 [box-shadow:0_5px_0_0_#14b8a6,0_10px_0_0_#d1d5db] hover:[box-shadow:0_0px_0_0_#14b8a6,0_0px_0_0_#d1d5db] hover:border-b-[0px] hover:translate-y-2 border-teal-400  font-bold py-4 rounded-md focus:outline-none focus:shadow-outline"
          on:click={goToNormalMode}
        >
          演習モード
        </button>
        <p class="text-stone-700 text-lg">単元を選択して学習</p>
        </div>
        <div class="w-xl h-20 flex flex-row space-x-6 items-center">
          <button
          class=" bg-teal-500 text-white w-1/2 border-b-[1px] transition-all duration-150 [box-shadow:0_5px_0_0_#0d9488,0_10px_0_0_#d1d5db] hover:[box-shadow:0_0px_0_0_#0d9488,0_0px_0_0_#d1d5db] hover:border-b-[0px] hover:translate-y-2 border-teal-500  font-bold py-4 rounded-md focus:outline-none focus:shadow-outline"
          on:click={goToReviewMode}
        >
          エビングハウス モード
        </button>
        <p class="text-stone-700 text-lg">忘却曲線に沿った反復学習</p>

        </div>
        <div class="w-xl h-20 flex flex-row space-x-6 items-center">
          <button
          class=" bg-teal-600 text-white w-1/2 border-b-[1px] transition-all duration-150 [box-shadow:0_5px_0_0_#14b8a6,0_10px_0_0_#d1d5db] hover:[box-shadow:0_0px_0_0_#14b8a6,0_0px_0_0_#d1d5db] hover:border-b-[0px] hover:translate-y-2 border-teal-600  font-bold py-4 rounded-md focus:outline-none focus:shadow-outline"
          on:click={goToReviewMode}
        >
          弱点克服モード
        </button>
        <p class="text-stone-700 text-lg">苦手分野を徹底攻略</p>

        </div>

      </section>

      <section class="text-center border-b pb-6 border-gray-200">
        <div class="flex justify-center space-x-8">
          <div class="p-4 bg-teal-100 rounded-lg shadow-sm">
            <p class="text-xl font-semibold text-gray-700">累計学習回数</p>
            <p class="text-4xl font-bold text-teal-700">{totalLearningSessions} 回</p>
          </div>
          <div class="p-4 bg-teal-100 rounded-lg shadow-sm">
            <p class="text-xl font-semibold text-gray-700">連続学習日数</p>
            <p class="text-4xl font-bold text-teal-700">{consecutiveLearningDays} 日</p>
          </div>
        </div>
      </section>

      <section class="space-y-6">
        <h2 class="text-3xl font-bold text-gray-700 text-center mb-6">あなたの学習統計</h2>

        <div class="bg-gray-100 p-6 rounded-lg shadow-sm">
          <h3 class="text-2xl font-semibold text-gray-700 mb-4">単元別パフォーマンス</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each unitStats as stat}
              <div class="p-4 bg-white rounded-lg shadow-sm text-center">
                <p class="text-xl font-bold text-gray-700">{stat.unit}</p>
                <p class="text-lg text-gray-600">回数: {stat.sessions}回</p>
                <p class="text-lg text-gray-600">正答率: {stat.correctness}%</p>
                <p class="text-lg text-gray-600">ヒント使用率: {stat.hintsUsed}回/問</p>
              </div>
            {/each}
          </div>
        </div>

        <div class="bg-gray-100 p-6 rounded-lg shadow-sm">
          <h3 class="text-2xl font-semibold text-gray-700 mb-4">問題別正答率</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each problemCorrectness as pStat}
              <div class="p-3 bg-white rounded-lg shadow-sm flex justify-between items-center">
                <p class="text-lg text-gray-700">{pStat.problem}</p>
                <p class="text-xl font-bold text-teal-500">{pStat.correctness}%</p>
              </div>
            {/each}
          </div>
        </div>

        <div class="bg-gray-100 p-6 rounded-lg shadow-sm">
          <h3 class="text-2xl font-semibold text-gray-700 mb-4">学習時間</h3>
          <p class="text-lg text-gray-700">最終学習日: {learningTime['2025/05/15']}</p>
          <p class="text-lg text-gray-700">平均学習時間: {learningTime.average}</p>
          <div class="bg-white h-48 mt-4 rounded-lg flex items-center justify-center text-gray-400">
            (ここに学習時間の折れ線グラフ Chart.js)
          </div>
        </div>

        <div class="bg-gray-100 p-6 rounded-lg shadow-sm">
          <h3 class="text-2xl font-semibold text-gray-700 mb-4">達成バッジ</h3>
          <div class="flex flex-wrap justify-center gap-4">
            {#each achievements as badge}
              <span class="bg-yellow-300 text-yellow-800 px-4 py-2 rounded-full font-semibold shadow-sm">
                {badge}
              </span>
            {/each}
          </div>
        </div>

        <div class="bg-gray-100 p-6 rounded-lg shadow-sm">
          <h3 class="text-2xl font-semibold text-gray-700 mb-4">進捗率</h3>
          {#each progressRates as pRate}
            <div class="flex justify-between items-center mb-2">
              <p class="text-lg text-gray-700">{pRate.unit}</p>
              <p class="text-xl font-bold text-teal-500">{pRate.covered} / {pRate.total} 問</p>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div
                class="bg-teal-500 h-4 rounded-full"
                style="width: {(pRate.covered / pRate.total) * 100}%"
              ></div>
            </div>
          {/each}
        </div>

        <div class="bg-gray-100 p-6 rounded-lg shadow-sm">
          <h3 class="text-2xl font-semibold text-gray-700 mb-4">苦手問題ランキング</h3>
          {#if weakestProblems.length > 0}
            <ol class="list-decimal list-inside space-y-2">
              {#each weakestProblems as wProblem}
                <li class="p-3 bg-white rounded-lg shadow-sm flex justify-between items-center">
                  <p class="text-lg text-gray-700">{wProblem.problem}</p>
                  <p class="text-xl font-bold text-red-500">{wProblem.correctness}%</p>
                </li>
              {/each}
            </ol>
          {:else}
            <p class="text-gray-600">まだ苦手な問題はありません。</p>
          {/if}
        </div>
      </section>

      <div class="text-center mt-8">
        <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md text-xl" on:click={goToStats}>
          詳細な学習統計を見る
        </button>
      </div>
    </div>
  </main>