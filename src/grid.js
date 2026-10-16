/**
 * @module grid
 * @ignore
 */

import { getExtents } from "./domain.js";

// Keys stay exact integers below 2^53.
const KEY_BITS = 52;

/**
 * @typedef {object} Grid
 * @property {function(number, function(number): void): void} forEachNeighbor
 *   Call back with the positions in `indices` of the points in the cells around a
 *   position, except itself.
 */

/**
 * Sparse uniform grid (cell list) over a subset of points, for neighbor queries
 * within `cellSize`.
 *
 * @param {ArrayLike<number>} points
 * @param {number} dimension
 * @param {ArrayLike<number>} indices
 * @param {import("./domain.js").Bounds} bounds Bounds containing the subset.
 * @param {number} cellSize
 * @returns {Grid}
 */
export function createGrid(points, dimension, indices, bounds, cellSize) {
  const [min] = bounds;
  const extents = getExtents(bounds);

  // Coarser cells when the grid key would overflow: slower but still exact.
  const maxCellsPerAxis = Math.floor(2 ** (KEY_BITS / dimension));
  const size = Math.max(
    cellSize,
    Math.max(...extents) / (maxCellsPerAxis - 1),
    1e-300,
  );

  // One empty cell on each side so that neighbor keys never wrap.
  const strides = new Float64Array(dimension);
  let stride = 1;
  for (let k = 0; k < dimension; k++) {
    strides[k] = stride;
    stride *= Math.floor(extents[k] / size) + 3;
  }

  const keys = new Float64Array(indices.length);
  const cells = new Map();
  for (let l = 0; l < indices.length; l++) {
    const offset = indices[l] * dimension;
    let key = 0;
    for (let k = 0; k < dimension; k++) {
      key +=
        (Math.floor((points[offset + k] - min[k]) / size) + 1) * strides[k];
    }
    keys[l] = key;
    const cell = cells.get(key);
    if (cell) cell.push(l);
    else cells.set(key, [l]);
  }

  let neighborOffsets = [0];
  for (const s of strides) {
    neighborOffsets = neighborOffsets.flatMap((o) => [o - s, o, o + s]);
  }

  return {
    forEachNeighbor(l, callback) {
      for (const neighborOffset of neighborOffsets) {
        const cell = cells.get(keys[l] + neighborOffset);
        if (!cell) continue;
        for (const m of cell) if (m !== l) callback(m);
      }
    },
  };
}
