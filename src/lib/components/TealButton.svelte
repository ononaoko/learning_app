<script>
  export let text = '';
  export let onClick = () => {};
  export let buttonColorClass = 'bg-teal-400';
  export let borderColorClass = 'border-teal-500';
  export let shadowColorClass = '[box-shadow:0_5px_0_0_#14b8a6,0_10px_0_0_#d1d5db]';
  export let hoverShadowColorClass = 'hover:[box-shadow:0_0px_0_0_#14b8a6,0_0px_0_0_#d1d5db]';
  export let textColorClass = 'text-white';
  export let widthClass = '';
  export let minWidthClass = '';
  export let type = 'button';
  export let disabled = false;

  // 画像関連のprops
  export let imageSrc = '';
  export let imageAlt = '';
  export let imagePosition = 'left'; // 'left', 'right', 'top', 'bottom', 'center'
  export let imageSize = 'w-6 h-6'; // 画像のサイズクラス
  export let imageOnly = false; // 画像のみ表示するかどうか
</script>

<button
  type={type}
  class="{widthClass} {minWidthClass} {buttonColorClass} {borderColorClass} border-b-[1px]
         transition-all duration-150 h-[4rem] active:border-b-[0px] active:translate-y-2
         {shadowColorClass} {hoverShadowColorClass}
         hover:border-b-[0px] hover:translate-y-2
         {textColorClass} text-2xl font-bold font-sans py-4 px-4 rounded-md focus:outline-none focus:shadow-outline cursor-pointer
         {imageOnly ? 'flex items-center justify-center' : ''}"
  on:click={onClick}
  {disabled}
>
  {#if imageOnly && imageSrc}
    <!-- 画像のみの場合 -->
    <img src={imageSrc} alt={imageAlt} class={imageSize} />
  {:else if imageSrc}
    <!-- 画像とテキストの組み合わせ -->
    {#if imagePosition === 'left'}
      <div class="flex items-center justify-center gap-2">
        <img src={imageSrc} alt={imageAlt} class={imageSize} />
        <span>{text}</span>
      </div>
    {:else if imagePosition === 'right'}
      <div class="flex items-center justify-center gap-2">
        <span>{text}</span>
        <img src={imageSrc} alt={imageAlt} class={imageSize} />
      </div>
    {:else if imagePosition === 'top'}
      <div class="flex flex-col items-center justify-center gap-1">
        <img src={imageSrc} alt={imageAlt} class={imageSize} />
        <span class="text-sm">{text}</span>
      </div>
    {:else if imagePosition === 'bottom'}
      <div class="flex flex-col items-center justify-center gap-1">
        <span class="text-sm">{text}</span>
        <img src={imageSrc} alt={imageAlt} class={imageSize} />
      </div>
    {:else if imagePosition === 'center'}
      <div class="flex items-center justify-center gap-2">
        <img src={imageSrc} alt={imageAlt} class={imageSize} />
        <span>{text}</span>
      </div>
    {/if}
  {:else}
    <!-- テキストのみ（従来通り） -->
    {text}
  {/if}
</button>

<style>
  /*
    画像対応ボタンの説明:
    - imageSrc: 画像のパス
    - imageAlt: 画像のalt属性
    - imagePosition: 画像の位置（left, right, top, bottom, center）
    - imageSize: 画像のサイズ（Tailwindクラス）
    - imageOnly: 画像のみ表示するかどうか

    使用例:
    1. 左側にアイコン: imagePosition="left" imageSrc="/icons/login.svg"
    2. 右側にアイコン: imagePosition="right" imageSrc="/icons/arrow.svg"
    3. 上下配置: imagePosition="top" imageSrc="/icons/user.svg"
    4. 画像のみ: imageOnly={true} imageSrc="/icons/close.svg"
  */
</style>