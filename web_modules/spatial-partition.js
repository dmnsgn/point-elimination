import { r as __exportAll } from "./_chunks/rolldown-runtime-hjQuzKSd.js";

/** @module typedArrayReserve */
/**
* @typedef {Int8Array
*   | Uint8Array
*   | Uint8ClampedArray
*   | Int16Array
*   | Uint16Array
*   | Int32Array
*   | Uint32Array
*   | Float32Array
*   | Float64Array
*   | BigInt64Array
*   | BigUint64Array} TypedArray
*/
/**
* Typed array of at least `length` elements: `array` when long enough, a new
* array of the same type otherwise.
*
* @param {TypedArray} array
* @param {number} length
* @param {boolean} [copy=false] Copy the values of `array`.
* @param {number} [factor=1.5] Growth factor, above 1. Higher is faster and
*   uses more memory.
* @returns {TypedArray}
* @alias module:typedArrayReserve
* @see Cormen, T. H., Leiserson, C. E., Rivest, R. L., & Stein, C. (2009). Introduction to algorithms (3rd ed.), §17.4 Dynamic tables. MIT Press.
*/
function typedArrayReserve(array, length, copy = false, factor = 1.5) {
	if (array.length >= length) return array;
	const reserved = new array.constructor(Math.max(length, Math.ceil(array.length * factor)));
	if (copy) reserved.set(array);
	return reserved;
}

var utils_exports = /* @__PURE__ */ __exportAll({
	INSIDE: () => 2,
	INTERSECTS: () => 1,
	OUTSIDE: () => 0,
	avecDistanceSquared: () => avecDistanceSquared,
	boundsClamp: () => boundsClamp,
	boundsDistanceSquared: () => boundsDistanceSquared,
	boundsFromPoints: () => boundsFromPoints,
	boundsOverlap: () => boundsOverlap
});
/** @module utils */
/**
* Squared distance between `a[i]` and `b[j]`.
*
* @param {ArrayLike<number>} a
* @param {number} i
* @param {ArrayLike<number>} b
* @param {number} j
* @param {number} dimension
* @returns {number}
*/
function avecDistanceSquared(a, i, b, j, dimension) {
	let sum = 0;
	for (let k = 0; k < dimension; k++) {
		const delta = a[i * dimension + k] - b[j * dimension + k];
		sum += delta * delta;
	}
	return sum;
}
/**
* Bounds of `count` points: the first ones, or those at `indices`. [0, 0] when
* empty.
*
* @param {Float64Array[]} bounds
* @param {ArrayLike<number>} points
* @param {number} dimension
* @param {number} count
* @param {ArrayLike<number>} [indices]
*/
function boundsFromPoints([min, max], points, dimension, count, indices) {
	if (!count) {
		min.fill(0);
		max.fill(0);
		return;
	}
	min.fill(Infinity);
	max.fill(-Infinity);
	for (let j = 0; j < count; j++) {
		const i = indices ? indices[j] : j;
		for (let k = 0; k < dimension; k++) {
			const value = points[i * dimension + k];
			if (value < min[k]) min[k] = value;
			if (value > max[k]) max[k] = value;
		}
	}
}
/**
* Clamp a box into bounds.
*
* @param {ArrayLike<number>} min
* @param {ArrayLike<number>} max
* @param {Float64Array[]} bounds
* @param {Float64Array} outMin
* @param {Float64Array} outMax
* @param {number} dimension
*/
function boundsClamp(min, max, [boundsMin, boundsMax], outMin, outMax, dimension) {
	for (let k = 0; k < dimension; k++) {
		outMin[k] = Math.min(Math.max(min[k], boundsMin[k]), boundsMax[k]);
		outMax[k] = Math.min(Math.max(max[k], boundsMin[k]), boundsMax[k]);
	}
}
const OUTSIDE = 0;
const INTERSECTS = 1;
const INSIDE = 2;
/**
* Overlap of the box at `offset` in `boxMin`/`boxMax` with [min, max].
*
* @param {ArrayLike<number>} boxMin
* @param {ArrayLike<number>} boxMax
* @param {number} offset
* @param {ArrayLike<number>} min
* @param {ArrayLike<number>} max
* @param {number} dimension
* @returns {number} `OUTSIDE`, `INTERSECTS` or `INSIDE`.
*/
function boundsOverlap(boxMin, boxMax, offset, min, max, dimension) {
	let result = 2;
	for (let k = 0; k < dimension; k++) {
		const lo = boxMin[offset + k];
		const hi = boxMax[offset + k];
		if (lo > max[k] || hi < min[k]) return 0;
		if (lo < min[k] || hi > max[k]) result = 1;
	}
	return result;
}
/**
* Squared distance from a position to a box, 0 inside.
*
* @param {ArrayLike<number>} position
* @param {ArrayLike<number>} min
* @param {ArrayLike<number>} max
* @param {number} dimension
* @returns {number}
*/
function boundsDistanceSquared(position, min, max, dimension) {
	let sum = 0;
	for (let k = 0; k < dimension; k++) {
		const delta = Math.max(min[k] - position[k], 0, position[k] - max[k]);
		sum += delta * delta;
	}
	return sum;
}

