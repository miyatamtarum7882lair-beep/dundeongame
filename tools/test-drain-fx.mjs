// File: tools/test-drain-fx.mjs
import assert from 'node:assert/strict';
import { lowMpIntensity, membraneEnvelope, edgeAlpha } from '../src/ui/drainFxMath.js';
import { heartbeatBpm, Heartbeat } from '../src/core/heartbeat.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

const E = {
  periodSec: 2.6, lowMpStart: 0.5, lowMpAlpha: 0.16, membraneAlpha: 0.1,
  capAlpha: 0.22, climaxAlpha: 0.2, climaxCapAlpha: 0.42
};
const peakTime = E.periodSec / 4;   // sin = 1 → 波が最大

// ---- lowMpIntensity ----
near(lowMpIntensity(1, 0.5), 0);
near(lowMpIntensity(0.5, 0.5), 0);
near(lowMpIntensity(0.25, 0.5), 0.5);
near(lowMpIntensity(0, 0.5), 1);
near(lowMpIntensity(0.1, 0), 0);

// ---- membraneEnvelope ----
near(membraneEnvelope(-1, 0.12, 0.9), 0);
near(membraneEnvelope(0, 0.12, 0.9), 0);
near(membraneEnvelope(0.06, 0.12, 0.9), 0.5);
near(membraneEnvelope(0.12, 0.12, 0.9), 1);
near(membraneEnvelope(0.12 + 0.45, 0.12, 0.9), 0.25);
near(membraneEnvelope(5, 0.12, 0.9), 0);

// ---- edgeAlpha ----
const base = { mpRatio: 1, time: 0, membrane: 0, climaxProgress: null, mode: 'full' };
near(edgeAlpha(base, E), 0);                                                   // MPが十分なら出ない
near(edgeAlpha({ ...base, mpRatio: 0, time: peakTime }, E), 0.16);             // MP0・波の最大
near(edgeAlpha({ ...base, mpRatio: 0, time: 0 }, E), 0.16 * 0.775);            // 波の中間
near(edgeAlpha({ ...base, mpRatio: 0, time: peakTime, membrane: 1 }, E), 0.22); // 合算は上限で止まる
near(edgeAlpha({ ...base, membrane: 1 }, E), 0.1);                             // パルスだけ
near(edgeAlpha({ ...base, mpRatio: 0, time: peakTime, climaxProgress: 1 }, E), 0.36);
near(edgeAlpha({ ...base, mpRatio: 0, time: peakTime, climaxProgress: 1, membrane: 1 }, E), 0.42); // 絶頂中の上限
near(edgeAlpha({ ...base, mpRatio: 0, mode: 'reduced' }, E), 0.16 * 0.75);      // 固定の弱い縁
near(edgeAlpha({ ...base, mpRatio: 0, mode: 'off' }, E), 0);
{
  // reduced では絶頂中でも通常の上限
  const a = edgeAlpha({ ...base, mpRatio: 0, climaxProgress: 1, membrane: 1, mode: 'reduced' }, E);
  assert.ok(a <= 0.22 + 1e-12);
}

// ---- heartbeat ----
const H = { startRatio: 0.35, bpmMin: 60, bpmMax: 100, climaxBpm: 120 };
near(heartbeatBpm(0.5, H), 0);
near(heartbeatBpm(0.35, H), 0);
near(heartbeatBpm(0.175, H), 80);
near(heartbeatBpm(0, H), 100);
near(heartbeatBpm(0, H, true), 120);
near(heartbeatBpm(1, H, true), 120);

{
  const beats = [];
  const hb = new Heartbeat({ cfg: H, onBeat: (b) => beats.push(b) });
  hb.update(0.25, { mpRatio: 0 });
  hb.update(0.25, { mpRatio: 0 });
  assert.equal(beats.length, 0);             // 間隔0.6秒。まだ鳴らない
  hb.update(0.15, { mpRatio: 0 });
  assert.equal(beats.length, 1);
  near(beats[0].bpm, 100);
  near(beats[0].k, 1);
  hb.update(0.25, { mpRatio: 0 });
  assert.equal(beats.length, 1);

  // 無効にすると、溜めた時間もリセットされる
  hb.update(0.25, { mpRatio: 0 });
  hb.update(0.1, { mpRatio: 0, enabled: false });
  hb.update(0.25, { mpRatio: 0 });
  assert.equal(beats.length, 1);

  // しきい値より上では鳴らない
  const quiet = [];
  const hb2 = new Heartbeat({ cfg: H, onBeat: (b) => quiet.push(b) });
  for (let i = 0; i < 100; i += 1) hb2.update(0.1, { mpRatio: 0.6 });
  assert.equal(quiet.length, 0);
}

console.log('drain-fx: all checks passed');
