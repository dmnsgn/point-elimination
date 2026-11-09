/**
 * @module pointElimination
 * @ignore
 */

import { HashGrid, utils } from "spatial-partition";

import { boundingDomain, getPoint, maxScale } from "./domain.js";
import { createMaxHeap } from "./heap.js";
import { packingRadius } from "./packing-radius.js";

// Parameters recommended by Yuksel 2015.
const ALPHA = 8;
const BETA = 0.65;
const GAMMA = 1.5;

// Integer pair weights in [0, 2^36] keep sums exact below 2^53: incremental
// updates match recomputed weights and ties always break on the index.
const WEIGHT_RESOLUTION = 2 ** 36;

const grow = (array) => {
  const grown = new array.constructor(array.length * 2);
  grown.set(array);
  return grown;
};

// Points are addressed by position in ascending `indices`: heap ties pop the
// highest index and allocations scale with the subset. `positions` maps point
// indices of the subset back to positions.
function eliminate(points, options, indices, count, radius) {
  const { dimension, scales, weightLimiting, positions } = options;
  const n = indices.length;
  if (count >= n) {
    return { kept: Uint32Array.from(indices), removed: new Uint32Array(0) };
  }

  const diameter = 2 * radius;
  // Neighbors closer than the minimum diameter weigh the same, so dense
  // clusters don't dominate the elimination order.
  const minDiameter = weightLimiting
    ? diameter * (1 - (count / n) ** GAMMA) * BETA
    : 0;

  // Distances are scaled at the weighted point only: pair weights are
  // asymmetric.
  const localScales = scales && Float64Array.from(indices, (i) => scales[i]);
  const scaledDistance = (l, d) => (localScales ? d / localScales[l] : d);
  const reach = (l) => (localScales ? diameter * localScales[l] : diameter);
  const weightOf = (scaled) =>
    scaled >= diameter
      ? 0
      : Math.round(
          (1 - Math.max(scaled, minDiameter) / diameter) ** ALPHA *
            WEIGHT_RESOLUTION,
        );

  // Neighbors weighed by position l, with their scaled distance, are at
  // [start[l], start[l + 1]).
  const weights = new Float64Array(n);
  const start = new Uint32Array(n + 1);
  let neighbors = new Uint32Array(n * 8);
  let neighborDistances = new Float64Array(n * 8);
  let edgeCount = 0;

  if (radius > 0) {
    const queryRadius = diameter * maxScale(scales, indices);
    const grid = new HashGrid({ dimension, cellSize: queryRadius }).build(
      points,
      indices,
    );
    const position = new Float64Array(dimension);
    const neighborIndices = [];
    for (let l = 0; l < n; l++) positions[indices[l]] = l;
    for (let l = 0; l < n; l++) {
      start[l] = edgeCount;
      const i = indices[l];
      grid.queryRadius(
        getPoint(points, dimension, i, position),
        queryRadius,
        neighborIndices,
      );
      for (const j of neighborIndices) {
        if (j === i) continue;
        const m = positions[j];
        const d = Math.sqrt(
          utils.avecDistanceSquared(points, i, points, j, dimension),
        );
        if (d >= Math.max(reach(l), reach(m))) continue;
        weights[l] += weightOf(scaledDistance(l, d));
        const scaled = scaledDistance(m, d);
        if (scaled >= diameter) continue;
        if (edgeCount === neighbors.length) {
          neighbors = grow(neighbors);
          neighborDistances = grow(neighborDistances);
        }
        neighbors[edgeCount] = m;
        neighborDistances[edgeCount++] = scaled;
      }
    }
  }
  start[n] = edgeCount;

  const alive = new Uint8Array(n).fill(1);
  const heap = createMaxHeap(weights);
  const removed = new Uint32Array(n - count);
  for (let r = 0; r < removed.length; r++) {
    const l = heap.pop();
    removed[r] = indices[l];
    alive[l] = 0;
    for (let e = start[l]; e < start[l + 1]; e++) {
      const m = neighbors[e];
      if (!alive[m]) continue;
      weights[m] -= weightOf(neighborDistances[e]);
      heap.decrease(m);
    }
  }

  return { kept: indices.filter((_, l) => alive[l]), removed };
}

/**
 * @typedef {object} EliminateToCountOptions
 * @property {number} [dimension=3] Number of components per point, from 1 to 3.
 * @property {number} [domainSize] Length, area or volume of the sampled domain.
 *   Defaults to the points bounding box, ignoring flat axes. Set it for points
 *   on a curve or surface, eg. the area of a mesh.
 * @property {number} [domainDimension] Dimension of the sampled domain, from 1
 *   to 3, eg. 2 for a surface in 3D. Defaults to the bounding box dimension, or
 *   `dimension` when `domainSize` is set. Set with `domainSize`.
 * @property {ArrayLike<number>} [scales] Per point spacing multiplier for
 *   adaptive sampling, positive and finite. Normalize them so that the domain
 *   mean of 1 / scale^domainDimension is 1.
 * @property {boolean} [weightLimiting=true] Cap the weight of very close
 *   neighbors.
 * @property {boolean} [progressive=false] Order the output so that each prefix
 *   is itself well distributed.
 */

/**
 * Weighted sample elimination ([Yuksel
 * 2015](http://www.cemyuksel.com/research/sampleelimination/)) to a Poisson
 * disk distributed subset of `count` points.
 *
 * Use 3 to 5 times more input points than `count`: more barely improves quality
 * while cost grows quadratically.
 *
 * @param {ArrayLike<number>} points Flat array of point components.
 * @param {number} count
 * @param {EliminateToCountOptions} [options={}]
 * @returns {Uint32Array} Indices of the kept points, ascending unless
 *   `progressive`.
 */
export function eliminateToCount(points, count, options = {}) {
  const {
    dimension = 3,
    scales,
    weightLimiting = true,
    progressive = false,
  } = options;
  const pointCount = Math.floor(points.length / dimension);
  const indices = Uint32Array.from({ length: pointCount }, (_, i) => i);
  const target = Math.max(0, Math.min(Math.floor(count), pointCount));
  const bounds = [new Float64Array(dimension), new Float64Array(dimension)];
  utils.boundsFromPoints(bounds, points, dimension, pointCount);

  let { domainSize, domainDimension } = options;
  if (domainSize === undefined) {
    const domain = boundingDomain(bounds);
    domainSize = domain.size;
    domainDimension ??= domain.dimension;
  }
  domainDimension ??= dimension;

  const eliminateOptions = {
    dimension,
    scales,
    weightLimiting,
    positions: new Uint32Array(pointCount),
  };
  const radius = (c) => packingRadius(domainSize, c, domainDimension);

  const { kept } = eliminate(
    points,
    eliminateOptions,
    indices,
    target,
    radius(target),
  );
  if (!progressive) return kept;

  // Each halving fills the output from the end, last removed points first.
  const order = new Uint32Array(kept.length);
  let current = kept;
  let end = kept.length;
  while (current.length > 1) {
    const half = current.length >> 1;
    const result = eliminate(
      points,
      eliminateOptions,
      current,
      half,
      radius(half),
    );
    for (let r = 0; r < result.removed.length; r++) {
      order[end - 1 - r] = result.removed[r];
    }
    end -= result.removed.length;
    current = result.kept;
  }
  order.set(current);

  return order;
}
