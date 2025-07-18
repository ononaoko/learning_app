<!-- src/lib/components/DailyStudyChart.svelte -->
<script>
    import { onMount } from 'svelte';
    import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ReferenceLine } from 'recharts';

    export let userId;
    export let days = 7; // デフォルト7日間

    let chartData = [];
    let loading = true;
    let chartType = 'line'; // 'line' または 'bar'
    let selectedMetric = 'both'; // 'problems', 'time', 'both'

    // 日別学習統計を取得
    async function loadDailyStats() {
      try {
        const response = await fetch(`/api/daily-study-stats?userId=${userId}&days=${days}`);
        if (response.ok) {
          const data = await response.json();
          chartData = data;
          console.log('日別学習統計を取得:', chartData);
        } else {
          console.error('日別学習統計の取得に失敗:', response.statusText);
        }
      } catch (error) {
        console.error('日別学習統計の取得エラー:', error);
      } finally {
        loading = false;
      }
    }

    // グラフの色を取得
    function getColors() {
      return {
        problems: '#14b8a6', // teal-500
        time: '#f59e0b',     // amber-500
        accuracy: '#ef4444'  // red-500
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

    // カスタムツールチップ
    function customTooltip({ active, payload, label }) {
      if (active && payload && payload.length) {
        return `
          <div class="bg-white p-3 border rounded shadow-lg">
            <p class="font-semibold">${label}</p>
            ${payload.map(entry => `
              <p style="color: ${entry.color}">
                ${entry.name}: ${entry.name === '学習時間' ? formatTime(entry.value) : entry.value}${entry.name === '正解率' ? '%' : entry.name === '解いた問題数' ? '問' : ''}
              </p>
            `).join('')}
          </div>
        `;
      }
      return null;
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

    onMount(async () => {
      await loadDailyStats();
    });

    $: summary = calculateSummary();
    $: colors = getColors();
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

        <!-- グラフタイプ選択 -->
        <select bind:value={chartType} class="px-3 py-1 border rounded">
          <option value="line">折れ線グラフ</option>
          <option value="bar">棒グラフ</option>
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

      <!-- グラフ -->
      <div class="h-80">
        {#if chartData.length > 0}
          <ResponsiveContainer width="100%" height="100%">
            {#if chartType === 'line'}
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateFormatted" />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip content={customTooltip} />
                <Legend />

                {#if selectedMetric === 'problems' || selectedMetric === 'both'}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="problemsSolved"
                    stroke={colors.problems}
                    strokeWidth={2}
                    name="解いた問題数"
                    dot={{ r: 4 }}
                  />
                {/if}

                {#if selectedMetric === 'time' || selectedMetric === 'both'}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="studyTimeMinutes"
                    stroke={colors.time}
                    strokeWidth={2}
                    name="学習時間"
                    dot={{ r: 4 }}
                  />
                {/if}
              </LineChart>
            {:else}
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateFormatted" />
                <YAxis />
                <Tooltip content={customTooltip} />
                <Legend />

                {#if selectedMetric === 'problems' || selectedMetric === 'both'}
                  <Bar
                    dataKey="problemsSolved"
                    fill={colors.problems}
                    name="解いた問題数"
                  />
                {/if}

                {#if selectedMetric === 'time' || selectedMetric === 'both'}
                  <Bar
                    dataKey="studyTimeMinutes"
                    fill={colors.time}
                    name="学習時間"
                  />
                {/if}
              </BarChart>
            {/if}
          </ResponsiveContainer>
        {:else}
          <div class="text-center py-16">
            <div class="text-6xl mb-4">📊</div>
            <h3 class="text-xl font-bold text-gray-700 mb-2">データがありません</h3>
            <p class="text-gray-600">学習を開始すると、ここに統計が表示されます</p>
          </div>
        {/if}
      </div>

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