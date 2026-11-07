// File: tools/test-skill-stage.mjs
import assert from 'node:assert/strict';
import {
  normalizeStage, hitTimes, totalSec, cuesFor, SkillDirector
} from '../src/battle/skillStage.js';
import { EnemyPhase } from '../src/battle/enemyPhase.js';
import { STAGE_FX } from '../src/battle/stageFx.js';
import { SKILL_STAGES } from '../src/data/skillStages.js';
import { bannerAlpha, bannerSlide, flashEnvelope, nextBanner } from '../src/ui/skillHudMath.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

const CFG = {
  defaults: {
    attack: { flashSec: 0, durationSec: 0.35, hitAt: 0.05 },
    special: { flashSec: 0.25, durationSec: 0.8, hitAt: 0.1 }
  }
};

// ---- normalizeStage（台本なし = 従来の演出）----
{
  const s = normalizeStage(undefined, 'attack', CFG);
  assert.equal(s.flashSec, 0);
  near(s.durationSec, 0.35);
  assert.deepEqual(s.hits, { count: 1, startSec: 0.05, endSec: 0.05 });
  assert.deepEqual(s.perHit, { hp: 1, mp: 1, exp: 1 });
  assert.equal(s.hitNumbers, true);
  assert.deepEqual(s.fx, [{ at: 'hit', id: 'legacy' }]);
  assert.deepEqual(s.se, [{ at: 'hit', id: '$skill', delay: 0.1 }]);

  const b = normalizeStage(undefined, 'bind', CFG);   // 定義の無い種別は special を使う
  near(b.flashSec, 0.25);
}

// ---- normalizeStage（台本あり）----
{
  const s = normalizeStage(SKILL_STAGES.drainBerochu, 'special', CFG);
  assert.equal(s.hits.count, 10);
  assert.deepEqual(s.perHit.exp, 0.5);
  near(s.perHit.hp, 0.1);
  near(s.perHit.mp, 0.1);
  assert.equal(s.hitNumbers, false);
  const times = hitTimes(s);
  assert.equal(times.length, 10);
  near(times[0], 0.35);
  near(times[9], 3.15);
  near(totalSec(s), 3.35);
  assert.equal(s.name, 'どれいんべろちゅー');
}

// ---- normalizeStage（値の整形）----
{
  const s = normalizeStage({
    flashSec: 9, durationSec: 99, hits: { count: 999, startSec: -1, endSec: 99 }, fx: [{ at: 'x', id: 'a' }, { at: 'hit' }, { at: 'end', id: 'b' }]
  }, 'special', CFG);
  assert.equal(s.hits.count, 40);
  assert.equal(s.hits.startSec, 0);
  near(s.hits.endSec, 7.95);
  assert.equal(s.flashSec, 1);
  assert.equal(s.durationSec, 8);
  assert.deepEqual(s.fx, [{ at: 'end', id: 'b' }]);   // 不正なキューは捨てる
  assert.equal(normalizeStage({ hits: { count: 1 } }, 'special', CFG).hitNumbers, true);
  assert.equal(normalizeStage({ hits: { count: 3 } }, 'special', CFG).hitNumbers, false);
  // 持続時間が最後のヒットより短くても、ヒットが演出の外に出ない
  const t = normalizeStage({ durationSec: 0.1, hits: { count: 2, startSec: 0, endSec: 1 } }, 'special', CFG);
  near(t.durationSec, 1.05);
}

// ---- cuesFor ----
{
  const list = [
    { at: 'start', id: 'a' },
    { at: 'hit', id: 'b', every: 3 },
    { at: 'hit', id: 'c', from: 2, to: 4 },
    { at: 'end', id: 'd' }
  ];
  const ids = (at, i) => cuesFor(list, at, i, 10).map((c) => c.id);
  assert.deepEqual(ids('start', 0), ['a']);
  assert.deepEqual(ids('end', 9), ['d']);
  assert.deepEqual(ids('hit', 0), ['b']);
  assert.deepEqual(ids('hit', 1), []);
  assert.deepEqual(ids('hit', 2), ['c']);
  assert.deepEqual(ids('hit', 3), ['b', 'c']);
  assert.deepEqual(ids('hit', 5), []);
  assert.deepEqual(ids('hit', 6), ['b']);
  assert.deepEqual(cuesFor(undefined, 'hit'), []);
}

// ---- SkillDirector ----
function makeDirector(extra = {}) {
  const log = [];
  const d = new SkillDirector({
    maxDt: 0.25,
    onStart: (p) => log.push(`start:${p.payload}`),
    onHit: (p, i) => log.push(`hit:${p.payload}:${i}`),
    onEnd: (p, c) => log.push(`end:${p.payload}:${c}`),
    ...extra
  });
  return { d, log };
}
const stage3 = () => normalizeStage(
  { flashSec: 0.2, durationSec: 1, hits: { count: 3, startSec: 0.1, endSec: 0.5 } }, 'special', CFG
);   // ヒット: 0.3 / 0.5 / 0.7、終了: 1.2

