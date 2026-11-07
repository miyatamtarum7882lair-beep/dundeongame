import assert from 'node:assert/strict';
import { charmCrop, charmAlphaAt, snapDir, bindSideOf, placementFor } from '../src/ui/boundCharmMath.js';
import {
  clampPoint, defaultPointFor, getCharmPoint, setCharmPoint, resetCharmPoint
} from '../src/data/charmPoint.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);
const RANGE = { zoomMin: 1, zoomMax: 5, defaultZoom: 2 };

// ---- charmCrop ----
{
  const c = charmCrop(1000, 2000, { cx: 0.5, cy: 0.5, zoom: 1 }, RANGE);
  assert.deepEqual(c, { sx: 0, sy: 500, sw: 1000, sh: 1000 });
}
{
  const c = charmCrop(1000, 2000, { cx: 0.5, cy: 0.5, zoom: 2 }, RANGE);
  assert.deepEqual(c, { sx: 250, sy: 750, sw: 500, sh: 500 });
}
{
  const c = charmCrop(1000, 2000, { cx: 0, cy: 0, zoom: 2 }, RANGE);
  assert.equal(c.sx, 0);
  assert.equal(c.sy, 0);
}
{
  const c = charmCrop(1000, 2000, { cx: 1, cy: 1, zoom: 2 }, RANGE);
  assert.equal(c.sx, 500);
  assert.equal(c.sy, 1500);
}
{
  const c = charmCrop(1000, 2000, { cx: 0.5, cy: 0.5, zoom: 99 }, RANGE);
  assert.equal(c.sw, 200);
}
{
  const c = charmCrop(2000, 1000, { cx: 0.5, cy: 0.5, zoom: 1 }, RANGE);
  assert.deepEqual(c, { sx: 500, sy: 0, sw: 1000, sh: 1000 });
}

// ---- charmAlphaAt ----
{
  const cfg = { centerTransparency: 0.4, innerRatio: 0.45 };
  near(charmAlphaAt(0, cfg), 0.6);
  near(charmAlphaAt(0.45, cfg), 0.6);
  near(charmAlphaAt(0.725, cfg), 0.3);
  near(charmAlphaAt(1, cfg), 0);
  let prev = Infinity;
  for (let i = 0; i <= 100; i += 1) {
    const a = charmAlphaAt(i / 100, cfg);
    assert.ok(a <= prev + 1e-12, `単調減少でない: t=${i / 100}`);
    prev = a;
  }
}

// ---- 向きと位置 ----
{
  const UP = { dx: 0, dy: -1 };
  assert.equal(bindSideOf(0, -1, UP), 'front');
  assert.equal(bindSideOf(0, 1, UP), 'back');
  assert.equal(bindSideOf(1, 0, UP), 'right');
  assert.equal(bindSideOf(-1, 0, UP), 'left');

  const RIGHT = { dx: 1, dy: 0 };
  assert.equal(bindSideOf(1, 0, RIGHT), 'front');
  assert.equal(bindSideOf(-1, 0, RIGHT), 'back');
  assert.equal(bindSideOf(0, 1, RIGHT), 'right');
  assert.equal(bindSideOf(0, -1, RIGHT), 'left');

  for (const dir of [{ dx: 1, dy: -1 }, { dx: -1, dy: -1 }, { dx: 1, dy: 1 }, { dx: -1, dy: 1 }, { dx: 0, dy: 0 }]) {
    const sides = new Set([[0, -1], [0, 1], [1, 0], [-1, 0]].map(([x, y]) => bindSideOf(x, y, dir)));
    assert.equal(sides.size, 4, `向き ${JSON.stringify(dir)}`);
  }
  assert.deepEqual(snapDir({ dx: 0, dy: 0 }), { dx: 0, dy: 1 });
}
{
  const P = { anchorX: 640, anchorY: 360, offsetPx: 200, sizePx: 300 };
  assert.deepEqual(placementFor('front', P), { x: 490, y: 10, size: 300 });
  assert.deepEqual(placementFor('back', P), { x: 490, y: 410, size: 300 });
  assert.deepEqual(placementFor('left', P), { x: 290, y: 210, size: 300 });
  assert.deepEqual(placementFor('right', P), { x: 690, y: 210, size: 300 });
}

// ---- チャームポイント設定 ----
{
  assert.deepEqual(clampPoint({ cx: -1, cy: 2, zoom: 0.2 }, RANGE), { cx: 0, cy: 1, zoom: 1 });
  assert.deepEqual(clampPoint({}, RANGE), { cx: 0.5, cy: 0.5, zoom: 2 });

  const kitten = defaultPointFor('kitten', RANGE);
  const nurse = defaultPointFor('nurse', RANGE);
  assert.ok(kitten.cy < nurse.cy);
  assert.equal(kitten.zoom, 2);

  const persistent = {};
  assert.deepEqual(getCharmPoint(persistent, 'kitten', RANGE), kitten);
  assert.equal(persistent.charmPoints, undefined);

  const stored = setCharmPoint(persistent, 'kitten', { cx: 0.123456, cy: 0.9, zoom: 3.14159 }, RANGE);
  assert.deepEqual(stored, { cx: 0.1235, cy: 0.9, zoom: 3.14 });
  assert.deepEqual(getCharmPoint(persistent, 'kitten', RANGE), stored);

  resetCharmPoint(persistent, 'kitten');
  assert.deepEqual(getCharmPoint(persistent, 'kitten', RANGE), kitten);
}

console.log('charm: all checks passed');
