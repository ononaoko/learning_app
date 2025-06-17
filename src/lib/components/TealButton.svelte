<script>
  export let text = '次の問題へ';
  export let onClick = () => {};
  export let buttonColorClass = 'bg-teal-400';
  export let borderColorClass = 'border-teal-500';
  export let shadowColorClass = '[box-shadow:0_5px_0_0_#14b8a6]';
  export let hoverShadowColorClass = 'hover:[box-shadow:0_0px_0_0_#14b8a6]';
  export let textColorClass = 'text-white';
  export let widthClass = '';
  export let minWidthClass = '';
  export let type = 'button'; // ★追加: デフォルトを 'button' に設定★
</script>

<button
  type={type} class="{widthClass} {minWidthClass} {buttonColorClass} {borderColorClass} border-b-[1px] transition-all duration-150 {shadowColorClass} {hoverShadowColorClass} hover:border-b-[0px] hover:translate-y-2 {textColorClass} text-2xl font-bold py-4 px-4 rounded-md focus:outline-none focus:shadow-outline"
  on:click={onClick}
>
  {text}
</button>