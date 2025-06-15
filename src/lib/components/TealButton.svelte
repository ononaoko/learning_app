<script>
    export let text = '次の問題へ'; // ボタンのテキスト、デフォルト値を設定
    export let onClick = () => {}; // クリック時のハンドラ関数、デフォルト値を設定
    export let buttonColorClass = 'bg-teal-400'; // ボタンの背景色クラス
    export let borderColorClass = 'border-teal-500'; // ボタンのボーダー色クラス
    export let shadowColorClass = '[box-shadow:0_5px_0_0_#14b8a6]'; // ボタンのシャドウ色クラス
    export let hoverShadowColorClass = 'hover:[box-shadow:0_0px_0_0_#14b8a6]'; // ホバー時のシャドウ色クラス
    export let textColorClass = 'text-white'; // ★追加: テキスト色クラス
    export let widthClass = ''; // ★追加: 幅指定クラス
  </script>

  <button
    class="{widthClass} {buttonColorClass} {borderColorClass} border-b-[1px] transition-all duration-150 {shadowColorClass} {hoverShadowColorClass} hover:border-b-[0px] hover:translate-y-2 {textColorClass} text-2xl font-bold py-4 px-4 rounded-md focus:outline-none focus:shadow-outline"
    on:click={onClick}
  >
    {text}
  </button>