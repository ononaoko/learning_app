<script>
    export let text = 'CLEAR'; // 表示するテキスト
    export let iconSize = '14'; // アイコンのサイズ
    export let bgColor = 'bg-teal-400'; // 背景色
    export let textColor = 'text-white'; // テキスト色
  </script>

  <div class="flex items-center space-x-1 px-2 py-1 rounded-full {bgColor} {textColor} text-xs font-bold font-sans">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-check-circle"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <path d="m9 11 3 3L22 4"/>
    </svg>
    <span>{text}</span>
  </div>