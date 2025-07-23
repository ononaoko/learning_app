<!-- src/lib/components/StudyStreakCard.svelte -->
<script>
  import { onMount } from 'svelte';
  import { audioStore } from '$lib/stores/audioStore.js';

  export let userId;
  export let streakData = null; // 親から渡されるデータ

  // ローカルのデータ状態
  let localStreakData = {
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null,
    totalStudyDays: 0,
    firstStudyDate: null,
    todayProblems: 0,
    totalProblems: 0,
    weeklyProgress: 0,
    weeklyGoal: 7,
    isOnTrack: false
  };

  let isNewStudyDay = false;
  let needsMoreProblems = true;
  let loading = false;

  // 親から渡されたデータを使用するか、APIから取得するかを判定
  function shouldUsePropsData() {
    return streakData && typeof streakData === 'object' && Object.keys(streakData).length > 0;
  }

  // 連続学習記録を取得（フォールバック用）
  async function loadStudyStreak() {
    // 親からデータが渡されている場合は、それを使用
    if (shouldUsePropsData()) {
      localStreakData = convertToLocalFormat(streakData);
      needsMoreProblems = (localStreakData.todayProblems || 0) < 3;
      console.log('親から渡されたstreakDataを使用:', localStreakData);
      return;
    }

    loading = true;
    try {
      // 拡張されたlearning-stats APIを使用
      const response = await fetch(`/api/learning-stats?type=streak`);
      if (response.ok) {
        const data = await response.json();
        localStreakData = convertToLocalFormat(data);
        needsMoreProblems = (localStreakData.todayProblems || 0) < 3;
        console.log('連続学習記録をAPIから取得:', localStreakData);
      } else {
        console.error('連続学習記録の取得に失敗:', response.statusText);
        // エラー時はデフォルトデータを使用
        localStreakData = getDefaultStreakData();
      }
    } catch (error) {
      console.error('連続学習記録の取得エラー:', error);
      localStreakData = getDefaultStreakData();
    } finally {
      loading = false;
    }
  }

  // API形式のデータをローカル形式に変換
  function convertToLocalFormat(data) {
    if (!data) return getDefaultStreakData();

    return {
      currentStreak: data.currentStreak || 0,
      longestStreak: data.longestStreak || 0,
      lastStudyDate: data.lastStudyDate || null,
      totalStudyDays: data.totalStudyDays || 0,
      firstStudyDate: data.firstStudyDate || null,
      todayProblems: estimateTodayProblems(data),
      totalProblems: data.totalProblems || 0,
      weeklyProgress: data.weeklyProgress || 0,
      weeklyGoal: data.weeklyGoal || 7,
      isOnTrack: data.isOnTrack || false
    };
  }

  // 今日の問題数を推定（APIデータから）
  function estimateTodayProblems(data) {
    if (data.todayProblems !== undefined) return data.todayProblems;

    // 最終学習日が今日の場合は、進捗から推定
    const today = new Date().toISOString().split('T')[0];
    if (data.lastStudyDate === today) {
      return Math.min(3, data.weeklyProgress || 0);
    }

    return 0;
  }

  // デフォルトデータを取得
  function getDefaultStreakData() {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
      totalStudyDays: 0,
      firstStudyDate: null,
      todayProblems: 0,
      totalProblems: 0,
      weeklyProgress: 0,
      weeklyGoal: 7,
      isOnTrack: false
    };
  }

  // 連続学習記録を更新（問題を解いた時に呼び出される）
  async function updateStudyStreak(problemsSolved = 1) {
    try {
      const response = await fetch('/api/study-streak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, problemsSolved })
      });

      if (response.ok) {
        const data = await response.json();
        localStreakData = convertToLocalFormat(data);
        isNewStudyDay = data.isNewStudyDay;
        needsMoreProblems = data.needsMoreProblems;

        console.log('連続学習記録を更新:', localStreakData);

        // 新しい学習日達成の場合は効果音を再生
        if (isNewStudyDay) {
          await audioStore.play('success');
        }
      } else {
        console.error('連続学習記録の更新に失敗:', response.statusText);
      }
    } catch (error) {
      console.error('連続学習記録の更新エラー:', error);
    }
  }

  // 連続学習のレベルを取得
  function getStreakLevel(streak) {
    if (streak >= 100) return { level: 'レジェンド', color: 'text-purple-600', icon: '👑' };
    if (streak >= 50) return { level: 'マスター', color: 'text-yellow-600', icon: '🏆' };
    if (streak >= 30) return { level: 'エキスパート', color: 'text-red-600', icon: '🔥' };
    if (streak >= 14) return { level: 'プロ', color: 'text-orange-600', icon: '⭐' };
    if (streak >= 7) return { level: 'アマチュア', color: 'text-blue-600', icon: '📚' };
    if (streak >= 3) return { level: 'ビギナー', color: 'text-green-600', icon: '🌱' };
    return { level: 'スタート', color: 'text-gray-600', icon: '🔰' };
  }

  // 学習開始からの日数を計算
  function getDaysSinceStart() {
    if (!localStreakData.firstStudyDate) return 0;
    const startDate = new Date(localStreakData.firstStudyDate);
    const today = new Date();
    return Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
  }

  // 連続学習率を計算
  function getStudyRate() {
    const totalDays = getDaysSinceStart();
    if (totalDays === 0) return 0;
    return Math.round((localStreakData.totalStudyDays / totalDays) * 100);
  }

  // 今日の進捗率を計算
  function getTodayProgress() {
    return Math.min(100, Math.round((localStreakData.todayProblems / 3) * 100));
  }

  // 今日の目標達成状況
  function getTodayStatus() {
    if (localStreakData.todayProblems >= 3) {
      return { text: '目標達成！', color: 'text-green-600', icon: '🎉' };
    } else if (localStreakData.todayProblems >= 2) {
      return { text: 'あと1問！', color: 'text-orange-600', icon: '💪' };
    } else if (localStreakData.todayProblems >= 1) {
      return { text: 'あと2問！', color: 'text-blue-600', icon: '📖' };
    } else {
      return { text: '今日も頑張ろう！', color: 'text-gray-600', icon: '🌟' };
    }
  }

  // 次のレベルまでの日数を計算
  function getDaysToNextLevel() {
    const current = localStreakData.currentStreak;
    if (current < 3) return { days: 3 - current, level: 'ビギナー' };
    if (current < 7) return { days: 7 - current, level: 'アマチュア' };
    if (current < 14) return { days: 14 - current, level: 'プロ' };
    if (current < 30) return { days: 30 - current, level: 'エキスパート' };
    if (current < 50) return { days: 50 - current, level: 'マスター' };
    if (current < 100) return { days: 100 - current, level: 'レジェンド' };
    return { days: 0, level: 'レジェンド達成！' };
  }

  // 次のレベルまでの進捗率を計算
  function getProgressToNextLevel() {
    const current = localStreakData.currentStreak;
    if (current < 3) return (current / 3) * 100;
    if (current < 7) return ((current - 3) / 4) * 100;
    if (current < 14) return ((current - 7) / 7) * 100;
    if (current < 30) return ((current - 14) / 16) * 100;
    if (current < 50) return ((current - 30) / 20) * 100;
    if (current < 100) return ((current - 50) / 50) * 100;
    return 100;
  }

  // 外部から呼び出される関数（問題を解いた時に使用）
  export function recordProblemSolved(count = 1) {
    updateStudyStreak(count);
  }

  onMount(async () => {
    console.log('StudyStreakCard マウント開始, userId:', userId);
    if (userId && userId !== 'undefined') {
      await loadStudyStreak();
    } else {
      console.warn('userId が設定されていません');
      localStreakData = getDefaultStreakData();
    }
  });

  // リアクティブな更新
  $: if (streakData) {
    localStreakData = convertToLocalFormat(streakData);
    needsMoreProblems = (localStreakData.todayProblems || 0) < 3;
  }

  $: streakLevel = getStreakLevel(localStreakData.currentStreak);
  $: studyRate = getStudyRate();
  $: daysSinceStart = getDaysSinceStart();
  $: todayProgress = getTodayProgress();
  $: todayStatus = getTodayStatus();
  $: nextLevel = getDaysToNextLevel();
  $: progressToNext = getProgressToNextLevel();
