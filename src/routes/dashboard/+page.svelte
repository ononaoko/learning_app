<script>
  import { isLoggedIn, nickname } from '$lib/authStore';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import IconHamburger from '$lib/components/IconHamburger.svelte';
  import AppNavigation from '$lib/components/AppNavigation.svelte';
  import IconGhost from '$lib/components/IconGhost.svelte';
  import TealButton from '$lib/components/TealButton.svelte';
  import { audioStore } from '$lib/stores/audioStore.js';
  import StudyStreakCard from '$lib/components/StudyStreakCard.svelte';
  import DailyStudyChart from '$lib/components/DailyStudyChart.svelte';
  import EbbinghausAnalyticsChart from '$lib/components/EbbinghausAnalyticsChart.svelte';

  let isOpen = false; // メニューの開閉状態

  // 効果音付きメニュートグル（統一システム使用）
  async function toggleMenu() {
    await audioStore.play('menu');
    isOpen = !isOpen;
  }

  // 既存の学習記録データ (従来のAPI用)
  let totalLearningSessions = 0;
  let consecutiveLearningDays = 0;
  let unitStats = [];
  let problemCorrectness = [];
  let learningTime = {};
  let achievements = [];
  let progressRates = [];
  let weakestProblems = [];

  // ★新規追加: 新しいコンポーネント用のデータ★
  let streakData = null;
  let dailyStatsData = [];
  let ebbinghausData = null;
  let isComponentDataLoading = true;
  let componentDataError = null;

  export let data;
  let currentUserId = data.userId;
  console.log('ダッシュボード サーバー側で設定されたuserId:', currentUserId);

  // 既存の学習統計データをロードする関数（従来のAPI）
  async function loadLearningStats() {
    try {
      const response = await fetch('/api/learning-stats');
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
        console.log('従来の学習統計データをロードしました:', data);
      } else {
        console.error('学習統計データのロードに失敗しました:', response.statusText);
      }
    } catch (error) {
      console.error('学習統計データのロード中にエラーが発生しました:', error);
    }
  }

  // ★新規追加: 新しいコンポーネント用のデータを取得★
  async function loadComponentData() {
    isComponentDataLoading = true;
    componentDataError = null;

    try {
      console.log('=== 新しいコンポーネント用データ取得開始 ===');

      // 3つのAPIを並行して呼び出し
      const [ebbinghausResponse, dailyStatsResponse, streakResponse] = await Promise.allSettled([
        // エビングハウス分析
        fetch('/api/ebbinghaus-analytics?type=retention'),

        // 日別学習統計（拡張されたlearning-stats API）
        fetch('/api/learning-stats?type=daily&days=7'),

        // 連続学習記録（拡張されたlearning-stats API）
        fetch('/api/learning-stats?type=streak')
      ]);

      // エビングハウス分析データの処理
      if (ebbinghausResponse.status === 'fulfilled' && ebbinghausResponse.value.ok) {
        ebbinghausData = await ebbinghausResponse.value.json();
        console.log('✅ エビングハウスデータ取得成功:', ebbinghausData);
      } else {
        console.warn('⚠️ エビングハウスデータ取得失敗:', ebbinghausResponse);
        ebbinghausData = createEmptyEbbinghausData();
      }

      // 日別統計データの処理
      if (dailyStatsResponse.status === 'fulfilled' && dailyStatsResponse.value.ok) {
        dailyStatsData = await dailyStatsResponse.value.json();
        console.log('✅ 日別統計データ取得成功:', dailyStatsData);
      } else {
        console.warn('⚠️ 日別統計データ取得失敗:', dailyStatsResponse);
        dailyStatsData = createEmptyDailyStats();
      }

      // 連続学習記録データの処理
      if (streakResponse.status === 'fulfilled' && streakResponse.value.ok) {
        streakData = await streakResponse.value.json();
        console.log('✅ 連続学習データ取得成功:', streakData);
      } else {
        console.warn('⚠️ 連続学習データ取得失敗:', streakResponse);
        streakData = createEmptyStreakData();
      }

      console.log('=== 新しいコンポーネント用データ取得完了 ===');

    } catch (err) {
      console.error('❌ コンポーネントデータ取得エラー:', err);
      componentDataError = 'データの取得に失敗しました。';

      // エラー時のデフォルトデータを設定
      ebbinghausData = createEmptyEbbinghausData();
      dailyStatsData = createEmptyDailyStats();
      streakData = createEmptyStreakData();
    } finally {
      isComponentDataLoading = false;
    }
  }

  // ★新規追加: デフォルトデータ生成関数群★
  function createEmptyEbbinghausData() {
    return {
      overallRetentionScore: 0,
      totalProblems: 0,
      completedProblems: 0,
      retentionDistribution: {
        excellent: 0, good: 0, fair: 0, poor: 0, critical: 0
      },
      stageAnalysis: {
        stage0: { total: 0, correct: 0, rate: 0 },
        stage1: { total: 0, correct: 0, rate: 0 },
        stage2: { total: 0, correct: 0, rate: 0 },
        stage3: { total: 0, correct: 0, rate: 0 }
      },
      patternAnalysis: {
        perfect: 0, improving: 0, declining: 0, unstable: 0, consistent: 0
      },
      message: 'まず学習を開始して、データを蓄積しましょう！'
    };
  }

  function createEmptyDailyStats() {
    const today = new Date();
    const stats = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      stats.push({
        date: date.toISOString().split('T')[0],
        studyCount: 0,
        totalTime: 0,
        correctAnswers: 0,
        totalAnswers: 0,
        accuracy: 0,
        completedProblems: 0,
        reviewCount: 0,
        newProblems: 0
      });
    }

    return stats;
  }

  function createEmptyStreakData() {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
      totalStudyDays: 0,
      streakHistory: [],
      weeklyGoal: 7,
      weeklyProgress: 0,
      isOnTrack: false
    };
  }

  // ★新規追加: データ再読み込み機能★
  async function refreshAllData() {
    console.log('🔄 全データを再読み込みします...');
    await Promise.all([
      loadLearningStats(),
      loadComponentData()
    ]);
  }

  onMount(async () => {
    // 従来のデータと新しいコンポーネント用データを並行して読み込み
    await Promise.all([
      loadLearningStats(),
      loadComponentData()
    ]);
  });

  async function goToNormalMode() {
    await audioStore.playWithDelay('click', () => {
      goto('/normal-mode');
      isOpen = false;
    }, 150);
  }

  async function goToEbbinghausMode() {
    await audioStore.playWithDelay('click', () => {
      goto('/ebbinghaus-mode');
      isOpen = false;
    }, 150);
  }

  async function goToReviewMode() {
    await audioStore.playWithDelay('click', () => {
      goto('/review-mode');
      isOpen = false;
    }, 150);
  }

  async function goToStats() {
    goto('/stats');
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

    <section class="flex flex-col items-center">
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
            onClick={goToEbbinghausMode}
            widthClass="w-[300px]"
            buttonColorClass="bg-yellow-400"
            borderColorClass="border-yellow-500"
            shadowColorClass="[box-shadow:0_5px_0_0_#eab308,0_10px_0_0_#d1d5db]"
            hoverShadowColorClass="hover:[box-shadow:0_0px_0_0_#eab308,0_0_0_0_#d1d5db]"
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
            shadowColorClass="[box-shadow:0_5px_0_0_#ef4444,0_10px_0_0_#d1d5db]"
            hoverShadowColorClass="hover:[box-shadow:0_0px_0_0_#ef4444,0_0px_0_0_#d1d5db]"
            imageSrc="/img/review-mode.svg"
            imageSize="h-8 w-auto"
          />
          <p class="text-stone-700 h-[4rem] rounded-md bg-stone-100 [box-shadow:var(--shadow-neumorphic-concave2)] w-[300px] flex justify-center items-center">正答率が低い問題を重点的に復習</p>
        </div>
      </div>
    </section>

    <section class="space-y-6">
      <h2 class="bg-teal-400 rounded-full py-1 text-xl font-bold text-white text-center mb-6">{$nickname}さんの学習統計</h2>

      <!-- ★修正: ローディング状態とエラー状態を追加★ -->
      {#if isComponentDataLoading}
        <div class="flex justify-center items-center p-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          <span class="ml-2 text-gray-600">データを読み込み中...</span>
        </div>
      {:else if componentDataError}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong class="font-bold">エラー:</strong>
          <span class="block sm:inline">{componentDataError}</span>
          <button
            class="mt-2 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            on:click={refreshAllData}
          >
            再試行
          </button>
        </div>
      {:else}
        <div class="flex flex-col gap-4">
          <!-- ★修正: propsを明示的に渡す★ -->
          <StudyStreakCard
            userId={currentUserId}
            streakData={streakData}
          />

          <DailyStudyChart
            userId={currentUserId}
            days={7}
            dailyStats={dailyStatsData}
          />

          <EbbinghausAnalyticsChart
            userId={currentUserId}
            analyticsData={ebbinghausData}
          />
        </div>
      {/if}

      <!-- ★追加: デバッグ情報（開発時のみ表示）★ -->
      {#if false} <!-- 本番では false に設定 -->
        <div class="bg-gray-100 p-4 rounded-lg">
          <h3 class="font-bold mb-2">デバッグ情報:</h3>
          <p>ユーザーID: {currentUserId}</p>
          <p>連続学習データ: {streakData ? '✅' : '❌'}</p>
          <p>日別統計データ: {dailyStatsData.length}件</p>
          <p>エビングハウスデータ: {ebbinghausData ? '✅' : '❌'}</p>
          <button
            class="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-sm"
            on:click={() => console.log('Current data:', { streakData, dailyStatsData, ebbinghausData })}
          >
            コンソールにデータを出力
          </button>
        </div>
      {/if}

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
              class:hidden={pRate.covered === 0}
            ></div>
          </div>
        {/each}
      </div>
    </section>
  </div>
</main>