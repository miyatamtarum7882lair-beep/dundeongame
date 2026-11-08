// 追加18体・後半10体（elite）・関連のある敵の湧き・連携攻撃の種類・見えているときだけのこすり合わせ
import assert from 'node:assert/strict';
import { B } from '../src/data/balance.js';
import { createDefaultSave } from '../src/data/saveSchema.js';
import { ENEMIES, ENEMIES_BY_ID } from '../src/data/enemies.js';
import { SKILL_DEFS } from '../src/data/skills.js';
import { SKILL_STAGES } from '../src/data/skillStages.js';
import { ENEMY_DIALOGUE, CLIMAX_VOICE } from '../src/data/enemyDialogue.js';
import { CONDITIONS } from '../src/data/conditioning.js';
import { sharedGroup, relatedSpecies } from '../src/data/enemyGroups.js';
import { generateFloor } from '../src/dungeon/generate.js';
import { Combat } from '../src/battle/combat.js';
import { Unit } from '../src/dungeon/unit.js';

const WAVE4 = ['demonicLady', 'mischievousDevil', 'shyIdol', 'corruptionLady', 'pinkSuccubus', 'curvyLittleDevil', 'bluePrincess', 'blackSister', 'silverBunny', 'assertiveMaid'];
for (const id of WAVE4) {
  const e = ENEMIES_BY_ID[id];
  assert.ok(e && e.rank === 'elite', id);
  for (const skillId of [e.normalSkill, ...e.bindSkills, ...e.skills, e.advancedSkill]) {
    assert.ok(SKILL_DEFS[skillId] && B.skills[skillId] && SKILL_STAGES[skillId], `${id}: ${skillId}`);
  }
  const d = ENEMY_DIALOGUE[id];
  if (id === 'silverBunny') assert.equal(e.choiceSkill, null, '白銀バニーは選択肢なし');
  else assert.equal(d?.choice?.skillId, e.choiceSkill, `${id}: 選択肢の技`);
  for (const scene of ['bind', 'request', 'climaxStart', 'defeat', 'danger', 'lowMp']) assert.ok(d.lines[scene], `${id}: 台詞 ${scene}`);
  assert.ok(CLIMAX_VOICE[id] && Object.values(CONDITIONS).some((c) => c.source === id), id);
  assert.ok(!JSON.stringify(d).includes('射精'), `${id}: 台詞の言い換え`);
}
assert.equal(ENEMIES.length, 39);

