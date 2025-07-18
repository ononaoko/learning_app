<!-- src/lib/components/EbbinghausAnalyticsChart.svelte -->
<script>
    import { onMount } from 'svelte';

    export let userId;
    export let unitId = null;

    let loading = true;
    let retentionData = null;
    let progressData = null;
    let predictionData = null;
    let selectedTab = 'retention';
    let selectedPeriod = 'all';

    // 定着度分析データを取得
    async function loadRetentionData() {
      if (!userId) return;

      try {
        const params = new URLSearchParams({ userId, type: 'retention' });
        if (unitId) params.append('unitId', unitId);

        const response = await fetch(`/api/ebbinghaus-analytics?${params}`);
        if (response.ok) {
          retentionData = await response.json();
        }
      } catch (error) {
        console.error('定着度データ取得エラー:', error);
      }
    }

    // 進捗分析データを取得
    async function loadProgressData() {
      if (!userId) return;

      try {
        const params = new URLSearchParams({ userId, type: 'progress' });
        if (unitId) params.append('unitId', unitId);

        const response = await fetch(`/api/ebbinghaus-analytics?${params}`);
        if (response.ok) {
          progressData = await response.json();
        }
      } catch (error) {
        console.error('進捗データ取得エラー:', error);
      }
    }

    // 予測分析データを取得
    async function loadPredictionData() {
      if (!userId) return;

      try {
        const params = new URLSearchParams({ userId, type: 'prediction' });
        if (unitId) params.append('unitId', unitId);

        const response = await fetch(`/api/ebbinghaus-analytics?${params}`);
        if (response.ok) {
          predictionData = await response.json();
        }
      } catch (error) {
        console.error('予測データ取得エラー:', error);
      }
    }

    // 全データを読み込み
    async function loadAllData() {
      loading = true;
      await Promise.all([
        loadRetentionData(),
        loadProgressData(),
        loadPredictionData()
      ]);
      loading = false;
    }

    // 定着度レベルの色を取得
    function getRetentionColor(score) {
      if (score >= 90) return 'bg-green-500';
      if (score >= 70) return 'bg-blue-500';
      if (score >= 50) return 'bg-yellow-500';
      if (score >= 30) return 'bg-orange-500';
      return 'bg-red-500';
    }

    // 定着度レベルのラベルを取得
    function getRetentionLabel(score) {
      if (score >= 90) return '優秀';
      if (score >= 70) return '良好';
      if (score >= 50) return '普通';
      if (score >= 30) return '要改善';
      return '危険';
    }

    // 時間を人間が読める形式に変換
    function formatDuration(milliseconds) {
      const seconds = Math.floor(milliseconds / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        return `${hours}時間${minutes % 60}分`;
      } else if (minutes > 0) {
        return `${minutes}分${seconds % 60}秒`;
      } else {
        return `${seconds}秒`;
      }
    }

    // 最大値を取得（グラフの高さ計算用）
    function getMaxValue(data, key) {
      return Math.max(...data.map(d => d[key] || 0), 1);
    }

    onMount(() => {
      if (userId) {
        loadAllData();
      }
    });

    // リアクティブな更新
    $: if (userId) {
      loadAllData();
    }
  </script>

  <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-800">🧠 エビングハウス学習分析</h2>
      <div class="flex gap-2">
        <select bind:value={selectedPeriod} class="px-3 py-1 border rounded text-sm">
          <option value="all">全期間</option>
          <option value="30">30日間</option>
          <option value="7">7日間</option>
        </select>
      </div>
    </div>

    <!-- タブナビゲーション -->
    <div class="flex border-b border-gray-200 mb-6">
      <button
        class="px-4 py-2 border-b-2 font-medium text-sm {selectedTab === 'retention' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
        on:click={() => selectedTab = 'retention'}
      >
        📊 定着度分析
      </button>
      <button
        class="px-4 py-2 border-b-2 font-medium text-sm {selectedTab === 'progress' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
        on:click={() => selectedTab = 'progress'}
      >
        📈 進捗分析
      </button>
      <button
        class="px-4 py-2 border-b-2 font-medium text-sm {selectedTab === 'prediction' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
        on:click={() => selectedTab = 'prediction'}
      >
        🔮 予測分析
      </button>
    </div>

    {#if loading}
      <div class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p class="mt-4 text-gray-600">分析データを読み込み中...</p>
      </div>
    {:else}
      <!-- 定着度分析タブ -->
      {#if selectedTab === 'retention' && retentionData}
        <div class="space-y-6">
          <!-- 全体定着度スコア -->
          <div class="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <div class="text-4xl font-bold text-blue-600 mb-2">
              {Math.round(retentionData.overallRetentionScore)}%
            </div>
            <div class="text-lg text-gray-700">全体定着度スコア</div>
            <div class="text-sm text-gray-500 mt-1">
              {getRetentionLabel(retentionData.overallRetentionScore)}
            </div>
          </div>

          <!-- 定着度分布 -->
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div class="text-center p-4 bg-green-50 rounded-lg">
              <div class="text-2xl font-bold text-green-600">{retentionData.retentionDistribution.excellent}</div>
              <div class="text-sm text-gray-600">優秀</div>
              <div class="text-xs text-green-500">90-100%</div>
            </div>
            <div class="text-center p-4 bg-blue-50 rounded-lg">
              <div class="text-2xl font-bold text-blue-600">{retentionData.retentionDistribution.good}</div>
              <div class="text-sm text-gray-600">良好</div>
              <div class="text-xs text-blue-500">70-89%</div>
            </div>
            <div class="text-center p-4 bg-yellow-50 rounded-lg">
              <div class="text-2xl font-bold text-yellow-600">{retentionData.retentionDistribution.fair}</div>
              <div class="text-sm text-gray-600">普通</div>
              <div class="text-xs text-yellow-500">50-69%</div>
            </div>
            <div class="text-center p-4 bg-orange-50 rounded-lg">
              <div class="text-2xl font-bold text-orange-600">{retentionData.retentionDistribution.poor}</div>
              <div class="text-sm text-gray-600">要改善</div>
              <div class="text-xs text-orange-500">30-49%</div>
            </div>
            <div class="text-center p-4 bg-red-50 rounded-lg">
              <div class="text-2xl font-bold text-red-600">{retentionData.retentionDistribution.critical}</div>
              <div class="text-sm text-gray-600">危険</div>
              <div class="text-xs text-red-500">0-29%</div>
            </div>
          </div>

          <!-- 段階別正解率 -->
          <div>
            <h3 class="text-lg font-semibold text-gray-800 mb-4">📚 復習段階別正解率</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              {#each Object.entries(retentionData.stageAnalysis) as [stage, data], index}
                <div class="bg-gray-50 p-4 rounded-lg">
                  <div class="text-center">
                    <div class="text-2xl font-bold text-gray-700">{Math.round(data.rate)}%</div>
                    <div class="text-sm text-gray-600">
                      {['初回学習', '1日後', '7日後', '28日後'][index]}
                    </div>
                    <div class="text-xs text-gray-500">
                      {data.correct}/{data.total}問正解
                    </div>
                  </div>
                  <div class="mt-2 bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                      style="width: {data.rate}%"
                    ></div>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- 学習パターン分析 -->
          <div>
            <h3 class="text-lg font-semibold text-gray-800 mb-4">🔍 学習パターン分析</h3>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
              {#each Object.entries(retentionData.patternAnalysis) as [pattern, count]}
                <div class="bg-gray-50 p-4 rounded-lg text-center">
                  <div class="text-xl font-bold text-gray-700">{count}</div>
                  <div class="text-sm text-gray-600">
                    {pattern === 'perfect' ? '完璧' :
                     pattern === 'improving' ? '改善中' :
                     pattern === 'declining' ? '悪化中' :
                     pattern === 'unstable' ? '不安定' : '一貫性'}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      <!-- 進捗分析タブ -->
      {#if selectedTab === 'progress' && progressData}
        <div class="space-y-6">
          <!-- 進捗サマリー -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center p-4 bg-blue-50 rounded-lg">
              <div class="text-2xl font-bold text-blue-600">{progressData.totalProblems}</div>
              <div class="text-sm text-gray-600">総問題数</div>
            </div>
            <div class="text-center p-4 bg-green-50 rounded-lg">
              <div class="text-2xl font-bold text-green-600">{progressData.completedProblems}</div>
              <div class="text-sm text-gray-600">完了問題</div>
            </div>
            <div class="text-center p-4 bg-yellow-50 rounded-lg">
              <div class="text-2xl font-bold text-yellow-600">{progressData.inProgressProblems}</div>
              <div class="text-sm text-gray-600">進行中</div>
            </div>
            <div class="text-center p-4 bg-red-50 rounded-lg">
              <div class="text-2xl font-bold text-red-600">{progressData.overdueProblems}</div>
              <div class="text-sm text-gray-600">期日超過</div>
            </div>
          </div>

          <!-- 完了率 -->
          <div class="bg-gray-50 p-6 rounded-lg">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">📊 完了率</h3>
            <div class="flex items-center">
              <div class="flex-1">
                <div class="bg-gray-200 rounded-full h-4">
                  <div
                    class="bg-green-500 h-4 rounded-full transition-all duration-1000"
                    style="width: {progressData.completionRate}%"
                  ></div>
                </div>
              </div>
              <div class="ml-4 text-xl font-bold text-gray-700">
                {Math.round(progressData.completionRate)}%
              </div>
            </div>
          </div>

          <!-- 日別進捗グラフ -->
          {#if progressData.dailyProgress && progressData.dailyProgress.length > 0}
            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-4">📈 日別進捗</h3>
              <div class="bg-gray-50 p-4 rounded-lg">
                <div class="flex items-end space-x-1 h-32">
                  {#each progressData.dailyProgress.slice(-14) as day}
                    {@const maxAttempts = getMaxValue(progressData.dailyProgress, 'totalAttempts')}
                    {@const height = maxAttempts > 0 ? (day.totalAttempts / maxAttempts) * 100 : 0}
                    <div class="flex-1 flex flex-col items-center">
                      <div
                        class="w-full bg-blue-400 rounded-t transition-all duration-1000"
                        style="height: {height}%"
                        title="{day.date}: {day.totalAttempts}回試行, 正解率{Math.round(day.accuracy)}%"
                      ></div>
                      <div class="text-xs text-gray-600 mt-1 text-center transform rotate-45">
                        {day.date.split('-').slice(1).join('/')}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {/if}

          <!-- 学習効率 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="font-semibold text-gray-800 mb-2">⚡ 平均試行回数</h4>
              <div class="text-2xl font-bold text-gray-700">
                {Math.round(progressData.averageAttemptsPerProblem * 10) / 10}
              </div>
              <div class="text-sm text-gray-500">問題あたり</div>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="font-semibold text-gray-800 mb-2">⏱️ 平均完了時間</h4>
              <div class="text-2xl font-bold text-gray-700">
                {Math.round(progressData.timeToCompletion.average * 10) / 10}
              </div>
              <div class="text-sm text-gray-500">日</div>
            </div>
          </div>
        </div>
      {/if}

      <!-- 予測分析タブ -->
      {#if selectedTab === 'prediction' && predictionData}
        <div class="space-y-6">
          <!-- 忘却曲線比較 -->
          <div>
            <h3 class="text-lg font-semibold text-gray-800 mb-4">🧠 忘却曲線比較</h3>
            <div class="bg-gray-50 p-4 rounded-lg">
              <div class="flex items-end space-x-2 h-32">
                {#each predictionData.forgettingCurve.stages as stage, index}
                  {@const theoretical = predictionData.forgettingCurve.theoretical[index]}
                  {@const actual = predictionData.forgettingCurve.actual[index]}
                  <div class="flex-1 flex flex-col items-center">
                    <div class="w-full flex justify-center items-end space-x-1" style="height: 120px;">
                      <div
                        class="w-6 bg-gray-400 rounded-t"
                        style="height: {theoretical}%"
                        title="理論値: {theoretical}%"
                      ></div>
                      <div
                        class="w-6 bg-blue-500 rounded-t"
                        style="height: {actual}%"
                        title="実測値: {Math.round(actual)}%"
                      ></div>
                    </div>
                    <div class="text-xs text-gray-600 mt-1 text-center">
                      {stage}
                    </div>
                  </div>
                {/each}
              </div>
              <div class="flex justify-center mt-4 space-x-4">
                <div class="flex items-center">
                  <div class="w-4 h-4 bg-gray-400 rounded mr-2"></div>
                  <span class="text-sm text-gray-600">理論値</span>
                </div>
                <div class="flex items-center">
                  <div class="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                  <span class="text-sm text-gray-600">実測値</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 復習予測 -->
          <div>
            <h3 class="text-lg font-semibold text-gray-800 mb-4">📅 復習予測</h3>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div class="bg-red-50 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold text-red-600">{predictionData.reviewPrediction.today}</div>
                <div class="text-sm text-gray-600">今日</div>
              </div>
              <div class="bg-orange-50 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold text-orange-600">{predictionData.reviewPrediction.tomorrow}</div>
                <div class="text-sm text-gray-600">明日</div>
              </div>
              <div class="bg-yellow-50 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold text-yellow-600">{predictionData.reviewPrediction.thisWeek}</div>
                <div class="text-sm text-gray-600">今週</div>
              </div>
              <div class="bg-blue-50 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold text-blue-600">{predictionData.reviewPrediction.nextWeek}</div>
                <div class="text-sm text-gray-600">来週</div>
              </div>
              <div class="bg-indigo-50 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold text-indigo-600">{predictionData.reviewPrediction.thisMonth}</div>
                <div class="text-sm text-gray-600">今月</div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold text-purple-600">{predictionData.reviewPrediction.nextMonth}</div>
                <div class="text-sm text-gray-600">来月</div>
              </div>
            </div>
          </div>

          <!-- 学習効率メトリクス -->
          <div class="bg-gray-50 p-6 rounded-lg">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">⚡ 学習効率</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="text-center">
                <div class="text-xl font-bold text-gray-700">
                  {Math.round(predictionData.learningEfficiency.efficiency)}%
                </div>
                <div class="text-sm text-gray-600">効率スコア</div>
              </div>
              <div class="text-center">
                <div class="text-xl font-bold text-gray-700">
                  {formatDuration(predictionData.learningEfficiency.details.averageTimePerProblem)}
                </div>
                <div class="text-sm text-gray-600">平均時間/問</div>
              </div>
              <div class="text-center">
                <div class="text-xl font-bold text-gray-700">
                  {predictionData.learningEfficiency.details.totalAttempts}
                </div>
                <div class="text-sm text-gray-600">総試行回数</div>
              </div>
              <div class="text-center">
                <div class="text-xl font-bold text-gray-700">
                  {predictionData.learningEfficiency.details.successfulCompletions}
                </div>
                <div class="text-sm text-gray-600">成功完了数</div>
              </div>
            </div>
          </div>

          <!-- 推奨事項 -->
          {#if predictionData.recommendations && predictionData.recommendations.length > 0}
            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-4">💡 推奨事項</h3>
              <div class="space-y-3">
                {#each predictionData.recommendations as recommendation}
                  <div class="border-l-4 p-4 bg-gray-50 rounded-r-lg {
                    recommendation.priority === 'high' ? 'border-red-500' :
                    recommendation.priority === 'medium' ? 'border-yellow-500' : 'border-blue-500'
                  }">
                    <div class="flex items-start">
                      <div class="flex-shrink-0 mr-3">
                        {#if recommendation.type === 'urgent'}
                          <div class="text-red-500">🚨</div>
                        {:else if recommendation.type === 'improvement'}
                          <div class="text-yellow-500">⚠️</div>
                        {:else}
                          <div class="text-blue-500">💡</div>
                        {/if}
                      </div>
                      <div class="flex-1">
                        <h4 class="font-semibold text-gray-800">{recommendation.title}</h4>
                        <p class="text-sm text-gray-600 mt-1">{recommendation.description}</p>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </div>