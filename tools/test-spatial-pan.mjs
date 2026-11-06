// File: tools/test-spatial-pan.mjs
import assert from 'node:assert/strict';
import { spatialFromOffset } from '../src/core/spatialPan.js';

const S = { panStrength: 0.9, behindDot: -0.3 };
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);
const at = (dx, dy, dir) => spatialFromOffset(dx, dy, dir, S);
const UP = { dx: 0, dy: -1 };

// 1. 上向きの主人公の右隣は、右いっぱい
{
  const r = at(1, 0, UP);
  near(r.pan, 0.9);
  near(r.vertical, 0);
  assert.equal(r.behind, false);
}

// 2. 左隣は左いっぱい
near(at(-1, 0, UP).pan, -0.9);

// 3. 真後ろは中央で、背後扱い
{
  const r = at(0, 1, UP);
  near(r.pan, 0);
  near(r.vertical, -1);
  assert.equal(r.behind, true);
}

// 4. 真正面は中央で、背後ではない
{
  const r = at(0, -3, UP);
  near(r.pan, 0);
  near(r.vertical, 1);
  assert.equal(r.behind, false);
}

// 5. 右向きの主人公では、画面の下側が右手になる
near(at(0, 1, { dx: 1, dy: 0 }).pan, 0.9);

// 6. 遠い音源は、角度が小さければ中央寄り
{
  const r = at(1, -7, UP);
  near(r.pan, (1 / Math.hypot(1, 7)) * 0.9);
  assert.ok(r.vertical > 0.98);
}

// 7. 斜め向きでも正規化される
{
  const r = at(1, 0, { dx: 1, dy: -1 });
  near(r.pan, Math.SQRT1_2 * 0.9);
  near(r.vertical, Math.SQRT1_2);
}

// 8. 同じタイル（距離0）は中央
{
  const r = at(0, 0, UP);
  assert.deepEqual(r, { pan: 0, vertical: 0, behind: false });
}

console.log('spatial-pan: all checks passed');