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

  export let data;
  let currentUserId = data.userId;

  let isOpen = false;

  function toggleMenu() {
    isOpen = !isOpen;
  }

  function goToTop() {
    goto('/');
    isOpen = false;
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

          console.log('=== 進捗データロード ===');
          console.log('取得した進捗データ:', progressData);
          console.log('progressData の型:', typeof progressData);
          console.log('progressData が null/undefined:', progressData == null);

          if (progressData && progressData !== null && typeof progressData === 'object') {
            let loadedIndex = progressData.lastProblemIndex;
            console.log('生のlastProblemIndex:', loadedIndex, '(型:', typeof loadedIndex, ')');

            if (typeof loadedIndex === 'string') {
              loadedIndex = parseInt(loadedIndex, 10);
            }
            if (typeof loadedIndex !== 'number' || isNaN(loadedIndex)) {
              loadedIndex = 0;
            }

            console.log('保存されていたlastProblemIndex:', loadedIndex);
            console.log('isCompleted:', progressData.isCompleted, '(型:', typeof progressData.isCompleted, ')');

            if (progressData.isCompleted !== true && progressData.isCompleted !== 'true') {
              if (loadedIndex >= 0 && loadedIndex < problems.length) {
                currentProblemIndex = loadedIndex;
                console.log('✅ 続きから開始:', currentProblemIndex);
              } else {
                currentProblemIndex = 0;
                console.log('❌ 無効なインデックスのため最初から開始');
                if (!isUnitCompleted) {
                  await saveUserProgress(currentUserId, unitId, 0, false);
                }
              }
            } else {
              currentProblemIndex = 0;
              console.log('🔄 完了済み単元の解き直し - 最初から開始');
            }
          } else {
            currentProblemIndex = 0;
            console.log('🆕 進捗データなし - 最初から開始');
          }

          currentProblem = problems[currentProblemIndex];
          problemStartTime = Date.now();

          if (sessionStartTime === 0) {
            sessionStartTime = Date.now();
          }

          console.log('=== 最終状態 ===');
          console.log('最終的なcurrentProblemIndex:', currentProblemIndex);
          console.log('currentProblem:', currentProblem ? `問題${currentProblemIndex + 1}` : 'null');
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

  async function handleShowNextHintEvent() {
    if (currentProblem && currentProblem.hints && currentHintIndex < currentProblem.hints.length) {
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

  async function showAnswerInput() {
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
      results = [...results, { isCorrect: problemIsCorrect, tag: currentProblem.tag }];

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
      // 全ヒント表示時も画面下にスクロール
      await tick();
      // 少し遅延を入れてDOM更新が完全に反映されるのを待つ
      setTimeout(() => {
        scrollToActionButtons();
      }, 200);
    }
  }

  async function finishSession() {
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

    await goto('/normal-mode/result', {
      state: {
        results: results,
        unitName: unitDisplayName,
        isIncomplete: true
      }
    });
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

      const allCorrect = results.every(result => result.isCorrect === true);

      console.log('=== 単元完了判定 ===');
      console.log('結果一覧:', results);
      console.log('すべて正解:', allCorrect);
      console.log('総問題数:', problems.length);
      console.log('結果数:', results.length);

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
        const saveSuccess = await saveUserProgress(
          currentUserId,
          unitId,
          0,
          true,
          allCorrect
        );

        if (!saveSuccess) {
          console.error('Failed to save completed status');
        }
      } catch (error) {
        console.error('Failed to save final progress:', error);
      }

      try {
        await goto('/normal-mode/result', {
          state: {
            results: results,
            unitName: unitDisplayName,
            allCorrect: allCorrect
          }
        });
      } catch (error) {
        console.error('Failed to navigate to result page:', error);
        await goto('/normal-mode/result');
      }
      return;
    }
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
  <header class="
  w-full p-6 rounded-md relative
  bg-stone-100
  [box-shadow:var(--shadow-neumorphic-convex)]
  mb-8
">
    <div class="flex items-center justify-between">
      <h1 class="text-4xl font-bold text-stone-700">演習 : {unitDisplayName}</h1>
      <button class="focus:outline-none cursor-pointer" on:click={toggleMenu} aria-label="メニューを開閉">
        <IconHamburger width="48" height="48" isOpen={isOpen} color="#374151" />
      </button>
    </div>
    <AppNavigation isOpen={isOpen} />
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
              onClick={handleShowNextHintEvent} widthClass="w-[12rem]"
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
    <TealButton text="ダッシュボードへ戻る" onClick={() => goto('/dashboard')}
    />
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