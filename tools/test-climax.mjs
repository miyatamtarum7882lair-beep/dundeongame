// File: tools/test-climax.mjs
import assert from 'node:assert/strict';
import { B } from '../src/data/balance.js';
import {
  ClimaxController,
  climaxDurationSec,
  afterglowTurnsFor,
  climaxDrainMult,
} from '../src/battle/climaxController.js';

function make({ hp = 100, maxHp = 100, binders = 1, onSecond } = {}) {
  const state = { count: 0, hp, binders, log: [] };
  const ctl = new ClimaxController({
    getCount: () => state.count,
    setCount: (n) => {
      state.count = n;
    },
    emit: (name, payload) => state.log.push([name, payload]),
    releaseBinders: (reason) => state.log.push(['release', reason]),
    restoreMp: () => state.log.push(['restore']),
    onSecond: (info) => {
      state.log.push(['second', info]);
      onSecond?.(info, ctl);
    },
    getHp: () => state.hp,
    getMaxHp: () => maxHp,
    loseHp: (n) => {
      state.hp = Math.max(0, state.hp - n);
      state.log.push(['loseHp', n]);
    },
    onDefeat: () => state.log.push(['defeat']),
    getBinderCount: () => state.binders,
  });
  return { ctl, state };
}

const names = (state) => state.log.map((e) => e[0]);
const find = (state, name) => state.log.filter((e) => e[0] === name);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

// 1. 継続秒: 5, 7, 9, 11, 13, 15 と増え、15で頭打ち
{
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6, 30].map((n) => climaxDurationSec(n)),
    [5, 7, 9, 11, 13, 15, 15, 15]
  );
}

// 2. 余韻ターン: 初回10、減っていき、下限を割らない
{
  assert.equal(afterglowTurnsFor(0), 10);
  let prev = Infinity;
  for (let n = 0; n < 40; n++) {
    const t = afterglowTurnsFor(n);
    assert.ok(t <= prev && t >= B.climax.afterglowMinTurns);
    prev = t;
  }
}

// 3. 開始条件: 拘束中かつMP0のときだけ。二重開始しない
{
  const { ctl } = make();
  assert.equal(ctl.tryStart({ bound: false, mp: 0 }), false);
  assert.equal(ctl.tryStart({ bound: true, mp: 1 }), false);
  assert.equal(ctl.tryStart({ bound: true, mp: 0 }), true);
  assert.equal(ctl.tryStart({ bound: true, mp: 0 }), false);
}

// 4. 5秒で終わる。解除 → MP回復 → climaxEnd → afterglowStart の順で1回だけ
{
  const { ctl, state } = make();
  ctl.tryStart({ bound: true, mp: 0 });
  ctl.update(4.9);
  assert.equal(ctl.isClimax(), true);
  assert.equal(find(state, 'second').length, 4);
  ctl.update(0.1);
  assert.equal(ctl.isClimax(), false);
  assert.equal(find(state, 'second').length, 5);
  assert.equal(find(state, 'release').length, 1);
  assert.equal(find(state, 'release')[0][1], 'climax');
  const n = names(state);
  assert.ok(n.indexOf('release') < n.indexOf('restore'));
  assert.ok(n.indexOf('restore') < n.indexOf('climaxEnd'));
  assert.ok(n.indexOf('climaxEnd') < n.indexOf('afterglowStart'));
  assert.equal(state.count, 1);
  assert.equal(ctl.afterglowLeft, 10);
}

// 5. 大きな dt でも秒処理は継続秒ぶんだけ、終了は1回
{
  const { ctl, state } = make();
  ctl.tryStart({ bound: true, mp: 0 });
  ctl.update(100);
  ctl.update(100);
  assert.equal(find(state, 'second').length, 5);
  assert.equal(find(state, 'climaxEnd').length, 1);
}

// 6. 絶頂のたびに延び、余韻は短くなる（HPは毎回戻して敗北を避ける）
{
  const { ctl, state } = make({ hp: 100000, maxHp: 100000 });
  for (let i = 0; i < 12; i++) {
    state.hp = 100000;
    assert.equal(ctl.tryStart({ bound: true, mp: 0 }), true, `start #${i}`);
    assert.equal(find(state, 'climaxStart').at(-1)[1].durationSec, Math.min(15, 5 + 2 * i));
    ctl.update(100);
    assert.equal(
      find(state, 'climaxEnd').at(-1)[1].afterglowTurns,
      Math.max(B.climax.afterglowMinTurns, 10 - i)
    );
  }
}

// 7. 脱出ロックは絶頂中のみ
{
  const { ctl } = make();
  assert.equal(ctl.escapeLocked(), false);
  ctl.tryStart({ bound: true, mp: 0 });
  assert.equal(ctl.escapeLocked(), true);
  ctl.update(100);
  assert.equal(ctl.escapeLocked(), false);
}

