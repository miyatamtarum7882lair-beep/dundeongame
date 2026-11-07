// File: tools/test-flashback.mjs
import assert from 'node:assert/strict';
import {
  durationFor, envelope, visualParams, buildFilter, motionFor,
  beatTimes, beatScale, ringProgress, smallHeartAlpha
} from '../src/core/flashbackMath.js';
import { FlashbackController, flashbackKey } from '../src/battle/flashback.js';
import { InputGate } from '../src/core/inputGate.js';
import { buildStatusEntries } from '../src/ui/statusPanel.js';
import { tintFor } from '../src/data/flashbackRules.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

const HEARTS = {
  beats: 2, beatGapSec: 0.2, popAmp: 0.22, popAttackSec: 0.05, popDecaySec: 0.3,
  sizePx: 280, fillAlpha: 0.16, lineAlpha: 0.55, lineWidthPx: 5,
  ringAlpha: 0.4, ringMaxPx: 560, ringLifeSec: 0.7,
  smallCount: 14, smallSizePx: [14, 30], smallReachPx: [180, 340], smallLifeSec: 1, smallAlpha: 0.75
};

const CFG = {
  minGapSec: 2.2,
  erectTurns: 3,
  inputLockSec: 0.35,
  riseSec: 0.3,
  holdSec: 0.5,
  durationSec: { touch: 1.3, strong: 1.7, rematch: 1.5, bind: 1.5 },
  kindScale: { touch: 0.8, strong: 1, rematch: 0.9, bind: 1 },
  reducedScale: 0.6,
  warp: { enabled: true },
  art: { alpha: 1, echoAlpha: 0.4, echoCount: 2, glowAlpha: 0.9, pushIn: 0.2, pulseHz: 1, pulseAmp: 0, driftPx: 10 },
  hearts: HEARTS,
  full: { blurPx: 3, invert: 0.28, desaturate: 0.35, dim: 0.9, warpScale: 16 },
  reduced: { blurPx: 1, artAlpha: 0.35 }
};

// ---- durationFor ----
near(durationFor('touch', 'full', CFG), 1.3);
near(durationFor('touch', 'reduced', CFG), 0.78);
near(durationFor('touch', 'off', CFG), 0);
near(durationFor('unknown', 'full', CFG), 1);

// ---- envelope（total 1秒、立ち上がり 0.2秒）----
near(envelope(0, 1, 0.2), 0);
near(envelope(0.1, 1, 0.2), 0.5);
near(envelope(0.2, 1, 0.2), 1);
near(envelope(0.6, 1, 0.2), 0.25);
near(envelope(1, 1, 0.2), 0);
near(envelope(2, 1, 0.2), 0);
near(envelope(-1, 1, 0.2), 0);
{
  let prev = 0;
  for (let i = 0; i <= 20; i += 1) {
    const e = envelope(i * 0.01, 1, 0.2);
    assert.ok(e >= prev - 1e-12, '立ち上がりは単調増加');
    prev = e;
  }
  for (let i = 20; i <= 100; i += 1) {
    const e = envelope(i * 0.01, 1, 0.2);
    assert.ok(e <= prev + 1e-12, '減衰は単調減少');
    prev = e;
  }
}

// ---- envelope（保持あり）----
near(envelope(0.5, 1, 0.2, 0.3), 1);
near(envelope(0.2, 1, 0.2, 0.3), 1);
near(envelope(0.75, 1, 0.2, 0.3), 0.25);
near(envelope(1, 1, 0.2, 0.3), 0);

