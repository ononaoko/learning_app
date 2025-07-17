<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';

  import ProgressBar from '$lib/components/ProgressBar.svelte';
  import ProblemDisplay from '$lib/components/ProblemDisplay.svelte';
  import HintSection from '$lib/components/HintSection.svelte';
  import AnswerInputAndEvaluation from '$lib/components/AnswerInputAndEvaluationNormalMode.svelte';
  import TealButton from '$lib/components/TealButton.svelte';
  import AppNavigation from '$lib/components/AppNavigation.svelte';
  import IconHamburger from '$lib/components/IconHamburger.svelte';
  import { audioStore } from '$lib/stores/audioStore.js';

  export let data;
  let currentUserId = data.userId;

  let isOpen = false;

  // 効果音付きメニュートグル
  async function toggleMenu() {
    await audioStore.play('menu'); // slide.mp3を再生
    isOpen = !isOpen;
  }

  // 効果音付きページ遷移
  async function goToTop() {
    await audioStore.playWithDelay('click', () => {
      goto('/');
      isOpen = false;
    }, 200);
  }

  let unitId = $page.params.unit;
  let problems = [];
  let currentProblemIndex = 0;
  let currentProblem;

  let showAnswerArea = false;
  let currentHintIndex = 0;
  let errorMessage = '';
  let showAllHints = false;

  let sessionStartTime = 0;
  let problemStartTime;
  let totalSessionTime = 0;
  let results = [];
  let unitDisplayName = data.unitDisplayName;

  let intervalId;
  let isSavingProgress = false;
  let isUnitCompleted = false;
  let problemResults = {}; // 問題ごとの結果を追跡するオブジェクト
