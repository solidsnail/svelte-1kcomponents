<script>
  import { onMount } from "svelte";
  import { startFPSMonitor, startMemMonitor } from "perf-monitor";
  import { interpolateViridis } from "d3-scale-chromatic";
  import VizDemo from "./VizDemo.svelte";

  let numPoints = 1000;

  startFPSMonitor();
  startMemMonitor();
</script>

<div class="app-wrapper">
  <VizDemo count={numPoints} />
  <div class="controls">
    # Points
    <input type="range" min={10} max={10000} bind:value={numPoints} />
    {numPoints}
  </div>
  <div class="about">
    Svelte 1k Components Demo based on the Glimmer demo by
    <a href="http://mlange.io" target="_blank">Michael Lange</a>

  </div>
</div>
