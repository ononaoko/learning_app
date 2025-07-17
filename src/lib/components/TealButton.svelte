<script>
  export let text = '次の問題へ';
  export let onClick = () => {};
  export let buttonColorClass = 'bg-teal-400';
  export let borderColorClass = 'border-teal-500';
  export let shadowColorClass = '[box-shadow:0_5px_0_0_#14b8a6,0_10px_0_0_#d1d5db]'; // 従来のbox-shadowは残す
  export let hoverShadowColorClass = 'hover:[box-shadow:0_0px_0_0_#14b8a6,0_0px_0_0_#d1d5db]'; // 従来のbox-shadowホバー効果も残す
  export let textColorClass = 'text-white';
  export let widthClass = '';
  export let minWidthClass = '';
  export let type = 'button';
  export let disabled = false;
</script>

<button
  type={type}
  class="{widthClass} {minWidthClass} {buttonColorClass} {borderColorClass} border-b-[1px]
         transition-all duration-150 h-[4rem] active:border-b-[0px] active:translate-y-2
         {shadowColorClass} {hoverShadowColorClass}
         hover:border-b-[0px] hover:translate-y-2
         {textColorClass} text-2xl font-bold font-sans py-4 px-4 rounded-md focus:outline-none focus:shadow-outline cursor-pointer"
  on:click={onClick}
>
  {text}
</button>

<style>
  /*
    解説:
    `drop-shadow-md` クラスを追加しました。
    これにより、`box-shadow` とは別に、要素全体にドロップシャドウが適用されます。
    `drop-shadow-md` は、中程度のドロップシャドウを適用するTailwind CSSのユーティリティクラスです。
    （`drop-shadow-sm`, `drop-shadow-lg`, `drop-shadow-xl`, `drop-shadow-2xl` など、様々なサイズがあります。）

    既存の `box-shadow` はボタンの「沈み込み」効果（下側の影）のために維持し、
    `drop-shadow` はボタン全体に浮遊感や奥行きを与えるために使用します。
    これらは共存可能です。
  */
</style>