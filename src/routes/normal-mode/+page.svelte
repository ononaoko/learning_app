<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import IconHamburger from '$lib/components/IconHamburger.svelte';
  import { units } from '$lib/data/units.js';
  import AppNavigation from '$lib/components/AppNavigation.svelte';
  import UnitStatusPerfectIcon from '$lib/components/UnitStatusPerfectIcon.svelte';
  import UnitStatusInProgressIcon from '$lib/components/UnitStatusInProgressIcon.svelte';

  export let data;
  let currentUserId = data.userId;

  let isOpen = false;
  let userProgress = {};
  let processedUnits = [];
  let clickSound; // 単元選択時の効果音
  let menuSound;

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

// 効果音を再生する関数 - デバッグ強化版
function playClickSound() {
  console.log('playClickSound関数が呼ばれました');

  if (clickSound) {
    console.log('clickSound要素が存在します');

    // 音声ファイルがロードされているか確認
    if (clickSound.readyState >= 2) {
      console.log('音声ファイルは正常にロードされています');
    } else {
      console.warn('音声ファイルが完全にロードされていません', clickSound.readyState);
    }

    // 音量の確認
    console.log('音量設定:', clickSound.volume);

    // 再生を試みる
    clickSound.currentTime = 0;
    clickSound.volume = 1.0; // 最大音量に設定

    // Promise APIを使用
    clickSound.play()
      .then(() => {
        console.log('効果音の再生に成功しました');
      })
      .catch(e => {
        console.error('効果音の再生に失敗しました:', e);
      });
  } else {
    console.error('clickSound要素が見つかりません');
  }
}

 // onMountでのデバッグ追加
onMount(async () => {
  await loadUserProgress(currentUserId);

  // オーディオ要素の初期化確認
  console.log('onMount: オーディオ要素の状態確認');
  if (clickSound) {
    console.log('オーディオ要素が正常に初期化されました');
  } else {
    console.warn('オーディオ要素が初期化されていません');
  }

  // 以下は既存のコード
  document.addEventListener('visibilitychange', handleVisibilityChange);
  startProgressPolling();

  // クリーンアップ関数
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    stopProgressPolling();
  };
});

function toggleMenu() {
  // 効果音を再生
  if (menuSound) {
    menuSound.currentTime = 0;
    menuSound.volume = 1.0;
    menuSound.play()
      .then(() => console.log('メニュー効果音の再生に成功しました'))
      .catch(e => console.error('メニュー効果音の再生に失敗しました:', e));
  }

  // メニュー状態を切り替え
  isOpen = !isOpen;
}

  function goToTop() {
    goto('/');
    isOpen = false;
  }

// 効果音を再生してから遅延してページ遷移する関数
function selectUnit(unitId) {
  console.log(`単元選択: ${unitId}`);

  // 効果音を再生
  if (clickSound) {
    clickSound.currentTime = 0;
    clickSound.volume = 1.0;

    // 音声再生をPromiseとして扱い、再生開始後に遅延してから遷移
    clickSound.play()
      .then(() => {
        console.log('効果音の再生を開始しました');

        // 音声が少なくとも100〜300ms程度再生されてから遷移
        setTimeout(() => {
          console.log(`ページ遷移を実行: /normal-mode/${unitId}`);
          goto(`/normal-mode/${unitId}`);
        }, 200); // 200msの遅延
      })
      .catch(e => {
        console.error('効果音の再生に失敗しました:', e);
        // 再生に失敗した場合はすぐに遷移
        goto(`/normal-mode/${unitId}`);
      });
  } else {
    // clickSoundが利用できない場合はすぐに遷移
    console.warn('音声要素が利用できないため、すぐに遷移します');
    goto(`/normal-mode/${unitId}`);
  }
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

<!-- 効果音用のaudio要素を追加 -->
<audio bind:this={clickSound} src="/sounds/tap.mp3" preload="auto"></audio>
<audio bind:this={menuSound} src="/sounds/slide.mp3" preload="auto"></audio>

<main class="flex flex-col items-center gap-8 min-h-screen bg-gradient-to-br from-stone-100 via-stone-100 to-stone-200 p-8">
  <header class="
  w-full p-6 rounded-md relative
  bg-stone-100
  [box-shadow:var(--shadow-neumorphic-convex)]
">
    <div class="flex items-center justify-between">
      <h1 class="text-4xl font-bold text-stone-700">演習モード</h1>
      <button class="focus:outline-none cursor-pointer" on:click={toggleMenu} aria-label="メニューを開閉">
        <IconHamburger width="48" height="48" isOpen={isOpen} />
      </button>
    </div>
    <AppNavigation isOpen={isOpen} />
  </header>

  <div class="w-full flex flex-col gap-8">
    <h2 class="text-3xl font-bold text-gray-700 text-center">単元選択</h2>
    {#each processedUnits as category (category.name)}
      <div>
        <div class="
        bg-teal-400 text-white rounded-full
        flex items-center
        px-6 py-2 mb-4
      ">
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
                          on:click={() => selectUnit(unit.id)}
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