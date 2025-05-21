<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 24 24" aria-hidden="true" class:reverse={reverse}>
    <g fill="none" stroke="{color}" stroke-dasharray="24" stroke-dashoffset="{offset}" stroke-linecap="round" stroke-linejoin="round" stroke-width="{strokeWidth}">
      <path d="M5 5l14 14"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.48s" values="24;0"/></path>
      <path d="M19 5l-14 14"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.48s" dur="0.48s" values="24;0"/></path>
    </g>
  </svg>

  <script>
    export let width = 24;
    export let height = 24;
    export let color = '#fff';
    export let strokeWidth = 2;
    export let isOpen = false;
    let reverse = false;
    let offset = isOpen ? 0 : 24;

    $: offset = isOpen ? 0 : 24;
    $: reverse = isOpen;
  </script>

  <style>
    svg {
      transition: transform 0.48s ease-in-out;
    }

    .reverse {
      transform: rotate(180deg);
    }
  </style>