<script>
  import { goto } from '$app/navigation';

  function selectUnit(unit) {
    goto(`/normal-mode/${unit}`);
  }

  function goToTop() {
    goto('/');
  }
</script>

<svelte:head>
  <title>通常モード - 算数学習アプリ</title>
</svelte:head>

<main class="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
  <header class="mb-8">
    <button class="text-blue-500 hover:underline" on:click={goToTop}>ホーム</button>
  </header>

  <h1 class="text-4xl font-bold text-blue-600 mb-8">通常モード</h1>
  <p class="text-stone-700 text-base mb-4">学習する単元を選んでください。</p>
  <div class="flex justify-center space-x-4 mb-4">
    <button on:click={() => goto('/normal-mode/algebra')}>代数</button>
    <button on:click={() => goto('/normal-mode/geometry')}>図形</button>
  </div>
</main>