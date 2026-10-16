# point-elimination

[![npm version](https://img.shields.io/npm/v/point-elimination)](https://www.npmjs.com/package/point-elimination)
[![stability-stable](https://img.shields.io/badge/stability-stable-green.svg)](https://www.npmjs.com/package/point-elimination)
[![npm minzipped size](https://img.shields.io/bundlephobia/minzip/point-elimination)](https://bundlephobia.com/package/point-elimination)
[![dependencies](https://img.shields.io/librariesio/release/npm/point-elimination)](https://github.com/dmnsgn/point-elimination/blob/main/package.json)
[![types](https://img.shields.io/npm/types/point-elimination)](https://github.com/microsoft/TypeScript)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-fa6673.svg)](https://conventionalcommits.org)
[![styled with prettier](https://img.shields.io/badge/styled_with-Prettier-f8bc45.svg?logo=prettier)](https://github.com/prettier/prettier)
[![linted with eslint](https://img.shields.io/badge/linted_with-ES_Lint-4B32C3.svg?logo=eslint)](https://github.com/eslint/eslint)
[![license](https://img.shields.io/github/license/dmnsgn/point-elimination)](https://github.com/dmnsgn/point-elimination/blob/main/LICENSE.md)

Eliminate 1D, 2D or 3D points: [weighted sample elimination](http://www.cemyuksel.com/research/sampleelimination/) to an exact count with progressive ordering, and greedy elimination by minimum distance, both with adaptive spacing.

`eliminateToCount` implements weighted sample elimination, progressive sampling and adaptive sampling from:

> Cem Yuksel. [Sample Elimination for Generating Poisson Disk Sample Sets](http://www.cemyuksel.com/research/sampleelimination/). _Computer Graphics Forum (Proceedings of EUROGRAPHICS 2015)_, 34(2), 25–32, 2015. [doi:10.1111/cgf.12538](https://doi.org/10.1111/cgf.12538)

Reference implementation: [cyCodeBase](http://www.cemyuksel.com/cyCodeBase/soln/poisson_disk_sampling.html)

[![paypal](https://img.shields.io/badge/donate-paypal-informational?logo=paypal)](https://paypal.me/dmnsgn)
[![coinbase](https://img.shields.io/badge/donate-coinbase-informational?logo=coinbase)](https://commerce.coinbase.com/checkout/56cbdf28-e323-48d8-9c98-7019e72c97f3)
[![twitter](https://img.shields.io/twitter/follow/dmnsgn?style=social)](https://twitter.com/dmnsgn)
[![bluesky](https://img.shields.io/badge/-blue?logo=bluesky&label=Follow%20%40dmnsgn.me&style=social)](https://bsky.app/profile/dmnsgn.me)

[![point-elimination screenshot](https://raw.githubusercontent.com/dmnsgn/point-elimination/main/screenshot.png)](https://dmnsgn.github.io/point-elimination/)

## Installation

```bash
npm install point-elimination
```

## Usage

See the [example](https://dmnsgn.github.io/point-elimination/) and its [source](examples/index.js).

```js
import {
  eliminateToCount,
  eliminateByDistance,
  packingRadius,
} from "point-elimination";

// 5000 random 2D points
const points = Float32Array.from({ length: 5000 * 2 }, Math.random);

// Poisson disk subset of exactly 1000 points
const indices = eliminateToCount(points, 1000, { dimension: 2 });
// => Uint32Array of kept point indices

// Progressive ordering: the first k indices are also well distributed, for any
// k. Slice the output to change the density without eliminating again.
const ordered = eliminateToCount(points, 1000, {
  dimension: 2,
  progressive: true,
});
const first100 = ordered.subarray(0, 100);

// The domain defaults to the bounding box (its volume for 3D points). Set it
// when points don't fill their bounding box, eg. the area of a mesh surface.
const surfaceIndices = eliminateToCount(meshPoints, 1000, {
  domainSize: meshArea,
  domainDimension: 2,
});

// Points at least 0.02 apart, earlier points first
const spaced = eliminateByDistance(points, 0.02, { dimension: 2 });

// Adaptive spacing: twice the distance where scale is 2
const scales = Float32Array.from({ length: 5000 }, (_, i) =>
  points[i * 2] < 0.5 ? 1 : 2,
);
const adaptive = eliminateByDistance(points, 0.02, { dimension: 2, scales });

// Poisson disk radius of 1000 points densely packed in a unit square: their
// minimum distance is twice that
const radius = packingRadius(1, 1000, 2);
```

## API

<!-- api-start -->

Auto-generated API content.

<!-- api-end -->

## License

MIT. See [license file](https://github.com/dmnsgn/point-elimination/blob/main/LICENSE.md).