{
  const { d, log } = makeDirector();
  d.start({ stage: stage3(), payload: 'A' });
  assert.deepEqual(log, ['start:A']);
  assert.equal(d.busy(), true);
  d.update(0.25);
  assert.deepEqual(log, ['start:A']);          // 発光中はヒットしない
  d.update(0.25);
  assert.deepEqual(log, ['start:A', 'hit:A:0', 'hit:A:1']);
  d.update(0.25);
  assert.equal(log.at(-1), 'hit:A:2');
  d.update(0.25);
  d.update(0.25);
  assert.equal(log.at(-1), 'end:A:false');
  assert.equal(d.busy(), false);
  d.update(1);                                  // 何もない状態で呼んでも問題ない
}

// 1フレームで進める時間の上限
{
  const { d, log } = makeDirector();
  d.start({ stage: stage3(), payload: 'A' });
  d.update(10);
  assert.deepEqual(log, ['start:A']);           // 0.25秒しか進まない
}

// 順番待ち
{
  const { d, log } = makeDirector();
  const quick = () => normalizeStage({ flashSec: 0, durationSec: 0.2, hits: { count: 1, startSec: 0, endSec: 0 } }, 'attack', CFG);
  d.start({ stage: quick(), payload: 'A' });
  d.start({ stage: quick(), payload: 'B' });
  assert.deepEqual(log, ['start:A']);
  d.update(0.25);
  assert.deepEqual(log, ['start:A', 'hit:A:0', 'end:A:false', 'start:B']);
  assert.equal(d.busy(), true);
  d.update(0.25);
  assert.equal(d.busy(), false);
}

// コールバックの中からの cancel
{
  const log = [];
  let d;
  d = new SkillDirector({
    onStart: () => log.push('start'),
    onHit: (p, i) => {
      log.push(`hit:${i}`);
      if (i === 1) d.cancel();
    },
    onEnd: (p, c) => log.push(`end:${c}`)
  });
  d.start({ stage: stage3(), payload: null });
  d.start({ stage: stage3(), payload: null });   // 順番待ちも捨てられる
  d.update(0.25);
  d.update(0.25);
  assert.deepEqual(log, ['start', 'hit:0', 'hit:1', 'end:true']);
  assert.equal(d.busy(), false);
  d.update(0.25);
  assert.equal(log.length, 4);
}

// clear は何も呼ばない
{
  const { d, log } = makeDirector();
  d.start({ stage: stage3(), payload: 'A' });
  d.clear();
  assert.equal(d.busy(), false);
  assert.deepEqual(log, ['start:A']);
}

// ---- EnemyPhase ----
{
  const acted = [];
  let busy = false;
  let done = 0;
  const units = ['a', 'b', 'c'];
  const phase = new EnemyPhase({
    units,
    act: (u) => {
      acted.push(u);
      if (u === 'b') busy = true;   // b が技の演出を始めた
    },
    isBusy: () => busy,
    onDone: () => { done += 1; }
  });
  phase.pump();
  assert.deepEqual(acted, ['a', 'b']);   // b の演出中は c に進まない
  assert.equal(done, 0);
  phase.pump();
  assert.deepEqual(acted, ['a', 'b']);
  busy = false;
  phase.pump();
  assert.deepEqual(acted, ['a', 'b', 'c']);
  assert.equal(done, 1);
  phase.pump();
  assert.equal(done, 1);                 // 終了後は何もしない
}
{
  const acted = [];
  let stop = false;
  const phase = new EnemyPhase({
    units: ['a', 'b', 'c'],
    isPresent: (u) => u !== 'b',
    act: (u) => {
      acted.push(u);
      if (u === 'a') stop = true;
    },
    shouldStop: () => stop
  });
  phase.pump();
  assert.deepEqual(acted, ['a']);        // 止める条件が立ったら、残りは動かない
  assert.equal(phase.finished, true);

  const acted2 = [];
  new EnemyPhase({ units: ['a', 'b', 'c'], isPresent: (u) => u !== 'b', act: (u) => acted2.push(u) }).pump();
  assert.deepEqual(acted2, ['a', 'c']);  // いなくなった敵は飛ばす

  let done = 0;
  new EnemyPhase({ units: [], act: () => {}, onDone: () => { done += 1; } }).pump();
  assert.equal(done, 1);                 // 敵がいなくても、終了は通知する
}

