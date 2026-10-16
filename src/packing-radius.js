/**
 * @module pointElimination
 * @ignore
 */

/**
 * Poisson disk radius of `count` points densely packed in a domain of
 * `domainSize`: segments in 1D, hexagonal in 2D and face-centered cubic in 3D.
 * Points are twice that apart.
 *
 * @param {number} domainSize Length, area or volume of the domain.
 * @param {number} count
 * @param {number} [domainDimension=3] From 1 to 3.
 * @returns {number}
 */
export function packingRadius(domainSize, count, domainDimension = 3) {
  if (count <= 0 || domainSize <= 0) return 0;
  if (domainDimension === 1) return domainSize / (2 * count);
  return domainDimension === 2
    ? Math.sqrt(domainSize / (2 * Math.sqrt(3) * count))
    : Math.cbrt(domainSize / (4 * Math.SQRT2 * count));
}
