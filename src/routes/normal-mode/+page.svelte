<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte'; // onMount をインポート
  import IconHamburger from '$lib/components/IconHamburger.svelte';
  import { units } from '$lib/data/units.js'; // 単元データをインポート
  import AppNavigation from '$lib/components/AppNavigation.svelte'; // ナビゲーションコンポーネントをインポート
  import UnitStatusClearIcon from '$lib/components/UnitStatusClearIcon.svelte';
  import UnitStatusInProgressIcon from '$lib/components/UnitStatusInProgressIcon.svelte';


  export let data; // layout.server.ts から data を受け取る
  let currentUserId = data.userId; // ユーザーIDを取得

  let isOpen = false;
  let userProgress = {}; // ユーザーの学習進捗を保持するオブジェクト { unitId: { lastProblemIndex: ..., isCompleted: ... }, ... }
  let processedUnits = []; // ユーザー進捗情報をマージした単元データ

  // ユーザーの進捗データをロードする関数
  async function loadUserProgress(userId) {
    if (!userId) {
      console.warn('User ID is not available for loading progress.');
      return;
    }
    try {
      // ユーザーの全単元の進捗を取得
    await fetch(`/api/user-progress?userId=${userId}`);
      if (response.ok) {
        const progressArray = await response.json();
        const progressMap = {};
        // 配列をオブジェクトに変換し、unitIdでアクセスできるようにする
        progressArray.forEach(p => {
          progressMap[p.unitId] = p;
        });
        userProgress = progressMap;
        console.log('Loaded user progress:', userProgress);
        // 進捗をロードした後で単元データを処理
        processUnitsData();
      } else {
        console.error('Failed to load user progress:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading user progress:', error);
    }
  }

  // 単元データとユーザー進捗情報をマージする関数
  function processUnitsData() {
    processedUnits = units.map(category => ({
      ...category,
      sub_units: category.sub_units.map(subcategory => ({
        ...subcategory,
        sub_units: subcategory.sub_units ? subcategory.sub_units.map(unit => {
          const progress = userProgress[unit.id] || {};
          return {
            ...unit,
            // isCompleted はAPIから取得した値、またはデフォルトで false
            isCompleted: progress.isCompleted || false,
            // lastProblemIndex はAPIから取得した値、またはデフォルトで 0
            lastProblemIndex: progress.lastProblemIndex !== undefined ? progress.lastProblemIndex : 0
          };
        }) : []
      }))
    }));
    console.log('Processed units with progress:', processedUnits);
  }

  onMount(async () => {
    await loadUserProgress(currentUserId);
  });

  function toggleMenu() {
    isOpen = !isOpen;
  }

  function goToTop() {
    goto('/');
    isOpen = false; // メニューを閉じる
  }

  // 単元が選択されたときの処理
  function selectUnit(unitId) {
    console.log('選択された単元ID:', unitId);
    goto(`/normal-mode/${unitId}`); // 動的ルートへ遷移
  }

  // ★この getUnitButtonStyle 関数が欠落している可能性が高いです。ここに追加してください。★
  // 単元ボタンのスタイルを決定する関数
  function getUnitButtonStyle(unit) {
    let baseStyle = "w-full text-left bg-stone-100 [box-shadow:var(--shadow-neumorphic-convex2)] hover:bg-teal-300 text-stone-700 font-bold py-2 px-4 rounded-md shadow-md text-lg transition duration-200 ease-in-out flex items-center justify-between";
    let statusStyle = "";

    if (unit.isCompleted) {
      // 単元がクリアされている場合（`lastProblemIndex` は `0` になっているはず）
      statusStyle = "bg-green-200 hover:bg-green-300"; // 明るい緑色
    } else if (unit.lastProblemIndex > 0) {
      // 完了していないが、途中まで進捗がある場合
      statusStyle = "bg-blue-100 hover:bg-blue-200"; // 明るい青色 (中断中)
    }

    return `${baseStyle} ${statusStyle}`;
  }
</script>

<svelte:head>
  <title>通常モード - 単元選択</title>
</svelte:head>

<main class="flex flex-col items-center min-h-screen bg-gray-100 p-8">
  <header class="
  w-full p-6 rounded-md relative
  bg-stone-100 /* stone-200を直接指定 */
  [box-shadow:var(--shadow-neumorphic-convex)] /* CSS変数を直接参照 */
">
    <div class="flex items-center justify-between">
      <h1 class="text-4xl font-bold text-stone-700">通常モード</h1>
      <button class="focus:outline-none" on:click={toggleMenu} aria-label="メニューを開閉">
        <IconHamburger width="48" height="48" isOpen={isOpen} />
      </button>
    </div>
    <AppNavigation isOpen={isOpen} />
  </header>

  <div class="w-full rounded-lg p-8 mt-8">
    <h2 class="text-3xl font-bold text-gray-700 text-center mb-6">単元選択</h2>

    {#each processedUnits as category (category.name)}
      <div class="mb-8">
        <h3 class="text-2xl font-bold text-teal-700 border-b-2 border-teal-500 pb-2 mb-4">
          {category.name}
        </h3>
        {#if category.sub_units}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {#each category.sub_units as subcategory (subcategory.name)}
              <div class="bg-stone-100 [box-shadow:var(--shadow-neumorphic-convex)] p-4 rounded-lg shadow-sm">
                <h4 class="text-xl font-semibold text-gray-800 mb-3">{subcategory.name}</h4>
                {#if subcategory.sub_units}
                  <ul class="space-y-4">
                    {#each subcategory.sub_units as unit (unit.id)}
                      <li>
                        <button
                          class="{getUnitButtonStyle(unit)}"
                          on:click={() => selectUnit(unit.id)}
                        >
                          <span>{unit.name}</span>
                          {#if unit.isCompleted}
                            <UnitStatusClearIcon />
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