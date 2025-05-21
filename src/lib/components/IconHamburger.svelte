<script>
  import { onMount } from 'svelte';
  export let width = 48;
  export let height = 48;
  export let color = '#374151';
  export let strokeWidth = 2;
  export let isOpen = false;

  let svgElement;
  let animationPlaying = false;

  function playOpenAnimation() {
    if (svgElement) {
      const animate = svgElement.querySelector('#open-animate');
      animate.beginElement();
      animationPlaying = true;
    }
  }

  function playCloseAnimation() {
    if (svgElement) {
      const animate = svgElement.querySelector('#close-animate');
      animate.beginElement();
      animationPlaying = false;
    }
  }

  // isOpenの変更に応じてアニメーションを制御
  $: if (svgElement) {
    if (isOpen && !animationPlaying) {
      playOpenAnimation();
    } else if (!isOpen && animationPlaying) {
      playCloseAnimation();
    }
  }

  onMount(() => {
    // 初期状態でアニメーションを停止
    if (svgElement) {
      const animates = svgElement.querySelectorAll('animate');
      animates.forEach(animate => {
        animate.endElement(); // アニメーションをリセット
      });
    }
    animationPlaying = isOpen;
    return () => {
      // クリーンアップ
      if (svgElement) {
        const animates = svgElement.querySelectorAll('animate');
        animates.forEach(animate => {
          animate.endElement();
        });
      }
    };
  });
</script>

<svg
  bind:this={svgElement}
  xmlns="http://www.w3.org/2000/svg"
  {width}
  {height}
  viewBox="0 0 24 24"
  aria-hidden="true"
>
  <path
    fill="none"
    stroke={color}
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width={strokeWidth}
    d="M5 5L12 5L19 5M5 12H19M5 19L12 19L19 19"
  >
    <!-- ハンバーガー → クローズアニメーション -->
    <animate
      id="open-animate"
      fill="freeze"
      attributeName="d"
      dur="0.3s"
      begin="indefinite"
      values="M5 5L12 5L19 5M5 12H19M5 19L12 19L19 19;M5 5L12 12L19 5M12 12H12M5 19L12 12L19 19"
    />
    <!-- クローズ → ハンバーガーアニメーション -->
    <animate
      id="close-animate"
      fill="freeze"
      attributeName="d"
      dur="0.3s"
      begin="indefinite"
      values="M5 5L12 12L19 5M12 12H12M5 19L12 12L19 19;M5 5L12 5L19 5M5 12H19M5 19L12 19L19 19"
    />
  </path>
</svg>