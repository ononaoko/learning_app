<!-- AudioManager.svelte -->
<script>
    import { onMount } from 'svelte';
    import { audioStore } from '$lib/stores/audioStore.js';

    let clickSound;
    let menuSound;
    let successSound;
    let errorSound;

    onMount(() => {
      // 音声要素を初期化
      clickSound = new Audio('/sounds/tap.mp3');
      menuSound = new Audio('/sounds/slide.mp3');
      successSound = new Audio('/sounds/success.mp3');
      errorSound = new Audio('/sounds/error.mp3');

      // 音量設定
      clickSound.volume = 0.7;
      menuSound.volume = 0.5;
      successSound.volume = 0.6;
      errorSound.volume = 0.8;

      // プリロード
      clickSound.preload = 'auto';
      menuSound.preload = 'auto';
      successSound.preload = 'auto';
      errorSound.preload = 'auto';

      // ストアに音声要素を登録
      audioStore.registerSounds({
        click: clickSound,
        menu: menuSound,
        success: successSound,
        error: errorSound
      });

      console.log('AudioManager: 効果音が初期化されました');
    });
  </script>

  <!-- このコンポーネントは見た目を持たない -->