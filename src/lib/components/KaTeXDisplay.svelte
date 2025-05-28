<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import katex from 'katex';

  export let textContent = []; // ★textContent はオブジェクトの配列を受け取る★
  export let displayMode = false;
  export let textColor = 'text-gray-800';
  export let fontSizeClass = 'text-base';

  let container; // 数式をレンダリングするDOM要素への参照
  let lastProcessedContent = ''; // 最後に処理したtextContent (配列のJSON文字列)

  // 数式とテキストを分離してレンダリングするメインの関数
  function parseAndRenderContent() {
    // ブラウザ環境でない、またはコンテナがない、またはtextContentが配列でない/空の場合は何もしない
    if (!browser || !container || !Array.isArray(textContent) || textContent.length === 0) {
      if (container) container.innerHTML = ''; // コンテナがあれば内容をクリア
      lastProcessedContent = JSON.stringify(textContent); // 空の状態も記憶しておく
      return;
    }

    // 無限ループ対策: 最後に処理したコンテンツと現在のコンテンツが同じならスキップ
    const currentContentJson = JSON.stringify(textContent);
    if (hasRenderedOnce && currentContentJson === lastProcessedContent) {
      return;
    }

    container.innerHTML = ''; // 古い内容をクリア

    // textContent (オブジェクトの配列) を直接ループして各パートをレンダリング
    textContent.forEach(part => {
      // part がオブジェクトで、type と value プロパティを持つことを確認
      if (typeof part === 'object' && part !== null && 'type' in part && 'value' in part) {
        if (part.type === 'text') {
          container.appendChild(document.createTextNode(part.value));
        } else if (part.type === 'math') {
          const mathSpan = document.createElement('span');
          container.appendChild(mathSpan);

          try {
            // KaTeX.render には $ や $$ を含まない純粋な TeX を渡す
            katex.render(part.value, mathSpan, { // part.valueを直接渡す
              throwOnError: false,
              displayMode: displayMode,
            });
          } catch (e) {
            console.error('KaTeX: Rendering error:', e, 'Formula:', part.value);
            mathSpan.innerHTML = `<span style="color: red; font-size: inherit;">[数式エラー: ${part.value}]</span>`;
          }
        }
      } else {
        console.warn('KaTeXDisplay: Invalid part in array:', part);
        // 無効なパートは無視するか、エラー文字列を追加する
      }
    });

    hasRenderedOnce = true; // 初回レンダリングが完了
    lastProcessedContent = currentContentJson; // 正常にレンダリングされた内容を記憶
  }

  // 初回レンダリングと、コンテンツ変更時のレンダリングをトリガー
  let hasRenderedOnce = false; // レンダリングが一度行われたかのフラグ

  onMount(() => {
    // コンポーネントが DOM にマウントされたら初回レンダリング
    setTimeout(() => {
      parseAndRenderContent();
    }, 50); // 50ms 遅延
  });

  // textContent または displayMode が変更されたら再レンダリングをトリガー
  $: textContent, displayMode, parseAndRenderContent();
</script>

<span bind:this={container} class="{fontSizeClass} {textColor}"></span>

<style>
  /* スタイルは変更なし */
  :global(.katex),
  :global(.katex-display) {
  }
  :global(.katex-display) {
  }
  :global(.katex span) {
  }
</style>