<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import katex from 'katex';

  export let textContent = [];
  export let displayMode = false;
  export let textColor = 'text-gray-800';
  export let fontSizeClass = 'text-base';

  let container;
  let lastProcessedContent = '';
  let hasRenderedOnce = false;

  function parseAndRenderContent() {
    if (!browser || !container || !Array.isArray(textContent) || textContent.length === 0) {
      if (container) container.innerHTML = '';
      lastProcessedContent = JSON.stringify(textContent);
      hasRenderedOnce = false;
      return;
    }

    const currentContentJson = JSON.stringify(textContent);
    if (hasRenderedOnce && currentContentJson === lastProcessedContent) {
      return;
    }

    container.innerHTML = '';

    textContent.forEach(part => {
      if (part.type === 'text') {
        container.appendChild(document.createTextNode(part.value));
      } else if (part.type === 'math') {
        const mathSpan = document.createElement('span');
        container.appendChild(mathSpan);

        try {
          katex.render(part.value, mathSpan, {
            throwOnError: false,
            displayMode: displayMode,
            output: 'htmlAndMathml',
          });
        } catch (e) {
          console.error('KaTeX: Rendering error:', e, 'Formula:', part.value);
          mathSpan.innerHTML = `<span style="color: red; font-size: inherit;">[数式エラー: ${part.value}]</span>`;
        }
      }
    });

    hasRenderedOnce = true;
    lastProcessedContent = currentContentJson;
  }

  onMount(() => {
    // setTimeout を削除
    parseAndRenderContent();
  });

  $: textContent, displayMode, parseAndRenderContent();
</script>

<span bind:this={container} class="{fontSizeClass} {textColor}"></span>

<style>
  /* 既存のKaTeXスタイル */

</style>