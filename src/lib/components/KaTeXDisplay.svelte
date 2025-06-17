<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import katex from 'katex';
  // KaTeXのCSSも必要に応じてインポートしてください
  // 例: import 'katex/dist/katex.min.css';

  // テキストと数式が混在するオブジェクト配列を受け取る（問題文、ヒント用）
  export let textContent = [];
  // 単一の数式文字列を受け取る（不正解時の解答用）
  export let mathExpression = '';
  export let displayMode = false;
  export let textColor = 'text-gray-800'; // 元のデフォルト値
  export let fontSizeClass = 'text-base'; // 元のデフォルト値

  let container;

  // コンテンツをレンダリングする汎用関数
  function renderContent() {
    if (!browser || !container) {
      return;
    }

    // コンテナをクリアして、新しいコンテンツを準備
    container.innerHTML = '';

    if (Array.isArray(textContent) && textContent.length > 0) {
      // textContent が配列として渡された場合（問題文やヒントの用途）
      textContent.forEach(part => {
        if (part.type === 'text') {
          // テキストノードとして追加
          container.appendChild(document.createTextNode(part.value));
        } else if (part.type === 'math') {
          // 数式用の span を作成し、KaTeXでレンダリング
          const mathSpan = document.createElement('span');
          container.appendChild(mathSpan);

          try {
            katex.render(part.value, mathSpan, {
              throwOnError: false, // 数式エラーでも処理を中断しない
              displayMode: displayMode,
              output: 'htmlAndMathml',
            });
          } catch (e) {
            console.error('KaTeX: Rendering error for array part:', e, 'Formula:', part.value);
            mathSpan.innerHTML = `<span style="color: red; font-size: inherit;">[数式エラー: ${part.value}]</span>`;
          }
        }
      });
    } else if (typeof mathExpression === 'string' && mathExpression.length > 0) {
      // mathExpression が文字列として渡された場合（不正解時の解答表示の用途）
      try {
        katex.render(mathExpression, container, {
          throwOnError: false,
          displayMode: displayMode,
          output: 'htmlAndMathml',
        });
      } catch (e) {
        console.error('KaTeX: Rendering error for single expression:', e, 'Formula:', mathExpression);
        container.innerHTML = `<span style="color: red; font-size: inherit;">[数式エラー: ${mathExpression}]</span>`;
      }
    }
    // どちらも渡されていない場合は、コンテナは空のままになります
  }

  // コンポーネントがDOMにマウントされたときに初回レンダリング
  onMount(() => {
    renderContent();
  });

  // textContent、mathExpression、displayMode のいずれかが変更されたときに再レンダリング
  $: textContent, mathExpression, displayMode, renderContent();
</script>

<span bind:this={container} class="{fontSizeClass} {textColor}"></span>

<style>
  /* 既存のKaTeXスタイルをここに記述するか、外部CSSをインポートしてください */
  /* KaTeXのデフォルトスタイルがなければここでインポートすることを強く推奨します */
  /* @import 'katex/dist/katex.min.css'; */
</style>