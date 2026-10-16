import test, { describe } from "node:test";
import assert from "node:assert";

import random from "pex-random";

import {
  eliminateToCount,
  eliminateByDistance,
  packingRadius,
} from "../index.js";

const randomPoints = (count, dimension, seed = 1) => {
  const rng = random.create(seed);
  return Float64Array.from({ length: count * dimension }, () => rng.float());
};

const getDistance = (points, dimension, i, j) => {
  let sum = 0;
  for (let k = 0; k < dimension; k++) {
    sum += (points[i * dimension + k] - points[j * dimension + k]) ** 2;
  }
  return Math.sqrt(sum);
};

// Smallest distance between two points, divided by their pair scale.
const minDistance = (points, dimension, indices, pairScale = () => 1) => {
  let min = Infinity;
  for (let a = 0; a < indices.length; a++) {
    for (let b = a + 1; b < indices.length; b++) {
      const [i, j] = [indices[a], indices[b]];
      min = Math.min(
        min,
        getDistance(points, dimension, i, j) / pairScale(i, j),
      );
    }
  }
  return min;
};

const range = (count) => Uint32Array.from({ length: count }, (_, i) => i);

// Yuksel 2015 equations 1, 4 and 5, with all weights recomputed at every step
// and adaptive distances scaled by the weighted point only (section 5.2).
const referenceElimination = (points, dimension, count, radius, scales) => {
  const alive = new Set(range(points.length / dimension));
  const diameter = 2 * radius;
  const minDiameter = diameter * (1 - (count / alive.size) ** 1.5) * 0.65;
  const weight = (i) => {
    let sum = 0;
    for (const j of alive) {
      if (j === i) continue;
      const d = getDistance(points, dimension, i, j) / (scales?.[i] ?? 1);
      const limited = Math.max(Math.min(d, diameter), minDiameter);
      // Integer weights as in the implementation, so ties are exact
      sum += Math.round((1 - limited / diameter) ** 8 * 2 ** 36);
    }
    return sum;
  };
  while (alive.size > count) {
    let heaviest = -1;
    let max = -Infinity;
    for (const i of alive) {
      const w = weight(i);
      if (w > max || (w === max && i > heaviest)) [heaviest, max] = [i, w];
    }
    alive.delete(heaviest);
  }
  return Uint32Array.from([...alive].sort((a, b) => a - b));
};

const assertValidIndices = (indices, count, pointCount) => {
  assert.ok(indices instanceof Uint32Array);
  assert.strictEqual(indices.length, count);
  assert.strictEqual(new Set(indices).size, count, "unique indices");
  assert.ok(
    indices.every((i) => i < pointCount),
    "indices in range",
  );
};

describe("packingRadius", () => {
  test("should match the densest packings", () => {
    // Hexagonal packing: count disks of radius r cover pi / (2 sqrt(3)) of the area
    const r2 = packingRadius(1, 100, 2);
    assert.ok(
      Math.abs((100 * Math.PI * r2 ** 2) / 1 - Math.PI / (2 * Math.sqrt(3))) <
        1e-12,
    );
    // FCC packing density: pi / (3 sqrt(2))
    const r3 = packingRadius(1, 100, 3);
    assert.ok(
      Math.abs(100 * (4 / 3) * Math.PI * r3 ** 3 - Math.PI / (3 * Math.SQRT2)) <
        1e-12,
    );
  });

  test("should split 1D domains in segments", () => {
    assert.strictEqual(packingRadius(1, 10, 1), 0.05);
  });

  test("should default to 3D", () => {
    assert.strictEqual(packingRadius(1, 100), packingRadius(1, 100, 3));
  });

  test("should be 0 for empty domains or counts", () => {
    assert.strictEqual(packingRadius(0, 10, 2), 0);
    assert.strictEqual(packingRadius(1, 0, 2), 0);
  });
});

