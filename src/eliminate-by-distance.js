/**
 * @module pointElimination
 * @ignore
 */

import { HashGrid, utils } from "spatial-partition";

import { getPoint, maxScale, pairScale } from "./domain.js";

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

  const queryRadius = distance * maxScale(scales, order);
  const grid =
    distance > 0
      ? new HashGrid({ dimension, cellSize: queryRadius }).build(points, order)
      : null;
  const position = new Float64Array(dimension);
  const neighbors = [];
  const visited = new Uint8Array(pointCount);
  const kept = new Uint32Array(order.length);
  let keptCount = 0;

  for (let l = 0; l < order.length; l++) {
    const i = order[l];
    if (visited[i]) continue;
    visited[i] = 1;
    kept[keptCount++] = i;
    if (!grid) continue;
    grid.queryRadius(
      getPoint(points, dimension, i, position),
      queryRadius,
      neighbors,
    );
    for (const j of neighbors) {
      if (visited[j]) continue;
      const minDistance = distance * pairScale(scales, i, j);
      if (
        utils.avecDistanceSquared(points, i, points, j, dimension) <
        minDistance * minDistance
      ) {
        visited[j] = 1;
      }
    }
  }

  return kept.slice(0, keptCount);
}
