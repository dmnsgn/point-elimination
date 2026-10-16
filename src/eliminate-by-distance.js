/**
 * @module pointElimination
 * @ignore
 */

import {
  distance as getDistance,
  getBounds,
  maxScale,
  pairScale,
} from "./domain.js";
import { createGrid } from "./grid.js";

/**
 * @typedef {object} EliminateByDistanceOptions
 * @property {number} [dimension=3] Number of components per point, from 1 to 3.
 * @property {ArrayLike<number>} [scales] Per point distance multiplier,
 *   positive and finite: two points conflict below `distance` times the mean of
 *   their scales.
 * @property {ArrayLike<number>} [order] Indices in visiting order: earlier
 *   points have priority. Points not listed are discarded. Defaults to the
 *   index order.
 */

/**
 * Greedy elimination: keeps each point, in order, not closer than `distance` to
 * an already kept one. Every removed point of `order` conflicts with a kept
 * point.
 *
 * @param {ArrayLike<number>} points Flat array of point components.
 * @param {number} distance Minimum distance between kept points.
 * @param {EliminateByDistanceOptions} [options={}]
 * @returns {Uint32Array} Unique indices of the kept points, in visiting order.
 */
export function eliminateByDistance(points, distance, options = {}) {
  const { dimension = 3, scales } = options;
  const pointCount = Math.floor(points.length / dimension);
  const order =
    options.order ?? Uint32Array.from({ length: pointCount }, (_, i) => i);

  const grid =
    distance > 0
      ? createGrid(
          points,
          dimension,
          order,
          getBounds(points, dimension, order),
          distance * maxScale(scales, order),
        )
      : null;
  const visited = new Uint8Array(pointCount);
  const kept = new Uint32Array(order.length);
  let keptCount = 0;

  for (let l = 0; l < order.length; l++) {
    const i = order[l];
    if (visited[i]) continue;
    visited[i] = 1;
    kept[keptCount++] = i;
    grid?.forEachNeighbor(l, (m) => {
      const j = order[m];
      if (
        !visited[j] &&
        getDistance(points, dimension, i, j) <
          distance * pairScale(scales, i, j)
      ) {
        visited[j] = 1;
      }
    });
  }

  return kept.slice(0, keptCount);
}