// ---- STAGE_FX ----
{
  const fixture = (def, attr, over = {}) => ({
    hero: { body: { x: 10, y: 20 }, head: { x: 10, y: 0 } },
    enemy: { body: { x: 100, y: 20 }, head: { x: 100, y: 0 } },
    dir: { dx: 1, dy: 0 },
    def, attr, index: 0, count: 1, progress: 0,
    hpLoss: 5, mpLoss: 0, expLost: 0, opts: {},
    ...over
  });
  const types = (list) => list.map((f) => f.type);

  assert.deepEqual(types(STAGE_FX.legacy(fixture({ fx: 'kiss', category: 'attack' }, 'mouth'))), ['stream', 'hearts', 'tint', 'kiss']);
  assert.deepEqual(types(STAGE_FX.legacy(fixture({ fx: 'kiss', category: 'attack' }, 'bust'))), ['stream', 'hearts', 'tint']);
  assert.deepEqual(types(STAGE_FX.legacy(fixture({ fx: 'blowKiss', category: 'special' }, 'hip'))), ['heartProjectile', 'stream']);
  assert.deepEqual(types(STAGE_FX.legacy(fixture({ fx: 'hit', category: 'attack' }, 'hip'))), ['impact', 'sparks']);
  assert.deepEqual(STAGE_FX.legacy(fixture({ category: 'attack' }, 'hip')), []);
  assert.deepEqual(types(STAGE_FX.legacy(fixture({ fx: 'pose', category: 'special' }, 'mouth', { hpLoss: 0 }))), ['ring', 'hearts', 'tint']);

  const drain = STAGE_FX.drainStream(fixture({}, 'mouth', { opts: { count: 5 } }))[0];
  assert.equal(drain.from.x, 10);        // 主人公から
  assert.equal(drain.to.x, 100);         // 敵へ
  assert.equal(drain.count, 5);
  const kiss = STAGE_FX.kissStream(fixture({}, 'mouth'))[0];
  assert.equal(kiss.from.x, 100);        // 敵から
  assert.equal(kiss.to.x, 10);           // 主人公へ
  assert.equal(STAGE_FX.shake(fixture({}, 'mouth', { opts: { power: 0.25 } }))[0].power, 0.25);
  assert.deepEqual(STAGE_FX.kissMark(fixture({}, 'mouth'))[0], { type: 'kiss', x: 10, y: 10, dx: 1, dy: 0 });

  // 台本が使う演出は、すべて登録されている
  for (const [id, s] of Object.entries(SKILL_STAGES)) {
    for (const cue of s.fx ?? []) assert.ok(STAGE_FX[cue.id], `${id}: 未登録の演出 ${cue.id}`);
  }
}

// ---- skillHudMath ----
near(bannerAlpha(-1, 1, 0.12, 0.3), 0);
near(bannerAlpha(0, 1, 0.12, 0.3), 0);
near(bannerAlpha(0.06, 1, 0.12, 0.3), 0.5);
near(bannerAlpha(0.5, 1, 0.12, 0.3), 1);
near(bannerAlpha(1.15, 1, 0.12, 0.3), 0.5);
near(bannerAlpha(1.3, 1, 0.12, 0.3), 0);
near(bannerSlide(0, 0.12, 40), -40);
near(bannerSlide(0.12, 0.12, 40), 0);
near(bannerSlide(5, 0.12, 40), 0);

near(flashEnvelope(0, 0.25), 0);
near(flashEnvelope(0.1, 0.25), 1);
near(flashEnvelope(0.175, 0.25), 0.25);
near(flashEnvelope(0.25, 0.25), 0);
near(flashEnvelope(1, 0.25), 0);
near(flashEnvelope(0.1, 0), 0);
{
  let prev = 0;
  for (let i = 0; i <= 10; i += 1) {   // 立ち上がりは単調増加、その後は単調減少（点滅しない）
    const v = flashEnvelope(i * 0.01, 0.25);
    assert.ok(v >= prev - 1e-12);
    prev = v;
  }
  for (let i = 10; i <= 25; i += 1) {
    const v = flashEnvelope(i * 0.01, 0.25);
    assert.ok(v <= prev + 1e-12);
    prev = v;
  }
}

{
  const first = nextBanner(null, { key: 'k', title: 'T', sub: 'S', attr: 'mouth', holdSec: 0.9 });
  assert.deepEqual(first, { key: 'k', title: 'T', sub: 'S', attr: 'mouth', age: 0, holdSec: 0.9 });
  // 同じ技名が表示中なら、出し直さず延長する
  const again = nextBanner({ ...first, age: 0.5 }, { key: 'k', title: 'T', sub: 'S', attr: 'mouth', holdSec: 2 });
  assert.equal(again.age, 0.5);
  near(again.holdSec, 2.5);
  // 消え始めていたら、新しく出す
  const fresh = nextBanner({ ...first, age: 0.95 }, { key: 'k', title: 'T', sub: 'S', attr: 'mouth', holdSec: 2 });
  assert.equal(fresh.age, 0);
  // 別の技名は、新しく出す
  assert.equal(nextBanner({ ...first, age: 0.1 }, { key: 'z', title: 'Z', sub: '', attr: 'foot', holdSec: 1 }).key, 'z');
}

console.log('skill-stage: all checks passed');