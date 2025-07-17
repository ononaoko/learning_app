<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import IconHamburger from '$lib/components/IconHamburger.svelte';
  import { units } from '$lib/data/units.js';
  import AppNavigation from '$lib/components/AppNavigation.svelte';
  import UnitStatusPerfectIcon from '$lib/components/UnitStatusPerfectIcon.svelte';
  import UnitStatusInProgressIcon from '$lib/components/UnitStatusInProgressIcon.svelte';
  import { audioStore } from '$lib/stores/audioStore.js';

  export let data;
  let currentUserId = data.userId;

  let isOpen = false;
  let userProgress = {};
  let processedUnits = [];

  async function loadUserProgress(userId) {
    if (!userId) {
      console.warn('User ID is not available for loading progress.');
      return;
    }
    try {
      const response = await fetch(`/api/user-progress?userId=${userId}`);
      if (response.ok) {
        const progressArray = await response.json();
        const progressMap = {};
        progressArray.forEach(p => {
          progressMap[p.unitId] = p;
        });
        // Svelteのリアクティビティのために新しいオブジェクトを代入
        userProgress = progressMap;
      } else {
        console.error('Failed to load user progress:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading user progress:', error);
    }
  }

  // 進捗状態をリアルタイムで更新する関数
  function updateUnitProgress(unitId, newProgress) {
    // Svelteのリアクティビティのために新しいオブジェクトを作成
    userProgress = {
      ...userProgress,
      [unitId]: { ...userProgress[unitId], ...newProgress }
    };
  }

  // userProgressが変更されるたびに自動的にprocessedUnitsを更新
  $: if (userProgress) {
    processedUnits = units.map(category => ({
      ...category,
      sub_units: category.sub_units.map(subcategory => ({
        ...subcategory,
        sub_units: subcategory.sub_units ? subcategory.sub_units.map(unit => {
          const progress = userProgress[unit.id];

          const processedUnit = {
            ...unit,
            isCompleted: progress && progress.isCompleted === true ? true : false,
            lastProblemIndex: progress && typeof progress.lastProblemIndex === 'number' ? progress.lastProblemIndex : 0,
            isPerfect: progress && progress.isPerfect === true ? true : false
          };

          return processedUnit;
        }) : []
      }))
    }));
  }

  // ページの可視性が変わったときに進捗を再読み込み
  function handleVisibilityChange() {
    if (!document.hidden) {
      loadUserProgress(currentUserId);
    }
  }

  // 定期的に進捗を更新（オプション）
  let progressUpdateInterval;
  function startProgressPolling() {
    // 30秒ごとに進捗を更新
    progressUpdateInterval = setInterval(() => {
      loadUserProgress(currentUserId);
    }, 30000);
  }

  function stopProgressPolling() {
    if (progressUpdateInterval) {
      clearInterval(progressUpdateInterval);
    }
  }

  onMount(async () => {
    await loadUserProgress(currentUserId);

    // イベントリスナーの追加
    document.addEventListener('visibilitychange', handleVisibilityChange);
    startProgressPolling();

    // クリーンアップ関数
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopProgressPolling();
    };
  });

  // 効果音付きメニュートグル（統一システム使用）
  async function toggleMenu() {
    await audioStore.play('menu');
    isOpen = !isOpen;
  }

  // 効果音付きトップページ遷移（統一システム使用）
  async function goToTop() {
    await audioStore.playWithDelay('click', () => {
      goto('/');
      isOpen = false;
    }, 150);
  }

  // 効果音付き単元選択（統一システム使用）
  async function selectUnit(unitId) {
    console.log(`単元選択: ${unitId}`);

    // 効果音を再生して遅延後にページ遷移
    await audioStore.playWithDelay('click', () => {
      console.log(`ページ遷移を実行: /normal-mode/${unitId}`);
      goto(`/normal-mode/${unitId}`);
    }, 200);
  }

  function getUnitButtonStyle(unit) {
    let baseStyle = "w-full text-left bg-stone-100 [box-shadow:var(--shadow-neumorphic-convex2)] cursor-pointer hover:bg-stone-200 active:bg-stone-200 text-stone-700 font-bold py-2 px-4 rounded-md shadow-md text-lg transition duration-500 ease-out flex items-center justify-between";
    let statusStyle = "";

    if (unit.isCompleted && unit.isPerfect) {
      statusStyle = "bg-stone-200";
    }

    return `${baseStyle} ${statusStyle}`;
  }

  // カスタムイベントリスナー（他のコンポーネントから進捗更新を受信）
  function handleProgressUpdate(event) {
    const { unitId, progress } = event.detail;
    updateUnitProgress(unitId, progress);
  }
</script>

<svelte:head>
  <title>通常モード - 単元選択</title>
</svelte:head>

<svelte:window on:progress-updated={handleProgressUpdate} />

<main class="flex flex-col items-center gap-8 min-h-screen bg-gradient-to-br from-stone-100 via-stone-100 to-stone-200 p-8">
  <header class="w-full p-6 rounded-md relative bg-stone-100 [box-shadow:var(--shadow-neumorphic-convex)]">
    <div class="flex items-center justify-between">
      <h1 class="text-4xl font-bold text-stone-700">演習モード</h1>
      <button
        class="focus:outline-none cursor-pointer"
        onclick={toggleMenu}
        aria-label="メニューを開閉"
      >
        <IconHamburger width="48" height="48" isOpen={isOpen} />
      </button>
    </div>
    <AppNavigation isOpen={isOpen} onNavigate={goToTop} />
  </header>

  <div class="w-full flex flex-col gap-8">
    <h2 class="text-3xl font-bold text-gray-700 text-center">単元選択</h2>
    {#each processedUnits as category (category.name)}
      <div>
        <div class="bg-teal-400 text-white rounded-full flex items-center px-6 py-2 mb-4">
          <h3 class="text-xl m-0">
            {category.name}
          </h3>
        </div>
        {#if category.sub_units}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {#each category.sub_units as subcategory (subcategory.name)}
              <div class="bg-stone-100 [box-shadow:var(--shadow-neumorphic-convex)] p-4 rounded-lg shadow-sm">
                <h4 class="text-lg font-medium text-gray-800 mb-3 ml-1">{subcategory.name}</h4>
                {#if subcategory.sub_units}
                  <ul class="space-y-4">
                    {#each subcategory.sub_units as unit (unit.id)}
                      <li>
                        <button
                          class="{getUnitButtonStyle(unit)}"
                          onclick={() => selectUnit(unit.id)}
                          aria-label="単元 {unit.name} を選択"
                        >
                          <span class="text-base font-normal">{unit.name}</span>
                          {#if unit.isCompleted && unit.isPerfect}
                            <UnitStatusPerfectIcon text="Perfect!"/>
                          {:else if unit.isCompleted && !unit.isPerfect}
                            <UnitStatusPerfectIcon text="Clear" bgColor="bg-red-300"/>
                          {:else if unit.lastProblemIndex > 0}
                            <UnitStatusInProgressIcon />
                          {/if}
                        </button>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</main>