// ---- visualParams ----
assert.equal(visualParams('off', CFG), null);
{
  const r = visualParams('reduced', CFG);
  assert.equal(r.invert, 0);
  assert.equal(r.dim, 0);
  assert.equal(r.warpScale, 0);
  assert.equal(r.hearts, null);
  near(r.art.alpha, 0.35);
  assert.equal(r.art.echoCount, 0);
  assert.equal(r.art.still, true);
}
{
  const f = visualParams('full', CFG);
  near(f.invert, 0.28);
  near(f.dim, 0.5);                  // 暗転の上限
  near(f.art.glowAlpha, 0.3);        // 光の上限
  assert.equal(f.warpScale, 16);
  assert.equal(f.art.echoCount, 2);
  assert.equal(f.art.still, false);
  assert.equal(visualParams(undefined, CFG).blurPx, 3);
  // ノイズ・帯・縁の暗がりは廃止
  for (const key of ['noiseAlpha', 'bandAlpha', 'bands', 'vignetteAlpha']) {
    assert.equal(key in f, false, key);
  }
  assert.equal(visualParams('full', { ...CFG, warp: { enabled: false } }).warpScale, 0);
}
{
  const hot = visualParams('full', { ...CFG, full: { ...CFG.full, invert: 0.9 } });
  near(hot.invert, 0.3);
}

// ---- visualParams（ハート）----
{
  const h = visualParams('full', CFG).hearts;
  assert.equal(h.beats, 2);
  near(h.fillAlpha, 0.16);
  near(h.lineAlpha, 0.55);
  assert.deepEqual(h.smallSizePx, [14, 30]);

  const hot = visualParams('full', {
    ...CFG,
    hearts: { ...HEARTS, beats: 5, beatGapSec: 0.05, fillAlpha: 0.9, popAmp: 2, smallCount: 99 }
  }).hearts;
  assert.equal(hot.beats, 2);          // 点滅は1秒3回未満
  near(hot.gapSec, 0.2);               // 拍は0.2秒以上あける
  near(hot.fillAlpha, 0.3);            // 大きな塗りの上限
  near(hot.popAmp, 0.4);
  assert.equal(hot.smallCount, 24);

  assert.equal(visualParams('full', { ...CFG, hearts: { ...HEARTS, beats: 0 } }).hearts, null);
  assert.equal(visualParams('full', { ...CFG, hearts: undefined }).hearts, null);
}

// ---- buildFilter ----
assert.equal(
  buildFilter({ blurPx: 2, invert: 0.2, desaturate: 0.4, warp: 8 }),
  'url(#fbWarp) blur(2.00px) invert(0.200) saturate(0.600)'
);
assert.equal(buildFilter({ blurPx: 0, invert: 0, desaturate: 0, warp: 0 }), '');
assert.equal(buildFilter({ warp: 0.4 }), '');
assert.equal(buildFilter({ brightness: 0.7 }), 'brightness(0.700)');
assert.equal(buildFilter({ brightness: 0.999 }), '');

// ---- motionFor ----
{
  const art = CFG.art;
  assert.deepEqual(motionFor('mouth', 0.5, 1, art, true), { dx: 0, dy: 0, scale: 1 });
  near(motionFor('mouth', 0, 1, art).scale, 1);
  near(motionFor('mouth', 1, 1, art).scale, 1.3);      // 口は強く寄る
  near(motionFor('bust', 1, 1, art).scale, 1.2);
  near(motionFor('foot', 0, 1, art).dy, 40);           // 足は下から
  near(motionFor('foot', 1, 1, art).dy, 0);
  near(motionFor('hip', 0.25, 1, art).dx, Math.sin(2 * Math.PI * 0.6 * 0.25) * 15);
  near(motionFor('bust', 0.25, 1, art).dy, Math.sin(2 * Math.PI * 0.55 * 0.25) * 10);
  assert.equal(motionFor('all', 0.5, 1, art).dx, 0);
  assert.equal(motionFor('all', 0.5, 1, art).dy, 0);
}