let totalProblemsAttempted = 0; // 実際に解いた問題数を追跡

  // ボタンコンテナへの参照を追加
  let actionButtonsContainer;

  // 画面下にスクロールする関数
  async function scrollToActionButtons() {
    if (browser) {
      // DOM更新を待つ
      await tick();

      // 画面の一番下にスムーズにスクロール
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
      console.log('画面下部にスクロールしたよ');
    }
  }

  // 旧関数は念のため残しておく
  async function scrollToBottom() {
    if (browser) {
      // DOM更新を待つ
      await tick();

      // 画面の一番下にスムーズにスクロール
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
      console.log('スクロールしたよ')
    }
  }

  async function saveUserProgress(userId, unitId, lastProblemIndex, isCompleted = undefined, isPerfect = undefined, ebbinghausReviewCount = undefined) {
    if (isSavingProgress) {
      return false;
    }

    if (isUnitCompleted && isCompleted !== true) {
      return true;
    }

    isSavingProgress = true;

    try {
      const progressData = {
        userId,
        unitId,
        lastProblemIndex,
        isCompleted,
        ebbinghausReviewCount
      };

      if (isPerfect !== undefined) {
        progressData.isPerfect = isPerfect;
      }

      console.log('=== 進捗データ送信 ===');
      console.log('Unit ID:', unitId);
      console.log('送信データ:', progressData);

      const response = await fetch('/api/user-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(progressData)
      });

      if (!response.ok) {
        console.error(`Failed to save user progress for ${unitId}:`, response.statusText);
        return false;
      }

      const responseData = await response.json();
      console.log('サーバーからの返答:', responseData);

      if (isCompleted === true) {
        isUnitCompleted = true;

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('progress-updated', {
            detail: {
              unitId: unitId,
              progress: progressData
            }
          }));
        }
      }

      return true;
    } catch (error) {
      console.error('Error saving user progress:', error);
      return false;
    } finally {
      isSavingProgress = false;
    }
  }

  async function loadUserProgress(userId, unitId) {
    try {
      console.log('=== loadUserProgress開始 ===');
      console.log('userId:', userId);
      console.log('unitId:', unitId);

      const url = `/api/user-progress?userId=${userId}&unitId=${unitId}`;
      console.log('リクエストURL:', url);

      const response = await fetch(url);
      console.log('レスポンスステータス:', response.status);

      if (response.ok) {
        const progress = await response.json();
        console.log('取得した生データ:', progress);

        if (progress && progress.isCompleted === true) {
          isUnitCompleted = true;
          console.log('単元完了フラグを設定');
        }

        return progress;
      } else {
        console.error('Failed to load user progress:', response.status, response.statusText);
        return null;
      }
    } catch (error) {
      console.error('Error loading user progress:', error);
      return null;
    }
  }

  async function loadProblemsForUnit(unit) {
  try {
    console.log('=== loadProblemsForUnit開始 ===');
    console.log('unit:', unit);

    const response = await fetch(`/api/problems/${unit}`);
    if (response.ok) {
      const data = await response.json();
      problems = data;
      console.log('問題数:', problems.length);

      if (problems && problems.length > 0) {
        const progressData = await loadUserProgress(currentUserId, unitId);

        // 既存の問題結果を読み込む
        await loadProblemResults();

        console.log('=== 進捗データロード ===');
        console.log('取得した進捗データ:', progressData);
        console.log('既存の問題結果:', problemResults);

        if (progressData && progressData !== null && typeof progressData === 'object') {
          let loadedIndex = progressData.lastProblemIndex;

          if (typeof loadedIndex === 'string') {
            loadedIndex = parseInt(loadedIndex, 10);
          }
          if (typeof loadedIndex !== 'number' || isNaN(loadedIndex)) {
            loadedIndex = 0;
          }

          console.log('保存されていたlastProblemIndex:', loadedIndex);
          console.log('isCompleted:', progressData.isCompleted);

          if (progressData.isCompleted !== true && progressData.isCompleted !== 'true') {
            if (loadedIndex >= 0 && loadedIndex < problems.length) {
              currentProblemIndex = loadedIndex;
              console.log('✅ 続きから開始:', currentProblemIndex);
            } else {
              currentProblemIndex = 0;
              console.log('❌ 無効なインデックスのため最初から開始');
            }
          } else {
            // 完了済みの場合は最初から（解き直し）
            currentProblemIndex = 0;
            problemResults = {}; // 解き直しの場合は結果をリセット
            totalProblemsAttempted = 0;
            console.log('🔄 完了済み単元の解き直し - 結果リセット');
          }
        } else {
          currentProblemIndex = 0;
          problemResults = {};
          totalProblemsAttempted = 0;
          console.log('🆕 進捗データなし - 最初から開始');
        }

        currentProblem = problems[currentProblemIndex];
        problemStartTime = Date.now();

        if (sessionStartTime === 0) {
          sessionStartTime = Date.now();
        }

        console.log('=== 最終状態 ===');
        console.log('最終的なcurrentProblemIndex:', currentProblemIndex);
        console.log('problemResults:', problemResults);
      } else {
        errorMessage = 'この単元には問題がありません。';
      }
    } else {
      errorMessage = `問題の読み込みに失敗しました: ${response.statusText}`;
    }
  } catch (error) {
    errorMessage = '問題の読み込み中にエラーが発生しました。';
    console.error('Error loading problems:', error);
  }
}

async function loadProblemResults() {
  try {
    const response = await fetch(`/api/problem-results?userId=${currentUserId}&unitId=${unitId}`);
    if (response.ok) {
      const data = await response.json();
      problemResults = data.results || {};
      totalProblemsAttempted = Object.keys(problemResults).length;
      console.log('読み込んだ問題結果:', problemResults);
    } else {
      problemResults = {};
      totalProblemsAttempted = 0;
      console.log('問題結果なし - 新規開始');
    }
  } catch (error) {
    console.error('問題結果の読み込みに失敗:', error);
    problemResults = {};
    totalProblemsAttempted = 0;
  }
}

