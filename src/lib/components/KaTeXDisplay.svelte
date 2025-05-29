<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import katex from 'katex';

  export let textContent = [];
  export let displayMode = false;
  export let textColor = 'text-gray-800';
  export let fontSizeClass = 'text-base'; // Tailwindのフォントサイズクラス

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
          // KaTeX.render のオプションでフォントサイズを調整
          // https://katex.org/docs/options.html
          katex.render(part.value, mathSpan, {
            throwOnError: false,
            displayMode: displayMode,
            // ★追加: フォントサイズ調整に関するオプション ★
            // 数式全体の基準フォントサイズ。'1em'で親要素のフォントサイズを基準に
            // baseFontSize: '1em', // これはKaTeX 0.11.0で非推奨/削除された可能性あり
            // minRuleThickness: 0.04, // 分数線などの最小の太さ (em単位)
            // strict: false, // 警告を無効にする（デバッグ時以外は非推奨）
            // trust: true, // 危険なコマンドも許可
            // output: 'html', // 出力形式 (デフォルトはhtml)
            // baseSize: 1.0, // KaTeXの内部的なベースサイズ。これも試す価値あり
            // displayModeがfalseの場合はinline math mode
            // KaTeXはデフォルトで数式を小さくするが、その挙動を打ち消すのは難しい
            // 主な問題はCSS側にある可能性が高い
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
    setTimeout(() => {
      parseAndRenderContent();
    }, 50);
  });

  $: textContent, displayMode, parseAndRenderContent();
</script>

<span bind:this={container} class="{fontSizeClass} {textColor}"></span>

<style>
  /* app.css と連携して正しく動作するはず */
  /* ここでKaTeXが生成する要素へのカスタムリセットを最小限に抑える */
  /* globalセレクタを使う場合は非常に慎重に */

  /* KaTeXによって生成される数式表示要素の基本スタイル */
  :global(.katex),
  :global(.katex-display) {

  }

  /* ディスプレイモード数式はブロック要素 */
  :global(.katex-display) {

  }

  /* KaTeX内部のspan要素などへの影響を最小限に */
  :global(.katex span) {

  }


</style>