// ---- beatTimes / beatScale ----
{
  const h = { beats: 2, gapSec: 0.2, popAmp: 0.22, popAttackSec: 0.05, popDecaySec: 0.3 };
  const times = beatTimes(0.2, h);
  assert.equal(times.length, 2);
  near(times[0], 0.2);
  near(times[1], 0.4);

  near(beatScale(0.1, [0.2], h), 1);          // 拍の前
  near(beatScale(0.2, [0.2], h), 1);          // 拍の瞬間（ここから膨らむ）
  near(beatScale(0.25, [0.2], h), 1.22);      // 膨らみの頂点
  near(beatScale(0.4, [0.2], h), 1.055);      // 戻る途中
  near(beatScale(0.6, [0.2], h), 1);          // 戻りきる
  // 2拍目が重なる
  near(beatScale(0.45, times, h), 1 + 0.22 * Math.pow(1 - (0.25 - 0.05) / 0.3, 2) + 0.22);

  // 1拍の膨らみは、頂点のあと単調に戻る
  let prev = Infinity;
  for (let i = 25; i <= 60; i += 1) {
    const s = beatScale(i * 0.01, [0.2], h);
    assert.ok(s <= prev + 1e-12);
    prev = s;
  }
}

// ---- ringProgress ----
assert.equal(ringProgress(0.1, 0.2, 0.7), null);
near(ringProgress(0.2, 0.2, 0.7), 0);
near(ringProgress(0.55, 0.2, 0.7), 0.5);
assert.equal(ringProgress(1, 0.2, 0.7), null);

// ---- smallHeartAlpha ----
near(smallHeartAlpha(0), 0);
near(smallHeartAlpha(0.15), 1);
near(smallHeartAlpha(0.575), 0.25);
near(smallHeartAlpha(1), 0);
near(smallHeartAlpha(-0.5), 0);
{
  let prev = 1;
  for (let i = 15; i <= 100; i += 1) {
    const a = smallHeartAlpha(i / 100);
    assert.ok(a <= prev + 1e-12, '現れたあとは単調に薄れる');
    prev = a;
  }
}

// ---- FlashbackController ----
function make() {
  const events = [];
  const state = { mode: 'full', floor: 'a', blocked: false };
  const fb = new FlashbackController({
    cfg: CFG,
    getMode: () => state.mode,
    getFloorKey: () => state.floor,
    emit: (name, payload) => events.push({ name, payload }),
    isBlocked: () => state.blocked
  });
  return { fb, events, state };
}
const touch = (enemyId) => ({ kind: 'touch', enemyId, attr: 'mouth', tx: 1, ty: 2 });

assert.equal(flashbackKey('touch', 'kitten', null), 'touch:kitten');
assert.equal(flashbackKey('strong', 'a', 's'), 'skill:s');
assert.equal(flashbackKey('rematch', 'b', 's'), 'skill:s');
assert.equal(flashbackKey('bind', 'c', 's'), 'skill:s');

// 1. 接触: 発動して勃起が付く。同じ敵は1フロア1回
{
  const { fb, events } = make();
  assert.equal(fb.request(touch('kitten')), true);
  assert.equal(events[0].name, 'flashbackStart');
  assert.equal(events[0].payload.mode, 'full');
  near(events[0].payload.durationSec, 1.3);
  assert.equal(events[0].payload.erectTurns, 3);
  assert.equal(events[0].payload.tx, 1);
  assert.equal(fb.isErect(), true);
  near(fb.erectTurnsLeft(), 3);
  fb.update(2.3);
  assert.equal(fb.request(touch('kitten')), false);
  assert.equal(events.length, 1);
  assert.equal(fb.request(touch('nurse')), true);
}

// 2. 拘束開始: 勃起は付かない
{
  const { fb, events } = make();
  assert.equal(fb.request({ kind: 'bind', enemyId: 'kitten', attr: 'mouth', skillId: 'levelDrainKiss' }), true);
  assert.equal(fb.isErect(), false);
  assert.equal(events[0].payload.erectTurns, 0);
}

// 3. 技は種類をまたいで1フロア1回
{
  const { fb } = make();
  assert.equal(fb.request({ kind: 'strong', enemyId: 'a', attr: 'mouth', skillId: 'pinkBreath' }), true);
  fb.update(2.3);
  assert.equal(fb.request({ kind: 'rematch', enemyId: 'b', attr: 'mouth', skillId: 'pinkBreath' }), false);
  assert.equal(fb.request({ kind: 'rematch', enemyId: 'b', attr: 'mouth', skillId: 'blowKiss' }), true);
}

