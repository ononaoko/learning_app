<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import katex from 'katex';
  import 'katex/dist/katex.min.css'; // KaTeXのCSSをここでインポート

  export let textContent = [];
  export let mathExpression = '';
  export let displayMode = false;
  export let textColor = 'text-gray-800';
  export let fontSizeClass = 'text-base';

  let container;

  function renderContent() {
    if (!browser || !container) {
      return;
    }

    container.innerHTML = '';
    let htmlContent = '';

    if (typeof mathExpression === 'string' && mathExpression.length > 0) {
      // mathExpression が文字列として渡された場合（不正解時の解答表示、ヒントの個別数式用）
      try {
        htmlContent += katex.renderToString(mathExpression, {
          throwOnError: false,
          displayMode: displayMode, // こちらは props の displayMode に従う
          output: 'htmlAndMathml',
        });
      } catch (e) {
        console.error('KaTeX: Rendering error for single expression:', e, 'Formula:', mathExpression);
        htmlContent += `<span style="color: red; font-size: inherit;">[数式エラー: ${mathExpression}]</span>`;
      }
    } else if (Array.isArray(textContent) && textContent.length > 0) {
      // textContent が配列として渡された場合（問題文、ヒントの説明文用）
      textContent.forEach(part => {
        if (part.type === 'text') {
          htmlContent += part.value;
        } else if (part.type === 'math') {
          try {
            htmlContent += katex.renderToString(part.value, {
              throwOnError: false,
              displayMode: false, // textContent内の数式はインラインモード
              output: 'htmlAndMathml',
            });
          } catch (e) {
            console.error('KaTeX: Rendering error for array part:', e, 'Formula:', part.value);
            htmlContent += `<span style="color: red; font-size: inherit;">[数式エラー: ${part.value}]</span>`;
          }
        } else if (part.type === 'br') {
          htmlContent += '<br>';
        }
      });
    }

    container.innerHTML = htmlContent;
  }

  onMount(() => {
    renderContent();
  });

  $: textContent, mathExpression, displayMode, renderContent();
</script>

<span bind:this={container} class="{fontSizeClass} {textColor}"></span>

<style>

</style>