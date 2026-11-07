import assert from 'node:assert/strict';
import { B } from '../src/data/balance.js';
import { createDefaultSave } from '../src/data/saveSchema.js';
import { ENEMIES } from '../src/data/enemies.js';
import { SKILL_DEFS } from '../src/data/skills.js';
import { SKILL_STAGES } from '../src/data/skillStages.js';
import { ENEMY_DIALOGUE } from '../src/data/enemyDialogue.js';
import { Combat } from '../src/battle/combat.js';
import { Unit } from '../src/dungeon/unit.js';

const WAVE2 = ['littleDevilLady', 'pamperingLady', 'powerBunny', 'silverFoxMaid', 'velvetBunny', 'whisperDevil', 'demonicChinaGirl', 'sakuraEnchantress', 'tricksterDevil'];

// 後半9体：固有技・選択肢・台詞・演出がそろっている
for (const id of WAVE2) {
  const e = ENEMIES.find((x) => x.id === id);
  for (const skillId of [e.normalSkill, ...e.bindSkills, ...e.skills, e.advancedSkill]) {
    assert.ok(SKILL_DEFS[skillId] && B.skills[skillId] && SKILL_STAGES[skillId], `${id}: ${skillId}`);
  }
  assert.equal(SKILL_DEFS[e.advancedSkill].advancedFrom, e.bindSkills[0], `${id}: 上位技の習得条件`);
  const d = ENEMY_DIALOGUE[id];
  assert.equal(d?.choice?.skillId, e.choiceSkill, `${id}: 選択肢の技`);
  for (const scene of ['bind', 'request', 'climaxStart', 'defeat', 'danger', 'lowMp']) assert.ok(d.lines[scene], `${id}: 台詞 ${scene}`);
}
// 21体すべてに固有技がある
assert.ok(ENEMIES.every((e) => e.skills.length > 0 && e.choiceSkill), '全員に固有技と選択肢がある');

function setup(raceId, { ex = 6 } = {}) {
  const hero = new Unit({ id: 1, kind: 'hero', speciesId: 'hero', name: '主人公', tx: 5, ty: 5 });
  const enemy = new Unit({ id: 2, kind: 'enemy', speciesId: raceId, name: raceId, tx: ex, ty: 5, level: 1, maxHp: 60 });
  const units = [hero, enemy];
  const walk = (x, y) => x >= 0 && y >= 0 && x < 20 && y < 20;
  const exp = { hero, units, walk, map: { isWalkable: walk }, unitAt: (x, y) => units.find((u) => u.tx === x && u.ty === y) ?? null, refresh: () => {} };
  const save = createDefaultSave();
  Object.assign(save.currentRun.hero, { level: 20, hpLevel: 20 });   // 吸える経験値がある、ラン途中の主人公
  return { combat: new Combat(B, save, exp), save, hero, enemy, exp };
}
const finish = (c) => { for (let i = 0; i < 300 && c.director.busy(); i++) c.director.update(0.1); };
const withRandom = (v, fn) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } };

// バニーロケット：離れた所から突進して、そのまま拘束に入る
{
  const { combat, hero, enemy } = setup('powerBunny', { ex: 9 });
  withRandom(0.99, () => combat.useSkill(enemy, 'bunnyRocket', {}));
  assert.equal(Math.abs(enemy.tx - hero.tx) + Math.abs(enemy.ty - hero.ty), 1, '隣まで詰める');
  finish(combat);
  assert.ok(combat.bound, '当たるとそのまま拘束');
  assert.equal(combat.bound.binders[0].skillId, 'powerHold');
}

// どっかーんヒップ：押し飛ばされる
{
  const { combat, hero, enemy } = setup('powerBunny');
  withRandom(0.99, () => combat.useSkill(enemy, 'dokkanHip', {}));
  finish(combat);
  assert.equal(hero.tx, 3, '敵から離れる向きに2マス');
}

// 魔力漏出 → 定期回収：漏れた分をまとめて吸われる
{
  const { combat, save, enemy } = setup('silverFoxMaid');
  save.currentRun.heroStatus.gauges.manaLeakBody = B.conditioning.onsetAt;
  withRandom(0.99, () => combat.useSkill(enemy, 'manaLeakProc', {}));
  finish(combat);
  assert.ok(combat.conditions.has('manaLeak'));
  combat.endTurn();
  combat.endTurn();
  const leaked = save.currentRun.heroStatus.leaked;
  assert.ok(leaked > 0, '漏れた分が記録される');
  const mp = combat.hs.mp;
  withRandom(0.99, () => combat.useSkill(enemy, 'periodicCollect', {}));
  finish(combat);
  assert.ok(mp - combat.hs.mp >= Math.round(leaked * B.skills.periodicCollect.collectMul), 'まとめて回収される');
  assert.equal(save.currentRun.heroStatus.leaked, 0);
}

// 罠：仕掛けられ、踏むと転倒・体勢崩し
{
  const { combat, exp, enemy } = setup('tricksterDevil');
  combat.useSkill(enemy, 'footTrap', {});
  finish(combat);
  assert.equal(exp.traps.length, SKILL_DEFS.footTrap.traps);
  const trap = exp.traps[0];
  combat.triggerTrap(trap);
  assert.ok(combat.conditions.has('offBalance'));
  assert.ok(combat.stunTurns >= 1, '転倒で1ターン動けない');
}

// 集中力低下：もがきの効きが落ちる
{
  const { combat, enemy } = setup('whisperDevil');
  combat.startBound(enemy, 'whisperHug');
  combat.conditions.addStatus('unfocused', 3);
  const before = combat.bound.escapeProgress;
  combat.struggle();
  assert.ok(Math.abs(combat.bound.escapeProgress - before - 0.65) < 0.001, 'もがき1回の効きが 0.65 に落ちる');
}

// 弱点看破：吸われる経験値が増える
{
  const { combat } = setup('demonicChinaGirl');
  const a = combat.drainHeroExp(0.1).lost;
  combat.hs.level = 20;
  combat.hs.exp = 400;
  combat.conditions.addStatus('weakExposed', 3);
  const b = combat.drainHeroExp(0.1).lost;
  assert.ok(b > a, '弱点看破中は多く吸われる');
}

// 花印：付いている間、ターンごとに花堕ちが溜まる
{
  const { combat, save, enemy } = setup('sakuraEnchantress');
  withRandom(0.99, () => combat.useSkill(enemy, 'corruptionMark', {}));
  finish(combat);
  const v = save.currentRun.heroStatus.gauges.sakuraFall;
  combat.endTurn();
  assert.ok(save.currentRun.heroStatus.gauges.sakuraFall > v);
}

console.log('wave2 enemies: all checks passed');
