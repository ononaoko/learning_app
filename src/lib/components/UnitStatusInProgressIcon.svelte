<script>
    export let text = '途中'; // 表示するテキスト
    export let iconSize = '18'; // アイコンのサイズ
    export let bgColor = 'bg-blue-100'; // 背景色
    export let textColor = 'text-blue-700'; // テキスト色
  </script>

  <div class="flex items-center space-x-1 px-2 py-1 rounded-full {bgColor} {textColor} text-sm font-semibold">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-rotate-cw"
    >
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1.04 6.74 2.86L22 8"/>
      <path d="M22 3v5h-5"/>
    </svg>
    <span>{text}</span>
  </div>