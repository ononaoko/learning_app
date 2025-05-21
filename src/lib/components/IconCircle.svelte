<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="none" stroke="{color}" stroke-dasharray="64" stroke-dashoffset="{offset}" stroke-linecap="round" stroke-linejoin="round" stroke-width="{strokeWidth}" d="M3 12c0 -4.97 4.03 -9 9 -9c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9c-4.97 0 -9 -4.03 -9 -9Z">
      <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.72s" values="64;0" begin="0;indefinite" id="circleAnim"/>
    </path>
  </svg>

  <script>
    export let width = 48;
    export let height = 48;
    export let color = '#fff';
    export let strokeWidth = 2;
    let isFilled = false;
    let offset = 64;

    function animateCircle() {
      const circleAnim = document.getElementById('circleAnim');
      if (circleAnim) {
        if (!isFilled) {
          circleAnim.beginElement();
          offset = 0;
        } else {
          offset = 64;
          circleAnim.beginElement();
        }
        isFilled = !isFilled;
      }
    }
  </script>