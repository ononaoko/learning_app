<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment'; // ★追加: browser定数をインポート★

  import ProgressBar from '$lib/components/ProgressBar.svelte';
  import ProblemDisplay from '$lib/components/ProblemDisplay.svelte';
  import HintSection from '$lib/components/HintSection.svelte';
  import AnswerInputAndEvaluation from '$lib/components/AnswerInputAndEvaluationNormalMode.svelte'; // AnswerInputAndEvaluationNormalMode.svelte を使用
  import TealButton from '$lib/components/TealButton.svelte';
  import AppNavigation from '$lib/components/AppNavigation.svelte';
  import IconHamburger from '$lib/components/IconHamburger.svelte';


  export let data;
  let currentUserId = data.userId;

  let isOpen = false; // ナビゲーションメニューの状態

  function toggleMenu() {
    isOpen = !isOpen;
  }

  function goToTop() {
    goto('/');
    isOpen = false; // メニューを閉じる
  }

  let unitId = $page.params.unit; // URLパラメータから単元IDを取得
  let problems = []; // 現在の単元の問題リスト
  let currentProblemIndex = 0; // 現在表示中の問題のインデックス
  let currentProblem; // 現在の問題オブジェクト
  let userAnswer = ''; // ユーザーの解答
  let isCorrect = null; // 解答の正誤 (true/false/null)
  let showHint = false; // ヒント表示状態 (現在未使用、HintSection内で管理)
  let showAnswerArea = false; // 回答入力エリアの表示状態 (旧 showAnswer)
  let currentHintIndex = 0; // 現在表示中のヒントのインデックス
  let errorMessage = ''; // エラーメッセージ
  let showAllHints = false; // 全てのヒントを表示するかどうか (誤答時に使用)

  let sessionStartTime; // セッション開始時刻
  let problemStartTime; // 各問題の開始時刻
  let totalSessionTime = 0; // 全セッションの合計学習時間 (秒)
  let results = []; // 各問題の解答結果を格納 (isCorrect, tag)
  let unitDisplayName = data.unitDisplayName; // 単元表示名

  let intervalId; // setInterval のID

  // ★修正★ ユーザーの進捗を保存する関数
  async function saveUserProgress(userId, unitId, lastProblemIndex, isCompleted = undefined, ebbinghausReviewCount = undefined) {
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
          ebbinghausReviewCount // オプション
        })
      });
      // console.log('Save user progress response:', response); // デバッグ用
      if (!response.ok) {
        console.error(`Failed to save user progress for ${unitId}:`, response.statusText);
      }
    } catch (error) {
      console.error('Error saving user progress:', error);
    }
  }

  // ★追加★ ユーザーの進捗をロードする関数
  async function loadUserProgress(userId, unitId) {
    try {
      const response = await fetch(`/api/user-progress?userId=${userId}&unitId=${unitId}`);
      if (response.ok) {
        const progress = await response.json();
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

  // 問題データをロード
  async function loadProblemsForUnit(unit) { // 関数名を変更して区別しやすく
    try {
      console.log('Fetching unit:', unit);
      const response = await fetch(`/api/problems/${unit}`); // APIから問題をフェッチ
      if (response.ok) {
        const data = await response.json();
        problems = data; // problems変数にAPIから取得したデータを直接代入
        console.log('Loaded problems for display:', problems);

        if (problems && problems.length > 0) { // problemsが配列であり、要素があることを確認
          // ユーザーの進捗をロード
          const progressData = await loadUserProgress(currentUserId, unitId);

          if (progressData) {
            let loadedIndex = progressData.lastProblemIndex;
            // progressData.isCompleted が true の場合、0から開始する
            if (progressData.isCompleted) {
              loadedIndex = 0;
              console.log(`Unit ${unitId} was completed. Starting from 0.`);
            }

            // ロードした問題数より進捗インデックスが大きい、または負の値の場合は、0にリセット
            if (loadedIndex < 0 || loadedIndex >= problems.length) {
              console.warn(`Loaded progress index ${loadedIndex} is out of bounds for ${problems.length} problems. Resetting to 0.`);
              currentProblemIndex = 0;
              // 不整合がある場合は、Redisの進捗もリセット（isCompleted=false, lastProblemIndex=0）
              await saveUserProgress(currentUserId, unitId, 0, false);
            } else {
              currentProblemIndex = loadedIndex;
            }
            console.log(`Starting from problem index: ${currentProblemIndex}`);
          } else {
            // 進捗データがない場合、最初から開始
            currentProblemIndex = 0;
            console.log('No user progress found. Starting from problem 0.');
          }

          // 現在の問題を設定
          currentProblem = problems[currentProblemIndex];
          problemStartTime = Date.now(); // 各問題の開始時刻を記録

          // セッション開始時刻を記録（最初の問題がロードされた時）
          if (sessionStartTime === 0) { // 既に設定されていなければ設定
            sessionStartTime = Date.now();
            console.log('Normal mode session started at:', new Date(sessionStartTime).toLocaleString());
            // 最初の問題が0でない場合、既に進捗があるため
            if (currentProblemIndex > 0) {
                console.log(`Resuming session from problem ${currentProblemIndex + 1}`);
            }
          }
        } else {
          errorMessage = 'この単元には問題がありません。';
          console.warn(errorMessage);
        }
      } else {
        errorMessage = `問題の読み込みに失敗しました: ${response.statusText}`;
        console.error(errorMessage);
      }
    } catch (error) {
      errorMessage = '問題の読み込み中にエラーが発生しました。';
      console.error('Error loading problems:', error);
    }
  }

  // 自動保存
  function startAutoSave() {
    // 既にインターバルが設定されていればクリア
    if (intervalId) {
      clearInterval(intervalId);
    }
    intervalId = setInterval(async () => {
      if (currentUserId && unitId && currentProblemIndex !== undefined) {
        // 各問題の解答時にはisCompletedは更新しない。単元完了時のみtrueにする。
        await saveUserProgress(currentUserId, unitId, currentProblemIndex); // isCompleted を省略
        console.log(`Auto-saved progress for ${unitId}: problem ${currentProblemIndex}`);
      }
    }, 60000); // 60秒ごとに自動保存
  }

  // ★再追加・修正★ 次のヒントを表示する関数
  function handleShowNextHintEvent() {
    if (currentProblem && currentProblem.hints && currentHintIndex < currentProblem.hints.length) {
      currentHintIndex++;
    }
  }

  // 回答エリアを表示
  function showAnswerInput() {
    showAnswerArea = true;
  }

  // 解答を記録（AnswerInputAndEvaluationから）
  async function handleRecordAnswer(event) {
    const { isCorrect: problemIsCorrect, userAnswer: submittedAnswer, timeTaken } = event.detail; // AnswerInputAndEvaluation からの値
    console.log('正解:', problemIsCorrect);

    if (currentProblem) { // currentProblemが存在することを確認
      results = [...results, { isCorrect: problemIsCorrect, tag: currentProblem.tag }];

      const recordData = {
        userId: currentUserId,
        unitId: unitId, // 単元IDを追加
        problemId: currentProblem.id,
        isCorrect: problemIsCorrect,
        hintsUsedCount: currentHintIndex,
        duration: timeTaken, // AnswerInputAndEvaluationから渡された時間
        problemIndex: currentProblemIndex // 現在の問題インデックスを保存
      };

      console.log('Saving problem record with problemId:', recordData.problemId, 'Duration:', timeTaken, 'seconds');

      try {
        const response = await fetch('/api/learning-record', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(recordData)
        });
        // console.log('Save learning record response:', response); // デバッグ用
        if (response.ok) {
          console.log('個別問題の学習記録を保存しました。');
        } else {
          console.error('個別問題の学習記録の保存に失敗しました:', response.statusText);
        }
      } catch (error) {
        console.error('個別問題の学習記録の送信中にエラーが発生しました:', error);
      }
    }

    if (!problemIsCorrect) { // isCorrectはevent.detail.isCorrectを使う
      showAllHints = true;
    }
  }

  /**
   * 「ここまで」ボタンが押された時の処理
   * 現在のセッションを終了し、そこまでの進捗を保存してリザルト画面へ遷移します。
   */
  async function finishSession() {
    // 現在の問題インデックスを保存 (次に開始する問題のインデックスとして currentProblemIndex を保存)
    // isCompleted は false のまま
    await saveUserProgress(currentUserId, unitId, currentProblemIndex, false); // currentProblemIndex + 1 ではなく currentProblemIndex に修正

    console.log('セッションが途中で終了しました。リザルト画面へ遷移します。');
    await goto('/normal-mode/result', {
      state: {
        results: results,
        unitName: unitDisplayName
      }
    });

    // セッション全体の学習記録も保存
    const sessionEndTime = Date.now();
    const totalSessionDurationSeconds = Math.round((sessionEndTime - sessionStartTime) / 1000);

    console.log('Normal mode session completed (interrupted). Total duration:', totalSessionDurationSeconds, 'seconds');

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

        if (sessionRecordResponse.ok) {
            console.log('ノーマルモードセッション全体の学習記録を保存しました。(中断時)');
        } else {
            console.error('ノーマルモードセッション全体の学習記録の保存に失敗しました。(中断時):', sessionRecordResponse.statusText);
        }
    } catch (error) {
        console.error('ノーマルモードセッション全体の学習記録の送信中にエラーが発生しました。(中断時):', error);
    }
  }

  // 次の問題へ進む
  async function nextProblem() {
    currentProblemIndex++;
    showAnswerArea = false;
    currentHintIndex = 0;
    showAllHints = false;

    if (currentProblemIndex < problems.length) { // まだ問題が残っている場合
      currentProblem = problems[currentProblemIndex]; // 次の問題を設定
      problemStartTime = Date.now(); // 次の問題の開始時間を記録
      // 次の問題に進んだら、その進捗を保存（自動保存の役割も兼ねる）
      await saveUserProgress(currentUserId, unitId, currentProblemIndex); // isCompleted を省略
    } else {
      // 全てのノーマルモード問題が終了した時の処理
      const sessionEndTime = Date.now();
      const totalSessionDurationSeconds = Math.round((sessionEndTime - sessionStartTime) / 1000);

      console.log('Normal mode session completed. Total duration:', totalSessionDurationSeconds, 'seconds');

      // セッション全体の学習記録を保存
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

        if (sessionRecordResponse.ok) {
          console.log('ノーマルモードセッション全体の学習記録を保存しました。');
        } else {
          console.error('ノーマルモードセッション全体の学習記録の保存に失敗しました:', sessionRecordResponse.statusText);
        }
      } catch (error) {
        console.error('ノーマルモードセッション全体の学習記録の送信中にエラーが発生しました:', error);
      }

      // 全問完了したら、その単元の進捗記録を「完了済み」として保存 (lastProblemIndexは0に戻す)
      await saveUserProgress(currentUserId, unitId, 0, true);
      // リザルト画面へ遷移 (state を渡す)
      await goto('/normal-mode/result', { state: { results: results, unitName: unitDisplayName} });
      return;
    }
  }

  // コンポーネントマウント時
  onMount(async () => {
    await loadProblemsForUnit(unitId); // 関数名を変更したため修正
    if (problems.length > 0) {
      startAutoSave(); // 自動保存を開始
    }
  });

  // コンポーネント破棄時
  onDestroy(() => {
    if (intervalId) {
      clearInterval(intervalId); // 自動保存を停止
    }
    // ページを離れる際にも、現在の進捗を保存
    if (browser) { // ★browser環境でのみfetchを伴う処理を実行★
      if (currentUserId && unitId && currentProblemIndex !== undefined && currentProblemIndex < problems.length) {
        saveUserProgress(currentUserId, unitId, currentProblemIndex, false);
        console.log('Saving progress on component destroy.');
      } else if (currentUserId && unitId && currentProblemIndex !== undefined && currentProblemIndex >= problems.length) {
          // 単元をクリアしているが、onDestroyが発火した場合
          saveUserProgress(currentUserId, unitId, 0, true);
          console.log('Saving completed unit progress on component destroy.');
      }
    }
  });

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