</script>

<div class="bg-stone-100 [box-shadow:var(--shadow-neumorphic-convex)] rounded-lg shadow-lg p-6 mb-6">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-2xl font-bold text-gray-800">連続学習記録</h2>
    {#if isNewStudyDay}
      <div class="animate-bounce">
        <span class="text-2xl">🎉</span>
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="text-center py-8">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
      <p class="mt-4 text-gray-600">読み込み中...</p>
    </div>
  {:else}
    <!-- データソース表示（デバッグ用） -->
    {#if false} <!-- 本番では非表示 -->
      <div class="mb-4 p-2 bg-gray-100 text-xs rounded">
        データソース: {shouldUsePropsData() ? '親コンポーネント' : 'API取得'}
        | 連続日数: {localStreakData.currentStreak}日
      </div>
    {/if}

    <!-- 今日の進捗 -->
    <div class="mb-6 p-4 bg-stone-100 [box-shadow:var(--shadow-neumorphic-concave2)] rounded-lg">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-lg font-semibold text-gray-800">今日の学習進捗</h3>
        <div class="text-right">
          <span class="text-2xl font-bold text-teal-600">{localStreakData.todayProblems}</span>
          <span class="text-gray-600">/3問</span>
        </div>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-4 mb-2">
        <div
          class="bg-gradient-to-r from-teal-400 to-teal-600 h-4 rounded-full transition-all duration-1000"
          style="width: {todayProgress}%"
        ></div>
      </div>
      <div class="text-center">
        <span class="{todayStatus.color} font-semibold">
          {todayStatus.icon} {todayStatus.text}
        </span>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- 現在の連続学習 -->
      <div class="text-center">
        <div class="text-4xl font-bold {streakLevel.color} mb-2">
          {localStreakData.currentStreak}
        </div>
        <div class="text-lg mb-1">
          {streakLevel.icon} {streakLevel.level}
        </div>
        <div class="text-sm text-gray-600">現在の連続学習</div>
        {#if isNewStudyDay && localStreakData.currentStreak > 1}
          <div class="text-xs text-green-600 mt-1">
            🔥 {localStreakData.currentStreak}日連続達成！
          </div>
        {/if}
      </div>

      <!-- 最大連続学習 -->
      <div class="text-center">
        <div class="text-4xl font-bold text-orange-600 mb-2">
          {localStreakData.longestStreak}
        </div>
        <div class="text-lg mb-1">🏆 最高記録</div>
        <div class="text-sm text-gray-600">最大連続学習</div>
        {#if localStreakData.currentStreak === localStreakData.longestStreak && localStreakData.longestStreak > 0}
          <div class="text-xs text-orange-600 mt-1">
            ✨ 記録更新中！
          </div>
        {/if}
      </div>

      <!-- 累計学習日数 -->
      <div class="text-center">
        <div class="text-4xl font-bold text-blue-600 mb-2">
          {localStreakData.totalStudyDays}
        </div>
        <div class="text-lg mb-1">📅 累計</div>
        <div class="text-sm text-gray-600">総学習日数</div>
        <div class="text-xs text-blue-600 mt-1">
          {daysSinceStart}日中 {localStreakData.totalStudyDays}日
        </div>
      </div>

      <!-- 週間進捗 -->
      <div class="text-center">
        <div class="text-4xl font-bold text-green-600 mb-2">
          {localStreakData.weeklyProgress}
        </div>
        <div class="text-lg mb-1">📊 週間進捗</div>
        <div class="text-sm text-gray-600">今週の学習日数</div>
        <div class="text-xs text-green-600 mt-1">
          目標: {localStreakData.weeklyGoal}日
          {localStreakData.isOnTrack ? '✅' : '⚠️'}
        </div>
      </div>
    </div>

    <!-- 次のレベルまでの進捗 -->
    <div class="mt-6">
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm text-gray-600">次のレベルまで</span>
        <span class="text-sm text-gray-600">
          {#if nextLevel.days > 0}
            あと{nextLevel.days}日で{nextLevel.level}
          {:else}
            {nextLevel.level}
          {/if}
        </span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-3">
        <div
          class="bg-gradient-to-r from-teal-400 to-teal-600 h-3 rounded-full transition-all duration-1000"
          style="width: {progressToNext}%"
        ></div>
      </div>
    </div>

    <!-- 学習統計サマリー -->
    {#if localStreakData.totalProblems > 0}
      <div class="mt-6 grid grid-cols-2 gap-4">
        <div class="text-center p-3 bg-gray-50 rounded-lg">
          <div class="text-lg font-bold text-gray-700">{localStreakData.totalProblems}</div>
          <div class="text-sm text-gray-600">総問題数</div>
          <div class="text-xs text-gray-500">
            平均 {localStreakData.totalStudyDays > 0 ? Math.round(localStreakData.totalProblems / localStreakData.totalStudyDays) : 0}問/日
          </div>
        </div>
        <div class="text-center p-3 bg-gray-50 rounded-lg">
          <div class="text-lg font-bold text-gray-700">{studyRate}%</div>
          <div class="text-sm text-gray-600">学習継続率</div>
          <div class="text-xs text-gray-500">
            {daysSinceStart}日中{localStreakData.totalStudyDays}日学習
          </div>
        </div>
      </div>
    {/if}

    <!-- 励ましメッセージ -->
    <div class="mt-4 text-center">
      {#if localStreakData.todayProblems >= 3}
        <p class="text-green-600 font-semibold">
          🎉 今日の目標達成！素晴らしい継続力です！
        </p>
      {:else if localStreakData.todayProblems > 0}
        <p class="text-blue-600 font-semibold">
          💪 あと{3 - localStreakData.todayProblems}問で今日の目標達成！
        </p>
      {:else if localStreakData.currentStreak > 0}
        <p class="text-orange-600 font-semibold">
          🔥 {localStreakData.currentStreak}日連続記録を継続しよう！
        </p>
      {:else}
        <p class="text-gray-600">
          🌟 今日も3問解いて学習記録を継続しよう！
        </p>
      {/if}
    </div>

    <!-- 学習のヒント -->
    {#if localStreakData.totalStudyDays > 0}
      <div class="mt-4 p-3 bg-white rounded-lg">
        <h4 class="font-semibold text-stone-700 mb-1 text-sm">💡 学習のコツ</h4>
        <div class="text-xs text-stone-700">
          {#if localStreakData.currentStreak >= 7}
            <p>• 素晴らしい継続力です！短い休憩を挟みながら続けましょう</p>
          {:else if localStreakData.currentStreak >= 3}
            <p>• 良いペースです！同じ時間帯に学習する習慣をつけましょう</p>
          {:else}
            <p>• 毎日少しずつでも学習を続けることが重要です</p>
          {/if}

          {#if localStreakData.weeklyProgress < 3}
            <p>• 週3日以上の学習を目標にしてみましょう</p>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>