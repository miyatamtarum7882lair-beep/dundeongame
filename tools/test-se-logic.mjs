// File: tools/test-se-logic.mjs
import assert from 'node:assert/strict';
import { spatialFromTiles, spatialFromSide, resolveSpatial } from '../src/core/seSpatial.js';

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} != ${b}`);
const CFG = { fadeTiles: 8, panStrength: 0.9 };
const hero = (dx, dy) => ({ tx: 10, ty: 10, dir: { dx, dy } });

// ---- 定位の規約 ----
// 隣接1タイルでも左右がはっきり分かる（旧実装は約±0.11で中央に聞こえていた）
{
  const s = spatialFromTiles(hero(0, 1), 11, 10, CFG); // 下向き、画面右の敵
  near(s.pan, -0.9, 'adjacent facing down, enemy screen-right → left ear');
  assert.equal(s.behind, false, 'side is not behind');
  near(spatialFromTiles(hero(0, -1), 11, 10, CFG).pan, 0.9, 'facing up → right ear');
  near(spatialFromTiles(hero(1, 0), 10, 11, CFG).pan, 0.9, 'facing right, enemy below → right ear');
}
// 距離で薄まらない（遠くても同じ方向なら同じ pan）
near(spatialFromTiles(hero(0, 1), 20, 10, CFG).pan, -0.9, 'far left');
// 正面は中央、背後は behind
{
  const front = spatialFromTiles(hero(0, 1), 10, 12, CFG);
  near(front.pan, 0, 'front pan');
  assert.equal(front.behind, false);
  assert.equal(front.vertical, 1);
  const back = spatialFromTiles(hero(0, 1), 10, 8, CFG);
  assert.equal(back.behind, true);
  assert.equal(back.vertical, -1);
}
// 斜め向きでも大きさが変わらない
near(spatialFromTiles(hero(1, 1), 11, 11, CFG).pan, 0, 'diagonal facing, straight ahead');
// 同一タイルは NaN にならない
{
  const s = spatialFromTiles(hero(0, 1), 10, 10, CFG);
  near(s.pan, 0, 'same tile');
  assert.equal(s.behind, false);
}

// ---- 拘束中の side 定位 ----
near(spatialFromSide('left', CFG).pan, -0.9, 'side left');
near(spatialFromSide('right', CFG).pan, 0.9, 'side right');
assert.equal(spatialFromSide('down', CFG).behind, false);
assert.equal(spatialFromSide('down', CFG).vertical, 1);
assert.equal(spatialFromSide('back', CFG).behind, true);
assert.equal(spatialFromSide('back', CFG).vertical, -1);
assert.equal(spatialFromSide('unknown', CFG), null);

// side（主人公基準）と、ワールド位置から求めた定位が一致する
near(
  spatialFromTiles(hero(0, 1), 11, 10, CFG).pan,
  spatialFromSide('left', CFG).pan,
  'world right of a down-facing hero == side left'
);
near(
  spatialFromTiles(hero(0, 1), 9, 10, CFG).pan,
  spatialFromSide('right', CFG).pan,
  'world left of a down-facing hero == side right'
);

// ---- se ペイロードの解決 ----
{
  assert.equal(resolveSpatial({ id: 'x' }, hero(0, 1), CFG), null, 'no position → centered');
  assert.equal(resolveSpatial({ tx: 11 }, hero(0, 1), CFG), null, 'tx without ty → centered');
  near(resolveSpatial({ tx: 11, ty: 10 }, hero(0, 1), CFG).pan, -0.9, 'tile position');
  near(
    resolveSpatial({ side: 'right', tx: 11, ty: 10 }, hero(0, 1), CFG).pan,
    0.9,
    'side takes precedence over tiles'
  );
}

console.log('se-logic: all checks passed');