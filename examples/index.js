import {
  eliminateToCount,
  eliminateByDistance,
  packingRadius,
} from "point-elimination";

import canvasContext from "canvas-context";
import random from "pex-random";
import { Pane } from "tweakpane";

const CONFIG = {
  method: "count",
  candidates: 5000,
  count: 1000,
  prefix: 1,
  distance: 0.025,
  progressive: true,
  adaptive: false,
  showCandidates: true,
  seed: 1,
};

const TAU = 2 * Math.PI;
const PADDING = 20;

// Adaptive spacing: four times sparser on the right
const getScale = (x) => 1 + 3 * x ** 2;

// Normalized so that the mean of 1 / scale^2 over the uniform candidates is 1,
// keeping the radius estimate of eliminateToCount valid.
const getScales = (points) => {
  const scales = Float64Array.from({ length: points.length / 2 }, (_, i) =>
    getScale(points[i * 2]),
  );
  const density =
    scales.reduce((sum, scale) => sum + scale ** -2, 0) / scales.length;
  return scales.map((scale) => scale * Math.sqrt(density));
};

const getColor = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

let state;

const update = () => {
  const rng = random.create(CONFIG.seed);
  const points = Float64Array.from({ length: CONFIG.candidates * 2 }, () =>
    rng.float(),
  );
  const scales = CONFIG.adaptive ? getScales(points) : undefined;

  const start = performance.now();
  const eliminated =
    CONFIG.method === "count"
      ? eliminateToCount(points, CONFIG.count, {
          dimension: 2,
          scales,
          progressive: CONFIG.progressive,
        })
      : eliminateByDistance(points, CONFIG.distance, {
          dimension: 2,
          scales,
        });
  const time = performance.now() - start;

  // Candidates are random: their first ones are a random subset
  const subset = Uint32Array.from({ length: eliminated.length }, (_, i) => i);

  state = { points, scales, eliminated, subset, time };
};

// Distances relative to the target spacing of each pair
const getMinDistance = (points, indices, scales) => {
  let min = Infinity;
  for (let a = 0; a < indices.length; a++) {
    for (let b = a + 1; b < indices.length; b++) {
      const i = indices[a];
      const j = indices[b];
      const pairScale = scales ? (scales[i] + scales[j]) / 2 : 1;
      min = Math.min(
        min,
        Math.hypot(
          points[i * 2] - points[j * 2],
          points[i * 2 + 1] - points[j * 2 + 1],
        ) / pairScale,
      );
    }
  }
  return min;
};

const { context, canvas } = canvasContext("2d");
document.querySelector("main").append(canvas);

const drawPanel = (title, indices, x, y, size) => {
  const { points, scales } = state;
  const count = indices.length;

  context.save();
  context.translate(x, y);

  context.strokeStyle = getColor("--color-dark");
  context.strokeRect(0, 0, size, size);

  if (CONFIG.showCandidates) {
    context.fillStyle = getColor("--color-dark");
    context.globalAlpha = 0.5;
    for (let i = 0; i < points.length / 2; i++) {
      context.fillRect(
        points[i * 2] * size - 0.5,
        points[i * 2 + 1] * size - 0.5,
        2,
        2,
      );
    }
  }

  context.globalAlpha = 1;
  context.fillStyle = getColor("--color-accent");
  const radius = Math.max(1, Math.min(4, size / Math.sqrt(count) / 6));
  for (const i of indices) {
    context.beginPath();
    context.arc(points[i * 2] * size, points[i * 2 + 1] * size, radius, 0, TAU);
    context.fill();
  }

  // Relative radius: 1 for a perfect hexagonal packing
  const relative =
    getMinDistance(points, indices, scales) / (2 * packingRadius(1, count, 2));

  context.fillStyle = getColor("--color-dark");
  context.font = "14px monospace";
  context.fillText(title, 0, -24);
  context.fillText(
    `${count} points, relative radius ${relative.toFixed(3)}`,
    0,
    -8,
  );

  context.restore();
};

const draw = () => {
  const { width, height } = canvas;
  context.fillStyle = getColor("--color-light");
  context.fillRect(0, 0, width, height);

  const prefix =
    CONFIG.method === "count" && CONFIG.progressive
      ? Math.max(1, Math.round(state.eliminated.length * CONFIG.prefix))
      : state.eliminated.length;

  const landscape = width > height;
  const size = Math.min(
    (landscape ? width / 2 : width) - PADDING * 2,
    (landscape ? height : height / 2) - PADDING * 8,
  );
  const offset = landscape ? [width / 2, 0] : [0, height / 2];

  drawPanel(
    "random subset",
    state.subset.subarray(0, prefix),
    PADDING,
    PADDING * 6,
    size,
  );
  drawPanel(
    `${CONFIG.method === "count" ? "eliminateToCount" : "eliminateByDistance"} (${state.time.toFixed(1)}ms)`,
    state.eliminated.subarray(0, prefix),
    PADDING + offset[0],
    PADDING * 6 + offset[1],
    size,
  );
};

const onResize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
};
window.addEventListener("resize", onResize);

update();
onResize();

const pane = new Pane();
const onChange = () => {
  update();
  draw();
};
pane
  .addBinding(CONFIG, "method", {
    options: { count: "count", distance: "distance" },
  })
  .on("change", () => {
    onChange();
    refreshVisibility();
  });
pane
  .addBinding(CONFIG, "candidates", { min: 100, max: 20_000, step: 100 })
  .on("change", onChange);
const countBinding = pane
  .addBinding(CONFIG, "count", { min: 1, max: 5000, step: 1 })
  .on("change", onChange);
const progressiveBinding = pane
  .addBinding(CONFIG, "progressive")
  .on("change", () => {
    onChange();
    refreshVisibility();
  });
const prefixBinding = pane
  .addBinding(CONFIG, "prefix", { min: 0, max: 1 })
  .on("change", draw);
const distanceBinding = pane
  .addBinding(CONFIG, "distance", { min: 0.002, max: 0.1 })
  .on("change", onChange);
pane.addBinding(CONFIG, "adaptive").on("change", onChange);
pane.addBinding(CONFIG, "showCandidates").on("change", draw);
pane
  .addBinding(CONFIG, "seed", { min: 0, max: 100, step: 1 })
  .on("change", onChange);

const refreshVisibility = () => {
  const count = CONFIG.method === "count";
  countBinding.hidden = !count;
  progressiveBinding.hidden = !count;
  prefixBinding.hidden = !count || !CONFIG.progressive;
  distanceBinding.hidden = count;
};
refreshVisibility();

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (!newModule) return;
    canvas.remove();
    pane.dispose();
  });
}