/** @module partition */
/** @typedef {ArrayLike<number>} Points */
/** @typedef {ArrayLike<number>} Position */
/** @typedef {ArrayLike<number>} Indices */
/** @typedef {Position[]} Bounds [min, max] corners. */
/**
* @callback NodeCallback
* @param {Float64Array} min Node min corner, reused between calls.
* @param {Float64Array} max Node max corner, reused between calls.
* @param {number} depth 0 for grid cells and tree roots.
* @param {number} count Number of points in the node.
*/
/**
* Shared interface and range queries of all structures. Subclasses implement
* `_build`, `_collect`, `queryNearest` and `forEachNode`.
*/
var Partition = class {
	/**
	* Number of components per point.
	*
	* @type {number}
	*/
	dimension;
	/**
	* Points of the last build.
	*
	* @type {Points}
	*/
	points = [];
	/**
	* Indices of the points of the last build, all points when undefined.
	*
	* @type {Indices | undefined}
	*/
	indices;
	/**
	* Number of points of the last build.
	*
	* @type {number}
	*/
	count = 0;
	/**
	* Bounds of the structure: the fixed bounds, or the points bounds of the last
	* build.
	*
	* @type {Float64Array[]}
	*/
	bounds;
	/**
	* Points tested against the query by the last query: a measure of the
	* structure efficiency.
	*
	* @type {number}
	*/
	candidateCount = 0;
	/**
	* Points collected by the current query, `candidateCount` of them. `out` is
	* only written at the end: clearing a plain array releases its storage.
	*
	* @type {Uint32Array}
	* @protected
	*/
	_candidates = /* @__PURE__ */ new Uint32Array(0);
	/** @type {Float64Array[] | undefined} */
	#fixedBounds;
	/** @type {Float64Array[]} */
	#dataBounds;
	#queryMin;
	#queryMax;
	/**
	* @param {object} [options]
	* @param {number} [options.dimension=3]
	* @param {Bounds} [options.bounds]
	*/
	constructor({ dimension = 3, bounds } = {}) {
		this.dimension = dimension;
		this.bounds = [new Float64Array(dimension), new Float64Array(dimension)];
		this.#dataBounds = [new Float64Array(dimension), new Float64Array(dimension)];
		if (bounds) this.#fixedBounds = bounds.map((corner) => Float64Array.from({ length: dimension }, (_, k) => corner[k]));
		this.#queryMin = new Float64Array(dimension);
		this.#queryMax = new Float64Array(dimension);
	}
	/**
	* Partition points. Buffers are reused across builds.
	*
	* @param {Points} points Flat array of point components, `dimension` per
	*   point. Kept by reference until the next build.
	* @param {Indices} [indices] Unique indices of the points to partition, all
	*   points when omitted. Kept by reference until the next build.
	* @returns {this}
	*/
	build(points, indices) {
		const { dimension } = this;
		this.points = points;
		this.indices = indices;
		this.count = indices ? indices.length : Math.floor(points.length / dimension);
		boundsFromPoints(this.#dataBounds, points, dimension, this.count, indices);
		const [min, max] = this.#fixedBounds ?? this.#dataBounds;
		this.bounds[0].set(min);
		this.bounds[1].set(max);
		this._candidates = typedArrayReserve(this._candidates, this.count);
		this._build();
		return this;
	}
	/**
	* Indices of the points within `radius` of `position`.
	*
	* @param {Position} position
	* @param {number} radius
	* @param {number[]} [out=[]] Overwritten and returned. Reuse it to avoid
	*   allocating.
	* @returns {number[]}
	*/
	queryRadius(position, radius, out = []) {
		this.candidateCount = 0;
		if (!this.count || radius < 0) {
			out.length = 0;
			return out;
		}
		this.#collectAround(position, radius);
		const { points, dimension, candidateCount } = this;
		const candidates = this._candidates;
		const radiusSquared = radius * radius;
		let length = 0;
		for (let j = 0; j < candidateCount; j++) {
			const i = candidates[j];
			if (avecDistanceSquared(points, i, position, 0, dimension) <= radiusSquared) out[length++] = i;
		}
		out.length = length;
		return out;
	}
	/**
	* Indices of the points inside an axis-aligned box, boundaries included.
	*
	* @param {Position} min
	* @param {Position} max
	* @param {number[]} [out=[]] Overwritten and returned. Reuse it to avoid
	*   allocating.
	* @returns {number[]}
	*/
	queryBox(min, max, out = []) {
		this.candidateCount = 0;
		const { dimension } = this;
		let empty = !this.count;
		for (let k = 0; k < dimension; k++) empty ||= min[k] > max[k];
		if (empty) {
			out.length = 0;
			return out;
		}
		boundsClamp(min, max, this.bounds, this.#queryMin, this.#queryMax, dimension);
		this._collect(this.#queryMin, this.#queryMax);
		const { points, candidateCount } = this;
		const candidates = this._candidates;
		let length = 0;
		for (let j = 0; j < candidateCount; j++) {
			const i = candidates[j];
			let inside = true;
			for (let k = 0; k < dimension && inside; k++) {
				const value = points[i * dimension + k];
				inside = value >= min[k] && value <= max[k];
			}
			if (inside) out[length++] = i;
		}
		out.length = length;
		return out;
	}
	/**
	* Indices of the `k` points nearest to `position`, sorted by distance.
	*
	* @abstract
	* @param {Position} position
	* @param {number} k
	* @param {number} [maxDistance=Infinity] Ignore points farther than this.
	* @param {number[]} [out=[]] Overwritten and returned. Reuse it to avoid
	*   allocating.
	* @returns {number[]}
	*/
	queryNearest(position, k, maxDistance = Infinity, out = []) {
		throw new Error("Not implemented");
	}
	/**
	* Visit every node of the structure: grid cells or tree nodes.
	*
	* @abstract
	* @param {NodeCallback} callback
	*/
	forEachNode(callback) {
		throw new Error("Not implemented");
	}
	/**
	* Whether bounds are fixed: points outside them may exist.
	*
	* @returns {boolean}
	* @protected
	*/
	get _hasFixedBounds() {
		return !!this.#fixedBounds;
	}
	/**
	* Prepare the structure for `this.points`, after `this.bounds` is set.
	*
	* @abstract
	* @protected
	*/
	_build() {
		throw new Error("Not implemented");
	}
	/**
	* Append the indices of the points in the cells or leaves intersecting a box
	* to `_candidates`, each once. The box is already clamped into
	* `this.bounds`.
	*
	* @abstract
	* @param {Float64Array} min
	* @param {Float64Array} max
	* @protected
	*/
	_collect(min, max) {
		throw new Error("Not implemented");
	}
	/**
	* @private
	* @param {Position} position
	* @param {number} radius
	*/
	#collectAround(position, radius) {
		const { dimension } = this;
		const queryMin = this.#queryMin;
		const queryMax = this.#queryMax;
		for (let k = 0; k < dimension; k++) {
			queryMin[k] = position[k] - radius;
			queryMax[k] = position[k] + radius;
		}
		boundsClamp(queryMin, queryMax, this.bounds, queryMin, queryMax, dimension);
		this._collect(queryMin, queryMax);
	}
};

/** @module nearest */
/**
* The `capacity` nearest points found by a query.
*
* @see Williams, J. W. J. (1964). Algorithm 232: Heapsort. Communications of the ACM, 7(6), 347–348. https://doi.org/10.1145/512274.3734138
*/
var Nearest = class {
	#distances = /* @__PURE__ */ new Float64Array(0);
	#indices = /* @__PURE__ */ new Uint32Array(0);
	#capacity = 0;
	#size = 0;
	/** @param {number} capacity */
	reset(capacity) {
		this.#distances = typedArrayReserve(this.#distances, capacity);
		this.#indices = typedArrayReserve(this.#indices, capacity);
		this.#capacity = capacity;
		this.#size = 0;
	}
	/**
	* Keep a point not farther than `bound`.
	*
	* @param {number} i
	* @param {number} distance Squared distance.
	* @param {number} bound Squared distance.
	* @returns {number} Updated bound: the farthest kept distance once full.
	*/
	push(i, distance, bound) {
		const distances = this.#distances;
		const indices = this.#indices;
		if (this.#size < this.#capacity) {
			let p = this.#size++;
			while (p > 0) {
				const parent = p - 1 >> 1;
				if (distances[parent] >= distance) break;
				distances[p] = distances[parent];
				indices[p] = indices[parent];
				p = parent;
			}
			distances[p] = distance;
			indices[p] = i;
		} else this.#siftDown(distance, i);
		return this.#size === this.#capacity ? distances[0] : bound;
	}
	/**
	* Move the kept points to `out`, nearest first.
	*
	* @param {number[]} out
	* @returns {number[]}
	*/
	drain(out) {
		out.length = this.#size;
		for (let j = this.#size - 1; j >= 0; j--) {
			out[j] = this.#indices[0];
			const last = --this.#size;
			if (last > 0) this.#siftDown(this.#distances[last], this.#indices[last]);
		}
		return out;
	}
	/**
	* Replace the root and restore the order.
	*
	* @private
	* @param {number} distance
	* @param {number} i
	*/
	#siftDown(distance, i) {
		const distances = this.#distances;
		const indices = this.#indices;
		const size = this.#size;
		let p = 0;
		let child = 1;
		while (child < size) {
			if (child + 1 < size && distances[child + 1] > distances[child]) child++;
			if (distances[child] <= distance) break;
			distances[p] = distances[child];
			indices[p] = indices[child];
			p = child;
			child = p * 2 + 1;
		}
		distances[p] = distance;
		indices[p] = i;
	}
};

/** @module grid */
/**
* Base class of grids of equal cells. Subclasses implement the cell hooks.
*
* @augments {Partition}
*/
var Grid = class extends Partition {
	/**
	* Cell edge length.
	*
	* @type {number}
	*/
	size = 1;
	#results = new Nearest();
	#center;
	#lo;
	#hi;
	/**
	* @param {object} [options]
	* @param {number} [options.dimension=3]
	* @param {import("./partition.js").Bounds} [options.bounds]
	*/
	constructor(options) {
		super(options);
		this.#center = new Float64Array(this.dimension);
		this.#lo = new Float64Array(this.dimension);
		this.#hi = new Float64Array(this.dimension);
	}
	/**
	* @param {Float64Array} min
	* @param {Float64Array} max
	* @protected
	*/
	_collect(min, max) {
		const lo = this.#lo;
		const hi = this.#hi;
		for (let k = 0; k < this.dimension; k++) {
			lo[k] = this._cell(min[k], k);
			hi[k] = this._cell(max[k], k);
		}
		this._beginQuery();
		if (this._overflows(lo, hi)) this._collectRemaining();
		else this._collectCells(lo, hi);
	}
	/**
	* Indices of the `k` points nearest to `position`, sorted by distance.
	*
	* @param {import("./partition.js").Position} position
	* @param {number} k
	* @param {number} [maxDistance=Infinity] Ignore points farther than this.
	* @param {number[]} [out=[]] Overwritten and returned. Reuse it to avoid
	*   allocating.
	* @returns {number[]}
	* @see Bentley, J. L., Weide, B. W., & Yao, A. C. (1980). Optimal expected-time algorithms for closest point problems. ACM Transactions on Mathematical Software, 6(4), 563–580. https://doi.org/10.1145/355921.355927 (spiral search)
	*/
	queryNearest(position, k, maxDistance = Infinity, out = []) {
		this.candidateCount = 0;
		if (!this.count || k < 1 || maxDistance < 0) {
			out.length = 0;
			return out;
		}
		const { dimension } = this;
		const results = this.#results;
		const center = this.#center;
		const lo = this.#lo;
		const hi = this.#hi;
		for (let a = 0; a < dimension; a++) center[a] = this._cell(position[a], a);
		let bound = maxDistance * maxDistance;
		results.reset(Math.min(Math.floor(k), this.count));
		this._beginQuery();
		for (let ring = this._firstRing(center);; ring++) {
			const start = this.candidateCount;
			for (let a = 0; a < dimension; a++) {
				lo[a] = center[a] - ring;
				hi[a] = center[a] + ring;
			}
			let complete = this._covers(lo, hi);
			if (this._overflows(lo, hi)) {
				this._collectRemaining();
				complete = true;
			} else this.#collectRing(ring);
			bound = this.#scanCandidates(position, start, bound);
			const reach = ring * this.size;
			if (complete || reach * reach >= bound) break;
		}
		return results.drain(out);
	}
	/**
	* Integer cell coordinate of a value along an axis.
	*
	* @abstract
	* @param {number} value
	* @param {number} k
	* @returns {number}
	* @protected
	*/
	_cell(value, k) {
		throw new Error("Not implemented");
	}
	/**
	* Append the points of the occupied cells in [lo, hi] to `_candidates`,
	* skipping cells already collected since `_beginQuery`.
	*
	* @abstract
	* @param {Float64Array} lo
	* @param {Float64Array} hi
	* @protected
	*/
	_collectCells(lo, hi) {
		throw new Error("Not implemented");
	}
	/**
	* Whether [lo, hi] holds every occupied cell.
	*
	* @abstract
	* @param {Float64Array} lo
	* @param {Float64Array} hi
	* @returns {boolean}
	* @protected
	*/
	_covers(lo, hi) {
		throw new Error("Not implemented");
	}
	/**
	* First ring around `center` holding occupied cells: inner rings are empty.
	*
	* @param {Float64Array} center
	* @returns {number}
	* @protected
	*/
	_firstRing(center) {
		return 0;
	}
	/**
	* Whether visiting [lo, hi] cell by cell costs more than visiting every
	* point.
	*
	* @param {Float64Array} lo
	* @param {Float64Array} hi
	* @returns {boolean}
	* @protected
	*/
	_overflows(lo, hi) {
		return false;
	}
	/**
	* Append the points not collected since `_beginQuery` to `_candidates`.
	*
	* @protected
	*/
	_collectRemaining() {
		throw new Error("Not implemented");
	}
	/**
	* Start a query: cells collected from now on are not collected twice.
	*
	* @protected
	*/
	_beginQuery() {}
	/**
	* Keep the candidates from `start` closer than `bound` among the nearest
	* found.
	*
	* @private
	* @param {import("./partition.js").Position} position
	* @param {number} start
	* @param {number} bound Squared distance.
	* @returns {number} Updated bound: the k-th squared distance once k points
	*   are found.
	*/
	#scanCandidates(position, start, bound) {
		const { points, dimension, candidateCount } = this;
		const results = this.#results;
		const candidates = this._candidates;
		for (let j = start; j < candidateCount; j++) {
			const i = candidates[j];
			const distance = avecDistanceSquared(points, i, position, 0, dimension);
			if (distance > bound) continue;
			bound = results.push(i, distance, bound);
		}
		return bound;
	}
	/**
	* Collect the cells at Chebyshev distance `ring` from the center cell, as
	* disjoint slabs: the slab of axis `a` holds the cells whose first axis at
	* distance `ring` is `a`.
	*
	* @private
	* @param {number} ring
	*/
	#collectRing(ring) {
		const { dimension } = this;
		const center = this.#center;
		const lo = this.#lo;
		const hi = this.#hi;
		if (ring === 0) {
			lo.set(center);
			hi.set(center);
			this._collectCells(lo, hi);
			return;
		}
		for (let a = 0; a < dimension; a++) for (let side = -1; side <= 1; side += 2) {
			for (let k = 0; k < dimension; k++) {
				const extent = k < a ? ring - 1 : ring;
				lo[k] = center[k] - extent;
				hi[k] = center[k] + extent;
			}
			lo[a] = hi[a] = center[a] + side * ring;
			this._collectCells(lo, hi);
		}
	}
};