// 8. 余韻: ドレイン倍率・状態異常無効・拘束ブロック・HP回復停止、ターンで終わる
{
  const { ctl, state } = make();
  assert.equal(ctl.drainScale(), 1);
  assert.equal(ctl.isStatusImmune(), false);
  assert.equal(ctl.blocksBinding(), false);
  assert.equal(ctl.hpRegenScale(), 1);
  ctl.tryStart({ bound: true, mp: 0 });
  assert.equal(ctl.hpRegenScale(), 0, 'climax');
  ctl.update(100);
  assert.equal(ctl.drainScale(), B.climax.afterglowDrainRate);
  assert.equal(ctl.isStatusImmune(), true);
  assert.equal(ctl.blocksBinding(), true);
  assert.equal(ctl.hpRegenScale(), 0, 'afterglow');
  for (let i = 0; i < 9; i++) ctl.onHeroTurnEnd();
  assert.equal(find(state, 'afterglowEnd').length, 0);
  ctl.onHeroTurnEnd();
  assert.equal(find(state, 'afterglowEnd').length, 1);
  assert.equal(ctl.blocksBinding(), false);
  assert.equal(ctl.hpRegenScale(), 1);
}

// 9. abort は解除・MP回復・余韻を発生させない
{
  const { ctl, state } = make();
  ctl.tryStart({ bound: true, mp: 0 });
  ctl.update(2);
  ctl.abort();
  assert.equal(ctl.isClimax(), false);
  assert.equal(find(state, 'release').length, 0);
  assert.equal(find(state, 'restore').length, 0);
  assert.equal(ctl.isAfterglow(), false);
  assert.equal(state.count, 0);
}

// 10. 保存・復元とリセット
{
  const { ctl } = make();
  ctl.restore({ afterglowTurns: 4 });
  assert.equal(ctl.isAfterglow(), true);
  assert.equal(ctl.serialize().afterglowTurns, 4);
  ctl.reset();
  assert.equal(ctl.isAfterglow(), false);
}

// 11. 開始時に最大HPの30%を固定ドレインする。毎秒のHPドレインは無い
{
  const { ctl, state } = make({ hp: 100, maxHp: 100 });
  ctl.tryStart({ bound: true, mp: 0 });
  assert.equal(state.hp, 70);
  assert.equal(find(state, 'climaxStart')[0][1].hpLoss, 30);
  ctl.update(100);
  assert.equal(find(state, 'loseHp').length, 1, 'HP is drained only once at start');
}

// 12. 現在HPが30%以下なら開始と同時に敗北（絶頂回数は増えない）
{
  const { ctl, state } = make({ hp: 30, maxHp: 100 });
  assert.equal(ctl.tryStart({ bound: true, mp: 0 }), true);
  assert.equal(state.hp, 0);
  assert.equal(find(state, 'defeat').length, 1);
  assert.equal(ctl.isClimax(), false);
  ctl.update(100);
  assert.equal(find(state, 'release').length, 0);
  assert.equal(state.count, 0);
}

// 13. 延長: +5秒、合計上限5秒。絶頂ごとにリセット
{
  const { ctl, state } = make();
  ctl.tryStart({ bound: true, mp: 0 });
  ctl.update(2);
  assert.equal(ctl.extend(), 5);
  near(ctl.duration, 10);
  assert.equal(ctl.extend(), 0, 'total cap');
  near(ctl.duration, 10);
  const ev = find(state, 'climaxExtend');
  assert.equal(ev.length, 1);
  near(ev[0][1].remainingSec, 8);
  ctl.update(100);
  assert.equal(find(state, 'second').length, 10);
  assert.equal(ctl.extend(), 0, 'after finish');
  ctl.tryStart({ bound: true, mp: 0 });
  assert.equal(ctl.extend(), 5, 'cap resets per climax');
}

// 14. 絶頂中でなければ延長しない
{
  const { ctl, state } = make();
  assert.equal(ctl.extend(), 0);
  assert.equal(find(state, 'climaxExtend').length, 0);
}

// 15. 残り0秒の競合: 最終秒の処理中に拘束が増えても、解除されず延長され、終了は1回
{
  const { ctl, state } = make({
    onSecond: ({ second }, c) => {
      if (second === 5) c.extend();
    },
  });
  ctl.tryStart({ bound: true, mp: 0 });
  ctl.update(5);
  assert.equal(ctl.isClimax(), true, 'still climaxing after extension at 0s');
  assert.equal(find(state, 'release').length, 0);
  ctl.update(100);
  assert.equal(ctl.isClimax(), false);
  assert.equal(find(state, 'release').length, 1);
  assert.equal(find(state, 'climaxEnd').length, 1);
}

// 16. 終了と同じ update で終わった後の拘束は延長されない（通常の新規拘束）
{
  const { ctl } = make();
  ctl.tryStart({ bound: true, mp: 0 });
  ctl.update(5);
  assert.equal(ctl.isClimax(), false);
  assert.equal(ctl.extend(), 0);
}

// 17. 拘束者数による倍率と tick 間隔
{
  near(climaxDrainMult(0, 1), B.climax.drainMultStart);
  near(climaxDrainMult(1, 1), B.climax.drainMultEnd);
  near(climaxDrainMult(0, 3), B.climax.drainMultStart * (1 + B.climax.extraBinderDrainMult * 2));
  const { ctl } = make();
  assert.equal(ctl.boundTickSec(), B.bound.tickSec);
  ctl.tryStart({ bound: true, mp: 0 });
  assert.equal(ctl.boundTickSec(), B.climax.tickSec);
}

// 18. onSecond に拘束者数と倍率が渡る
{
  const { ctl, state } = make({ binders: 3 });
  ctl.tryStart({ bound: true, mp: 0 });
  ctl.update(1);
  const info = find(state, 'second')[0][1];
  assert.equal(info.binderCount, 3);
  near(info.drainMult, climaxDrainMult(info.progress, 3));
}

console.log('climax: all checks passed');