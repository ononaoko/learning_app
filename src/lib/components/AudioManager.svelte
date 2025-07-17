<!-- AudioManager.svelte -->
<script>
  import { onMount } from 'svelte';
  import { audioStore } from '$lib/stores/audioStore.js';

  let clickSound;
  let menuSound;
  let successSound;
  let errorSound;
  let correctSound;
  let incorrectSound;
  let resultSound;

  onMount(() => {
    // 音声要素を初期化
    clickSound = new Audio('/sounds/tap.mp3');
    menuSound = new Audio('/sounds/slide.mp3');
    successSound = new Audio('/sounds/success.mp3');
    errorSound = new Audio('/sounds/error.mp3');
    correctSound = new Audio('/sounds/correct.mp3');
    incorrectSound = new Audio('/sounds/incorrect.mp3');
    resultSound = new Audio('/sounds/result.mp3');

    // 音量設定
    clickSound.volume = 0.7;
    menuSound.volume = 0.5;
    successSound.volume = 0.6;
    errorSound.volume = 0.8;
    correctSound.volume = 0.7;
    incorrectSound.volume = 0.7;

    // プリロード
    clickSound.preload = 'auto';
    menuSound.preload = 'auto';
    successSound.preload = 'auto';
    errorSound.preload = 'auto';
    correctSound.preload = 'auto';
    incorrectSound.preload = 'auto';
    resultSound.preload = 'auto';

    // ストアに音声要素を登録
    audioStore.registerSounds({
      click: clickSound,
      menu: menuSound,
      success: successSound,
      error: errorSound,
      correct: correctSound,
      incorrect: incorrectSound,
      result: resultSound
    });

    console.log('AudioManager: 効果音が初期化されました');
  });
</script>

<!-- このコンポーネントは見た目を持たない -->