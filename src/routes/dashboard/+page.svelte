<script>
    import { isLoggedIn, nickname } from '$lib/authStore';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import IconHamburger from '$lib/components/IconHamburger.svelte';
    import AppNavigation from '$lib/components/AppNavigation.svelte'; // 新しいナビゲーションコンポーネントをインポート
    import IconGhost from '$lib/components/IconGhost.svelte';
    import TealButton from '$lib/components/TealButton.svelte';
    import { audioStore } from '$lib/stores/audioStore.js';

    let isOpen = false; // メニューの開閉状態

  // 効果音付きメニュートグル（統一システム使用）
  async function toggleMenu() {
    await audioStore.play('menu');
    isOpen = !isOpen;
  }

    // 学習記録データ (初期値は空かデフォルト値)
    let totalLearningSessions = 0;
    let consecutiveLearningDays = 0;
    let unitStats = [];
    let problemCorrectness = [];
    let learningTime = {};
    let achievements = [];
    let progressRates = [];
    let weakestProblems = [];

    // ★追加: 学習統計データをロードする関数★
    async function loadLearningStats() {
        try {
            const response = await fetch('/api/learning-stats'); // APIエンドポイントからデータをフェッチ
            if (response.ok) {
                const data = await response.json();
                totalLearningSessions = data.totalLearningSessions;
                consecutiveLearningDays = data.consecutiveLearningDays;
                unitStats = data.unitStats;
                problemCorrectness = data.problemCorrectness;
                learningTime = data.learningTime;
                achievements = data.achievements;
                progressRates = data.progressRates;
                weakestProblems = data.weakestProblems;
                console.log('学習統計データをロードしました:', data);
            } else {
                console.error('学習統計データのロードに失敗しました:', response.statusText);
            }
        } catch (error) {
            console.error('学習統計データのロード中にエラーが発生しました:', error);
        }
    }

    onMount(() => {
      loadLearningStats(); // コンポーネントがマウントされたときにデータをロード
    });

    async function goToNormalMode() {
      await audioStore.playWithDelay('click', () => {
      goto('/normal-mode');
      isOpen = false;
    }, 150);
    }

    async function goToReviewMode() {
      await audioStore.playWithDelay('click', () => {
      goto('/review-mode'); // 復習モードページへ遷移
      isOpen = false;
    }, 150);
    }

    async function goToStats() {
      goto('/stats'); // 学習統計詳細ページへ遷移
    }
  </script>

  <svelte:head>
    <title>算数学習アプリ - ダッシュボード</title>
  </svelte:head>

  <main class="flex flex-col items-center min-h-screen p-8 bg-gradient-to-br from-stone-100 via-stone-100 to-stone-200">
    <header class="
    w-full p-6 rounded-md relative
    bg-stone-100
    [box-shadow:var(--shadow-neumorphic-convex)]
    mb-8
  ">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <IconGhost />
            <h1 class="text-4xl font-bold text-stone-700">ようこそ、{$nickname} さん！</h1>
          </div>
          <button class="focus:outline-none cursor-pointer" on:click={toggleMenu} aria-label="メニューを開閉">
            <IconHamburger width="48" height="48" isOpen={isOpen} />
          </button>
        </div>
        <AppNavigation isOpen={isOpen} />
      </header>


    <div class="w-full bg-stone-100 [box-shadow:var(--shadow-neumorphic-convex)] shadow-lg rounded-lg p-8 space-y-8">

      <section class="flex flex-col items-center pb-8 border-b border-gray-200">
        <div class="max-w-2xl space-y-8 md:space-y-0 w-full">
          <h1><img src="/img/logo.svg" alt="ONOTE.APP" class="max-w-80 mx-auto mb-8"></h1>
          <div class="flex flex-col md:flex-row items-center gap-6 h-[8rem] md:h-[6rem]">
            <TealButton
            onClick={goToNormalMode}
            imageOnly={true}
            widthClass="w-[300px]"
            imageSrc="/img/normal-mode.svg"
            imageSize="h-8 w-auto"
          />
          <p class="text-stone-700 h-[4rem] rounded-md bg-stone-100 [box-shadow:var(--shadow-neumorphic-concave2)] w-[300px] flex justify-center items-center">過去問を演習して実力を測定</p>
          </div>
          <div class="flex flex-col md:flex-row items-center gap-6 h-[8rem] md:h-[6rem]">
            <TealButton
            onClick={goToReviewMode}
            widthClass="w-[300px]"
            buttonColorClass="bg-yellow-400"
            borderColorClass="border-yellow-500"
            shadowColorClass="[box-shadow:0_5px_0_0_#eab308,0_10px_0_0_#d1d5db]" hoverShadowColorClass="hover:[box-shadow:0_0px_0_0_#eab308,0_0_0_0_#d1d5db]"
            imageSrc="/img/ebbinghaus-mode.svg"
            imageSize="h-8 w-auto"
          />
          <p class="text-stone-700 h-[4rem] rounded-md bg-stone-100 [box-shadow:var(--shadow-neumorphic-concave2)] w-[300px] flex justify-center items-center">忘却曲線に沿った最適な復習問題</p>
          </div>
          <div class="flex flex-col md:flex-row items-center gap-6 h-[8rem] md:h-[6rem]">
            <TealButton
            onClick={goToReviewMode}
            widthClass="w-[300px]"
            buttonColorClass="bg-red-400"
            borderColorClass="border-red-400"
            shadowColorClass="[box-shadow:0_5px_0_0_#ef4444,0_10px_0_0_#d1d5db]" hoverShadowColorClass="hover:[box-shadow:0_0px_0_0_#ef4444,0_0px_0_0_#d1d5db]"
            imageSrc="/img/review-mode.svg"
            imageSize="h-8 w-auto"
          />
          <p class="text-stone-700 h-[4rem] rounded-md bg-stone-100 [box-shadow:var(--shadow-neumorphic-concave2)] w-[300px] flex justify-center items-center">正答率が低い問題を重点的に復習</p>
          </div>
        </div>
      </section>

      <section class="space-y-6">
        <h2 class="text-3xl font-bold text-gray-700 text-center mb-6">{$nickname}さんの学習統計</h2>

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

        <!-- <div class="bg-gray-100 p-6 rounded-lg shadow-sm">
          <h3 class="text-2xl font-semibold text-gray-700 mb-4">学習時間</h3>
          <p class="text-lg text-gray-700">最終学習日: {learningTime['2025/05/15']}</p>
          <p class="text-lg text-gray-700">平均学習時間: {learningTime.average}</p>
          <div class="bg-white h-48 mt-4 rounded-lg flex items-center justify-center text-gray-400">
            (ここに学習時間の折れ線グラフ Chart.js)
          </div>
        </div> -->

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
              class="h-4 rounded-full bg-teal-500"
              style={`width: ${pRate.total > 0 ? (pRate.covered / pRate.total) * 100 : 0}%;`}
              class:hidden={pRate.covered === 0}               ></div>
            </div>
          {/each}
        </div>

        <!-- <div class="bg-gray-100 p-6 rounded-lg shadow-sm">
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
        </div> -->
      </section>
    </div>
  </main>