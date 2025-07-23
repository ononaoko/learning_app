<!-- src/lib/components/DailyStudyChart.svelte -->
<script>
  import { onMount } from 'svelte';

  export let userId;
  export let days = 7; // デフォルト7日間
  export let dailyStats = null; // 親から渡されるデータ

  let chartData = [];
  let loading = false;
  let selectedMetric = 'both'; // 'problems', 'time', 'both'

  // 親から渡されたデータを使用するか、APIから取得するかを判定
  function shouldUsePropsData() {
    return dailyStats && Array.isArray(dailyStats) && dailyStats.length > 0;
  }

  // 日別学習統計を取得（フォールバック用）
  async function loadDailyStats() {
    // 親からデータが渡されている場合は、それを使用
    if (shouldUsePropsData()) {
      chartData = convertToChartFormat(dailyStats);
      console.log('親から渡されたデータを使用:', chartData);
      return;
    }

    // userIdのバリデーション
    if (!userId || userId === 'undefined' || userId === '') {
      console.error('userId が無効です:', userId);
      return;
    }

    loading = true;
    try {
      console.log('日別学習統計を取得中...', { userId, days });

      // 拡張されたlearning-stats APIを使用
      const response = await fetch(`/api/learning-stats?type=daily&days=${days}`);
      if (response.ok) {
        const data = await response.json();
        chartData = convertToChartFormat(data);
        console.log('日別学習統計を取得:', chartData);
      } else {
        console.error('日別学習統計の取得に失敗:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('エラー詳細:', errorText);
        // エラー時は空のデータを生成
        chartData = generateEmptyChartData();
      }
    } catch (error) {
      console.error('日別学習統計の取得エラー:', error);
      // エラー時は空のデータを生成
      chartData = generateEmptyChartData();
    } finally {
      loading = false;
    }
  }

  // API形式のデータをチャート用のデータに変換
  function convertToChartFormat(data) {
    if (!data || !Array.isArray(data)) {
      return generateEmptyChartData();
    }

    return data.map(day => ({
      date: day.date,
      problemsSolved: day.studyCount || day.totalAnswers || 0,
      studyTimeMinutes: Math.round((day.totalTime || 0) / 60), // 秒を分に変換
      sessionsCount: day.studyCount || day.newProblems || 0,
      averageAccuracy: Math.round(day.accuracy || 0)
    }));
  }

  // 空のチャートデータを生成
  function generateEmptyChartData() {
    const data = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      data.push({
        date: date.toISOString().split('T')[0],
        problemsSolved: 0,
        studyTimeMinutes: 0,
        sessionsCount: 0,
        averageAccuracy: 0
      });
    }

    return data;
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

  // daysが変更された時の処理
  async function onDaysChange() {
    if (!shouldUsePropsData()) {
      await loadDailyStats();
    } else {
      // 親からのデータが日数変更に対応していない場合は、空データを生成
      chartData = generateEmptyChartData();
    }
  }

  onMount(async () => {
    console.log('DailyStudyChart マウント開始, userId:', userId);
    if (userId && userId !== 'undefined') {
      await loadDailyStats();
    } else {
      console.warn('userId が設定されていません');
      chartData = generateEmptyChartData();
    }
  });

  // リアクティブな更新
  $: if (dailyStats) {
    chartData = convertToChartFormat(dailyStats);
  }

  $: summary = calculateSummary();
</script>

<div class="bg-stone-100 [box-shadow:var(--shadow-neumorphic-convex)] rounded-lg p-6 mb-6">
  <div class="flex justify-between items-start mb-6">
    <h2 class="text-2xl font-bold text-gray-800">学習統計グラフ</h2>
    <div class="flex gap-2 sm:flex-row flex-col">
      <!-- 表示期間選択 -->
      <select bind:value={days} on:change={onDaysChange} class="px-3 py-1 border rounded text-sm">
        <option value={7}>7日間</option>
        <option value={14}>14日間</option>
        <option value={30}>30日間</option>
      </select>

      <!-- 表示項目選択 -->
      <select bind:value={selectedMetric} class="px-3 py-1 border rounded text-sm">
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
    <!-- データソース表示（デバッグ用） -->
    {#if false} <!-- 本番では非表示 -->
      <div class="mb-4 p-2 bg-gray-100 text-xs rounded">
        データソース: {shouldUsePropsData() ? '親コンポーネント' : 'API取得'}
        | データ数: {chartData.length}件
      </div>
    {/if}

    <!-- 統計サマリー -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="text-center p-3 bg-teal-400 rounded-lg">
        <div class="text-sm text-teal-800 font-sans">総問題数</div>
        <div class="text-2xl font-bold text-white">{summary.totalProblems}</div>
        <div class="text-xs text-white">平均{summary.avgProblemsPerDay}問/日</div>
      </div>

      <div class="text-center p-3 bg-yellow-400 rounded-lg">
        <div class="text-sm text-yellow-800 font-sans">総学習時間</div>
        <div class="text-2xl font-bold text-white">{formatTime(summary.totalTime)}</div>
        <div class="text-xs text-white">平均{formatTime(summary.avgTimePerDay)}/日</div>
      </div>

      <div class="text-center p-3 bg-blue-400 rounded-lg">
        <div class="text-sm text-blue-800 font-sans">総セッション数</div>
        <div class="text-2xl font-bold text-white">{summary.totalSessions}</div>
        <div class="text-xs text-white">平均{Math.round(summary.totalSessions / days)}回/日</div>
      </div>

      <div class="text-center p-3 bg-red-400 rounded-lg">
        <div class="text-sm text-red-800 font-sans">平均正解率</div>
        <div class="text-2xl font-bold text-white">{summary.avgAccuracy}%</div>
        <div class="text-xs text-white">過去{days}日間</div>
      </div>
    </div>

    <!-- 簡易グラフ -->
    {#if chartData.length > 0 && summary.totalProblems > 0}
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