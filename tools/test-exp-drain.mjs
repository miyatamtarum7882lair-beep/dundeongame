// File: tools/test-exp-drain.mjs
import assert from 'node:assert/strict';
import { loseHeroExp } from '../src/battle/expDrain.js';

const levelUp = { hp: 10, mp: 8 };
const needFn = () => 100;
const make = (over = {}) => ({
  level: 5, exp: 80, hp: 100, mp: 50, maxHp: 110, maxMp: 60, ...over,
});
const run = (hs, amount, minLevel = 1) => loseHeroExp(hs, amount, { needFn, levelUp, minLevel });

// 1. 足りる場合はレベルが変わらない
{
  const hs = make();
  const r = run(hs, 30);
  assert.deepEqual(r, { lost: 30, levelsLost: 0, atFloor: false });
  assert.equal(hs.exp, 50);
  assert.equal(hs.level, 5);
}

// 2. 足りない場合は1レベル下がる。maxHp / maxMp も戻る
{
  const hs = make({ exp: 20 });
  const r = run(hs, 50);
  assert.equal(r.lost, 50);
  assert.equal(r.levelsLost, 1);
  assert.equal(hs.level, 4);
  assert.equal(hs.exp, 99 - 30);
  assert.equal(hs.maxHp, 100);
  assert.equal(hs.maxMp, 52);
}

// 3. 複数レベルを一度に失う
{
  const hs = make({ exp: 0 });
  const r = run(hs, 250);
  assert.equal(r.lost, 250);
  assert.equal(r.levelsLost, 3);
  assert.equal(hs.level, 2);
  assert.equal(hs.exp, 47);
}

// 4. 下限では止まり、失えた分だけ lost に入る
{
  const hs = make({ level: 2, exp: 20 });
  const r = run(hs, 50, 2);
  assert.deepEqual(r, { lost: 20, levelsLost: 0, atFloor: true });
  assert.equal(hs.level, 2);
  assert.equal(hs.exp, 0);
}

// 5. hp / mp は新しい上限で切り詰める
{
  const hs = make({ exp: 0, hp: 110, mp: 60 });
  run(hs, 10);
  assert.equal(hs.maxHp, 100);
  assert.equal(hs.hp, 100);
  assert.equal(hs.mp, 52);
}

// 6. 0 や端数
{
  const hs = make();
  assert.equal(run(hs, 0).lost, 0);
  assert.equal(hs.exp, 80);
  assert.equal(run(hs, 2.6).lost, 3);
  assert.equal(hs.exp, 77);
}

console.log('exp-drain: all checks passed');