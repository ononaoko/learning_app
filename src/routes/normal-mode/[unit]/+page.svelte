<script>
  import { onMount, onDestroy } from 'svelte';
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
  let userAnswer = '';
  let isCorrect = null;
  let showHint = false;
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

  async function saveUserProgress(userId, unitId, lastProblemIndex, isCompleted = undefined, ebbinghausReviewCount = undefined) {
    if (isSavingProgress) {
      return false;
    }

    if (isUnitCompleted && isCompleted !== true) {
      return true;
    }

    isSavingProgress = true;

    try {
      const response = await fetch('/api/user-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          unitId,
          lastProblemIndex,
          isCompleted,
          ebbinghausReviewCount
        })
      });

      if (!response.ok) {
        console.error(`Failed to save user progress for ${unitId}:`, response.statusText);
        return false;
      }

      if (isCompleted === true) {
        isUnitCompleted = true;
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
      const response = await fetch(`/api/user-progress?userId=${userId}&unitId=${unitId}`);
      if (response.ok) {
        const progress = await response.json();

        if (progress && progress.isCompleted === true) {
          isUnitCompleted = true;
        }

        return progress;
      } else {
        console.error('Failed to load user progress:', response.statusText);
        return null;
      }
    } catch (error) {
      console.error('Error loading user progress:', error);
      return null;
    }
  }

  async function loadProblemsForUnit(unit) {
    try {
      const response = await fetch(`/api/problems/${unit}`);
      if (response.ok) {
        const data = await response.json();
        problems = data;

        if (problems && problems.length > 0) {
          const progressData = await loadUserProgress(currentUserId, unitId);

          if (progressData) {
            let loadedIndex = progressData.lastProblemIndex;

            if (progressData.isCompleted) {
              loadedIndex = 0;
            }

            if (loadedIndex < 0 || loadedIndex >= problems.length) {
              currentProblemIndex = 0;
              if (!isUnitCompleted) {
                await saveUserProgress(currentUserId, unitId, 0, false);
              }
            } else {
              currentProblemIndex = loadedIndex;
            }
          } else {
            currentProblemIndex = 0;
          }

          currentProblem = problems[currentProblemIndex];
          problemStartTime = Date.now();

          if (sessionStartTime === 0) {
            sessionStartTime = Date.now();
          }
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

  function handleShowNextHintEvent() {
    if (currentProblem && currentProblem.hints && currentHintIndex < currentProblem.hints.length) {
      currentHintIndex++;
    }
  }

  function showAnswerInput() {
    showAnswerArea = true;
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
    }
  }

  async function finishSession() {
    await saveUserProgress(currentUserId, unitId, currentProblemIndex, false);

    await goto('/normal-mode/result', {
      state: {
        results: results,
        unitName: unitDisplayName
      }
    });

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
        if (allCorrect) {
          const saveSuccess = await saveUserProgress(currentUserId, unitId, 0, true);
          if (!saveSuccess) {
            console.error('Failed to save completed status');
          }
        } else {
          await saveUserProgress(currentUserId, unitId, problems.length - 1, false);
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
        if (isAtEnd && results.length === problems.length) {
          const allCorrect = results.every(result => result.isCorrect === true);
          completedStatus = allCorrect;
        } else {
          completedStatus = undefined;
        }

        const progressData = {
          userId: currentUserId,
          unitId: unitId,
          lastProblemIndex: isAtEnd ? 0 : currentProblemIndex,
          isCompleted: completedStatus
        };

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

<main class="bg-stone-100 flex flex-col items-center min-h-screen p-4">
  <header class="
  w-full p-6 rounded-md relative
  bg-stone-100
  [box-shadow:var(--shadow-neumorphic-convex)]
  mb-8
">
    <div class="flex items-center justify-between">
      <h1 class="text-4xl font-bold text-stone-700">演習 : {unitDisplayName}</h1> <button class="focus:outline-none" on:click={toggleMenu} aria-label="メニューを開閉">
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
      <div class="flex items-start justify-end w-full gap-4 mt-6">
          {#if !showAnswerArea && currentHintIndex < currentProblem.hints.length && !showAllHints}
            <TealButton
              text="ヒント"
              onClick={handleShowNextHintEvent} widthClass="w-[12rem]"
              buttonColorClass="bg-yellow-300"
              borderColorClass="border-yellow-500"
              shadowColorClass="[box-shadow:0_5px_0_0_#eab308]"
              hoverShadowColorClass="hover:[box-shadow:0_0px_0_0_#eab308]"
              textColorClass="text-stone-800"
            />
          {/if}

          {#if !showAnswerArea && !showAllHints}
            <TealButton
              text="回答をする"
              onClick={showAnswerInput}
              widthClass="w-[12rem]"
              buttonColorClass="bg-teal-300"
              borderColorClass="border-teal-500"
              shadowColorClass="[box-shadow:0_5px_0_0_#14b8a6]"
              hoverShadowColorClass="hover:[box-shadow:0_0px_0_0_#14b8a6]"
              textColorClass="text-stone-800"
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