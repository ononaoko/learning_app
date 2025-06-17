<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import IconHamburger from '$lib/components/IconHamburger.svelte';
  import { slide } from 'svelte/transition';
  import { units } from '$lib/data/units.js'; // 単元データをインポート
  import AppNavigation from '$lib/components/AppNavigation.svelte'; // 新しいナビゲーションコンポーネントをインポート


  let isOpen = false;

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
</script>

<svelte:head>
  <title>通常モード - 単元選択</title>
</svelte:head>

<main class="flex flex-col items-center min-h-screen bg-gray-100 p-8">
  <header class="bg-teal-300 shadow-lg w-full p-6 rounded-md relative">
    <div class="flex items-center justify-between">
      <h1 class="text-4xl font-bold text-stone-700">通常モード</h1>
      <button class="focus:outline-none" on:click={toggleMenu} aria-label="メニューを開閉">
        <IconHamburger width="48" height="48" isOpen={isOpen} />
      </button>
    </div>
    <AppNavigation isOpen={isOpen} />
  </header>

  <div class="w-full bg-white shadow-lg rounded-lg p-8 mt-8">
    <h2 class="text-3xl font-bold text-gray-700 text-center mb-6">単元選択</h2>

    {#each units as category (category.name)}
      <div class="mb-8">
        <h3 class="text-2xl font-bold text-teal-700 border-b-2 border-teal-500 pb-2 mb-4">
          {category.name}
        </h3>
        {#if category.sub_units}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {#each category.sub_units as subcategory (subcategory.name)}
              <div class="bg-gray-100 p-4 rounded-lg shadow-sm">
                <h4 class="text-xl font-semibold text-gray-800 mb-3">{subcategory.name}</h4>
                {#if subcategory.sub_units}
                  <ul class="space-y-2">
                    {#each subcategory.sub_units as unit (unit.id)}
                      <li>
                        <button
                          class="w-full text-left bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-md shadow-md text-lg transition duration-200 ease-in-out"
                          on:click={() => selectUnit(unit.id)}
                        >
                          {unit.name}
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