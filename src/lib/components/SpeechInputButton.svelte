<script>
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    export let buttonClass = ""; // 親からカスタムクラスを受け取る
    export let disabled = false; // 親から無効化状態を受け取る

    let speechRecognition;
    let isListening = false;
    let recognitionError = '';
    let lastTranscript = ''; // 最後に認識されたテキストを保持

    function startSpeechRecognition() {
      if (!('webkitSpeechRecognition' in window)) {
        recognitionError = 'お使いのブラウザは音声入力に対応していません。Google Chromeを推奨します。';
        return;
      }

      // 既に実行中の認識プロセスがあれば停止（安全のため）
      if (speechRecognition && isListening) {
        speechRecognition.stop();
      }

      speechRecognition = new webkitSpeechRecognition();
      speechRecognition.continuous = false;
      speechRecognition.interimResults = false;
      speechRecognition.lang = 'ja-JP'; // 日本語を設定

      speechRecognition.onstart = () => {
        isListening = true;
        recognitionError = '';
        lastTranscript = ''; // 新しい音声入力開始時にクリア
        console.log('音声入力開始...');
      };

      speechRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        lastTranscript = transcript;
        dispatch('recognized', { transcript }); // 親コンポーネントに認識結果を渡す
        console.log('認識結果:', transcript);
      };

      speechRecognition.onerror = (event) => {
        isListening = false;
        recognitionError = `音声認識エラー: ${event.error}`;
        console.error('音声認識エラー:', event.error);
        dispatch('error', { error: event.error }); // 親コンポーネントにエラーを渡す
      };

      speechRecognition.onend = () => {
        isListening = false;
        console.log('音声入力終了。');
      };

      speechRecognition.start();
    }

    function stopSpeechRecognition() {
      if (speechRecognition && isListening) {
        speechRecognition.stop();
      }
    }

    // コンポーネントが破棄されるときに認識プロセスを停止
    import { onDestroy } from 'svelte';
    onDestroy(() => {
      stopSpeechRecognition();
    });
  </script>

  <button
    class="{buttonClass} transition-all duration-150 [box-shadow:0_5px_0_0_#16a34a] hover:[box-shadow:0_0px_0_0_#16a34a] hover:border-b-[0px] hover:translate-y-2 text-white text-2xl font-bold py-4 px-4 rounded-md focus:outline-none focus:shadow-outline w-full"
    on:click={isListening ? stopSpeechRecognition : startSpeechRecognition}
    {disabled}
  >
    {#if isListening}
      <span class="animate-pulse">音声入力中...</span>
    {:else}
      <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 inline-block mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8H13a3 3 0 01-3 3v1a2 2 0 104 0v-1a1 1 0 112 0v1a4 4 0 11-8 0v-1a1 1 0 012 0v1a2 2 0 104 0v-1a3 3 0 00-3-3H7a7.001 7.001 0 006 6.93V17a1 1 0 11-2 0v-2.07A7.001 7.001 0 003 8h4a3 3 0 013 3v1a2 2 0 104 0v-1a1 1 0 112 0v1a4 4 0 11-8 0v-1a1 1 0 012 0v1a2 2 0 104 0v-1a3 3 0 00-3-3H7a7.001 7.001 0 006 6.93V17a1 1 0 11-2 0v-2.07z" clip-rule="evenodd" />
      </svg>
      音声で回答する
    {/if}
  </button>

  {#if recognitionError}
    <p class="text-red-500 text-sm text-center mt-2">{recognitionError}</p>
  {/if}