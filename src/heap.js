/**
 * @module heap
 * @ignore
 */

/**
 * @typedef {object} MaxHeap
 * @property {function(): number} pop
 * @property {function(number): void} decrease Restore the order after lowering
 *   a weight.
 */

/**
 * Indexed binary max heap of the indices of `weights`.
 *
 * Ties pop the highest index first so results are deterministic.
 *
 * @param {Float64Array} weights Only lowered by the caller before `decrease`.
 * @returns {MaxHeap}
 */
export function createMaxHeap(weights) {
  let size = weights.length;
  const heap = Uint32Array.from({ length: size }, (_, i) => i);
  const positions = Uint32Array.from(heap);

  const greater = (a, b) =>
    weights[a] > weights[b] || (weights[a] === weights[b] && a > b);

  const place = (p, i) => {
    heap[p] = i;
    positions[i] = p;
  };

  const siftDown = (p) => {
    const i = heap[p];
    for (;;) {
      const left = p * 2 + 1;
      if (left >= size) break;
      const right = left + 1;
      const child =
        right < size && greater(heap[right], heap[left]) ? right : left;
      if (!greater(heap[child], i)) break;
      place(p, heap[child]);
      p = child;
    }
    place(p, i);
  };

  for (let p = (size >> 1) - 1; p >= 0; p--) siftDown(p);

  return {
    pop() {
      const top = heap[0];
      size--;
      if (size > 0) {
        heap[0] = heap[size];
        siftDown(0);
      }
      return top;
    },
    decrease(i) {
      siftDown(positions[i]);
    },
  };
}
