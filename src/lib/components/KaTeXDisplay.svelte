<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import katex from 'katex';

  export let textContent = []; // ★textContent はオブジェクトの配列を受け取る★
  export let displayMode = false;
  export let textColor = 'text-gray-800';
  export let fontSizeClass = 'text-base';

  let container;
  let hasRenderedOnce = false;

  function parseAndRenderContent() {
    // textContent が配列であることを確認
    if (!browser || !container || !Array.isArray(textContent) || textContent.length === 0) {
      if (container) container.innerHTML = ''; // コンテナがあれば内容をクリア
      return;
    }

    // 無限ループ対策 (コンテナのDOM内容を直接比較)
    const currentContainerHTML = container.innerHTML; // DOMのHTML内容を記憶
    // 新しいコンテンツのHTMLを予測し、比較する（より複雑な比較になる）
    // シンプルにするため、ここでは文字列化したJSONで比較を試みる
    const newContentString = JSON.stringify(textContent);

    if (hasRenderedOnce && container.dataset.lastRenderedContent === newContentString) {
        // console.log('KaTeXDisplay: Content unchanged, skipping re-render.');
        return;
    }

    container.innerHTML = ''; // 古い内容をクリア

    // textContent (オブジェクトの配列) を直接ループして各パートをレンダリング
    textContent.forEach(part => {
      if (part.type === 'text') {
        container.appendChild(document.createTextNode(part.value));
      } else if (part.type === 'math') {
        const mathSpan = document.createElement('span');
        container.appendChild(mathSpan);

        try {
          katex.render(part.value, mathSpan, {
            throwOnError: false, // エラーがあってもレンダリングを続行
            displayMode: displayMode, // $$...$$ 形式か $...$ 形式か
          });
        } catch (e) {
          console.error('KaTeX: Rendering error:', e, 'Formula:', part.value);
          mathSpan.innerHTML = `<span style="color: red; font-size: inherit;">[数式エラー: ${part.value}]</span>`; // エラー表示
        }
      }
    });

    hasRenderedOnce = true; // 初回レンダリングが完了
    container.dataset.lastRenderedContent = newContentString; // 最後にレンダリングした内容をデータ属性に保存
  }

  onMount(() => {
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