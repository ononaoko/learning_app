<!-- src/lib/components/DailyStudyChart.svelte -->
<script>
  import { onMount } from 'svelte';

  export let userId;
  export let days = 7; // デフォルト7日間

  let chartData = [];
  let loading = true;
  let selectedMetric = 'both'; // 'problems', 'time', 'both'

  // 日別学習統計を取得
  async function loadDailyStats() {
    // userIdのバリデーション
    if (!userId || userId === 'undefined' || userId === '') {
      console.error('userId が無効です:', userId);
      loading = false;
      return;
    }

    try {
      console.log('日別学習統計を取得中...', { userId, days });
      const response = await fetch(`/api/daily-study-stats?userId=${userId}&days=${days}`);
      if (response.ok) {
        const data = await response.json();
        chartData = data;
        console.log('日別学習統計を取得:', chartData);
      } else {
        console.error('日別学習統計の取得に失敗:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('エラー詳細:', errorText);
      }
    } catch (error) {
      console.error('日別学習統計の取得エラー:', error);
    } finally {
      loading = false;
    }
  }

  // 統計サマリーを計算
  function calculateSummary() {
    const totalProblems = chartData.reduce((sum, day) => sum + day.problemsSolved, 0);
    const totalTime = chartData.reduce((sum, day) => sum + day.studyTimeMinutes, 0);
    const totalSessions = chartData.reduce((sum, day) => sum + day.sessionsCount, 0);
    const avgAccuracy = chartData.length > 0
      ? Math.round(chartData.reduce((sum, day) => sum + day.averageAccuracy, 0) / chartData.length)
      : 0;

    return {
      totalProblems,
      totalTime,
      totalSessions,
      avgAccuracy,
      avgProblemsPerDay: Math.round(totalProblems / days),
      avgTimePerDay: Math.round(totalTime / days)
    };
  }

  // 時間を分から時間:分形式に変換
  function formatTime(minutes) {
    if (minutes < 60) {
      return `${minutes}分`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins > 0 ? `${mins}分` : ''}`;
  }

  // 簡易グラフの最大値を取得
  function getMaxValue(data, key) {
    return Math.max(...data.map(d => d[key]), 1);
  }

  // グラフ用のシンプルな日付表示（7/12）
  function formatDateForChart(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric'
    });
  }

  // テーブル用の曜日付き日付表示（7/12(月)）
  function formatDateForTable(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short'
    });
  }

  onMount(async () => {
    console.log('DailyStudyChart マウント開始, userId:', userId);
    if (userId && userId !== 'undefined') {
      await loadDailyStats();
    } else {
      console.warn('userId が設定されていません');
      loading = false;
    }
  });

  $: summary = calculateSummary();
</script>

<div class="bg-white rounded-lg shadow-lg p-6 mb-6">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-2xl font-bold text-gray-800">学習統計グラフ</h2>
    <div class="flex gap-2">
      <!-- 表示期間選択 -->
      <select bind:value={days} on:change={loadDailyStats} class="px-3 py-1 border rounded">
        <option value={7}>7日間</option>
        <option value={14}>14日間</option>
        <option value={30}>30日間</option>
      </select>

      <!-- 表示項目選択 -->
      <select bind:value={selectedMetric} class="px-3 py-1 border rounded">
        <option value="both">問題数・時間</option>
        <option value="problems">問題数のみ</option>
        <option value="time">時間のみ</option>
      </select>
    </div>
  </div>

  {#if loading}
    <div class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
      <p class="mt-4 text-gray-600">読み込み中...</p>
    </div>
  {:else if !userId || userId === 'undefined'}
    <div class="text-center py-12">
      <div class="text-6xl mb-4">⚠️</div>
      <h3 class="text-xl font-bold text-gray-700 mb-2">ユーザーIDが設定されていません</h3>
      <p class="text-gray-600">ログインしてから再度お試しください</p>
    </div>
  {:else}
    <!-- 統計サマリー -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="text-center p-3 bg-teal-50 rounded-lg">
        <div class="text-2xl font-bold text-teal-600">{summary.totalProblems}</div>
        <div class="text-sm text-gray-600">総問題数</div>
        <div class="text-xs text-teal-500">平均{summary.avgProblemsPerDay}問/日</div>
      </div>

      <div class="text-center p-3 bg-amber-50 rounded-lg">
        <div class="text-2xl font-bold text-amber-600">{formatTime(summary.totalTime)}</div>
        <div class="text-sm text-gray-600">総学習時間</div>
        <div class="text-xs text-amber-500">平均{formatTime(summary.avgTimePerDay)}/日</div>
      </div>

      <div class="text-center p-3 bg-blue-50 rounded-lg">
        <div class="text-2xl font-bold text-blue-600">{summary.totalSessions}</div>
        <div class="text-sm text-gray-600">総セッション数</div>
        <div class="text-xs text-blue-500">平均{Math.round(summary.totalSessions / days)}回/日</div>
      </div>

      <div class="text-center p-3 bg-red-50 rounded-lg">
        <div class="text-2xl font-bold text-red-600">{summary.avgAccuracy}%</div>
        <div class="text-sm text-gray-600">平均正解率</div>
        <div class="text-xs text-red-500">過去{days}日間</div>
      </div>
    </div>

    <!-- 簡易グラフ -->
    {#if chartData.length > 0}
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">日別推移</h3>

        <!-- 問題数グラフ -->
        {#if selectedMetric === 'problems' || selectedMetric === 'both'}
          <div class="mb-4">
            <h4 class="text-md font-medium text-teal-600 mb-2">📚 解いた問題数</h4>
            <div class="flex items-end space-x-1 h-24 bg-gray-50 p-2 rounded">
              {#each chartData as day}
                {@const maxProblems = getMaxValue(chartData, 'problemsSolved')}
                {@const height = maxProblems > 0 ? (day.problemsSolved / maxProblems) * 100 : 0}
                <div class="flex-1 flex flex-col items-center">
                  <div
                    class="w-full bg-teal-400 rounded-t transition-all duration-1000"
                    style="height: {height}%"
                    title="{formatDateForChart(day.date)}: {day.problemsSolved}問"
                  ></div>
                  <div class="text-xs text-gray-600 mt-1 text-center">
                    {formatDateForChart(day.date)}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- 学習時間グラフ -->
        {#if selectedMetric === 'time' || selectedMetric === 'both'}
          <div class="mb-4">
            <h4 class="text-md font-medium text-amber-600 mb-2">⏰ 学習時間</h4>
            <div class="flex items-end space-x-1 h-24 bg-gray-50 p-2 rounded">
              {#each chartData as day}
                {@const maxTime = getMaxValue(chartData, 'studyTimeMinutes')}
                {@const height = maxTime > 0 ? (day.studyTimeMinutes / maxTime) * 100 : 0}
                <div class="flex-1 flex flex-col items-center">
                  <div
                    class="w-full bg-amber-400 rounded-t transition-all duration-1000"
                    style="height: {height}%"
                    title="{formatDateForChart(day.date)}: {formatTime(day.studyTimeMinutes)}"
                  ></div>
                  <div class="text-xs text-gray-600 mt-1 text-center">
                    {formatDateForChart(day.date)}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- データテーブル -->
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-100">
                <th class="p-2 text-left">日付</th>
                <th class="p-2 text-center">問題数</th>
                <th class="p-2 text-center">時間</th>
                <th class="p-2 text-center">正解率</th>
              </tr>
            </thead>
            <tbody>
              {#each chartData as day}
                <tr class="border-b">
                  <td class="p-2 font-medium">{formatDateForTable(day.date)}</td>
                  <td class="p-2 text-center">{day.problemsSolved}問</td>
                  <td class="p-2 text-center">{formatTime(day.studyTimeMinutes)}</td>
                  <td class="p-2 text-center">{day.averageAccuracy}%</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {:else}
      <div class="text-center py-16">
        <div class="text-6xl mb-4">📊</div>
        <h3 class="text-xl font-bold text-gray-700 mb-2">データがありません</h3>
        <p class="text-gray-600">学習を開始すると、ここに統計が表示されます</p>
      </div>
    {/if}

    <!-- 学習のヒント -->
    <div class="mt-6 p-4 bg-gray-50 rounded-lg">
      <h4 class="font-semibold text-gray-800 mb-2">📈 学習アドバイス</h4>
      <div class="text-sm text-gray-600">
        {#if summary.avgProblemsPerDay < 3}
          <p>• 1日3問以上解くことを目標にしましょう！</p>
        {:else if summary.avgProblemsPerDay >= 10}
          <p>• 素晴らしい学習量です！この調子で続けましょう 🎉</p>
        {:else}
          <p>• 良いペースで学習できています！継続が大切です 👍</p>
        {/if}

        {#if summary.avgAccuracy < 60}
          <p>• 正解率向上のため、ヒントを活用してみてください</p>
        {:else if summary.avgAccuracy >= 90}
          <p>• 非常に高い正解率です！より難しい問題にチャレンジしてみましょう</p>
        {/if}

        {#if summary.avgTimePerDay < 10}
          <p>• もう少し時間をかけて、じっくり学習してみてください</p>
        {:else if summary.avgTimePerDay >= 60}
          <p>• 集中して長時間学習できています！適度な休憩も大切です</p>
        {/if}
      </div>
    </div>
  {/if}
</div>