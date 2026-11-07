import assert from 'node:assert/strict';
import { B } from '../src/data/balance.js';
import { createDefaultSave } from '../src/data/saveSchema.js';
import { ENEMIES, ENEMIES_BY_ID } from '../src/data/enemies.js';
import { ENEMY_DIALOGUE, choiceFor } from '../src/data/enemyDialogue.js';
import { SKILL_DEFS } from '../src/data/skills.js';
import { Combat } from '../src/battle/combat.js';
import { Unit } from '../src/dungeon/unit.js';

// 選択肢は各敵ちょうど1技（v6）
for (const [raceId, entry] of Object.entries(ENEMY_DIALOGUE)) {
  const enemy = ENEMIES_BY_ID[raceId];
  assert.ok(enemy, `unknown enemy: ${raceId}`);
  if (!entry.choice) continue;
  assert.ok([...enemy.skills, ...enemy.bindSkills].includes(entry.choice.skillId), `${raceId} cannot use ${entry.choice.skillId}`);
  assert.equal(choiceFor(raceId, entry.choice.skillId), entry.choice);
  assert.equal(choiceFor(raceId, enemy.normalSkill), null);
  if (enemy.choiceSkill) assert.equal(enemy.choiceSkill, entry.choice.skillId);
}
for (const enemy of ENEMIES) {
  if (!enemy.advancedSkill || !enemy.choiceSkill) continue;
  assert.equal(SKILL_DEFS[enemy.advancedSkill].advancedFrom, enemy.bindSkills[0], `${enemy.id}: 上位技の習得条件`);
}

const realRandom = Math.random;
const withRandom = (value, fn) => {
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = realRandom;
  }
};

function setup(raceId, { walkable = () => true } = {}) {
  const hero = new Unit({ id: 1, kind: 'hero', speciesId: 'hero', name: '主人公', tx: 2, ty: 2 });
  const enemy = new Unit({ id: 2, kind: 'enemy', speciesId: raceId, name: raceId, tx: 3, ty: 2, level: 1, maxHp: 60 });
  const units = [hero, enemy];
  let refreshed = 0;
  const exp = {
    hero, units, walk: walkable, map: { isWalkable: walkable },
    unitAt: (x, y) => units.find((unit) => unit.tx === x && unit.ty === y) ?? null,
    refresh: () => { refreshed += 1; }
  };
  const save = createDefaultSave();
  Object.assign(save.currentRun.hero, { level: 20, hpLevel: 20 });   // 吸える経験値がある、ラン途中の主人公
  const combat = new Combat(B, save, exp);
  return { combat, save, hero, enemy, refreshed: () => refreshed };
}

const finishStage = (combat) => {
  for (let i = 0; i < 200 && combat.director.busy(); i++) combat.director.update(0.1);
};
const gauge = (save, id) => save.currentRun.heroStatus.gauges[id] ?? 0;
// 選択肢付きの技を使い、前置き（技名 → 誘惑）が終わって選択肢の画面が出るところまで進める
const offer = (combat, enemy, skillId) => {
  combat.useSkill(enemy, skillId, {});
  assert.ok(combat.choice?.prelude, '選択肢の前に前置きがある');
  let shown = null;
  combat.on('enemyChoiceStart', (info) => { shown = info; });
  finishStage(combat);
  assert.ok(shown, '前置きのあとに選択肢の画面が出る');
};

// kitten：拒否して身構えると、誘惑癖は増えない
{
  const { combat, save, enemy } = setup('kitten');
  offer(combat, enemy, 'kittenDare');
  assert.ok(combat.choice);
  assert.equal(combat.director.busy(), false);
  combat.resolveChoice('resist');
  assert.equal(combat.choice, null);
  assert.equal(combat.guarding, true);
  finishStage(combat);
  assert.equal(gauge(save, 'temptHabit'), 0);
}

// kitten：受け入れると、ドレイン強化・誘惑癖が大きく進み、誘惑受容の状態になる
{
  const { combat, save, enemy } = setup('kitten');
  offer(combat, enemy, 'kittenDare');
  combat.resolveChoice('accept');
  assert.equal(combat.director.current.payload.choiceDrainMul, B.temptation.acceptDrainMul);
  finishStage(combat);
  assert.equal(gauge(save, 'temptHabit'), 1 * B.temptation.acceptCondMul);
  assert.ok(combat.conditions.has('tempted'));
  assert.equal(save.persistent.skillEvolution.kitten.kittenDare.manual, 1);
  // 続けて使っても、クールダウン中は選択肢が出ない
  combat.useSkill(enemy, 'kittenDare', {});
  assert.equal(combat.choice, null);
  combat.director.clear();
}