describe("eliminateToCount", () => {
  const points = randomPoints(5000, 2);

  test("should keep count unique ascending indices", () => {
    const indices = eliminateToCount(points, 1000, { dimension: 2 });
    assertValidIndices(indices, 1000, 5000);
    assert.ok(indices.every((i, n) => n === 0 || indices[n - 1] < i));
  });

  test("should space points much better than a random subset", () => {
    const radius = packingRadius(1, 1000, 2);
    const indices = eliminateToCount(points, 1000, { dimension: 2 });
    const eliminated = minDistance(points, 2, indices) / (2 * radius);
    const random = minDistance(points, 2, range(1000)) / (2 * radius);
    assert.ok(eliminated > 0.6, `relative radius ${eliminated}`);
    assert.ok(random < 0.1, `random relative radius ${random}`);
  });

  test("should be deterministic", () => {
    assert.deepStrictEqual(
      eliminateToCount(points, 500, { dimension: 2 }),
      eliminateToCount(points, 500, { dimension: 2 }),
    );
  });

  test("should match a direct implementation of the paper", () => {
    const small = randomPoints(300, 2, 11);
    const radius = packingRadius(1, 100, 2);
    assert.deepStrictEqual(
      eliminateToCount(small, 100, {
        dimension: 2,
        domainSize: 1,
        domainDimension: 2,
      }),
      referenceElimination(small, 2, 100, radius),
    );

    const scales = Float64Array.from({ length: 300 }, (_, i) =>
      small[i * 2] < 0.5 ? 0.8 : 1.6,
    );
    assert.deepStrictEqual(
      eliminateToCount(small, 100, {
        dimension: 2,
        domainSize: 1,
        domainDimension: 2,
        scales,
      }),
      referenceElimination(small, 2, 100, radius, scales),
    );
  });

  test("should handle counts outside of the input range", () => {
    assert.deepStrictEqual(
      eliminateToCount(points, 6000, { dimension: 2 }),
      range(5000),
    );
    assert.strictEqual(eliminateToCount(points, 0, { dimension: 2 }).length, 0);
    assert.strictEqual(
      eliminateToCount(points, -3, { dimension: 2 }).length,
      0,
    );
    assert.strictEqual(
      eliminateToCount(points, 10.7, { dimension: 2 }).length,
      10,
    );
    assert.strictEqual(eliminateToCount([], 10).length, 0);
  });

  test("should default to 3D points", () => {
    const points3 = randomPoints(2000, 3);
    const indices = eliminateToCount(points3, 400);
    assertValidIndices(indices, 400, 2000);
    const radius = packingRadius(1, 400, 3);
    assert.ok(minDistance(points3, 3, indices) / (2 * radius) > 0.5);
  });

  test("should support 1D", () => {
    const points1 = randomPoints(500, 1);
    const indices1 = eliminateToCount(points1, 100, { dimension: 1 });
    assertValidIndices(indices1, 100, 500);
    assert.ok(
      minDistance(points1, 1, indices1) / (2 * packingRadius(1, 100, 1)) > 0.5,
    );
  });

  test("should ignore flat axes of the bounding box", () => {
    // Points on the z = 0 plane: a 2D domain in 3D
    const rng = random.create(3);
    const planar = Float64Array.from({ length: 3000 * 3 }, (_, i) =>
      i % 3 === 2 ? 0 : rng.float(),
    );
    const indices = eliminateToCount(planar, 600);
    const relative =
      minDistance(planar, 3, indices) / (2 * packingRadius(1, 600, 2));
    assert.ok(relative > 0.6, `relative radius ${relative}`);
    const extent = (k) => {
      const values = planar.filter((_, i) => i % 3 === k);
      return Math.max(...values) - Math.min(...values);
    };
    assert.deepStrictEqual(
      indices,
      eliminateToCount(planar, 600, {
        domainSize: extent(0) * extent(1),
        domainDimension: 2,
      }),
    );
  });

  test("should handle coincident points", () => {
    const indices = eliminateToCount(new Float64Array(30), 4);
    assert.strictEqual(indices.length, 4);
    assertValidIndices(indices, 4, 10);
  });

  test("should order progressive outputs so prefixes are well spaced", () => {
    const indices = eliminateToCount(points, 1000, {
      dimension: 2,
      progressive: true,
    });
    assertValidIndices(indices, 1000, 5000);
    assert.deepStrictEqual(
      [...indices].sort((a, b) => a - b),
      [...eliminateToCount(points, 1000, { dimension: 2 })],
    );
    const relatives = [50, 125, 250, 500].map(
      (prefix) =>
        minDistance(points, 2, indices.slice(0, prefix)) /
        (2 * packingRadius(1, prefix, 2)),
    );
    assert.ok(Math.min(...relatives) > 0.5, `relative radii ${relatives}`);
  });

  test("should keep progressive outputs of a single point", () => {
    const indices = eliminateToCount(points, 1, {
      dimension: 2,
      progressive: true,
    });
    assert.strictEqual(indices.length, 1);
    assertValidIndices(indices, 1, 5000);
  });

  test("should adapt spacing to scales", () => {
    // Twice the spacing on the right half: a quarter of the density
    const scales = Float64Array.from({ length: 5000 }, (_, i) =>
      points[i * 2] < 0.5 ? 1 : 2,
    );
    const indices = eliminateToCount(points, 500, { dimension: 2, scales });
    const right = indices.filter((i) => points[i * 2] >= 0.5).length;
    const ratio = (indices.length - right) / right;
    assert.ok(ratio > 3, `density ratio ${ratio}`);
    assert.ok(ratio < 5.5, `density ratio ${ratio}`);
  });

  test("should run without weight limiting", () => {
    const indices = eliminateToCount(points, 1000, {
      dimension: 2,
      weightLimiting: false,
    });
    assertValidIndices(indices, 1000, 5000);
    assert.ok(
      minDistance(points, 2, indices) / (2 * packingRadius(1, 1000, 2)) > 0.4,
    );
  });

  test("should eliminate 100k points in a reasonable time", () => {
    const large = randomPoints(100_000, 3);
    const start = performance.now();
    assertValidIndices(eliminateToCount(large, 20_000), 20_000, 100_000);
    assert.ok(performance.now() - start < 5000);
  });
});