var cells_exports = /* @__PURE__ */ __exportAll({
	clip: () => clip,
	gridResolution: () => gridResolution,
	nextCell: () => nextCell
});
/** @module cells */
/**
* Advance `cell` to the next integer coordinates in [lo, hi], first axis
* fastest.
*
* @param {Float64Array} cell
* @param {ArrayLike<number>} lo
* @param {ArrayLike<number>} hi
* @param {number} dimension
* @returns {boolean} False once every cell was visited.
*/
function nextCell(cell, lo, hi, dimension) {
	for (let k = 0; k < dimension; k++) {
		if (cell[k] < hi[k]) {
			cell[k]++;
			return true;
		}
		cell[k] = lo[k];
	}
	return false;
}
/**
* Number of cells of `size` along each axis to cover bounds.
*
* @param {Uint32Array} resolution Filled with the cell count of each axis.
* @param {ArrayLike<number>} min
* @param {ArrayLike<number>} max
* @param {number} size Cell edge length.
* @param {number} dimension
* @returns {number} Total cell count, NaN for non-finite bounds.
*/
function gridResolution(resolution, min, max, size, dimension) {
	let cellCount = 1;
	for (let k = 0; k < dimension; k++) {
		const cells = Math.max(1, Math.ceil((max[k] - min[k]) / size));
		resolution[k] = cells;
		cellCount *= cells;
	}
	return cellCount;
}
/**
* Intersect the cell range [lo, hi] with [rangeLo, rangeHi].
*
* @param {ArrayLike<number>} lo
* @param {ArrayLike<number>} hi
* @param {ArrayLike<number>} rangeLo
* @param {ArrayLike<number>} rangeHi
* @param {Float64Array} clippedLo
* @param {Float64Array} clippedHi
* @param {number} dimension
* @returns {boolean} False when empty.
*/
function clip(lo, hi, rangeLo, rangeHi, clippedLo, clippedHi, dimension) {
	for (let k = 0; k < dimension; k++) {
		clippedLo[k] = Math.max(lo[k], rangeLo[k]);
		clippedHi[k] = Math.min(hi[k], rangeHi[k]);
		if (clippedLo[k] > clippedHi[k]) return false;
	}
	return true;
}

var sort_exports = /* @__PURE__ */ __exportAll({
	countingSort: () => countingSort,
	lowerBound: () => lowerBound,
	quickselect: () => quickselect,
	radixSort: () => radixSort
});
/** @module sort */
/**
* Stable counting sort of positions [lo, hi) by key: key `c` ends up in
* `sorted[lo + starts[c]]` to `sorted[lo + starts[c + 1] - 1]`.
*
* @param {Uint32Array} keys Key of each position.
* @param {number} lo
* @param {number} hi Exclusive.
* @param {number} keyCount
* @param {Uint32Array} starts At least `keyCount + 1` elements, relative to
*   `lo`.
* @param {Uint32Array} sorted
* @param {ArrayLike<number>} [values] Sorted values, the positions themselves
*   if omitted.
* @see Knuth, D. E. (1998). The art of computer programming, vol. 3: Sorting and searching (2nd ed.), §5.2, Algorithm D (distribution counting). Addison-Wesley.
*/
function countingSort(keys, lo, hi, keyCount, starts, sorted, values) {
	starts.fill(0, 0, keyCount + 1);
	for (let i = lo; i < hi; i++) starts[keys[i] + 1]++;
	for (let c = 0; c < keyCount; c++) starts[c + 1] += starts[c];
	for (let i = lo; i < hi; i++) sorted[lo + starts[keys[i]]++] = values ? values[i] : i;
	for (let c = keyCount; c > 0; c--) starts[c] = starts[c - 1];
	starts[0] = 0;
}
const RADIX_BITS = 8;
const RADIX = 256;
const histogram = new Uint32Array(RADIX);
/**
* Stable LSD radix sort of `keys` with their `values`.
*
* @param {Uint32Array} keys
* @param {Uint32Array} values
* @param {Uint32Array} keysTemp
* @param {Uint32Array} valuesTemp
* @param {number} count
* @param {number} bits Significant bits of the keys.
* @see Knuth, D. E. (1998). The art of computer programming, vol. 3: Sorting and searching (2nd ed.), §5.2.5. Addison-Wesley.
*/
function radixSort(keys, values, keysTemp, valuesTemp, count, bits) {
	const passes = Math.ceil(bits / RADIX_BITS);
	let fromKeys = keys;
	let fromValues = values;
	let toKeys = keysTemp;
	let toValues = valuesTemp;
	for (let pass = 0; pass < passes; pass++) {
		const shift = pass * RADIX_BITS;
		histogram.fill(0);
		for (let i = 0; i < count; i++) histogram[fromKeys[i] >>> shift & 255]++;
		let sum = 0;
		for (let r = 0; r < RADIX; r++) {
			const bucket = histogram[r];
			histogram[r] = sum;
			sum += bucket;
		}
		for (let i = 0; i < count; i++) {
			const slot = histogram[fromKeys[i] >>> shift & 255]++;
			toKeys[slot] = fromKeys[i];
			toValues[slot] = fromValues[i];
		}
		const swapKeys = fromKeys;
		const swapValues = fromValues;
		fromKeys = toKeys;
		fromValues = toValues;
		toKeys = swapKeys;
		toValues = swapValues;
	}
	if (fromKeys !== keys) for (let i = 0; i < count; i++) {
		keys[i] = fromKeys[i];
		values[i] = fromValues[i];
	}
}
/**
* @private
* @param {Uint32Array} indices
* @param {number} i
* @param {number} j
*/
function swap(indices, i, j) {
	const index = indices[i];
	indices[i] = indices[j];
	indices[j] = index;
}
/**
* Partition `indices[left..right]` around the value at `k`.
*
* @private
* @param {Uint32Array} indices
* @param {number} left
* @param {number} right Inclusive.
* @param {number} k
* @param {ArrayLike<number>} points
* @param {number} dimension
* @param {number} axis
* @returns {number} Final position of the value at `k`: smaller or equal values
*   before, greater or equal after.
*/
function partition(indices, left, right, k, points, dimension, axis) {
	const t = points[indices[k] * dimension + axis];
	let i = left;
	let j = right;
	swap(indices, left, k);
	if (points[indices[right] * dimension + axis] > t) swap(indices, left, right);
	while (i < j) {
		swap(indices, i, j);
		i++;
		j--;
		while (points[indices[i] * dimension + axis] < t) i++;
		while (points[indices[j] * dimension + axis] > t) j--;
	}
	if (points[indices[left] * dimension + axis] === t) swap(indices, left, j);
	else {
		j++;
		swap(indices, j, right);
	}
	return j;
}
const SAMPLE_THRESHOLD = 600;
/**
* Floyd–Rivest selection: reorder `indices[left..right]` so that the point at
* `k` has rank `k` along `axis`, with smaller or equal values before and
* greater or equal values after.
*
* @param {Uint32Array} indices
* @param {number} left
* @param {number} right Inclusive.
* @param {number} k
* @param {ArrayLike<number>} points
* @param {number} dimension
* @param {number} axis
* @see Floyd, R. W., & Rivest, R. L. (1975). Algorithm 489: The algorithm SELECT—for finding the ith smallest of n elements. Communications of the ACM, 18(3), 173. https://doi.org/10.1145/360680.360694
* @see https://github.com/mourner/kdbush/blob/main/index.js (`select`)
*/
function quickselect(indices, left, right, k, points, dimension, axis) {
	while (right > left) {
		if (right - left > SAMPLE_THRESHOLD) {
			const n = right - left + 1;
			const m = k - left + 1;
			const z = Math.log(n);
			const s = .5 * Math.exp(2 * z / 3);
			const sd = .5 * Math.sqrt(z * s * (n - s) / n) * (m < n / 2 ? -1 : 1);
			quickselect(indices, Math.max(left, Math.floor(k - m * s / n + sd)), Math.min(right, Math.floor(k + (n - m) * s / n + sd)), k, points, dimension, axis);
		}
		const j = partition(indices, left, right, k, points, dimension, axis);
		if (j <= k) left = j + 1;
		if (k <= j) right = j - 1;
	}
}
/**
* First position in sorted `values[lo..hi)` not below `value`.
*
* @param {Uint32Array} values
* @param {number} lo
* @param {number} hi
* @param {number} value
* @returns {number}
*/
function lowerBound(values, lo, hi, value) {
	while (lo < hi) {
		const mid = lo + hi >>> 1;
		if (values[mid] < value) lo = mid + 1;
		else hi = mid;
	}
	return lo;
}