// 時間切れは別カウント。ドレインは受け入れより強い
{
  const { combat, save, enemy } = setup('kitten');
  offer(combat, enemy, 'kittenDare');
  combat.resolveChoice('timeout');
  assert.equal(combat.director.current.payload.choiceDrainMul, B.temptation.timeoutDrainMul);
  finishStage(combat);
  const st = save.persistent.skillEvolution.kitten.kittenDare;
  assert.equal(st.timeout, 1);
  assert.equal(st.manual, 0);
}

// blackRibbon：避けるを選ぶと回避判定に上乗せ。成功すれば横へ避ける
{
  const { combat, hero, enemy, refreshed } = setup('blackRibbon');
  offer(combat, enemy, 'peachBreath');
  assert.ok(combat.choice);
  withRandom(0, () => combat.resolveChoice('resist'));
  assert.equal(combat.director.busy(), false);
  assert.notDeepEqual([hero.tx, hero.ty], [2, 2]);
  assert.equal(refreshed(), 1);
}

// 回避に失敗すると当たるが、受け入れの強化は付かない
{
  const { combat, save, enemy } = setup('blackRibbon');
  offer(combat, enemy, 'peachBreath');
  withRandom(0.99, () => combat.resolveChoice('resist'));
  assert.equal(combat.director.current.payload.choiceDrainMul, 1);
  finishStage(combat);
  assert.equal(gauge(save, 'pinkDrunk'), SKILL_DEFS.peachBreath.cond.gain);
}

// pinkFox：押し返すと被害なし。相手は下がって1ターンひるむ
{
  const { combat, save, hero, enemy } = setup('pinkFox');
  offer(combat, enemy, 'foxPushContest');
  assert.ok(combat.choice);
  withRandom(0, () => combat.resolveChoice('resist'));
  assert.equal(combat.director.current.payload.blocked, true);
  finishStage(combat);
  assert.equal(enemy.tx, 4);
  assert.equal(enemy.stunTurns, 1);
  assert.equal(gauge(save, 'hipPressure'), 0);
  assert.equal(combat.hs.hp, combat.hs.maxHp);
  void hero;
}

// pinkFox：押されるままになると、体勢崩しで背中を向ける → 次の背面すりすりは背面拘束
{
  const { combat, hero, enemy } = setup('pinkFox');
  offer(combat, enemy, 'foxPushContest');
  combat.resolveChoice('accept');
  finishStage(combat);
  assert.ok(combat.conditions.has('offBalance'));
  assert.deepEqual(hero.dir, { dx: -1, dy: 0 });
  combat.startBound(enemy, 'foxBackRub');
  assert.equal(combat.bound.isBackBind, true);
}

// 自発的受容3回で、技が一度だけ進化する（技名に「・改」）
{
  const { combat, save, enemy } = setup('kitten');
  for (let i = 0; i < B.temptation.evolveManualAccept; i++) {
    enemy.choiceCooldown = 0;
    offer(combat, enemy, 'kittenDare');
    combat.resolveChoice('accept');
    finishStage(combat);
  }
  assert.equal(save.persistent.skillEvolution.kitten.kittenDare.evolved, true);
  assert.equal(combat.skillLabel('kittenDare', enemy), 'ねえ、負けちゃう？♡・改');
}

// 指定の拘束技でフィニッシュすると、拘束技が進化し、上位技を永続習得する
{
  const { combat, save, enemy } = setup('kitten');
  combat.bound = { binders: [{ unit: enemy, skillId: 'kittenKissHold', attr: 'mouth' }] };
  combat.onFinish();
  assert.deepEqual(save.persistent.learnedSkills.kitten, ['kittenFullTemptation']);
  assert.equal(enemy.advancedSkillUnlocked, true);
  assert.equal(save.persistent.skillEvolution.kitten.kittenKissHold.evolved, true);
  combat.bound = null;
}

console.log('enemy choice: all checks passed');
