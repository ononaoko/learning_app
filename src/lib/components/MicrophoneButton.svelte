<script>
    import { createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';

    const dispatch = createEventDispatcher();

    export let buttonClass = "";
    export let disabled = false;

    let speechRecognition;
    let isListening = false;
    let recognitionError = '';
    let lastTranscript = '';

    function startSpeechRecognition() {
      if (!('webkitSpeechRecognition' in window)) {
        recognitionError = 'お使いのブラウザは音声入力に対応していません。Google Chromeを推奨します。';
        return;
      }

      if (speechRecognition && isListening) {
        speechRecognition.stop();
      }

      speechRecognition = new webkitSpeechRecognition();
      speechRecognition.continuous = false;
      speechRecognition.interimResults = false;
      speechRecognition.lang = 'ja-JP';

      speechRecognition.onstart = () => {
        isListening = true;
        recognitionError = '';
        lastTranscript = '';
        console.log('音声入力開始...');
      };

      speechRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        lastTranscript = transcript;
        dispatch('recognized', { transcript });
        console.log('認識結果:', transcript);
      };

      speechRecognition.onerror = (event) => {
        isListening = false;
        recognitionError = `音声認識エラー: ${event.error}`;
        console.error('音声認識エラー:', event.error);
        dispatch('error', { error: event.error });
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

    import { onDestroy } from 'svelte';
    onDestroy(() => {
      stopSpeechRecognition();
    });
  </script>

<button
class="{buttonClass} transition-all duration-150 rounded-full focus:outline-none flex items-center justify-center"
class:bg-teal-400={!isListening}
class:hover_bg-teal-600={!isListening}
class:bg-red-500={isListening}
class:hover_bg-red-600={isListening}
class:shadow-md={true}
class:shadow-teal-600={!isListening}
class:shadow-red-600={isListening}
on:click={isListening ? stopSpeechRecognition : startSpeechRecognition}
{disabled}
aria-label={isListening ? '音声入力停止' : '音声入力開始'}
style="width: 64px; height: 64px;"
>
{#if isListening}
  <div class="w-full h-full flex items-center justify-center" in:fade={{ duration: 100 }} out:fade={{ duration: 100 }}>
    <span class="relative flex h-3 w-3">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
      <span class="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
    </span>
  </div>
{:else}
  <svg in:fade={{ duration: 100 }} out:fade={{ duration: 100 }}
    xmlns="http://www.w3.org/2000/svg"
    width="48"
    height="48"
    viewBox="0 0 24 24"
  >
    <path fill="white" d="M12 16c2.206 0 4-1.795 4-4V6c0-2.206-1.794-4-4-4S8 3.794 8 6v6c0 2.205 1.794 4 4 4m7-4v-2a1 1 0 1 0-2 0v2c0 2.757-2.243 5-5 5s-5-2.243-5-5v-2a1 1 0 1 0-2 0v2c0 3.52 2.613 6.432 6 6.92V20H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-1.08c3.387-.488 6-3.4 6-6.92"/>
  </svg>
{/if}
</button>

{#if recognitionError}
<p class="text-red-500 text-sm text-center mt-2" transition:fade>{recognitionError}</p>
{/if}