/**
 * @module domain
 * @ignore
 */

// Extents below this fraction of the largest one are flat axes.
const FLAT_EXTENT = 1e-9;

/** @typedef {Float64Array[]} Bounds [min, max] */

/**
 * Size of each axis of bounds, 0 when empty.
 *
 * @param {Bounds} bounds
 * @returns {number[]}
 */
export const getExtents = ([min, max]) =>
  Array.from(min, (value, k) => Math.max(0, max[k] - value));

/**
 * @typedef {object} Domain
 * @property {number} size Length, area or volume.
 * @property {number} dimension
 */

/**
 * Size and dimension of bounds, ignoring flat axes.
 *
 * @param {Bounds} bounds
 * @returns {Domain}
 */
export function boundingDomain(bounds) {
  const extents = getExtents(bounds);
  const maxExtent = Math.max(...extents);
  const axes = extents.filter((extent) => extent > maxExtent * FLAT_EXTENT);

  return {
    size: axes.length ? axes.reduce((size, extent) => size * extent, 1) : 0,
    dimension: Math.max(1, axes.length),
  };
}

/**
 * Copy the components of a point.
 *
 * @param {ArrayLike<number>} points
 * @param {number} dimension
 * @param {number} i
 * @param {Float64Array} out
 * @returns {Float64Array}
 */
export function getPoint(points, dimension, i, out) {
  for (let k = 0; k < dimension; k++) out[k] = points[i * dimension + k];
  return out;
}

/**
 * Largest value of `scales` over a subset of points, 1 without scales.
 *
 * @param {ArrayLike<number> | undefined} scales
 * @param {ArrayLike<number>} indices
 * @returns {number}
 */
export function maxScale(scales, indices) {
  if (!scales) return 1;
  let max = 0;
  for (const i of indices) max = Math.max(max, scales[i]);
  return max;
}

/**
 * Scale of the distance between two points: the mean of their scales.
 *
 * @param {ArrayLike<number> | undefined} scales
 * @param {number} i
 * @param {number} j
 * @returns {number}
 */
export const pairScale = (scales, i, j) =>
  scales ? (scales[i] + scales[j]) / 2 : 1;
