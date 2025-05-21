<script>
    export let numerator; // 分子
    export let denominator; // 分母
    export let slashWidth = 'w-10'; // スラッシュの幅（例: w-10, w-12, w-16）
  </script>

  <div class="relative inline-flex items-center justify-center text-6xl font-bold text-teal-500 h-24">
    <span class="absolute whitespace-nowrap" style="left: 0; top: 0; transform: translate(-5%, -5%);">
      {numerator}
    </span>

    <span class="block h-[2px] bg-teal-500 transform rotate-125 w-24"></span>

    <span class="absolute whitespace-nowrap" style="right: 0; bottom: 0; transform: translate(5%, 5%);">
      {denominator}
    </span>
  </div>

  <style>
    /* transform-origin のデフォルトは center なので、特別な設定は不要 */
  </style>