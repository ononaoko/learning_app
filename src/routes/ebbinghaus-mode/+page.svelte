<!-- src/routes/ebbinghaus-mode/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { audioStore } from '$lib/stores/audioStore.js';
    import { units } from '$lib/data/units.js';
    import IconHamburger from '$lib/components/IconHamburger.svelte';
    import AppNavigation from '$lib/components/AppNavigation.svelte';
    import TealButton from '$lib/components/TealButton.svelte';

    export let data;
    let currentUserId = data.userId;

    let isOpen = false;
    let reviewData = {
      review1: [], // 1回目の復習（1日後）
      review2: [], // 2回目の復習（1週間後）
      review3: []  // 3回目の復習（1ヶ月後）
    };

    // 効果音付きメニュートグル
    async function toggleMenu() {
      await audioStore.play('menu');
      isOpen = !isOpen;
    }

    // 効果音付きページ遷移
    async function goToTop() {
      await audioStore.playWithDelay('click', () => {
        goto('/');
        isOpen = false;
      }, 200);
    }

    // 単元名を取得するヘルパー関数
    function getUnitDisplayName(unitId) {
      const flatUnits = getFlatUnits(units);
      const unitInfo = flatUnits.find(u => u.id === unitId);
      return unitInfo ? unitInfo.name : unitId;
    }

    // 単元を平坦化する関数
    function getFlatUnits(unitList) {
      let flatUnits = [];
      unitList.forEach((item) => {
        if (item.type === 'unit') {
          flatUnits.push({ id: item.id, name: item.name });
        } else if (item.type === 'subcategory' && item.sub_units) {
          flatUnits = flatUnits.concat(getFlatUnits(item.sub_units));
        } else if (item.type === 'category' && item.sub_units) {
          flatUnits = flatUnits.concat(getFlatUnits(item.sub_units));
        }
      });
      return flatUnits;
    }

    // 復習データを読み込む関数
    async function loadReviewData() {
      try {
        const response = await fetch(`/api/ebbinghaus-review?userId=${currentUserId}`);
        if (response.ok) {
          const data = await response.json();
          reviewData = data;
          console.log('復習データを読み込みました:', reviewData);
        } else {
          console.error('復習データの読み込みに失敗しました:', response.statusText);
        }
      } catch (error) {
        console.error('復習データの読み込み中にエラーが発生しました:', error);
      }
    }

    // 復習問題に遷移する関数
    async function goToReview(unitId, reviewLevel) {
      await audioStore.playWithDelay('click', () => {
        goto(`/ebbinghaus-mode/${unitId}?review=${reviewLevel}`);
      }, 200);
    }

    // 復習レベルに応じた色を取得
    function getReviewColor(reviewLevel) {
      switch (reviewLevel) {
        case 1: return 'bg-yellow-400 border-yellow-500 [box-shadow:0_5px_0_0_#eab308]';
        case 2: return 'bg-orange-400 border-orange-500 [box-shadow:0_5px_0_0_#f97316]';
        case 3: return 'bg-red-400 border-red-500 [box-shadow:0_5px_0_0_#dc2626]';
        default: return 'bg-gray-400 border-gray-500 [box-shadow:0_5px_0_0_#6b7280]';
      }
    }

    // 復習レベルに応じたラベルを取得
    function getReviewLabel(reviewLevel) {
      switch (reviewLevel) {
        case 1: return '1回目の復習（1日後）';
        case 2: return '2回目の復習（1週間後）';
        case 3: return '3回目の復習（1ヶ月後）';
        default: return '';
      }
    }

    onMount(async () => {
      await loadReviewData();
    });
  </script>

  <svelte:head>
    <title>エビングハウスモード - 復習</title>
  </svelte:head>

  <main class="flex flex-col items-center min-h-screen bg-gradient-to-br from-stone-100 via-stone-100 to-stone-200 p-8">
    <header class="w-full p-6 rounded-md relative bg-stone-100 [box-shadow:var(--shadow-neumorphic-convex)]">
      <div class="flex items-center justify-between">
        <h1 class="text-4xl font-bold text-stone-700">エビングハウスモード</h1>
        <button class="focus:outline-none" on:click={toggleMenu} aria-label="メニューを開閉">
          <IconHamburger width="48" height="48" isOpen={isOpen} />
        </button>
      </div>
      <AppNavigation isOpen={isOpen} />
    </header>

    <div class="w-full rounded-lg p-8 mt-8">
      <div class="text-center mb-8">
        <h2 class="text-3xl font-bold text-gray-700 mb-4">復習スケジュール</h2>
        <p class="text-lg text-gray-600">忘却曲線に沿った最適な復習タイミングで問題を出題します</p>
      </div>

      <!-- 復習1回目 -->
      <div class="mb-12">
        <h3 class="text-2xl font-bold text-yellow-600 border-b-2 border-yellow-400 pb-2 mb-6">
          📅 {getReviewLabel(1)}
        </h3>
        {#if reviewData.review1.length > 0}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each reviewData.review1 as reviewItem}
              <div class="bg-stone-100 [box-shadow:var(--shadow-neumorphic-convex)] p-6 rounded-lg">
                <h4 class="text-xl font-semibold text-gray-800 mb-4">
                  {getUnitDisplayName(reviewItem.unitId)}
                </h4>
                <div class="mb-4">
                  <p class="text-gray-600 mb-2">復習対象問題: {reviewItem.problemCount}問</p>
                  <p class="text-sm text-gray-500">
                    学習日: {new Date(reviewItem.lastStudied).toLocaleDateString()}
                  </p>
                </div>
                <button
                  class="w-full text-white font-bold py-3 px-4 rounded-md transition duration-200 ease-in-out {getReviewColor(1)} hover:[box-shadow:0_0px_0_0_#eab308] hover:translate-y-1"
                  on:click={() => goToReview(reviewItem.unitId, 1)}
                >
                  復習開始
                </button>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-center py-12">
            <p class="text-gray-500 text-lg">現在、1回目の復習対象はありません</p>
          </div>
        {/if}
      </div>

      <!-- 復習2回目 -->
      <div class="mb-12">
        <h3 class="text-2xl font-bold text-orange-600 border-b-2 border-orange-400 pb-2 mb-6">
          📅 {getReviewLabel(2)}
        </h3>
        {#if reviewData.review2.length > 0}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each reviewData.review2 as reviewItem}
              <div class="bg-stone-100 [box-shadow:var(--shadow-neumorphic-convex)] p-6 rounded-lg">
                <h4 class="text-xl font-semibold text-gray-800 mb-4">
                  {getUnitDisplayName(reviewItem.unitId)}
                </h4>
                <div class="mb-4">
                  <p class="text-gray-600 mb-2">復習対象問題: {reviewItem.problemCount}問</p>
                  <p class="text-sm text-gray-500">
                    前回復習: {new Date(reviewItem.lastReviewed).toLocaleDateString()}
                  </p>
                </div>
                <button
                  class="w-full text-white font-bold py-3 px-4 rounded-md transition duration-200 ease-in-out {getReviewColor(2)} hover:[box-shadow:0_0px_0_0_#f97316] hover:translate-y-1"
                  on:click={() => goToReview(reviewItem.unitId, 2)}
                >
                  復習開始
                </button>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-center py-12">
            <p class="text-gray-500 text-lg">現在、2回目の復習対象はありません</p>
          </div>
        {/if}
      </div>

      <!-- 復習3回目 -->
      <div class="mb-12">
        <h3 class="text-2xl font-bold text-red-600 border-b-2 border-red-400 pb-2 mb-6">
          📅 {getReviewLabel(3)}
        </h3>
        {#if reviewData.review3.length > 0}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each reviewData.review3 as reviewItem}
              <div class="bg-stone-100 [box-shadow:var(--shadow-neumorphic-convex)] p-6 rounded-lg">
                <h4 class="text-xl font-semibold text-gray-800 mb-4">
                  {getUnitDisplayName(reviewItem.unitId)}
                </h4>
                <div class="mb-4">
                  <p class="text-gray-600 mb-2">復習対象問題: {reviewItem.problemCount}問</p>
                  <p class="text-sm text-gray-500">
                    前回復習: {new Date(reviewItem.lastReviewed).toLocaleDateString()}
                  </p>
                </div>
                <button
                  class="w-full text-white font-bold py-3 px-4 rounded-md transition duration-200 ease-in-out {getReviewColor(3)} hover:[box-shadow:0_0px_0_0_#dc2626] hover:translate-y-1"
                  on:click={() => goToReview(reviewItem.unitId, 3)}
                >
                  復習開始
                </button>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-center py-12">
            <p class="text-gray-500 text-lg">現在、3回目の復習対象はありません</p>
          </div>
        {/if}
      </div>

      <!-- 復習がない場合の案内 -->
      {#if reviewData.review1.length === 0 && reviewData.review2.length === 0 && reviewData.review3.length === 0}
        <div class="text-center py-16">
          <div class="text-6xl mb-4">📚</div>
          <h3 class="text-2xl font-bold text-gray-700 mb-4">復習対象がありません</h3>
          <p class="text-gray-600 mb-8">まずは通常モードで学習を進めてください</p>
          <TealButton
            text="通常モードへ"
            onClick={() => goto('/normal-mode')}
            widthClass="w-auto"
            buttonColorClass="bg-teal-400"
            borderColorClass="border-teal-500"
            shadowColorClass="[box-shadow:0_5px_0_0_#14b8a6]"
            hoverShadowColorClass="hover:[box-shadow:0_0px_0_0_#14b8a6]"
            textColorClass="text-white"
          />
        </div>
      {/if}
    </div>
  </main>