/** @module uniformGrid */
const CELLS_PER_POINT = 4;
/**
* @typedef {object} UniformGridOptions
* @property {number} [dimension=3] Number of components per point.
* @property {number} [cellSize=1] Cell edge length. Match the usual query
*   radius.
* @property {import("./partition.js").Bounds} [bounds] Fixed bounds. Points
*   outside are kept in the edge cells. Defaults to the points bounds on each
*   build.
* @property {number} [maxCells=4194304] Cells are doubled in size until there
*   are no more than `maxCells`, and no more than 4 per point.
*/
/**
* Dense grid of equal cells over bounds. O(n) builds.
*
* Best for bounded, evenly spread points queried with a fixed radius.
*
* @augments {Grid}
* @see Hockney, R. W., & Eastwood, J. W. (1981). Computer simulation using particles. McGraw-Hill. (cell lists)
* @see Green, S. (2010). Particle simulation using CUDA. NVIDIA. https://developer.download.nvidia.com/assets/cuda/files/particles.pdf (sorted cell start layout)
*/
var UniformGrid = class extends Grid {
	/**
	* Number of cells along each axis.
	*
	* @type {Uint32Array}
	*/
	resolution;
	#cellSize;
	#maxCells;
	#strides;
	#firstCell;
	#lastCell;
	#cellCount = 0;
	#cellOf = /* @__PURE__ */ new Uint32Array(0);
	#cellStart = /* @__PURE__ */ new Uint32Array(0);
	#sorted = /* @__PURE__ */ new Uint32Array(0);
	#lo;
	#hi;
	#cell;
	#nodeMin;
	#nodeMax;
	/** @param {UniformGridOptions} [options] */
	constructor({ dimension = 3, cellSize = 1, bounds, maxCells = 2 ** 22 } = {}) {
		super({
			dimension,
			bounds
		});
		this.#cellSize = Math.max(cellSize, Number.MIN_VALUE);
		this.#maxCells = maxCells;
		this.size = cellSize;
		this.resolution = new Uint32Array(dimension);
		this.#strides = new Float64Array(dimension);
		this.#firstCell = new Float64Array(dimension);
		this.#lastCell = new Float64Array(dimension);
		this.#lo = new Float64Array(dimension);
		this.#hi = new Float64Array(dimension);
		this.#cell = new Float64Array(dimension);
		this.#nodeMin = new Float64Array(dimension);
		this.#nodeMax = new Float64Array(dimension);
	}
	/** @protected */
	_build() {
		const { points, indices, dimension, count, resolution } = this;
		const [min, max] = this.bounds;
		const maxCells = Math.min(this.#maxCells, Math.max(CELLS_PER_POINT * count, 1));
		let size = this.#cellSize;
		let cellCount = gridResolution(resolution, min, max, size, dimension);
		while (cellCount > maxCells) {
			size *= 2;
			cellCount = gridResolution(resolution, min, max, size, dimension);
		}
		this.size = size;
		this.#cellCount = cellCount;
		let stride = 1;
		for (let k = 0; k < dimension; k++) {
			this.#strides[k] = stride;
			stride *= resolution[k];
			this.#lastCell[k] = resolution[k] - 1;
		}
		this.#cellOf = typedArrayReserve(this.#cellOf, count);
		this.#cellStart = typedArrayReserve(this.#cellStart, cellCount + 1);
		this.#sorted = typedArrayReserve(this.#sorted, count);
		for (let j = 0; j < count; j++) {
			const i = indices ? indices[j] : j;
			let cell = 0;
			for (let k = 0; k < dimension; k++) cell += this._cell(points[i * dimension + k], k) * this.#strides[k];
			this.#cellOf[j] = cell;
		}
		countingSort(this.#cellOf, 0, count, cellCount, this.#cellStart, this.#sorted, indices);
	}
	/**
	* Cell coordinate of a value along an axis, clamped into the grid.
	*
	* @param {number} value
	* @param {number} k
	* @returns {number}
	* @protected
	*/
	_cell(value, k) {
		const coordinate = Math.floor((value - this.bounds[0][k]) / this.size);
		return Math.min(Math.max(coordinate, 0), this.resolution[k] - 1);
	}
	/**
	* @param {Float64Array} lo
	* @param {Float64Array} hi
	* @protected
	*/
	_collectCells(lo, hi) {
		const { dimension } = this;
		const clippedLo = this.#lo;
		const clippedHi = this.#hi;
		const firstCell = this.#firstCell;
		const lastCell = this.#lastCell;
		if (!clip(lo, hi, firstCell, lastCell, clippedLo, clippedHi, dimension)) return;
		const candidates = this._candidates;
		let length = this.candidateCount;
		const cell = this.#cell;
		cell.set(clippedLo);
		do {
			let c = 0;
			for (let k = 0; k < dimension; k++) c += cell[k] * this.#strides[k];
			for (let j = this.#cellStart[c]; j < this.#cellStart[c + 1]; j++) candidates[length++] = this.#sorted[j];
		} while (nextCell(cell, clippedLo, clippedHi, dimension));
		this.candidateCount = length;
	}
	/**
	* @param {Float64Array} lo
	* @param {Float64Array} hi
	* @returns {boolean}
	* @protected
	*/
	_covers(lo, hi) {
		const { dimension } = this;
		const firstCell = this.#firstCell;
		const lastCell = this.#lastCell;
		return boundsOverlap(firstCell, lastCell, 0, lo, hi, dimension) === 2;
	}
	/**
	* Visit every cell, empty ones included.
	*
	* @param {import("./partition.js").NodeCallback} callback
	*/
	forEachNode(callback) {
		const { dimension, resolution, size } = this;
		const [boundsMin] = this.bounds;
		const min = this.#nodeMin;
		const max = this.#nodeMax;
		for (let c = 0; c < this.#cellCount; c++) {
			for (let k = 0; k < dimension; k++) {
				const cell = Math.floor(c / this.#strides[k]) % resolution[k];
				min[k] = boundsMin[k] + cell * size;
				max[k] = min[k] + size;
			}
			callback(min, max, 0, this.#cellStart[c + 1] - this.#cellStart[c]);
		}
	}
};

function fmix(input) {
	input ^= input >>> 16;
	input = Math.imul(input, 2246822507);
	input ^= input >>> 13;
	input = Math.imul(input, 3266489909);
	input ^= input >>> 16;
	return input >>> 0;
}

/** @module hashGrid */
const PRIMES = [
	73856093,
	19349663,
	83492791
];
/**
* @typedef {object} HashGridOptions
* @property {number} [dimension=3] Number of components per point.
* @property {number} [cellSize=1] Cell edge length. Match the usual query
*   radius.
* @property {number} [tableSize] Number of hash buckets, rounded up to a power
*   of two. Defaults to twice the number of points on each build.
*/
/**
* Unbounded grid of equal cells hashed into buckets. O(n) builds, memory
* independent of the extent.
*
* Best for sparse or unbounded points queried with a fixed radius.
*
* @augments {Grid}
* @see Teschner, M., Heidelberger, B., Müller, M., Pomeranets, D., & Gross, M. (2003). Optimized spatial hashing for collision detection of deformable objects. Proceedings of Vision, Modeling, Visualization (VMV), 47–54. https://matthias-research.github.io/pages/publications/tetraederCollision.pdf
* @see Müller, M. Ten Minute Physics, 11: Finding overlaps among thousands of objects blazing fast. https://matthias-research.github.io/pages/tenMinutePhysics/index.html (dense hash table filled by counting sort)
*/
var HashGrid = class extends Grid {
	/**
	* Number of hash buckets of the last build.
	*
	* @type {number}
	*/
	tableSize = 0;
	#tableSizeOption;
	#bucketOf = /* @__PURE__ */ new Uint32Array(0);
	#bucketStart = /* @__PURE__ */ new Uint32Array(0);
	#sorted = /* @__PURE__ */ new Uint32Array(0);
	#visited = /* @__PURE__ */ new Uint32Array(0);
	#stamp = 0;
	#occupiedLo;
	#occupiedHi;
	#lo;
	#hi;
	#cell;
	/** @param {HashGridOptions} [options] */
	constructor({ dimension = 3, cellSize = 1, tableSize } = {}) {
		super({ dimension });
		this.size = cellSize;
		this.#tableSizeOption = tableSize;
		this.#occupiedLo = new Float64Array(dimension);
		this.#occupiedHi = new Float64Array(dimension);
		this.#lo = new Float64Array(dimension);
		this.#hi = new Float64Array(dimension);
		this.#cell = new Float64Array(dimension);
	}
	/** @protected */
	_build() {
		const { points, indices, dimension, count } = this;
		const tableSize = 2 ** Math.ceil(Math.log2(Math.max(this.#tableSizeOption ?? count * 2, 1)));
		if (tableSize !== this.tableSize) {
			this.#visited = typedArrayReserve(this.#visited, tableSize);
			this.#visited.fill(0);
			this.#stamp = 0;
		}
		this.tableSize = tableSize;
		const [min, max] = this.bounds;
		for (let k = 0; k < dimension; k++) {
			this.#occupiedLo[k] = this._cell(min[k]);
			this.#occupiedHi[k] = this._cell(max[k]);
		}
		this.#bucketOf = typedArrayReserve(this.#bucketOf, count);
		this.#bucketStart = typedArrayReserve(this.#bucketStart, tableSize + 1);
		this.#sorted = typedArrayReserve(this.#sorted, count);
		const cell = this.#cell;
		for (let j = 0; j < count; j++) {
			const i = indices ? indices[j] : j;
			for (let k = 0; k < dimension; k++) cell[k] = this._cell(points[i * dimension + k]);
			this.#bucketOf[j] = this.#hash(cell);
		}
		countingSort(this.#bucketOf, 0, count, tableSize, this.#bucketStart, this.#sorted, indices);
	}
	/**
	* @param {number} value
	* @returns {number}
	* @protected
	*/
	_cell(value) {
		return Math.floor(value / this.size);
	}
	/** @protected */
	_beginQuery() {
		if (++this.#stamp < 2 ** 32) return;
		this.#visited.fill(0);
		this.#stamp = 1;
	}
	/**
	* @param {Float64Array} lo
	* @param {Float64Array} hi
	* @protected
	*/
	_collectCells(lo, hi) {
		if (!this.#clip(lo, hi)) return;
		const { dimension } = this;
		const clippedLo = this.#lo;
		const clippedHi = this.#hi;
		const cell = this.#cell;
		cell.set(clippedLo);
		do
			this.#collectBucket(this.#hash(cell));
		while (nextCell(cell, clippedLo, clippedHi, dimension));
	}
	/**
	* @param {Float64Array} center
	* @returns {number}
	* @protected
	*/
	_firstRing(center) {
		let ring = 0;
		for (let k = 0; k < this.dimension; k++) ring = Math.max(ring, this.#occupiedLo[k] - center[k], center[k] - this.#occupiedHi[k]);
		return ring;
	}
	/**
	* @param {Float64Array} lo
	* @param {Float64Array} hi
	* @returns {boolean}
	* @protected
	*/
	_overflows(lo, hi) {
		if (!this.#clip(lo, hi)) return false;
		let cellCount = 1;
		for (let k = 0; k < this.dimension; k++) cellCount *= this.#hi[k] - this.#lo[k] + 1;
		return cellCount >= this.tableSize;
	}
	/** @protected */
	_collectRemaining() {
		for (let bucket = 0; bucket < this.tableSize; bucket++) this.#collectBucket(bucket);
	}
	/**
	* @param {Float64Array} lo
	* @param {Float64Array} hi
	* @returns {boolean}
	* @protected
	*/
	_covers(lo, hi) {
		const { dimension } = this;
		const occupiedLo = this.#occupiedLo;
		const occupiedHi = this.#occupiedHi;
		return boundsOverlap(occupiedLo, occupiedHi, 0, lo, hi, dimension) === 2;
	}
	/**
	* Visit every non-empty cell. Allocates: meant for debugging and
	* visualisation.
	*
	* @param {import("./partition.js").NodeCallback} callback
	*/
	forEachNode(callback) {
		const { points, indices, dimension, count, size } = this;
		/** @type {Map<string, number[]>} */
		const cells = /* @__PURE__ */ new Map();
		for (let j = 0; j < count; j++) {
			const i = indices ? indices[j] : j;
			const cell = Array.from({ length: dimension }, (_, k) => this._cell(points[i * dimension + k]));
			const key = cell.join(",");
			const entry = cells.get(key);
			if (entry) entry[dimension]++;
			else cells.set(key, [...cell, 1]);
		}
		const min = new Float64Array(dimension);
		const max = new Float64Array(dimension);
		for (const entry of cells.values()) {
			for (let k = 0; k < dimension; k++) {
				min[k] = entry[k] * size;
				max[k] = min[k] + size;
			}
			callback(min, max, 0, entry[dimension]);
		}
	}
	/**
	* Intersect a cell range with the occupied cells into `#lo` and `#hi`.
	*
	* @private
	* @param {Float64Array} lo
	* @param {Float64Array} hi
	* @returns {boolean} False when empty.
	*/
	#clip(lo, hi) {
		return clip(lo, hi, this.#occupiedLo, this.#occupiedHi, this.#lo, this.#hi, this.dimension);
	}
	/**
	* @private
	* @param {number} bucket
	*/
	#collectBucket(bucket) {
		if (this.#visited[bucket] === this.#stamp) return;
		this.#visited[bucket] = this.#stamp;
		const candidates = this._candidates;
		let length = this.candidateCount;
		const end = this.#bucketStart[bucket + 1];
		for (let j = this.#bucketStart[bucket]; j < end; j++) candidates[length++] = this.#sorted[j];
		this.candidateCount = length;
	}
	/**
	* @private
	* @param {Float64Array} cell
	* @returns {number}
	*/
	#hash(cell) {
		let hash = 0;
		for (let k = 0; k < this.dimension; k++) hash ^= Math.imul(cell[k], PRIMES[k % PRIMES.length]);
		return fmix(hash) & this.tableSize - 1;
	}
};

/**
* @typedef {Float64ArrayConstructor | Float32ArrayConstructor |
*   Uint32ArrayConstructor | Int32ArrayConstructor | Uint16ArrayConstructor |
*   Int16ArrayConstructor | Uint8ArrayConstructor | Int8ArrayConstructor} TypedArrayConstructor
*/
/** @template [T=number] */
var FlatQueue = class {
	/**
	* Creates an empty queue. If `capacity` is provided, the queue is backed by fixed-size typed
	* arrays for better performance and memory use, but can't grow beyond `capacity`. `values` uses
	* `ValuesArray` (default `Float64Array`) and `ids` uses `IdsArray` (default `Uint32Array`); pass
	* narrower constructors like `Uint16Array` if your values or ids are known to fit them.
	*
	* @param {number} [capacity]
	* @param {TypedArrayConstructor} [ValuesArray]
	* @param {TypedArrayConstructor} [IdsArray]
	*/
	constructor(capacity = Infinity, ValuesArray = Float64Array, IdsArray = Uint32Array) {
		const fixed = capacity !== Infinity;
		/** @type {T[]} */
		this.ids = fixed ? new IdsArray(capacity) : [];
		/** @type {number[]} */
		this.values = fixed ? new ValuesArray(capacity) : [];
		/** Maximum number of items the queue can hold; `Infinity` for regular-array queues, which grow on demand. */
		this.capacity = capacity;
		/** Number of items in the queue. */
		this.length = 0;
	}
	/** Removes all items from the queue. */
	clear() {
		this.length = 0;
	}
	/**
	* Adds `item` to the queue with the specified `priority`.
	*
	* `priority` must be a number. Items are sorted and returned from low to high priority. Multiple items
	* with the same priority value can be added to the queue, but there is no guaranteed order between these items.
	*
	* For fixed-capacity queues, throws a `RangeError` if the queue is already full.
	*
	* @param {T} item
	* @param {number} priority
	*/
	push(item, priority) {
		if (this.length === this.capacity) throw new RangeError("Queue is at capacity.");
		let pos = this.length++;
		while (pos > 0) {
			const parent = pos - 1 >> 1;
			const parentValue = this.values[parent];
			if (priority >= parentValue) break;
			this.ids[pos] = this.ids[parent];
			this.values[pos] = parentValue;
			pos = parent;
		}
		this.ids[pos] = item;
		this.values[pos] = priority;
	}
	/**
	* Removes and returns the item from the head of this queue, which is one of
	* the items with the lowest priority. If this queue is empty, returns `undefined`.
	*/
	pop() {
		if (this.length === 0) return void 0;
		const ids = this.ids, values = this.values, top = ids[0], last = --this.length;
		if (last > 0) {
			const id = ids[last];
			const value = values[last];
			let pos = 0;
			const halfLen = last >> 1;
			while (pos < halfLen) {
				const left = (pos << 1) + 1;
				const right = left + 1;
				const child = left + (+(right < last) & +(values[right] < values[left]));
				if (values[child] >= value) break;
				ids[pos] = ids[child];
				values[pos] = values[child];
				pos = child;
			}
			ids[pos] = id;
			values[pos] = value;
		}
		return top;
	}
	/** Returns the item from the head of this queue without removing it. If this queue is empty, returns `undefined`. */
	peek() {
		return this.length > 0 ? this.ids[0] : void 0;
	}
	/**
	* Returns the priority value of the item at the head of this queue without
	* removing it. If this queue is empty, returns `undefined`.
	*/
	peekValue() {
		return this.length > 0 ? this.values[0] : void 0;
	}
	/**
	* Shrinks the internal arrays to `this.length`. No-op for queues with fixed capacity.
	*
	* `pop()` and `clear()` calls don't free memory automatically to avoid unnecessary resize operations.
	* This also means that items that have been added to the queue can't be garbage collected until
	* a new item is pushed in their place, or this method is called.
	*/
	shrink() {
		if (Array.isArray(this.ids)) this.ids.length = this.length;
		if (Array.isArray(this.values)) this.values.length = this.length;
	}
};

/** @module tree */
/**
* Base class of trees whose nodes are ranges of `_indices`. Subclasses fill the
* node arrays.
*
* @augments {Partition}
*/
var Tree = class extends Partition {
	/**
	* Point indices in tree order: every node is a contiguous range.
	*
	* @type {Uint32Array}
	* @protected
	*/
	_indices = /* @__PURE__ */ new Uint32Array(0);
	/**
	* First position of each node in `_indices`.
	*
	* @type {Uint32Array}
	* @protected
	*/
	_lo = /* @__PURE__ */ new Uint32Array(0);
	/**
	* End position of each node in `_indices`, exclusive.
	*
	* @type {Uint32Array}
	* @protected
	*/
	_hi = /* @__PURE__ */ new Uint32Array(0);
	/**
	* First child of each node: the children of a node are contiguous.
	*
	* @type {Uint32Array}
	* @protected
	*/
	_firstChild = /* @__PURE__ */ new Uint32Array(0);
	/**
	* Number of children of each node, 0 for leaves.
	*
	* @type {Uint32Array}
	* @protected
	*/
	_childCount = /* @__PURE__ */ new Uint32Array(0);
	/**
	* Min corner of each node box, `dimension` values per node.
	*
	* @type {Float64Array}
	* @protected
	*/
	_boxMin = /* @__PURE__ */ new Float64Array(0);
	/**
	* Max corner of each node box, `dimension` values per node.
	*
	* @type {Float64Array}
	* @protected
	*/
	_boxMax = /* @__PURE__ */ new Float64Array(0);
	#stack = /* @__PURE__ */ new Uint32Array(0);
	#queue = new FlatQueue();
	#results = new Nearest();
	#position;
	#min;
	#max;
	/**
	* @param {object} [options]
	* @param {number} [options.dimension=3]
	* @param {import("./partition.js").Bounds} [options.bounds]
	*/
	constructor(options) {
		super(options);
		this.#position = new Float64Array(this.dimension);
		this.#min = new Float64Array(this.dimension);
		this.#max = new Float64Array(this.dimension);
	}
	/**
	* Fill `_indices` with the indices of the points of the build.
	*
	* @protected
	*/
	_resetIndices() {
		const { count, indices } = this;
		this._indices = typedArrayReserve(this._indices, count);
		if (indices) this._indices.set(indices);
		else for (let i = 0; i < count; i++) this._indices[i] = i;
	}
	/**
	* Grow the node arrays to hold `nodeCount` nodes.
	*
	* @param {number} nodeCount
	* @param {boolean} [copy=false] Keep the existing nodes.
	* @param {boolean} [boxes=true] Also grow `_boxMin` and `_boxMax`.
	* @protected
	*/
	_reserveNodes(nodeCount, copy = false, boxes = true) {
		this._lo = typedArrayReserve(this._lo, nodeCount, copy);
		this._hi = typedArrayReserve(this._hi, nodeCount, copy);
		this._firstChild = typedArrayReserve(this._firstChild, nodeCount, copy);
		this._childCount = typedArrayReserve(this._childCount, nodeCount, copy);
		if (!boxes) return;
		const length = nodeCount * this.dimension;
		this._boxMin = typedArrayReserve(this._boxMin, length, copy);
		this._boxMax = typedArrayReserve(this._boxMax, length, copy);
	}
	/**
	* Indices of the `k` points nearest to `position`, sorted by distance.
	*
	* @param {import("./partition.js").Position} position
	* @param {number} k
	* @param {number} [maxDistance=Infinity] Ignore points farther than this.
	* @param {number[]} [out=[]] Overwritten and returned. Reuse it to avoid
	*   allocating.
	* @returns {number[]}
	* @see Hjaltason, G. R., & Samet, H. (1999). Distance browsing in spatial databases. ACM Transactions on Database Systems, 24(2), 265–318. https://doi.org/10.1145/320248.320255
	*/
	queryNearest(position, k, maxDistance = Infinity, out = []) {
		this.candidateCount = 0;
		if (!this.count || k < 1 || maxDistance < 0) {
			out.length = 0;
			return out;
		}
		const { dimension } = this;
		const queue = this.#queue;
		const results = this.#results;
		const from = this.#position;
		if (this._hasFixedBounds) boundsClamp(position, position, this.bounds, from, from, dimension);
		else for (let a = 0; a < dimension; a++) from[a] = position[a];
		let bound = maxDistance * maxDistance;
		results.reset(Math.min(Math.floor(k), this.count));
		queue.clear();
		queue.push(0, this.#nodeDistance(0, from));
		while (queue.length && queue.values[0] <= bound) {
			const node = queue.pop();
			if (this._childCount[node]) this.#queueChildren(node, from, bound);
			else bound = this.#scanLeaf(node, position, bound);
		}
		return results.drain(out);
	}
	/**
	* @param {Float64Array} min
	* @param {Float64Array} max
	* @protected
	*/
	_collect(min, max) {
		const candidates = this._candidates;
		let length = this.candidateCount;
		let stack = typedArrayReserve(this.#stack, 1);
		let size = 0;
		stack[size++] = 0;
		while (size) {
			const node = stack[--size];
			const lo = this._lo[node];
			const hi = this._hi[node];
			if (lo === hi) continue;
			const nodeOverlap = this._overlap(node, min, max);
			if (nodeOverlap === 0) continue;
			const childCount = this._childCount[node];
			if (nodeOverlap === 2 || !childCount) for (let j = lo; j < hi; j++) candidates[length++] = this._indices[j];
			else {
				stack = typedArrayReserve(stack, size + childCount, true);
				const first = this._firstChild[node];
				for (let c = 0; c < childCount; c++) stack[size++] = first + c;
			}
		}
		this.#stack = stack;
		this.candidateCount = length;
	}
	/**
	* Overlap of a node box with a query box.
	*
	* @param {number} node
	* @param {Float64Array} min
	* @param {Float64Array} max
	* @returns {number} `OUTSIDE`, `INTERSECTS` or `INSIDE`.
	* @protected
	*/
	_overlap(node, min, max) {
		const { dimension } = this;
		return boundsOverlap(this._boxMin, this._boxMax, node * dimension, min, max, dimension);
	}
	/**
	* Box containing the points of a node, inside bounds.
	*
	* @param {number} node
	* @param {Float64Array} min
	* @param {Float64Array} max
	* @protected
	*/
	_nodeBox(node, min, max) {
		const { dimension } = this;
		const offset = node * dimension;
		for (let k = 0; k < dimension; k++) {
			min[k] = this._boxMin[offset + k];
			max[k] = this._boxMax[offset + k];
		}
	}
	/**
	* Queue the non-empty children of a node closer than `bound`.
	*
	* @private
	* @param {number} node
	* @param {Float64Array} from
	* @param {number} bound Squared distance.
	*/
	#queueChildren(node, from, bound) {
		const first = this._firstChild[node];
		const end = first + this._childCount[node];
		for (let child = first; child < end; child++) {
			if (this._lo[child] === this._hi[child]) continue;
			const distance = this.#nodeDistance(child, from);
			if (distance <= bound) this.#queue.push(child, distance);
		}
	}
	/**
	* Keep the leaf points closer than `bound` among the nearest found.
	*
	* @private
	* @param {number} node
	* @param {import("./partition.js").Position} position
	* @param {number} bound Squared distance.
	* @returns {number} Updated bound: the k-th squared distance once k points
	*   are found.
	*/
	#scanLeaf(node, position, bound) {
		const { points, dimension } = this;
		const results = this.#results;
		const hi = this._hi[node];
		for (let j = this._lo[node]; j < hi; j++) {
			const i = this._indices[j];
			const distance = avecDistanceSquared(points, i, position, 0, dimension);
			this.candidateCount++;
			if (distance > bound) continue;
			bound = results.push(i, distance, bound);
		}
		return bound;
	}
	/**
	* @private
	* @param {number} node
	* @param {Float64Array} position
	* @returns {number}
	*/
	#nodeDistance(node, position) {
		this._nodeBox(node, this.#min, this.#max);
		return boundsDistanceSquared(position, this.#min, this.#max, this.dimension);
	}
};

/** @module octree */
/**
* @typedef {object} OctreeOptions
* @property {number} [dimension=3] Number of components per point: 2 for a
*   quadtree, 3 for an octree.
* @property {number} [bucketSize=8] Leaves holding more points are split.
* @property {number} [maxDepth=12] Leaves at this depth are never split, so
*   that duplicate points terminate. Clamped to [0, 255].
* @property {import("./partition.js").Bounds} [bounds] Fixed bounds. Points
*   outside are kept in the edge nodes. Defaults to the points bounds on each
*   build.
*/
/**
* Tree splitting each node at its center into 2^dimension children: a quadtree
* in 2D, an octree in 3D. O(n log n) builds.
*
* Best for clustered points or varying query radii.
*
* @augments {Tree}
* @see Finkel, R. A., & Bentley, J. L. (1974). Quad trees: a data structure for retrieval on composite keys. Acta Informatica, 4(1), 1–9. https://doi.org/10.1007/BF00288933
* @see Samet, H. (1984). The quadtree and related hierarchical data structures. ACM Computing Surveys, 16(2), 187–260. https://doi.org/10.1145/356924.356930 (PR quadtree with bucket leaves)
* @see Meagher, D. (1982). Geometric modeling using octree encoding. Computer Graphics and Image Processing, 19(2), 129–147. https://doi.org/10.1016/0146-664X(82)90104-6
*/
var Octree = class extends Tree {
	/**
	* Leaves holding more points are split.
	*
	* @type {number}
	*/
	bucketSize;
	/**
	* Leaves at this depth are never split.
	*
	* @type {number}
	*/
	maxDepth;
	/**
	* Number of nodes of the last build.
	*
	* @type {number}
	*/
	nodeCount = 0;
	#branching;
	#temp = /* @__PURE__ */ new Uint32Array(0);
	#octant = /* @__PURE__ */ new Uint32Array(0);
	#childStart;
	#depth = /* @__PURE__ */ new Uint8Array(0);
	#center;
	#nodeMin;
	#nodeMax;
	/** @param {OctreeOptions} [options] */
	constructor({ dimension = 3, bucketSize = 8, maxDepth = 12, bounds } = {}) {
		super({
			dimension,
			bounds
		});
		this.bucketSize = Math.max(1, bucketSize);
		this.maxDepth = Math.min(Math.max(maxDepth, 0), 255);
		this.#branching = 2 ** dimension;
		this.#childStart = new Uint32Array(this.#branching + 1);
		this.#center = new Float64Array(dimension);
		this.#nodeMin = new Float64Array(dimension);
		this.#nodeMax = new Float64Array(dimension);
	}
	/** @protected */
	_build() {
		const { count } = this;
		this._resetIndices();
		this.#temp = typedArrayReserve(this.#temp, count);
		this.#octant = typedArrayReserve(this.#octant, count);
		this.nodeCount = 0;
		const root = this.#addNodes(1);
		this._boxMin.set(this.bounds[0]);
		this._boxMax.set(this.bounds[1]);
		this.#depth[root] = 0;
		this.#split(root, 0, count);
	}
	/**
	* Allocate contiguous nodes, growing the pool when needed.
	*
	* @private
	* @param {number} count
	* @returns {number} First node.
	*/
	#addNodes(count) {
		const first = this.nodeCount;
		const nodeCount = this.nodeCount += count;
		this._reserveNodes(nodeCount, true);
		this.#depth = typedArrayReserve(this.#depth, nodeCount, true);
		return first;
	}
	/**
	* @private
	* @param {number} node
	* @param {number} lo
	* @param {number} hi
	*/
	#split(node, lo, hi) {
		this._lo[node] = lo;
		this._hi[node] = hi;
		this._childCount[node] = 0;
		if (hi - lo <= this.bucketSize || this.#depth[node] >= this.maxDepth) return;
		this.#sortByOctant(node, lo, hi);
		const first = this.#addChildren(node, lo);
		for (let o = 0; o < this.#branching; o++) {
			const child = first + o;
			this.#split(child, this._lo[child], this._hi[child]);
		}
	}
	/**
	* Sort the node points by child octant, into `#childStart` offsets relative
	* to `lo`.
	*
	* @private
	* @param {number} node
	* @param {number} lo
	* @param {number} hi
	*/
	#sortByOctant(node, lo, hi) {
		const { points, dimension } = this;
		const center = this.#center;
		const offset = node * dimension;
		for (let k = 0; k < dimension; k++) center[k] = (this._boxMin[offset + k] + this._boxMax[offset + k]) / 2;
		const indices = this._indices;
		const octant = this.#octant;
		for (let j = lo; j < hi; j++) {
			let o = 0;
			for (let k = 0; k < dimension; k++) if (points[indices[j] * dimension + k] >= center[k]) o |= 1 << k;
			octant[j] = o;
		}
		countingSort(octant, lo, hi, this.#branching, this.#childStart, this.#temp, indices);
		for (let j = lo; j < hi; j++) indices[j] = this.#temp[j];
	}
	/**
	* Allocate the children of a node split at `#center`, with the ranges of
	* `#childStart`.
	*
	* @private
	* @param {number} node
	* @param {number} lo
	* @returns {number} First child.
	*/
	#addChildren(node, lo) {
		const { dimension } = this;
		const center = this.#center;
		const childStart = this.#childStart;
		const offset = node * dimension;
		const depth = this.#depth[node];
		const first = this.#addNodes(this.#branching);
		this._firstChild[node] = first;
		this._childCount[node] = this.#branching;
		const min = this._boxMin;
		const max = this._boxMax;
		for (let o = 0; o < this.#branching; o++) {
			const child = first + o;
			const childOffset = child * dimension;
			for (let k = 0; k < dimension; k++) {
				const upper = o >> k & 1;
				min[childOffset + k] = upper ? center[k] : min[offset + k];
				max[childOffset + k] = upper ? max[offset + k] : center[k];
			}
			this.#depth[child] = depth + 1;
			this._lo[child] = lo + childStart[o];
			this._hi[child] = lo + childStart[o + 1];
		}
		return first;
	}
	/**
	* Visit every node, empty leaves included.
	*
	* @param {import("./partition.js").NodeCallback} callback
	*/
	forEachNode(callback) {
		for (let node = 0; node < this.nodeCount; node++) {
			this._nodeBox(node, this.#nodeMin, this.#nodeMax);
			callback(this.#nodeMin, this.#nodeMax, this.#depth[node], this._hi[node] - this._lo[node]);
		}
	}
};

var morton_exports = /* @__PURE__ */ __exportAll({
	bits: () => bits,
	encode: () => encode
});
/** @module morton */
/**
* Bits per axis so that a Morton code fits a Uint32.
*
* @param {number} dimension
* @returns {number}
*/
const bits = (dimension) => Math.floor(32 / dimension);
/**
* Spread the low 16 bits of `x` to the even bits.
*
* @private
* @param {number} x
* @returns {number}
*/
function spread2(x) {
	x &= 65535;
	x = (x | x << 8) & 16711935;
	x = (x | x << 4) & 252645135;
	x = (x | x << 2) & 858993459;
	return (x | x << 1) & 1431655765;
}
/**
* Spread the low 10 bits of `x` to every third bit.
*
* @private
* @param {number} x
* @returns {number}
*/
function spread3(x) {
	x &= 1023;
	x = (x | x << 16) & 50331903;
	x = (x | x << 8) & 50393103;
	x = (x | x << 4) & 51130563;
	return (x | x << 2) & 153391689;
}
/**
* Interleave quantized coordinates of `bits(dimension)` bits: bit `b` of axis
* `k` goes to bit `b * dimension + k`.
*
* @param {ArrayLike<number>} cell Integer coordinates.
* @param {number} dimension
* @returns {number}
* @see Morton, G. M. (1966). A computer oriented geodetic data base and a new technique in file sequencing. IBM Ltd., Ottawa.
*/
function encode(cell, dimension) {
	if (dimension === 2) return (spread2(cell[0]) | spread2(cell[1]) << 1) >>> 0;
	if (dimension === 3) return (spread3(cell[0]) | spread3(cell[1]) << 1 | spread3(cell[2]) << 2) >>> 0;
	const axisBits = bits(dimension);
	let code = 0;
	for (let b = 0; b < axisBits; b++) for (let k = 0; k < dimension; k++) code |= (cell[k] >>> b & 1) << b * dimension + k;
	return code >>> 0;
}

/** @module linearOctree */
/**
* @typedef {object} LinearOctreeOptions
* @property {number} [dimension=3] Number of components per point: 2 for a
*   quadtree, 3 for an octree.
* @property {number} [bucketSize=8] Leaves holding more points are split.
* @property {number} [maxDepth] Leaves at this depth are never split. Clamped
*   to [0, Morton code precision]: 16 in 2D, 10 in 3D.
* @property {import("./partition.js").Bounds} [bounds] Fixed bounds. Points
*   outside are kept in the edge nodes. Defaults to the points bounds on each
*   build.
*/
/**
* Quadtree or octree built from points sorted by Morton (Z-order) code. O(n)
* builds, no empty nodes.
*
* Best for clustered points rebuilt every frame.
*
* @augments {Tree}
* @see Gargantini, I. (1982). An effective way to represent quadtrees. Communications of the ACM, 25(12), 905–910. https://doi.org/10.1145/358728.358741
* @see Lauterbach, C., Garland, M., Sengupta, S., Luebke, D., & Manocha, D. (2009). Fast BVH construction on GPUs. Computer Graphics Forum, 28(2), 375–384. https://doi.org/10.1111/j.1467-8659.2009.01377.x
*/
var LinearOctree = class extends Tree {
	/**
	* Leaves holding more points are split.
	*
	* @type {number}
	*/
	bucketSize;
	/**
	* Leaves at this depth are never split.
	*
	* @type {number}
	*/
	maxDepth;
	/**
	* Number of nodes of the last build.
	*
	* @type {number}
	*/
	nodeCount = 0;
	#bits;
	#branching;
	#scale;
	#codes = /* @__PURE__ */ new Uint32Array(0);
	#codesTemp = /* @__PURE__ */ new Uint32Array(0);
	#indicesTemp = /* @__PURE__ */ new Uint32Array(0);
	#depth = /* @__PURE__ */ new Uint8Array(0);
	#prefix = /* @__PURE__ */ new Uint32Array(0);
	#cells = /* @__PURE__ */ new Uint32Array(0);
	#cell;
	#queryLo;
	#queryHi;
	#nodeMin;
	#nodeMax;
	/** @param {LinearOctreeOptions} [options] */
	constructor({ dimension = 3, bucketSize = 8, maxDepth, bounds } = {}) {
		super({
			dimension,
			bounds
		});
		this.#bits = bits(dimension);
		this.#branching = 2 ** dimension;
		this.bucketSize = Math.max(1, bucketSize);
		this.maxDepth = Math.min(Math.max(maxDepth ?? this.#bits, 0), this.#bits);
		this.#scale = new Float64Array(dimension);
		this.#cell = new Float64Array(dimension);
		this.#queryLo = new Float64Array(dimension);
		this.#queryHi = new Float64Array(dimension);
		this.#nodeMin = new Float64Array(dimension);
		this.#nodeMax = new Float64Array(dimension);
	}
	/** @protected */
	_build() {
		this.#sortByCode();
		this.nodeCount = 0;
		this.#cell.fill(0);
		this.#addNode(0, 0, 0, this.count, this.#cell);
		for (let node = 0; node < this.nodeCount; node++) this.#split(node);
	}
	/**
	* Sort point indices by the Morton code of their quantized position.
	*
	* @private
	*/
	#sortByCode() {
		const { points, dimension, count } = this;
		const bits = this.#bits;
		const [min, max] = this.bounds;
		for (let k = 0; k < dimension; k++) {
			const extent = max[k] - min[k];
			this.#scale[k] = extent > 0 ? 2 ** bits / extent : 0;
		}
		this._resetIndices();
		this.#codes = typedArrayReserve(this.#codes, count);
		this.#codesTemp = typedArrayReserve(this.#codesTemp, count);
		this.#indicesTemp = typedArrayReserve(this.#indicesTemp, count);
		const cell = this.#cell;
		for (let j = 0; j < count; j++) {
			const i = this._indices[j];
			for (let k = 0; k < dimension; k++) cell[k] = this.#quantize(points[i * dimension + k], k);
			this.#codes[j] = encode(cell, dimension);
		}
		radixSort(this.#codes, this._indices, this.#codesTemp, this.#indicesTemp, count, bits * dimension);
	}
	/**
	* Append the non-empty children of a node: the code ranges of its prefix
	* followed by each child octant.
	*
	* @private
	* @param {number} node
	*/
	#split(node) {
		const { dimension } = this;
		const branching = this.#branching;
		const depth = this.#depth[node];
		const lo = this._lo[node];
		const hi = this._hi[node];
		this._firstChild[node] = this.nodeCount;
		this._childCount[node] = 0;
		if (hi - lo <= this.bucketSize || depth >= this.maxDepth) return;
		const cell = this.#cell;
		const prefix = this.#prefix[node];
		const shift = 2 ** ((this.#bits - depth - 1) * dimension);
		let start = lo;
		for (let o = 0; o < branching && start < hi; o++) {
			const childPrefix = prefix * branching + o;
			const end = lowerBound(this.#codes, start, hi, (childPrefix + 1) * shift);
			if (end > start) {
				for (let k = 0; k < dimension; k++) cell[k] = this.#cells[node * dimension + k] * 2 + (o >> k & 1);
				this.#addNode(depth + 1, childPrefix, start, end, cell);
				this._childCount[node]++;
			}
			start = end;
		}
	}
	/**
	* @private
	* @param {number} depth
	* @param {number} prefix Morton code of the node, `depth * dimension` bits.
	* @param {number} lo
	* @param {number} hi
	* @param {Float64Array} cell
	*/
	#addNode(depth, prefix, lo, hi, cell) {
		const node = this.nodeCount++;
		const { dimension, nodeCount } = this;
		this.#depth = typedArrayReserve(this.#depth, nodeCount, true);
		this.#prefix = typedArrayReserve(this.#prefix, nodeCount, true);
		this._reserveNodes(nodeCount, true, false);
		this.#cells = typedArrayReserve(this.#cells, nodeCount * dimension, true);
		this.#depth[node] = depth;
		this.#prefix[node] = prefix;
		this._lo[node] = lo;
		this._hi[node] = hi;
		for (let k = 0; k < dimension; k++) this.#cells[node * dimension + k] = cell[k];
	}
	/**
	* @param {Float64Array} min
	* @param {Float64Array} max
	* @protected
	*/
	_collect(min, max) {
		for (let k = 0; k < this.dimension; k++) {
			this.#queryLo[k] = this.#quantize(min[k], k);
			this.#queryHi[k] = this.#quantize(max[k], k);
		}
		super._collect(min, max);
	}
	/**
	* Overlap of a node with the query quantized by `_collect`.
	*
	* @param {number} node
	* @returns {number}
	* @protected
	*/
	_overlap(node) {
		const { dimension } = this;
		const span = 2 ** (this.#bits - this.#depth[node]);
		let overlap = 2;
		for (let k = 0; k < dimension; k++) {
			const nodeLo = this.#cells[node * dimension + k] * span;
			const nodeHi = nodeLo + span - 1;
			if (nodeLo > this.#queryHi[k] || nodeHi < this.#queryLo[k]) return 0;
			if (nodeLo < this.#queryLo[k] || nodeHi > this.#queryHi[k]) overlap = 1;
		}
		return overlap;
	}
	/**
	* @param {number} node
	* @param {Float64Array} min
	* @param {Float64Array} max
	* @protected
	*/
	_nodeBox(node, min, max) {
		const depth = this.#depth[node];
		const [boundsMin, boundsMax] = this.bounds;
		for (let k = 0; k < this.dimension; k++) {
			const width = (boundsMax[k] - boundsMin[k]) / 2 ** depth;
			const pad = (Math.abs(boundsMin[k]) + Math.abs(boundsMax[k])) * Number.EPSILON * 4;
			min[k] = boundsMin[k] + this.#cells[node * this.dimension + k] * width - pad;
			max[k] = min[k] + width + 2 * pad;
		}
	}
	/**
	* Visit every node, breadth first. Empty nodes are not stored.
	*
	* @param {import("./partition.js").NodeCallback} callback
	*/
	forEachNode(callback) {
		const { dimension } = this;
		const [boundsMin, boundsMax] = this.bounds;
		for (let node = 0; node < this.nodeCount; node++) {
			const depth = this.#depth[node];
			for (let k = 0; k < dimension; k++) {
				const width = (boundsMax[k] - boundsMin[k]) / 2 ** depth;
				this.#nodeMin[k] = boundsMin[k] + this.#cells[node * dimension + k] * width;
				this.#nodeMax[k] = this.#nodeMin[k] + width;
			}
			callback(this.#nodeMin, this.#nodeMax, depth, this._hi[node] - this._lo[node]);
		}
	}
	/**
	* Integer cell of a value along an axis at the deepest level, clamped.
	*
	* @private
	* @param {number} value
	* @param {number} k
	* @returns {number}
	*/
	#quantize(value, k) {
		const cell = Math.floor((value - this.bounds[0][k]) * this.#scale[k]);
		return Math.min(Math.max(cell, 0), 2 ** this.#bits - 1);
	}
};

/** @module kdTree */
/**
* @typedef {object} KdTreeOptions
* @property {number} [dimension=3] Number of components per point.
* @property {number} [bucketSize=8] Maximum number of points per leaf.
*/
/**
* Balanced binary tree split at the median of the widest axis. O(n log n)
* builds.
*
* Best for nearest queries and static or rarely rebuilt points of any density.
*
* @augments {Tree}
* @see Bentley, J. L. (1975). Multidimensional binary search trees used for associative searching. Communications of the ACM, 18(9), 509–517. https://doi.org/10.1145/361002.361007
* @see Friedman, J. H., Bentley, J. L., & Finkel, R. A. (1977). An algorithm for finding best matches in logarithmic expected time. ACM Transactions on Mathematical Software, 3(3), 209–226. https://doi.org/10.1145/355744.355745 (median splits, bucket leaves)
* @see https://github.com/mourner/kdbush (implicit array layout)
*/
var KdTree = class extends Tree {
	/**
	* Maximum number of points per leaf.
	*
	* @type {number}
	*/
	bucketSize;
	/**
	* Depth of the deepest leaf of the last build.
	*
	* @type {number}
	*/
	depth = 0;
	#nodeMin;
	#nodeMax;
	/** @param {KdTreeOptions} [options] */
	constructor({ dimension = 3, bucketSize = 8 } = {}) {
		super({ dimension });
		this.bucketSize = Math.max(1, bucketSize);
		this.#nodeMin = new Float64Array(dimension);
		this.#nodeMax = new Float64Array(dimension);
	}
	/** @protected */
	_build() {
		const { count, bucketSize } = this;
		let depth = 0;
		while (Math.ceil(count / 2 ** depth) > bucketSize) depth++;
		this.depth = depth;
		const nodeCount = 2 ** (depth + 1) - 1;
		this._resetIndices();
		this._reserveNodes(nodeCount);
		this._boxMin.set(this.bounds[0]);
		this._boxMax.set(this.bounds[1]);
		this.#split(0, 0, count);
	}
	/**
	* @private
	* @param {number} node
	* @param {number} lo
	* @param {number} hi
	*/
	#split(node, lo, hi) {
		const { points, dimension } = this;
		const min = this._boxMin;
		const max = this._boxMax;
		this._lo[node] = lo;
		this._hi[node] = hi;
		this._childCount[node] = 0;
		if (hi - lo <= this.bucketSize) return;
		const offset = node * dimension;
		let axis = 0;
		for (let k = 1; k < dimension; k++) if (max[offset + k] - min[offset + k] > max[offset + axis] - min[offset + axis]) axis = k;
		const mid = lo + hi >>> 1;
		quickselect(this._indices, lo, hi - 1, mid, points, dimension, axis);
		const split = points[this._indices[mid] * dimension + axis];
		const left = node * 2 + 1;
		const right = left + 1;
		this._firstChild[node] = left;
		this._childCount[node] = 2;
		for (let k = 0; k < dimension; k++) {
			min[left * dimension + k] = min[right * dimension + k] = min[offset + k];
			max[left * dimension + k] = max[right * dimension + k] = max[offset + k];
		}
		max[left * dimension + axis] = split;
		min[right * dimension + axis] = split;
		this.#split(left, lo, mid);
		this.#split(right, mid, hi);
	}
	/**
	* Visit every node, depth first.
	*
	* @param {import("./partition.js").NodeCallback} callback
	*/
	forEachNode(callback) {
		if (this._lo.length) this.#visit(0, 0, callback);
	}
	/**
	* @private
	* @param {number} node
	* @param {number} depth
	* @param {import("./partition.js").NodeCallback} callback
	*/
	#visit(node, depth, callback) {
		this._nodeBox(node, this.#nodeMin, this.#nodeMax);
		callback(this.#nodeMin, this.#nodeMax, depth, this._hi[node] - this._lo[node]);
		if (!this._childCount[node]) return;
		this.#visit(node * 2 + 1, depth + 1, callback);
		this.#visit(node * 2 + 2, depth + 1, callback);
	}
};

export { Grid, HashGrid, KdTree, LinearOctree, Nearest, Octree, Partition, Tree, UniformGrid, cells_exports as cells, morton_exports as morton, sort_exports as sort, utils_exports as utils };