describe("eliminateByDistance", () => {
  const points = randomPoints(3000, 2, 7);
  const distance = 0.03;

  test("should keep points at least distance apart", () => {
    const indices = eliminateByDistance(points, distance, { dimension: 2 });
    assert.ok(minDistance(points, 2, indices) >= distance);
  });

  test("should keep every removed point within distance of a kept one", () => {
    const indices = eliminateByDistance(points, distance, { dimension: 2 });
    const kept = new Set(indices);
    const orphans = range(3000).filter(
      (i) =>
        !kept.has(i) &&
        indices.every((j) => getDistance(points, 2, i, j) >= distance),
    );
    assert.deepStrictEqual(orphans, new Uint32Array(0));
  });

  test("should give priority to earlier points", () => {
    const indices = eliminateByDistance(points, distance, { dimension: 2 });
    assert.strictEqual(indices[0], 0);
    assert.ok(indices.every((i, n) => n === 0 || indices[n - 1] < i));
  });

  test("should follow a visiting order", () => {
    const order = range(3000).reverse();
    const indices = eliminateByDistance(points, distance, {
      dimension: 2,
      order,
    });
    assert.strictEqual(indices[0], 2999);
    assert.ok(minDistance(points, 2, indices) >= distance);
  });

  test("should discard points missing from the order", () => {
    const order = Uint32Array.of(5, 1, 9);
    const indices = eliminateByDistance(points, 1e-9, {
      dimension: 2,
      order,
    });
    assert.deepStrictEqual(indices, order);
  });

  test("should keep all points without distance", () => {
    assert.deepStrictEqual(
      eliminateByDistance(points, 0, { dimension: 2 }),
      range(3000),
    );
  });

  test("should keep unique indices with or without distance", () => {
    const order = Uint32Array.of(2, 2, 5);
    for (const d of [0, 1e-9]) {
      assert.deepStrictEqual(
        eliminateByDistance(points, d, { dimension: 2, order }),
        Uint32Array.of(2, 5),
      );
    }
  });

  test("should remove coincident points", () => {
    assert.deepStrictEqual(
      eliminateByDistance(new Float64Array(12), 0.1),
      Uint32Array.of(0),
    );
  });

  test("should scale the distance per point", () => {
    const scales = Float64Array.from({ length: 3000 }, (_, i) =>
      points[i * 2] < 0.5 ? 1 : 2,
    );
    const indices = eliminateByDistance(points, distance, {
      dimension: 2,
      scales,
    });
    const scaledDistance = minDistance(
      points,
      2,
      indices,
      (i, j) => (scales[i] + scales[j]) / 2,
    );
    assert.ok(scaledDistance >= distance);
    const right = indices.filter((i) => points[i * 2] >= 0.5).length;
    assert.ok((indices.length - right) / right > 2.5);
  });

  test("should default to 3D points", () => {
    const points3 = randomPoints(1000, 3);
    const indices = eliminateByDistance(points3, 0.1);
    assert.ok(minDistance(points3, 3, indices) >= 0.1);
  });
});
