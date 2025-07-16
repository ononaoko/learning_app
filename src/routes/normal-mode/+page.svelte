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
        userProgress = progressMap;
        processUnitsData();
      } else {
        console.error('Failed to load user progress:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading user progress:', error);
    }
  }

  function processUnitsData() {
    processedUnits = units.map(category => ({
      ...category,
      sub_units: category.sub_units.map(subcategory => ({
        ...subcategory,
        sub_units: subcategory.sub_units ? subcategory.sub_units.map(unit => {
          const progress = userProgress[unit.id];

          const processedUnit = {
            ...unit,
            isCompleted: progress && progress.isCompleted === true ? true : false,
            lastProblemIndex: progress && typeof progress.lastProblemIndex === 'number' ? progress.lastProblemIndex : 0
          };

          return processedUnit;
        }) : []
      }))
    }));
  }

  onMount(async () => {
    await loadUserProgress(currentUserId);
  });

  function toggleMenu() {
    isOpen = !isOpen;
  }

  function goToTop() {
    goto('/');
    isOpen = false;
  }

  function selectUnit(unitId) {
    goto(`/normal-mode/${unitId}`);
  }

  function getUnitButtonStyle(unit) {
    let baseStyle = "w-full text-left bg-stone-100 [box-shadow:var(--shadow-neumorphic-convex2)] hover:bg-teal-300 text-stone-700 font-bold py-2 px-4 rounded-md shadow-md text-lg transition duration-200 ease-in-out flex items-center justify-between";
    let statusStyle = "";

    if (unit.isCompleted) {
      statusStyle = "bg-green-200 hover:bg-green-300";
    } else if (unit.lastProblemIndex > 0) {
      statusStyle = "bg-blue-100 hover:bg-blue-200";
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
  bg-stone-100
  [box-shadow:var(--shadow-neumorphic-convex)]
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
        <h3 class="text-2xl font-bold text-teal-700 border-b-2 border-teal-400 pb-2 mb-4">
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
                            <UnitStatusPerfectIcon text="Perfect"/>
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