async function saveProblemResults() {
  try {
    const response = await fetch('/api/problem-results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: currentUserId,
        unitId: unitId,
        results: problemResults
      })
    });

    if (!response.ok) {
      console.error('問題結果の保存に失敗:', response.statusText);
    } else {
      console.log('問題結果を保存しました');
    }
  } catch (error) {
    console.error('問題結果の保存エラー:', error);
  }
}

  function startAutoSave() {
    if (intervalId) {
      clearInterval(intervalId);
    }
    intervalId = setInterval(async () => {
      if (currentUserId && unitId && currentProblemIndex !== undefined && !isUnitCompleted) {
        await saveUserProgress(currentUserId, unitId, currentProblemIndex);
      }
    }, 60000);
  }

  // 効果音付きヒント表示
  async function handleShowNextHintEvent() {
    if (currentProblem && currentProblem.hints && currentHintIndex < currentProblem.hints.length) {
      await audioStore.play('menu'); // ヒントボタンにクリック音
      currentHintIndex++;
      // DOM更新を待ってからスクロール
      await tick();
      // 少し遅延を入れてDOM更新が完全に反映されるのを待つ
      setTimeout(() => {
        scrollToActionButtons();
      }, 200);
      console.log('ヒントが出てスクロール予約したよ');
    }
  }

  // 効果音付き回答エリア表示
  async function showAnswerInput() {
    await audioStore.play('click'); // 回答ボタンにクリック音
    showAnswerArea = true;
    // DOM更新を待ってからスクロール
    await tick();
    // アニメーション完了を待つ（200ms）
    setTimeout(() => {
      scrollToActionButtons();
    }, 200);
    console.log('回答エリア表示後にスクロールを予約したよ');
  }

  async function handleRecordAnswer(event) {
  const { isCorrect: problemIsCorrect, userAnswer: submittedAnswer, timeTaken } = event.detail;

  if (currentProblem) {
    // セッション用の結果配列に追加（結果画面用）
    results = [...results, { isCorrect: problemIsCorrect, tag: currentProblem.tag }];

    // 問題ごとの結果を記録
    problemResults[currentProblemIndex] = {
      isCorrect: problemIsCorrect,
      problemId: currentProblem.id,
      timestamp: new Date().toISOString()
    };

    // 実際に解いた問題数を更新
    totalProblemsAttempted = Object.keys(problemResults).length;

    console.log('=== 問題結果記録 ===');
    console.log('問題インデックス:', currentProblemIndex);
    console.log('正解:', problemIsCorrect);
    console.log('累積結果:', problemResults);
    console.log('解いた問題数:', totalProblemsAttempted);

    // 問題結果を保存
    await saveProblemResults();

    // 学習記録の保存
    const recordData = {
      userId: currentUserId,
      unitId: unitId,
      problemId: currentProblem.id,
      isCorrect: problemIsCorrect,
      hintsUsedCount: currentHintIndex,
      duration: timeTaken,
      problemIndex: currentProblemIndex
    };

    try {
      const response = await fetch('/api/learning-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(recordData)
      });

      if (!response.ok) {
        console.error('個別問題の学習記録の保存に失敗しました:', response.statusText);
      }
    } catch (error) {
      console.error('個別問題の学習記録の送信中にエラーが発生しました:', error);
    }
  }

  if (!problemIsCorrect) {
    showAllHints = true;
    await tick();
    setTimeout(() => {
      scrollToActionButtons();
    }, 200);
  }
}

  // 効果音付きセッション終了
  async function finishSession() {
    await audioStore.play('click'); // 終了ボタンにクリック音

    console.log('=== ここまでボタン押下 ===');
    console.log('現在のproblemIndex:', currentProblemIndex);
    console.log('総問題数:', problems.length);

    const progressData = {
      userId: currentUserId,
      unitId: unitId,
      lastProblemIndex: currentProblemIndex,
      isCompleted: false,
      isPerfect: false
    };

    console.log('送信予定のデータ:', progressData);

    try {
      const response = await fetch('/api/user-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(progressData)
      });

      if (!response.ok) {
        console.error('進捗の保存に失敗しました:', response.status, response.statusText);
      } else {
        const responseData = await response.json();
        console.log('保存成功 - サーバーからの応答:', responseData);
        console.log('確認 - isCompleted:', responseData.isCompleted);
        console.log('確認 - lastProblemIndex:', responseData.lastProblemIndex);
      }
    } catch (error) {
      console.error('進捗保存中にエラー:', error);
    }

    const sessionEndTime = Date.now();
    const totalSessionDurationSeconds = Math.round((sessionEndTime - sessionStartTime) / 1000);

    try {
      const sessionRecordResponse = await fetch('/api/session-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUserId,
          mode: 'normal-mode',
          unitId: unitId,
          duration: totalSessionDurationSeconds,
          timestamp: new Date().toISOString()
        })
      });

      if (!sessionRecordResponse.ok) {
        console.error('ノーマルモードセッション全体の学習記録の保存に失敗しました。(中断時):', sessionRecordResponse.statusText);
      }
    } catch (error) {
      console.error('ノーマルモードセッション全体の学習記録の送信中にエラーが発生しました。(中断時):', error);
    }

    // 200ms遅延後にページ遷移
    setTimeout(() => {
      goto('/normal-mode/result', {
        state: {
          results: results,
          unitName: unitDisplayName,
          isIncomplete: true
        }
      });
    }, 200);
  }

  async function nextProblem() {
  currentProblemIndex++;
  showAnswerArea = false;
  currentHintIndex = 0;
  showAllHints = false;

  if (currentProblemIndex < problems.length) {
    currentProblem = problems[currentProblemIndex];
    problemStartTime = Date.now();

    if (!isUnitCompleted) {
      try {
        await saveUserProgress(currentUserId, unitId, currentProblemIndex);
      } catch (error) {
        console.error('Failed to save progress:', error);
      }
    }
  } else {
    const sessionEndTime = Date.now();
    const totalSessionDurationSeconds = Math.round((sessionEndTime - sessionStartTime) / 1000);

    // 全問正解の判定を修正
    const allProblemsCorrect = problems.every((_, index) => {
      return problemResults[index] && problemResults[index].isCorrect === true;
    });

    const allProblemsAttempted = Object.keys(problemResults).length === problems.length;

    console.log('=== 単元完了判定 ===');
    console.log('問題結果:', problemResults);
    console.log('総問題数:', problems.length);
    console.log('解いた問題数:', Object.keys(problemResults).length);
    console.log('全問題を解いた:', allProblemsAttempted);
    console.log('全問正解:', allProblemsCorrect);
    console.log('Perfect条件:', allProblemsAttempted && allProblemsCorrect);

    // 成功音またはエラー音を再生
    if (allProblemsCorrect && allProblemsAttempted) {
      await audioStore.play('success');
    } else {
      await audioStore.play('click');
    }

    try {
      const sessionRecordResponse = await fetch('/api/session-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUserId,
          mode: 'normal-mode',
          unitId: unitId,
          duration: totalSessionDurationSeconds,
          timestamp: new Date().toISOString()
        })
      });

      if (!sessionRecordResponse.ok) {
        console.error('ノーマルモードセッション全体の学習記録の保存に失敗しました:', sessionRecordResponse.statusText);
      }
    } catch (error) {
      console.error('ノーマルモードセッション全体の学習記録の送信中にエラーが発生しました:', error);
    }

    try {
      // 修正: 全問正解の判定を正しく行う
      const isPerfect = allProblemsAttempted && allProblemsCorrect;

      const saveSuccess = await saveUserProgress(
        currentUserId,
        unitId,
        0,
        true, // isCompleted
        isPerfect // isPerfect - 全問解いて全問正解の場合のみtrue
      );

      if (!saveSuccess) {
        console.error('Failed to save completed status');
      }

      // 完了時に問題結果をクリア
      if (saveSuccess) {
        problemResults = {};
        await saveProblemResults();
      }
    } catch (error) {
      console.error('Failed to save final progress:', error);
    }

    // 結果画面用のallCorrectは現在のセッションの結果を使用
    const sessionAllCorrect = results.every(result => result.isCorrect === true);

    setTimeout(() => {
      try {
        goto('/normal-mode/result', {
          state: {
            results: results,
            unitName: unitDisplayName,
            allCorrect: sessionAllCorrect,
            isPerfect: allProblemsAttempted && allProblemsCorrect
          }
        });
      } catch (error) {
        console.error('Failed to navigate to result page:', error);
        goto('/normal-mode/result');
      }
    }, 200);
    return;
  }
}

  // 効果音付きダッシュボード遷移
  async function goToDashboard() {
    await audioStore.playWithDelay('click', () => {
      goto('/dashboard');
    }, 200);
  }

  onMount(async () => {
    try {
      await loadProblemsForUnit(unitId);
      if (problems.length > 0) {
        startAutoSave();
      }
    } catch (error) {
      console.error('Failed to load problems:', error);
    }
  });

  onDestroy(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }

    if (browser && !isUnitCompleted && currentUserId && unitId && currentProblemIndex !== undefined) {
      const saveProgress = async () => {
        try {
          if (currentProblemIndex < problems.length) {
            await saveUserProgress(currentUserId, unitId, currentProblemIndex, false);
          }
        } catch (error) {
          console.error('Failed to save progress on destroy:', error);
        }
      };

      saveProgress();
    }
  });

  if (browser) {
    window.addEventListener('beforeunload', (event) => {
      if (isUnitCompleted) {
        return;
      }

      if (currentUserId && unitId && currentProblemIndex !== undefined) {
        const isAtEnd = currentProblemIndex >= problems.length;

        let completedStatus;
        let perfectStatus;

        if (isAtEnd && results.length === problems.length) {
          const allCorrect = results.every(result => result.isCorrect === true);
          completedStatus = allCorrect;
          perfectStatus = allCorrect;
        } else {
          completedStatus = undefined;
          perfectStatus = undefined;
        }

        const progressData = {
          userId: currentUserId,
          unitId: unitId,
          lastProblemIndex: isAtEnd ? 0 : currentProblemIndex,
          isCompleted: completedStatus
        };

        if (perfectStatus !== undefined) {
          progressData.isPerfect = perfectStatus;
        }

        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/user-progress', JSON.stringify(progressData));
        }
      }
    });
  }
