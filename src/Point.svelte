<script>
  export let x;
  export let y;
  export let color;
</script>

<rect
  class="point"
  transform={`translate(${Math.floor(x)}, ${Math.floor(y)})`}
  fill={color} />
