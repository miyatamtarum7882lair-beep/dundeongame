import assert from 'node:assert/strict';
import { B } from '../src/data/balance.js';
import { createDefaultSave } from '../src/data/saveSchema.js';
import { ENEMIES } from '../src/data/enemies.js';
import { SKILL_DEFS } from '../src/data/skills.js';
import { SKILL_STAGES } from '../src/data/skillStages.js';
import { ENEMY_DIALOGUE } from '../src/data/enemyDialogue.js';
import { Combat } from '../src/battle/combat.js';
import { Unit } from '../src/dungeon/unit.js';

const WAVE1 = ['thiefGirl', 'mikuGirl', 'pleadingBunny', 'angelGirl', 'blondeBunny', 'blueHairGal', 'darkSister', 'dreamLady', 'kissHunter'];

// 前半9体：固有技・選択肢・台詞・演出がそろっている
for (const id of WAVE1) {
  const e = ENEMIES.find((x) => x.id === id);
  const all = [e.normalSkill, ...e.bindSkills, ...e.skills, e.advancedSkill];
  for (const skillId of all) {
    assert.ok(SKILL_DEFS[skillId], `${id}: ${skillId} の定義`);
    assert.ok(B.skills[skillId], `${id}: ${skillId} の数値`);
    assert.ok(SKILL_STAGES[skillId], `${id}: ${skillId} の演出`);
  }
  assert.equal(SKILL_DEFS[e.advancedSkill].advancedFrom, e.bindSkills[0], `${id}: 上位技の習得条件`);
  const d = ENEMY_DIALOGUE[id];
  assert.equal(d?.choice?.skillId, e.choiceSkill, `${id}: 選択肢の技`);
  for (const scene of ['bind', 'request', 'climaxStart', 'defeat', 'danger', 'lowMp']) assert.ok(d.lines[scene], `${id}: 台詞 ${scene}`);
}

function setup(raceId) {
  const hero = new Unit({ id: 1, kind: 'hero', speciesId: 'hero', name: '主人公', tx: 2, ty: 2 });
  const enemy = new Unit({ id: 2, kind: 'enemy', speciesId: raceId, name: raceId, tx: 3, ty: 2, level: 1, maxHp: 60 });
  const units = [hero, enemy];
  const walk = () => true;
  const exp = { hero, units, walk, map: { isWalkable: walk }, unitAt: (x, y) => units.find((u) => u.tx === x && u.ty === y) ?? null, refresh: () => {} };
  const save = createDefaultSave();
  Object.assign(save.currentRun.hero, { level: 20, hpLevel: 20 });   // 吸える経験値がある、ラン途中の主人公
  return { combat: new Combat(B, save, exp), save, hero, enemy };
}
const finish = (c) => { for (let i = 0; i < 300 && c.director.busy(); i++) c.director.update(0.1); };
const withRandom = (v, fn) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } };

// 最初は無害：蓄積が発症するまでは MP が減らない。発症後は減る
{
  const { combat, save, enemy } = setup('mikuGirl');
  const mp0 = combat.hs.mp;
  withRandom(0.99, () => combat.useSkill(enemy, 'mikuBlowKiss', { choiceResolved: true }));
  finish(combat);
  assert.equal(combat.hs.mp, mp0, '無害な間は MP が減らない');
  assert.ok(save.currentRun.heroStatus.gauges.heartCaptive > 0, '蓄積は進む');
  save.currentRun.heroStatus.gauges.heartCaptive = B.conditioning.onsetAt;
  withRandom(0.99, () => combat.useSkill(enemy, 'mikuBlowKiss', { choiceResolved: true }));
  finish(combat);
  assert.ok(combat.hs.mp < mp0, '発症後は MP が減る');
}

// カウントダウン：集中して中断できれば、被害は無い
{
  const { combat, enemy } = setup('darkSister');
  const before = { mp: combat.hs.mp, exp: combat.hs.exp, level: combat.hs.level };
  withRandom(0, () => combat.useSkill(enemy, 'countdown', { choiceResolved: true, choiceAnswer: 'resist' }));
  assert.equal(combat.director.current.payload.flags.interrupted, true);
  finish(combat);
  assert.equal(combat.hs.mp, before.mp);
  assert.equal(combat.hs.level, before.level);
}

// あまあま祝福：HP は回復するが、偽りの祝福でターンごとに MP が漏れる
{
  const { combat, enemy } = setup('angelGirl');
  combat.hs.hp = 50;
  combat.useSkill(enemy, 'sweetBlessing', { choiceResolved: true, choiceAnswer: 'accept', choiceDrainMul: 1.25 });
  finish(combat);
  assert.ok(combat.hs.hp > 50, '回復する');
  assert.ok(combat.conditions.has('falseBlessing'));
  const mp = combat.hs.mp;
  combat.endTurn();
  assert.ok(combat.hs.mp < mp, 'ターンの終わりに MP が漏れる');
}

// ハート泥棒：盗んだ経験値の累計で進化する
{
  const { combat, save, enemy } = setup('thiefGirl');
  save.currentRun.heroStatus.gauges.thiefMark = 0;
  for (let i = 0; i < 40 && !save.persistent.skillEvolution?.thiefGirl?.heartThief?.evolved; i++) {
    withRandom(0.99, () => combat.useSkill(enemy, 'heartThief', { choiceResolved: true, choiceAnswer: 'accept' }));
    finish(combat);
    combat.hs.mp = combat.hs.maxMp;
  }
  assert.equal(save.persistent.skillEvolution.thiefGirl.heartThief.evolved, true);
}

// ハートマーキング：命中すると、その種族の敵が追ってくる
{
  const { combat, save, enemy } = setup('kissHunter');
  save.currentRun.heroStatus.gauges.chased = B.conditioning.onsetAt;
  withRandom(0.99, () => combat.useSkill(enemy, 'heartMarking', { choiceResolved: true, choiceAnswer: 'accept' }));
  finish(combat);
  assert.equal(enemy.lured, true);
  assert.ok(combat.conditions.has('marked'));
}

console.log('wave1 enemies: all checks passed');
