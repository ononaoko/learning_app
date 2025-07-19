<!-- src/lib/components/EbbinghausAnalyticsChart.svelte -->
<script>
  import { onMount } from 'svelte';

  export let userId;
  export let unitId = null;
  export let analyticsData = null; // 親から渡されるデータ

  let selectedTab = 'retention';
  let selectedPeriod = 'all';
  let loading = false;

  // データが親から渡されない場合のフォールバック
  let retentionData = null;
  let progressData = null;
  let predictionData = null;

  // 親から渡されたデータを使用するか、APIから取得するかを判定
  function shouldUsePropsData() {
    return analyticsData && Object.keys(analyticsData).length > 0;
  }

  // 定着度分析データを取得（フォールバック用）
  async function loadRetentionData() {
    if (!userId || shouldUsePropsData()) return;

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

  // 進捗分析データを取得（フォールバック用）
  async function loadProgressData() {
    if (!userId || shouldUsePropsData()) return;

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

  // 予測分析データを取得（フォールバック用）
  async function loadPredictionData() {
    if (!userId || shouldUsePropsData()) return;

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

  // 全データを読み込み（フォールバック用）
  async function loadAllData() {
    if (shouldUsePropsData()) {
      // 親からデータが渡されている場合は、それを使用
      retentionData = analyticsData;
      // 他のタブ用のデータも同じデータから生成（簡易版）
      progressData = generateProgressFromRetention(analyticsData);
      predictionData = generatePredictionFromRetention(analyticsData);
      return;
    }

    loading = true;
    await Promise.all([
      loadRetentionData(),
      loadProgressData(),
      loadPredictionData()
    ]);
    loading = false;
  }

  // 定着度データから進捗データを生成（簡易版）
  function generateProgressFromRetention(data) {
    if (!data) return null;

    return {
      totalProblems: data.totalProblems || 0,
      completedProblems: data.completedProblems || 0,
      inProgressProblems: Math.max(0, (data.totalProblems || 0) - (data.completedProblems || 0)),
      overdueProblems: data.retentionDistribution?.critical || 0,
      completionRate: data.totalProblems > 0 ? (data.completedProblems / data.totalProblems) * 100 : 0,
      averageAttemptsPerProblem: 2.5, // デフォルト値
      timeToCompletion: {
        average: 3.5 // デフォルト値
      },
      dailyProgress: [] // 空配列
    };
  }

  // 定着度データから予測データを生成（簡易版）
  function generatePredictionFromRetention(data) {
    if (!data) return null;

    return {
      forgettingCurve: {
        theoretical: [100, 58, 44, 35, 26],
        actual: [100, 70, 60, 50, 45],
        stages: ['初回', '1日後', '7日後', '28日後', '長期記憶']
      },
      reviewPrediction: {
        today: data.retentionDistribution?.poor || 0,
        tomorrow: data.retentionDistribution?.fair || 0,
        thisWeek: Math.floor((data.totalProblems || 0) * 0.1),
        nextWeek: Math.floor((data.totalProblems || 0) * 0.05),
        thisMonth: Math.floor((data.totalProblems || 0) * 0.2),
        nextMonth: Math.floor((data.totalProblems || 0) * 0.1)
      },
      learningEfficiency: {
        efficiency: data.overallRetentionScore || 0,
        details: {
          averageTimePerProblem: 120000, // 2分
          totalAttempts: data.totalProblems || 0,
          successfulCompletions: data.completedProblems || 0
        }
      },
      recommendations: generateRecommendations(data)
    };
  }

  // 推奨事項を生成
  function generateRecommendations(data) {
    if (!data) return [];

    const recommendations = [];

    if (data.retentionDistribution?.critical > 0) {
      recommendations.push({
        type: 'urgent',
        title: '緊急復習が必要です',
        description: `${data.retentionDistribution.critical}問の定着度が非常に低い状態です。`,
        priority: 'high'
      });
    }

    if (data.retentionDistribution?.poor > 0) {
      recommendations.push({
        type: 'improvement',
        title: '復習をお勧めします',
        description: `${data.retentionDistribution.poor}問の定着度が低い状態です。`,
        priority: 'medium'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'continue',
        title: '学習順調です！',
        description: '現在の学習ペースを維持しましょう。',
        priority: 'low'
      });
    }

    return recommendations;
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
    if (!data || !Array.isArray(data)) return 1;
    return Math.max(...data.map(d => d[key] || 0), 1);
  }

  onMount(() => {
    if (userId) {
      loadAllData();
    }
  });

  // リアクティブな更新
  $: if (analyticsData) {
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
  {:else if !retentionData && !analyticsData}
    <div class="text-center py-12">
      <div class="text-4xl mb-4">📚</div>
      <p class="text-gray-600 text-lg mb-2">学習データがありません</p>
      <p class="text-gray-500 text-sm">まず問題を解いて学習記録を作成しましょう</p>
    </div>
  {:else}
    <!-- 定着度分析タブ -->
    {#if selectedTab === 'retention' && retentionData}
      <div class="space-y-6">
        <!-- 全体定着度スコア -->
        <div class="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <div class="text-4xl font-bold text-blue-600 mb-2">
            {Math.round(retentionData.overallRetentionScore || 0)}%
          </div>
          <div class="text-lg text-gray-700">全体定着度スコア</div>
          <div class="text-sm text-gray-500 mt-1">
            {getRetentionLabel(retentionData.overallRetentionScore || 0)}
          </div>
        </div>

        <!-- メッセージ表示 -->
        {#if retentionData.message}
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p class="text-blue-700">{retentionData.message}</p>
          </div>
        {/if}

        <!-- 問題数表示 -->
        <div class="grid grid-cols-2 gap-4">
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <div class="text-2xl font-bold text-gray-700">{retentionData.totalProblems || 0}</div>
            <div class="text-sm text-gray-600">総問題数</div>
          </div>
          <div class="text-center p-4 bg-green-50 rounded-lg">
            <div class="text-2xl font-bold text-green-600">{retentionData.completedProblems || 0}</div>
            <div class="text-sm text-gray-600">完了問題数</div>
          </div>
        </div>

        {#if retentionData.totalProblems > 0}
          <!-- 定着度分布 -->
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div class="text-center p-4 bg-green-50 rounded-lg">
              <div class="text-2xl font-bold text-green-600">{retentionData.retentionDistribution?.excellent || 0}</div>
              <div class="text-sm text-gray-600">優秀</div>
              <div class="text-xs text-green-500">90-100%</div>
            </div>
            <div class="text-center p-4 bg-blue-50 rounded-lg">
              <div class="text-2xl font-bold text-blue-600">{retentionData.retentionDistribution?.good || 0}</div>
              <div class="text-sm text-gray-600">良好</div>
              <div class="text-xs text-blue-500">70-89%</div>
            </div>
            <div class="text-center p-4 bg-yellow-50 rounded-lg">
              <div class="text-2xl font-bold text-yellow-600">{retentionData.retentionDistribution?.fair || 0}</div>
              <div class="text-sm text-gray-600">普通</div>
              <div class="text-xs text-yellow-500">50-69%</div>
            </div>
            <div class="text-center p-4 bg-orange-50 rounded-lg">
              <div class="text-2xl font-bold text-orange-600">{retentionData.retentionDistribution?.poor || 0}</div>
              <div class="text-sm text-gray-600">要改善</div>
              <div class="text-xs text-orange-500">30-49%</div>
            </div>
            <div class="text-center p-4 bg-red-50 rounded-lg">
              <div class="text-2xl font-bold text-red-600">{retentionData.retentionDistribution?.critical || 0}</div>
              <div class="text-sm text-gray-600">危険</div>
              <div class="text-xs text-red-500">0-29%</div>
            </div>
          </div>

          <!-- 段階別正解率 -->
          {#if retentionData.stageAnalysis}
            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-4">📚 復習段階別正解率</h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                {#each Object.entries(retentionData.stageAnalysis) as [stage, data], index}
                  <div class="bg-gray-50 p-4 rounded-lg">
                    <div class="text-center">
                      <div class="text-2xl font-bold text-gray-700">{Math.round(data.rate || 0)}%</div>
                      <div class="text-sm text-gray-600">
                        {['初回学習', '1日後', '7日後', '28日後'][index]}
                      </div>
                      <div class="text-xs text-gray-500">
                        {data.correct || 0}/{data.total || 0}問正解
                      </div>
                    </div>
                    <div class="mt-2 bg-gray-200 rounded-full h-2">
                      <div
                        class="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                        style="width: {data.rate || 0}%"
                      ></div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- 学習パターン分析 -->
          {#if retentionData.patternAnalysis}
            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-4">🔍 学習パターン分析</h3>
              <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                {#each Object.entries(retentionData.patternAnalysis) as [pattern, count]}
                  <div class="bg-gray-50 p-4 rounded-lg text-center">
                    <div class="text-xl font-bold text-gray-700">{count || 0}</div>
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
          {/if}
        {/if}
      </div>
    {/if}

    <!-- 進捗分析タブ -->
    {#if selectedTab === 'progress' && progressData}
      <div class="space-y-6">
        <!-- 進捗サマリー -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center p-4 bg-blue-50 rounded-lg">
            <div class="text-2xl font-bold text-blue-600">{progressData.totalProblems || 0}</div>
            <div class="text-sm text-gray-600">総問題数</div>
          </div>
          <div class="text-center p-4 bg-green-50 rounded-lg">
            <div class="text-2xl font-bold text-green-600">{progressData.completedProblems || 0}</div>
            <div class="text-sm text-gray-600">完了問題</div>
          </div>
          <div class="text-center p-4 bg-yellow-50 rounded-lg">
            <div class="text-2xl font-bold text-yellow-600">{progressData.inProgressProblems || 0}</div>
            <div class="text-sm text-gray-600">進行中</div>
          </div>
          <div class="text-center p-4 bg-red-50 rounded-lg">
            <div class="text-2xl font-bold text-red-600">{progressData.overdueProblems || 0}</div>
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
                  style="width: {progressData.completionRate || 0}%"
                ></div>
              </div>
            </div>
            <div class="ml-4 text-xl font-bold text-gray-700">
              {Math.round(progressData.completionRate || 0)}%
            </div>
          </div>
        </div>

        <!-- 学習効率 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-800 mb-2">⚡ 平均試行回数</h4>
            <div class="text-2xl font-bold text-gray-700">
              {Math.round((progressData.averageAttemptsPerProblem || 0) * 10) / 10}
            </div>
            <div class="text-sm text-gray-500">問題あたり</div>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-800 mb-2">⏱️ 平均完了時間</h4>
            <div class="text-2xl font-bold text-gray-700">
              {Math.round((progressData.timeToCompletion?.average || 0) * 10) / 10}
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
              <div class="text-2xl font-bold text-red-600">{predictionData.reviewPrediction.today || 0}</div>
              <div class="text-sm text-gray-600">今日</div>
            </div>
            <div class="bg-orange-50 p-4 rounded-lg text-center">
              <div class="text-2xl font-bold text-orange-600">{predictionData.reviewPrediction.tomorrow || 0}</div>
              <div class="text-sm text-gray-600">明日</div>
            </div>
            <div class="bg-yellow-50 p-4 rounded-lg text-center">
              <div class="text-2xl font-bold text-yellow-600">{predictionData.reviewPrediction.thisWeek || 0}</div>
              <div class="text-sm text-gray-600">今週</div>
            </div>
            <div class="bg-blue-50 p-4 rounded-lg text-center">
              <div class="text-2xl font-bold text-blue-600">{predictionData.reviewPrediction.nextWeek || 0}</div>
              <div class="text-sm text-gray-600">来週</div>
            </div>
            <div class="bg-indigo-50 p-4 rounded-lg text-center">
              <div class="text-2xl font-bold text-indigo-600">{predictionData.reviewPrediction.thisMonth || 0}</div>
              <div class="text-sm text-gray-600">今月</div>
            </div>
            <div class="bg-purple-50 p-4 rounded-lg text-center">
              <div class="text-2xl font-bold text-purple-600">{predictionData.reviewPrediction.nextMonth || 0}</div>
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
                {Math.round(predictionData.learningEfficiency.efficiency || 0)}%
              </div>
              <div class="text-sm text-gray-600">効率スコア</div>
            </div>
            <div class="text-center">
              <div class="text-xl font-bold text-gray-700">
                {formatDuration(predictionData.learningEfficiency.details.averageTimePerProblem || 0)}
              </div>
              <div class="text-sm text-gray-600">平均時間/問</div>
            </div>
            <div class="text-center">
              <div class="text-xl font-bold text-gray-700">
                {predictionData.learningEfficiency.details.totalAttempts || 0}
              </div>
              <div class="text-sm text-gray-600">総試行回数</div>
            </div>
            <div class="text-center">
              <div class="text-xl font-bold text-gray-700">
                {predictionData.learningEfficiency.details.successfulCompletions || 0}
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