// 4. 最小間隔
{
  const { fb } = make();
  assert.equal(fb.request(touch('kitten')), true);
  assert.equal(fb.request(touch('nurse')), false);
  fb.update(2.19);
  assert.equal(fb.request(touch('nurse')), false);
  fb.update(0.02);
  assert.equal(fb.request(touch('nurse')), true);
}

// 5. フロアが変わると発動済みの記録を捨てる
{
  const { fb, state } = make();
  assert.equal(fb.request(touch('kitten')), true);
  fb.update(2.3);
  state.floor = 'b';
  assert.equal(fb.request(touch('kitten')), true);
}

// 6. 絶頂中・余韻中（blocked）は発動しない
{
  const { fb, events, state } = make();
  state.blocked = true;
  assert.equal(fb.request(touch('kitten')), false);
  assert.equal(events.length, 0);
  assert.equal(fb.isErect(), false);
}

// 7. Erection lasts for three confirmed hero turns.
{
  const { fb } = make();
  fb.request(touch('kitten'));
  fb.onHeroTurn();
  near(fb.erectTurnsLeft(), 2);
  fb.onHeroTurn();
  fb.onHeroTurn();
  near(fb.erectTurnsLeft(), 0);
  assert.equal(fb.isErect(), false);

  const b = make();
  b.fb.request(touch('kitten'));
  b.fb.onHeroTurn();
  b.fb.onHeroTurn();
  near(b.fb.erectTurnsLeft(), 1);
  b.fb.update(2.3);
  b.fb.request({ kind: 'strong', enemyId: 'x', attr: 'mouth', skillId: 'foxPounce' });
  near(b.fb.erectTurnsLeft(), 3);
}
// 8. cancel は記録を残し、reset は記録も捨てる
{
  const { fb, events } = make();
  fb.request(touch('kitten'));
  fb.cancel();
  assert.equal(fb.isErect(), false);
  assert.equal(events.at(-1).name, 'flashbackCancel');
  fb.update(2.3);
  assert.equal(fb.request(touch('kitten')), false);
  fb.reset();
  assert.equal(fb.request(touch('kitten')), true);
}

// 9. off: 映像は0秒だが、イベントと勃起は残る
{
  const { fb, events, state } = make();
  state.mode = 'off';
  assert.equal(fb.request(touch('kitten')), true);
  assert.equal(events[0].payload.mode, 'off');
  assert.equal(events[0].payload.durationSec, 0);
  assert.equal(fb.isErect(), true);
}

// ---- InputGate ----
{
  let active = false;
  const gate = new InputGate({ lockSec: 0.35, isActive: () => active });
  gate.onAction(0.2);
  assert.equal(gate.canAct(), true);   // 勃起していなければロックしない
  active = true;
  gate.onAction(0.2);                  // 0.2 + 0.35 = 0.55
  assert.equal(gate.canAct(), false);
  gate.update(0.5);
  assert.equal(gate.canAct(), false);
  gate.update(0.06);
  assert.equal(gate.canAct(), true);
  gate.onAction(0);
  assert.equal(gate.canAct(), false);
  gate.clear();
  assert.equal(gate.canAct(), true);
}

// ---- statusPanel ----
assert.deepEqual(buildStatusEntries({}), []);
{
  const rows = buildStatusEntries({
    buffs: [{ id: 'atkUp', label: 'Attack Up', turnsLeft: 10 }],
    buffTurns: 20,
    afterglowTurns: 4,
    erectTurns: 2,
    erectTotalTurns: 3
  });
  assert.deepEqual(rows.map((r) => r.id), ['erect', 'afterglow', 'atkUp']);
  near(rows[0].ratio, 2 / 3);
  assert.equal(rows[1].ratio, null);
  assert.equal(rows[2].kind, 'buff');
  assert.equal(rows[2].icon, 'sword');
  assert.equal(rows[2].detail, '10');
  near(rows[2].ratio, 0.5);
}
// ---- flashbackRules ----
assert.equal(tintFor('mouth').length, 3);
assert.deepEqual(tintFor('unknown'), tintFor('all'));

console.log('flashback: all checks passed');
