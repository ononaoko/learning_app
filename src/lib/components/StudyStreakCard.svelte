<!-- src/lib/components/StudyStreakCard.svelte -->
<script>
  import { onMount } from 'svelte';
  import { audioStore } from '$lib/stores/audioStore.js';

  export let userId;

  let streakData = {
    currentStreak: 0,
    maxStreak: 0,
    lastStudyDate: null,
    totalStudyDays: 0,
    firstStudyDate: null,
    todayProblems: 0,
    totalProblems: 0
  };

  let isNewStudyDay = false;
  let needsMoreProblems = true;
  let loading = true;

  // 連続学習記録を取得
  async function loadStudyStreak() {
    try {
      const response = await fetch(`/api/study-streak?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        streakData = data;
        needsMoreProblems = data.todayProblems < 3;
        console.log('連続学習記録を取得:', streakData);
      } else {
        console.error('連続学習記録の取得に失敗:', response.statusText);
      }
    } catch (error) {
      console.error('連続学習記録の取得エラー:', error);
    } finally {
      loading = false;
    }
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
        streakData = data;
        isNewStudyDay = data.isNewStudyDay;
        needsMoreProblems = data.needsMoreProblems;

        console.log('連続学習記録を更新:', streakData);

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
    if (!streakData.firstStudyDate) return 0;
    const startDate = new Date(streakData.firstStudyDate);
    const today = new Date();
    return Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
  }

  // 連続学習率を計算
  function getStudyRate() {
    const totalDays = getDaysSinceStart();
    if (totalDays === 0) return 0;
    return Math.round((streakData.totalStudyDays / totalDays) * 100);
  }

  // 今日の進捗率を計算
  function getTodayProgress() {
    return Math.min(100, Math.round((streakData.todayProblems / 3) * 100));
  }

  // 今日の目標達成状況
  function getTodayStatus() {
    if (streakData.todayProblems >= 3) {
      return { text: '目標達成！', color: 'text-green-600', icon: '🎉' };
    } else if (streakData.todayProblems >= 2) {
      return { text: 'あと1問！', color: 'text-orange-600', icon: '💪' };
    } else if (streakData.todayProblems >= 1) {
      return { text: 'あと2問！', color: 'text-blue-600', icon: '📖' };
    } else {
      return { text: '今日も頑張ろう！', color: 'text-gray-600', icon: '🌟' };
    }
  }

  // 外部から呼び出される関数（問題を解いた時に使用）
  export function recordProblemSolved(count = 1) {
    updateStudyStreak(count);
  }

  onMount(async () => {
    await loadStudyStreak();
  });

  $: streakLevel = getStreakLevel(streakData.currentStreak);
  $: studyRate = getStudyRate();
  $: daysSinceStart = getDaysSinceStart();
  $: todayProgress = getTodayProgress();
  $: todayStatus = getTodayStatus();
</script>

<div class="bg-white rounded-lg shadow-lg p-6 mb-6">
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
    <!-- 今日の進捗 -->
    <div class="mb-6 p-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-lg font-semibold text-gray-800">今日の学習進捗</h3>
        <div class="text-right">
          <span class="text-2xl font-bold text-teal-600">{streakData.todayProblems}</span>
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
          {streakData.currentStreak}
        </div>
        <div class="text-lg mb-1">
          {streakLevel.icon} {streakLevel.level}
        </div>
        <div class="text-sm text-gray-600">現在の連続学習</div>
        {#if isNewStudyDay && streakData.currentStreak > 1}
          <div class="text-xs text-green-600 mt-1">
            🔥 {streakData.currentStreak}日連続達成！
          </div>
        {/if}
      </div>

      <!-- 最大連続学習 -->
      <div class="text-center">
        <div class="text-4xl font-bold text-orange-600 mb-2">
          {streakData.maxStreak}
        </div>
        <div class="text-lg mb-1">🏆 最高記録</div>
        <div class="text-sm text-gray-600">最大連続学習</div>
        {#if streakData.currentStreak === streakData.maxStreak && streakData.maxStreak > 0}
          <div class="text-xs text-orange-600 mt-1">
            ✨ 記録更新中！
          </div>
        {/if}
      </div>

      <!-- 累計学習日数 -->
      <div class="text-center">
        <div class="text-4xl font-bold text-blue-600 mb-2">
          {streakData.totalStudyDays}
        </div>
        <div class="text-lg mb-1">📅 累計</div>
        <div class="text-sm text-gray-600">総学習日数</div>
        <div class="text-xs text-blue-600 mt-1">
          {daysSinceStart}日中 {streakData.totalStudyDays}日
        </div>
      </div>

      <!-- 解いた問題数 -->
      <div class="text-center">
        <div class="text-4xl font-bold text-green-600 mb-2">
          {streakData.totalProblems}
        </div>
        <div class="text-lg mb-1">📊 総問題数</div>
        <div class="text-sm text-gray-600">解いた問題の合計</div>
        <div class="text-xs text-green-600 mt-1">
          平均 {streakData.totalStudyDays > 0 ? Math.round(streakData.totalProblems / streakData.totalStudyDays) : 0}問/日
        </div>
      </div>
    </div>

    <!-- 次のレベルまでの進捗 -->
    <div class="mt-6">
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm text-gray-600">次のレベルまで</span>
        <span class="text-sm text-gray-600">
          {#if streakData.currentStreak < 3}
            あと{3 - streakData.currentStreak}日でビギナー
          {:else if streakData.currentStreak < 7}
            あと{7 - streakData.currentStreak}日でアマチュア
          {:else if streakData.currentStreak < 14}
            あと{14 - streakData.currentStreak}日でプロ
          {:else if streakData.currentStreak < 30}
            あと{30 - streakData.currentStreak}日でエキスパート
          {:else if streakData.currentStreak < 50}
            あと{50 - streakData.currentStreak}日でマスター
          {:else if streakData.currentStreak < 100}
            あと{100 - streakData.currentStreak}日でレジェンド
          {:else}
            レジェンド達成！
          {/if}
        </span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-3">
        <div
          class="bg-gradient-to-r from-teal-400 to-teal-600 h-3 rounded-full transition-all duration-1000"
          style="width: {Math.min(100, (streakData.currentStreak % 10) * 10)}%"
        ></div>
      </div>
    </div>

    <!-- 励ましメッセージ -->
    <div class="mt-4 text-center">
      {#if streakData.todayProblems >= 3}
        <p class="text-green-600 font-semibold">
          🎉 今日の目標達成！素晴らしい継続力です！
        </p>
      {:else if streakData.todayProblems > 0}
        <p class="text-blue-600 font-semibold">
          💪 あと{3 - streakData.todayProblems}問で今日の目標達成！
        </p>
      {:else}
        <p class="text-gray-600">
          🌟 今日も3問解いて学習記録を継続しよう！
        </p>
      {/if}
    </div>
  {/if}
</div>