</script>

<svelte:head>
  <title>演習モード：{unitDisplayName} - 算数学習アプリ</title>
</svelte:head>

<main class="bg-gradient-to-br from-stone-100 via-stone-100 to-stone-200 flex flex-col items-center min-h-screen p-4">
  <header class="w-full p-6 rounded-md relative bg-stone-100 [box-shadow:var(--shadow-neumorphic-convex)] mb-8">
    <div class="flex items-center justify-between">
      <h1 class="text-4xl font-bold text-stone-700">演習 : {unitDisplayName}</h1>
      <button
        class="focus:outline-none cursor-pointer"
        onclick={toggleMenu}
        aria-label="メニューを開閉"
      >
        <IconHamburger width="48" height="48" isOpen={isOpen} color="#374151" />
      </button>
    </div>
    <AppNavigation isOpen={isOpen} onNavigate={goToTop} />
  </header>

  {#if problems.length > 0 && currentProblemIndex < problems.length && currentProblem}
    <div class="w-full h-full">
      <ProgressBar
        current={currentProblemIndex + 1}
        total={problems.length}
      />
      <ProblemDisplay
        problemNumber={currentProblemIndex + 1}
        questionContent={currentProblem.question}
        source={currentProblem.source}
        tag={currentProblem.tag}
      />
      <div class="flex-grow min-w-0">
        <HintSection
          hints={currentProblem.hints}
          currentHintIndex={currentHintIndex}
          showAnswerArea={showAnswerArea}
          showAllHints={showAllHints}
          on:showNextHint={handleShowNextHintEvent}
        />
      </div>
      <div class="flex items-start justify-end w-full gap-4 my-8" bind:this={actionButtonsContainer}>
          {#if !showAnswerArea && currentHintIndex < currentProblem.hints.length && !showAllHints}
            <TealButton
              text="ヒント"
              onClick={handleShowNextHintEvent}
              widthClass="w-[12rem]"
              buttonColorClass="bg-yellow-400"
              borderColorClass="border-yellow-500"
              shadowColorClass="[box-shadow:0_5px_0_0_#eab308]"
              hoverShadowColorClass="hover:[box-shadow:0_0px_0_0_#eab308]"
              textColorClass="text-white"
            />
          {/if}

          {#if !showAnswerArea && !showAllHints}
            <TealButton
              text="回答をする"
              onClick={showAnswerInput}
              widthClass="w-[12rem]"
              buttonColorClass="bg-teal-400"
              borderColorClass="border-teal-500"
              shadowColorClass="[box-shadow:0_5px_0_0_#14b8a6]"
              hoverShadowColorClass="hover:[box-shadow:0_0px_0_0_#14b8a6]"
              textColorClass="text-white"
            />
          {/if}
      </div>

      {#if showAnswerArea}
        <AnswerInputAndEvaluation
          currentProblemAnswer={currentProblem.answer}
          currentProblemAcceptableAnswers={currentProblem.acceptableAnswers || []}
          on:recordAnswer={handleRecordAnswer}
          on:nextProblem={nextProblem}
          on:finishSession={finishSession}
        />
      {/if}

    </div>
  {:else if problems.length === 0 && !errorMessage}
    <p class="p-16">問題がありません。</p>
  {:else if errorMessage}
    <p class="text-red-500 text-center text-xl mt-8">{errorMessage}</p>
    <TealButton text="ダッシュボードへ戻る" onClick={goToDashboard} />
  {/if}

  {#if problems.length > 0}
    <ProgressBar current={currentProblemIndex + 1} total={problems.length} />
  {/if}
</main>

<style>
  :global(body) {
    overflow-x: hidden;
  }
</style>