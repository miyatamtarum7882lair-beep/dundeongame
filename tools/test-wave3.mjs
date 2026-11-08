// 追加18体・前半8体：技・台詞・演出がそろっていることと、敵ごとの記憶・メイド連携・ご褒美の罠
import assert from 'node:assert/strict';
import { B } from '../src/data/balance.js';
import { createDefaultSave } from '../src/data/saveSchema.js';
import { ENEMIES } from '../src/data/enemies.js';
import { SKILL_DEFS } from '../src/data/skills.js';
import { SKILL_STAGES } from '../src/data/skillStages.js';
import { ENEMY_DIALOGUE, CLIMAX_VOICE } from '../src/data/enemyDialogue.js';
import { ENEMY_THEMES } from '../src/data/enemyThemes.js';
import { CONDITIONS } from '../src/data/conditioning.js';
import { Combat } from '../src/battle/combat.js';
import { Unit } from '../src/dungeon/unit.js';

const WAVE3 = ['blondeMaid', 'sweetBunny', 'yandereGirl', 'littleDevilMaid', 'jiangshiGirl', 'silverDevil', 'expressionlessSuccubus', 'sweetCatMaid'];

for (const id of WAVE3) {
  const e = ENEMIES.find((x) => x.id === id);
  assert.ok(e, id);
  for (const skillId of [e.normalSkill, ...e.bindSkills, ...e.skills, e.advancedSkill]) {
    assert.ok(SKILL_DEFS[skillId] && B.skills[skillId] && SKILL_STAGES[skillId], `${id}: ${skillId}`);
  }
  assert.equal(SKILL_DEFS[e.advancedSkill].advancedFrom, e.bindSkills[0], `${id}: 上位技の習得条件`);
  const d = ENEMY_DIALOGUE[id];
  assert.equal(d?.choice?.skillId, e.choiceSkill, `${id}: 選択肢の技`);
  for (const scene of ['bind', 'request', 'climaxStart', 'defeat', 'danger', 'lowMp']) assert.ok(d.lines[scene], `${id}: 台詞 ${scene}`);
  assert.ok(CLIMAX_VOICE[id] && ENEMY_THEMES[id], `${id}: 声と色`);
  assert.ok(Object.values(CONDITIONS).some((c) => c.source === id), `${id}: 固有デバフ`);
  // 台詞に、直接的な言葉を使わない（経験値・絶頂に置き換える）
  assert.ok(!JSON.stringify(d).includes('射精'), `${id}: 台詞の言い換え`);
}

function setup(specs) {
  const hero = new Unit({ id: 1, kind: 'hero', speciesId: 'hero', name: '主人公', tx: 5, ty: 5 });
  const enemies = specs.map(([raceId, tx, ty], i) => new Unit({ id: 2 + i, kind: 'enemy', speciesId: raceId, name: raceId, tx, ty, level: 1, maxHp: 60 }));
  const units = [hero, ...enemies];
  const walk = (x, y) => x >= 0 && y >= 0 && x < 30 && y < 30;
  const exp = {
    hero, units, walk, turnCount: 0, map: { isWalkable: walk, isVisible: () => true },
    unitAt: (x, y) => units.find((u) => u.tx === x && u.ty === y) ?? null, refresh: () => {}, removeUnit: () => {}
  };
  const save = createDefaultSave();
  Object.assign(save.currentRun.hero, { level: 20, hpLevel: 20 });
  const combat = new Combat(B, save, exp);
  const logs = [];
  combat.on('log', (kind, params) => logs.push({ kind, ...params }));
  return { combat, save, hero, enemies, logs };
}
const finish = (c) => { for (let i = 0; i < 300 && c.director.busy(); i++) c.director.update(0.1); };
const withRandom = (v, fn) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } };

// ヤンデレちゃん：逃げるたびに覚え、次は抜け出しにくい
{
  const { combat, save, enemies, logs } = setup([['yandereGirl', 6, 5]]);
  combat.startBound(enemies[0], 'yandereHipHold', true, { answer: 'resist', drainMul: 1 });
  const need = combat.bound.requiredClicks;
  combat.escapeBound();
  assert.equal(save.persistent.enemyMemory.yandereGirl.escapes, 1);
  assert.ok(logs.some((l) => l.kind === 'memoryEscape'));
  enemies[0].bindImmune = false;
  combat.startBound(enemies[0], 'yandereHipHold', true, { answer: 'resist', drainMul: 1 });
  assert.ok(combat.bound.requiredClicks > need, '逃げた回数のぶん抜けにくい');
}