function setup(specs, { visible = () => true } = {}) {
  const hero = new Unit({ id: 1, kind: 'hero', speciesId: 'hero', name: '主人公', tx: 5, ty: 5 });
  const enemies = specs.map(([raceId, tx, ty], i) => new Unit({ id: 2 + i, kind: 'enemy', speciesId: raceId, name: raceId, tx, ty, level: 1, maxHp: 60 }));
  const units = [hero, ...enemies];
  const walk = (x, y) => x >= 0 && y >= 0 && x < 30 && y < 30;
  const exp = {
    hero, units, walk, turnCount: 0, map: { isWalkable: walk, isVisible: visible },
    unitAt: (x, y) => units.find((u) => u.tx === x && u.ty === y) ?? null, refresh: () => {}, removeUnit: () => {}, stepToward: () => false
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
const use = (s, i, skill, ctx = {}) => { withRandom(0.99, () => s.combat.useSkill(s.enemies[i], skill, ctx)); finish(s.combat); };

// 魅了の連鎖：魅了中に当たると、3つの状態が連鎖する
{
  const s = setup([['demonicLady', 6, 5]]);
  s.combat.conditions.addStatus('charmed', 2);
  use(s, 0, 'charmCascade');
  for (const id of B.traits.charmChainStatuses) assert.ok(s.combat.conditions.has(id), id);
}
// 控えめアイドル：自信がつくほど強い（永続）
{
  const s = setup([['shyIdol', 7, 5]]);
  use(s, 0, 'sexyBeam');
  assert.equal(s.save.persistent.enemyMemory.shyIdol.confidence, 1);
}
// 桃髪サキュバス：奪った MP の累計を覚える
{
  const s = setup([['pinkSuccubus', 6, 5]]);
  use(s, 0, 'manaPlunder');
  assert.ok(s.save.persistent.enemyMemory.pinkSuccubus.absorbed > 0);
}
// むちむち小悪魔：視線ロックが最大で動けなくなり、目を逸らすと戻る
{
  const s = setup([['curvyLittleDevil', 7, 5]]);
  for (let i = 0; i < B.traits.gazeMax; i++) use(s, 0, 'lookBackTempt');
  assert.ok(s.logs.some((l) => l.kind === 'gazeLockMax'));
  use(s, 0, 'lookBackTempt');
  assert.equal(s.save.currentRun.gazeLock, 1);
  s.enemies[0].choiceCooldown = 0;
  s.combat.choice = { enemy: s.enemies[0], skillId: 'stillWatching', continueSkill: () => {} };
  s.combat.resolveChoice('resist');
  assert.equal(s.save.currentRun.gazeLock, 0, '目を逸らすと戻る');
}
// 堕落のお姉さん：甘い取引で回復する代わりに、尻の耐性が永続で下がる
{
  const s = setup([['corruptionLady', 7, 5]]);
  s.combat.hs.mp = 10;
  use(s, 0, 'sweetDealOffer', { choiceResolved: true, choiceAnswer: 'accept', choiceDrainMul: 1 });
  assert.ok(s.combat.hs.mp > 10);
  assert.ok(s.save.persistent.resistances.hip < 0);
}
// 白銀バニー：背後へ回り込み、背面から拘束すると経験値も吸う
{
  const s = setup([['silverBunny', 8, 5]]);
  s.hero.setDir(1, 0);
  use(s, 0, 'backOpen');
  assert.equal(s.enemies[0].tx, 4, '背後へ');
  s.combat.startBound(s.enemies[0], 'silverCling', true, { answer: 'resist', drainMul: 1 });
  assert.equal(s.combat.bound.isBackBind, true);
}
// 黒衣のシスター：拘束中に重圧が増し、抜け出しにくくなる
{
  const s = setup([['blackSister', 6, 5]]);
  s.combat.startBound(s.enemies[0], 'blackPressHold', true, { answer: 'resist', drainMul: 1 });
  const need = s.combat.bound.requiredClicks;
  for (let i = 0; i < B.traits.pressureEverySec * 2; i++) s.combat.boundSecond();
  assert.ok(s.combat.bound.pressure >= 2);
  assert.ok(s.combat.bound.requiredClicks > need);
}
// 強引な桃髪メイド：顔を逸らした回数を覚える
{
  const s = setup([['assertiveMaid', 7, 5]]);
  s.combat.choice = { enemy: s.enemies[0], skillId: 'lookAwayQ', continueSkill: () => {} };
  s.combat.resolveChoice('resist');
  assert.equal(s.save.persistent.enemyMemory.assertiveMaid.faceAways, 1);
}

// 関連のある敵：同じまとまりの仲間が一緒に湧きやすい
{
  assert.equal(sharedGroup('blondeMaid', 'sweetCatMaid'), 'maid');
  assert.ok(relatedSpecies('silverBunny').includes('sweetBunny'));
  let related = 0;
  let packs = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const sp = generateFloor(seed, 3, B).enemySpawns;
    for (let i = 1; i < sp.length; i++) {
      packs += 1;
      if (sharedGroup(sp[i - 1].species, sp[i].species) || sp[i - 1].species === sp[i].species) related += 1;
    }
  }
  assert.ok(related / packs > 0.4, `関連のある敵が並びやすい（${(related / packs).toFixed(2)}）`);
}

// 連携攻撃：同じまとまりは専用技（絆が無くても起きる）
{
  const s = setup([['blondeMaid', 6, 5], ['sweetCatMaid', 5, 6]]);
  assert.equal(s.combat.uniteType(s.enemies[0], s.enemies[1]).effect, 'chorus');
  withRandom(0.01, () => s.combat.enemyDecide(s.enemies[0], { dist: 1, sees: true }));
  assert.ok(s.logs.some((l) => l.kind === 'uniteAttack' && l.skill === 'メイド隊の総力ご奉仕'));
  const d = setup([['kitten', 6, 5], ['whisperDevil', 5, 6]]);
  assert.equal(d.combat.uniteType(d.enemies[0], d.enemies[1]).effect, 'whisper');
}

// こすり合わせ：見えていないと始まらず、見えなくなると止まる
{
  let seen = true;
  const s = setup([['blondeMaid', 9, 5], ['sweetCatMaid', 10, 5]], { visible: () => seen });
  seen = false;
  assert.equal(withRandom(0.0, () => s.combat.bonds.tryStart(1)), null, '見えていないと始まらない');
  seen = true;
  const pair = withRandom(0.0, () => s.combat.bonds.tryStart(1));
  assert.ok(pair, '見えていれば始まる');
  s.combat.bonds.update(2);
  const el = pair.elapsed;
  seen = false;
  s.combat.bonds.update(2);
  assert.equal(pair.elapsed, el, '見えない間は進まない');
  s.combat.bonds.update(B.pairBond.hiddenStopSec);
  assert.equal(s.combat.bonds.active.length, 0, 'しばらく見えないと終わる');
  // 見せつけられると、二人の蓄積デバフが進む
  seen = true;
  const t = setup([['kitten', 9, 5], ['mikuGirl', 10, 5]]);
  const p2 = t.combat.bonds.start(t.enemies[0], t.enemies[1]);
  for (let i = 0; i < 8; i++) t.combat.bonds.update(B.pairBond.pulseSec);
  assert.ok(Object.values(t.save.currentRun.heroStatus.gauges).some((v) => v > 0), '見ているだけで溜まる');
  assert.ok(p2.elapsed > 0);
}

console.log('wave4 enemies: all checks passed');
