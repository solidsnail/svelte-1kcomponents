<script>
  import { afterUpdate, onMount } from "svelte";
  import { interpolateViridis } from "d3-scale-chromatic";

  import { Layout, LAYOUT_ORDER } from "./constants.js";
  import Point from "./Point.svelte";
  export let count;
  let points = [];
  let step = 0;
  let numSteps = 60 * 2;
  let layout = 0;

  const theta = Math.PI * (3 - Math.sqrt(5));

  function xForLayout(layout) {
    switch (layout) {
      case Layout.PHYLLOTAXIS:
        return "px";
      case Layout.GRID:
        return "gx";
      case Layout.WAVE:
        return "wx";
      case Layout.SPIRAL:
        return "sx";
    }
  }

  function yForLayout(layout) {
    switch (layout) {
      case Layout.PHYLLOTAXIS:
        return "py";
      case Layout.GRID:
        return "gy";
      case Layout.WAVE:
        return "wy";
      case Layout.SPIRAL:
        return "sy";
    }
  }

  function lerp(obj, percent, startProp, endProp) {
    let px = obj[startProp];
    return px + (obj[endProp] - px) * percent;
  }

  function genPhyllotaxis(n) {
    return i => {
      let r = Math.sqrt(i / n);
      let th = i * theta;
      return [r * Math.cos(th), r * Math.sin(th)];
    };
  }

  function genGrid(n) {
    let rowLength = Math.round(Math.sqrt(n));
    return i => [
      -0.8 + (1.6 / rowLength) * (i % rowLength),
      -0.8 + (1.6 / rowLength) * Math.floor(i / rowLength)
    ];
  }

  function genWave(n) {
    let xScale = 2 / (n - 1);
    return i => {
      let x = -1 + i * xScale;
      return [x, Math.sin(x * Math.PI * 3) * 0.3];
    };
  }

  function genSpiral(n) {
    return i => {
      let t = Math.sqrt(i / (n - 1)),
        phi = t * Math.PI * 10;
      return [t * Math.cos(phi), t * Math.sin(phi)];
    };
  }

  function scale(magnitude, vector) {
    return vector.map(p => p * magnitude);
  }

  function translate(translation, vector) {
    return vector.map((p, i) => p + translation[i]);
  }

  function project(vector) {
    const wh = window.innerHeight / 2;
    const ww = window.innerWidth / 2;
    return translate([ww, wh], scale(Math.min(wh, ww), vector));
  }
  function makePoints(count) {
    const newPoints = [];
    for (var i = 0; i < count; i++) {
      newPoints.push({
        x: 0,
        y: 0,
        color: interpolateViridis(i / count)
      });
    }
    setAnchors(newPoints);
  }
  function setAnchors(arr) {
    arr.map((p, index) => {
      const [gx, gy] = project(grid(index));
      const [wx, wy] = project(wave(index));
      const [sx, sy] = project(spiral(index));
      const [px, py] = project(phyllotaxis(index));
      Object.assign(p, { gx, gy, wx, wy, sx, sy, px, py });
    });
    points = arr;
  }
  function next() {
    step = (step + 1) % numSteps;

    if (step === 0) {
      layout = (layout + 1) % LAYOUT_ORDER.length;
    }

    // Clamp the linear interpolation at 80% for a pause at each finished layout state
    const pct = Math.min(1, step / (numSteps * 0.8));

    const currentLayout = LAYOUT_ORDER[layout];
    const nextLayout = LAYOUT_ORDER[(layout + 1) % LAYOUT_ORDER.length];

    // Keep these redundant computations out of the loop
    const pxProp = xForLayout(currentLayout);
    const nxProp = xForLayout(nextLayout);
    const pyProp = yForLayout(currentLayout);
    const nyProp = yForLayout(nextLayout);

    points = points.map(point => {
      const newPoint = { ...point };
      newPoint.x = lerp(newPoint, pct, pxProp, nxProp);
      newPoint.y = lerp(newPoint, pct, pyProp, nyProp);
      return newPoint;
    });
    // setState();
    requestAnimationFrame(() => {
      next();
    });
  }
  let phyllotaxis = genPhyllotaxis(100);
  let grid = genGrid(100);
  let wave = genWave(100);
  let spiral = genSpiral(100);

  onMount(() => {
    next();
  });
  $: {
    phyllotaxis = genPhyllotaxis(count);
    grid = genGrid(count);
    wave = genWave(count);
    spiral = genSpiral(count);
    makePoints(count);
  }
</script>

<svg class="demo">
  <g>
    {#each points as point}
      <Point x={point.x} y={point.y} color={point.color} />
    {/each}
  </g>

</svg>