// キョンシーちゃん：逃げ方を覚える
{
  const { combat, save, enemies } = setup([['jiangshiGirl', 6, 5]]);
  combat.startBound(enemies[0], 'jiangshiHold', true, { answer: 'resist', drainMul: 1 });
  combat.escapeBound();
  assert.equal(save.persistent.enemyMemory.jiangshiGirl.learn, 1);
}

// 白銀の小悪魔：お願いを聞くとカモ認定。吸われる量が増える
{
  const { combat, save, enemies, logs } = setup([['silverDevil', 7, 5]]);
  const before = combat.hs.mp;
  withRandom(0.99, () => combat.useSkill(enemies[0], 'pleaseListen', { choiceResolved: true, choiceAnswer: 'accept', choiceDrainMul: 1 }));
  finish(combat);
  assert.equal(save.persistent.enemyMemory.silverDevil.kamo, true);
  assert.ok(logs.some((l) => l.kind === 'memoryKamo'));
  assert.ok(combat.hs.mp < before);
}

// 無表情サキュバス：抵抗をやめた回数のぶん、拘束の始まりから身を任せている
{
  const { combat, save, enemies } = setup([['expressionlessSuccubus', 6, 5]]);
  withRandom(0.99, () => combat.useSkill(enemies[0], 'giveUp', { choiceResolved: true, choiceAnswer: 'accept', choiceDrainMul: 1 }));
  finish(combat);
  assert.equal(save.persistent.enemyMemory.expressionlessSuccubus.giveUps, 1);
  combat.bound = null;
  combat.startBound(enemies[0], 'silentShackle', true, { answer: 'resist', drainMul: 1 });
  assert.ok(combat.bound.surrenderRate >= B.memory.giveUpSurrender);
}

// ご褒美の罠・過保護の罠：自分から受け入れると、その子が成長する（時間切れは対象外）
{
  const { combat, enemies, logs } = setup([['sweetCatMaid', 6, 5]]);
  withRandom(0.99, () => combat.useSkill(enemies[0], 'leaveItToMe', { choiceResolved: true, choiceAnswer: 'accept', choiceDrainMul: 1 }));
  finish(combat);
  assert.ok(logs.some((l) => l.kind === 'acceptGrow'));
  const t = setup([['littleDevilMaid', 6, 5]]);
  withRandom(0.99, () => t.combat.useSkill(t.enemies[0], 'rewardOffer', { choiceResolved: true, choiceAnswer: 'timeout', choiceDrainMul: 1 }));
  finish(t.combat);
  assert.ok(!t.logs.some((l) => l.kind === 'acceptGrow'), '時間切れでは成長しない');
}

// メイド連携追跡：呼び鈴でメイドが集まり、2人以上で拘束すると声をそろえる
{
  const { combat, enemies, logs } = setup([['blondeMaid', 6, 5], ['sweetCatMaid', 20, 20], ['kitten', 21, 21], ['littleDevilMaid', 4, 5]]);
  withRandom(0.99, () => combat.useSkill(enemies[0], 'maidPursuit', {}));
  finish(combat);
  assert.equal(enemies[1].lured, true, 'メイドは集まる');
  assert.ok(!enemies[2].lured, 'メイド以外は来ない');
  assert.ok(logs.some((l) => l.kind === 'maidCall'));
  combat.startBound(enemies[0], 'blondeMaidHold', true, { answer: 'resist', drainMul: 1 });
  combat.addBoundBinder(enemies[3], 'devilMaidHold');
  const mp = combat.hs.mp;
  combat.boundPulse(1.2);
  assert.ok(combat.hs.mp < mp);
  assert.ok(combat.bound.chorusTimer > 0, '声をそろえた');
}

// 甘やかしバニー：負け癖が深いほど、もう少しだけ♡ が強く効く
{
  const a = setup([['sweetBunny', 8, 5]]);
  const b = setup([['sweetBunny', 8, 5]]);
  b.save.persistent.debuffs.loseHabit.byRace.sweetBunny = 4;
  for (const s of [a, b]) {
    withRandom(0.99, () => s.combat.useSkill(s.enemies[0], 'justALittleMore', { choiceResolved: true, choiceAnswer: 'accept', choiceDrainMul: 1 }));
    finish(s.combat);
  }
  assert.ok(b.combat.hs.mp < a.combat.hs.mp, '負けた相手ほど溶かされる');
}

console.log('wave3 enemies: all checks passed');
