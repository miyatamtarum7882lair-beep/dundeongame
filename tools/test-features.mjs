// HP は絶頂のときだけ減る・絶頂の瞬間の吸い上げ・敗北の搾取・敵どうしの絆とユナイト攻撃・保存
import assert from 'node:assert/strict';
import { B } from '../src/data/balance.js';
import { createDefaultSave, newRunHero, saveSchema } from '../src/data/saveSchema.js';
import { migrate, deepMerge } from '../src/core/storage.js';
import { Combat } from '../src/battle/combat.js';
import { Unit } from '../src/dungeon/unit.js';
import { rubAttrsOf, uniteNameOf } from '../src/battle/pairBond.js';
import { collectDebuffs } from '../src/ui/debuffPanel.js';
import { generateArena } from '../src/dungeon/generate.js';
import { conditionOfRace } from '../src/battle/economy.js';

function setup(specs = [['kitten', 6, 5]]) {
  const hero = new Unit({ id: 1, kind: 'hero', speciesId: 'hero', name: '主人公', tx: 5, ty: 5 });
  const enemies = specs.map(([raceId, tx, ty], i) => new Unit({ id: 2 + i, kind: 'enemy', speciesId: raceId, name: raceId, tx, ty, level: 1, maxHp: 60 }));
  const units = [hero, ...enemies];
  const walk = (x, y) => x >= 0 && y >= 0 && x < 30 && y < 30;
  const exp = {
    hero, units, walk, turnCount: 0, map: { isWalkable: walk, isVisible: () => true },
    unitAt: (x, y) => units.find((u) => u.tx === x && u.ty === y) ?? null, refresh: () => {},
    removeUnit: (u) => units.splice(units.indexOf(u), 1),
    stepToward: () => false
  };
  const save = createDefaultSave();
  Object.assign(save.currentRun.hero, { level: 20, hpLevel: 20 });
  const combat = new Combat(B, save, exp);
  const logs = [];
  combat.on('log', (kind, params) => logs.push({ kind, ...params }));
  return { combat, save, hero, enemies, exp, logs };
}
const finish = (c) => { for (let i = 0; i < 300 && c.director.busy(); i++) c.director.update(0.1); };
const withRandom = (v, fn) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } };

// 絶頂以外では HP が減らない（打撃は MP を奪う）
{
  const { combat, enemies } = setup();
  const hs = combat.hs;
  const hp = hs.hp;
  const mp = hs.mp;
  for (let i = 0; i < 5; i++) {
    withRandom(0.99, () => combat.useSkill(enemies[0], 'kittenTouch', {}));
    finish(combat);
  }
  assert.equal(hs.hp, hp, 'HP は減らない');
  assert.ok(hs.mp < mp, '代わりに MP が減る');
}

// レベルが下がっても最大HPは減らず、上がり直しても二重に増えない
{
  const { combat } = setup();
  const hs = combat.hs;
  const maxHp = hs.maxHp;
  combat.drainHeroExp(3);
  assert.ok(hs.level < 20);
  assert.equal(hs.maxHp, maxHp);
}

// 絶頂の瞬間に、まとめて大きく吸い上げる。拘束役は経験値を得る
{
  const { combat, enemies, logs } = setup();
  combat.startBound(enemies[0], 'kittenKissHold', true, { answer: 'accept', drainMul: 1 });
  assert.ok(combat.bound);
  combat.hs.mp = 0;
  const level = combat.hs.level;
  const enemyExp = enemies[0].exp;
  combat.checkClimaxStart();
  assert.ok(combat.climax.isClimax());
  assert.ok(logs.some((l) => l.kind === 'climaxStartDrain' && l.amount > 0), '絶頂の瞬間の吸い上げ');
  assert.ok(combat.hs.level < level || combat.hs.exp >= 0);
  assert.ok(enemies[0].exp > enemyExp || enemies[0].level > 1, '拘束役が経験値を得る');
}

// 敵のレベルが一気に上がっても、ログは1回
{
  const { combat, enemies, logs } = setup();
  combat.gainDrainExperience(enemies[0], 5000);
  const ups = logs.filter((l) => l.kind === 'enemyLevelUp');
  assert.equal(ups.length, 1);
  assert.ok(ups[0].gain > 1);
  assert.equal(enemies[0].level, 1 + ups[0].gain);
}

// 敵どうしの絆：30秒で、能力上昇 → 負け癖の共有 → 完遂（ユナイト攻撃が使える）
{
  const { combat, save, enemies, logs } = setup([['kitten', 9, 5], ['mikuGirl', 10, 5]]);
  const [a, b] = enemies;
  save.persistent.debuffs.loseHabit.byRace.kitten = 3;
  const pair = combat.bonds.start(a, b);
  assert.deepEqual(pair.attrs, ['mouth', 'mouth'], '口どうしはキス');
  for (let t = 0; t < B.pairBond.stages[0] + 0.5; t += 0.5) combat.bonds.update(0.5);
  assert.equal(a.level, 1 + B.pairBond.levelGain, '能力上昇');
  for (let t = 0; t < 10; t += 0.5) combat.bonds.update(0.5);
  assert.equal(save.persistent.debuffs.loseHabit.byRace.mikuGirl, 3, '負け癖の共有');
  assert.ok(logs.some((l) => l.kind === 'pairShareHabit'));
  for (let t = 0; t < 12; t += 0.5) combat.bonds.update(0.5);
  assert.equal(a.bondPartner, b);
  assert.equal(b.bondPartner, a);
  assert.equal(save.persistent.pairBonds['kitten|mikuGirl'].completed, 1, '絆は永続で記録');
  assert.equal(combat.bonds.active.length, 0);
  // ユナイト攻撃：隣にいる二人が、同時に吸って、二人がかりで拘束する
  a.moveTo(6, 5);
  b.moveTo(6, 6);
  const mp = combat.hs.mp;
  withRandom(0.01, () => combat.enemyDecide(a, { dist: 1, sees: true }));
  assert.ok(logs.some((l) => l.kind === 'uniteAttack'));
  assert.ok(combat.hs.mp < mp);
  assert.ok(combat.bound, '二人がかりで拘束');
  assert.equal(combat.bound.binders.length, 2);
  assert.ok(combat.bound.binders.every((x) => x.unite));
}

// こすり合わせ中に攻撃すると止まる。強化はそのまま
{
  const { combat, enemies } = setup([['blondeBunny', 6, 5], ['powerBunny', 7, 5]]);
  const pair = combat.bonds.start(enemies[0], enemies[1]);
  assert.deepEqual(pair.attrs, ['bust', 'bust']);
  for (let t = 0; t < 11; t += 0.5) combat.bonds.update(0.5);
  combat.heroAttack(enemies[0]);
  assert.equal(combat.bonds.active.length, 0, '中断');
  assert.equal(enemies[1].bondPower, B.pairBond.powerMul, '強化は残る');
  assert.equal(enemies[1].bondPartner, undefined);
}
assert.equal(uniteNameOf(rubAttrsOf('demonicChinaGirl', 'kitten')).includes('サンドイッチ'), true);

// 敗北の搾取：まわりの敵が吸い尽くし、癖を刻む。回想に載る
{
  const { combat, save, enemies } = setup([['kitten', 6, 5], ['mikuGirl', 5, 6]]);
  combat.defeated = { raceId: 'kitten', skillId: 'kittenKissHold', attr: 'mouth', name: 'kitten' };
  const resist = save.persistent.resistances.mouth;
  let recap = null;
  combat.on('defeatRecap', (r) => { recap = r; });
  withRandom(0.01, () => combat.defeatHarvest());
  assert.ok(combat.harvest.expLost > 0);
  assert.ok(save.persistent.resistances.mouth < resist);
  assert.ok(enemies[1].exp > 0 || enemies[1].level > 1);
  combat.finalizeDefeat();
  assert.ok(recap.harvest && recap.harvest.debuffs.length > 0);
  assert.equal(save.persistent.codex.entries.kitten.defeatsBySkill.kittenKissHold, 1, '図鑑：その技で負けた回数');
}

// 負け癖と耐性は、永続デバフの欄には出さない
{
  const save = createDefaultSave();
  save.persistent.debuffs.loseHabit.byRace.kitten = 4;
  save.persistent.resistances.mouth = -20;
  save.persistent.debuffs.fallHabit.stage = 1;
  const ids = collectDebuffs(save.persistent, B).map((d) => d.id);
  assert.ok(!ids.some((id) => id.startsWith('lose:') || id.startsWith('res_')));
  assert.ok(ids.includes('fall'));
}

// 新しいランの主人公：初期レベルは 1。デバッグ設定の開始レベルは、ランをまたいで残る
{
  assert.equal(saveSchema.currentRun.hero.level, 1);
  const save = createDefaultSave();
  save.persistent.debugSettings.startLevel = 20;
  save.persistent.debugSettings.priestCompanion = false;
  const hero = newRunHero(save.persistent, B.battle.levelUp);
  assert.equal(hero.level, 20);
  assert.equal(hero.maxHp, saveSchema.currentRun.hero.maxHp + 19 * B.battle.levelUp.hp);
  // 古い保存：ラン側にあったデバッグ設定を、永続側へ移す
  const old = { version: 12, currentRun: { debugOptions: { priestCompanion: false, enemySpawnWeights: { kitten: 2 } }, hero: { level: 20 } }, persistent: {} };
  const merged = deepMerge(saveSchema, migrate(old));
  assert.equal(merged.persistent.debugSettings.priestCompanion, false);
  assert.equal(merged.persistent.debugSettings.enemySpawnWeights.kitten, 2);
  assert.equal(merged.currentRun.hero.level, 20, '途中のランのレベルはそのまま');
}

// 模擬戦のアリーナ：ひと部屋。敵は二人ずつ隣り合う
{
  const gen = generateArena(4);
  assert.equal(gen.enemySpawns.length, 4);
  const [a, b] = gen.enemySpawns;
  assert.equal(Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)), 1);
}

// ---- お金・贈り物・装備・アイテム・商人・拠点 ----
{
  const { combat, save, enemies, logs } = setup([['blondeBunny', 6, 5]]);
  const eco = combat.eco;
  const p = save.persistent;
  // 誘惑に乗ると、その子の贈り物（部位ごと）を無理やり着けさせられる
  const gift = eco.forceGift(enemies[0], 'bust');
  assert.equal(gift.name, 'グラマーバニーさんのブラ');
  assert.equal(p.equipment.slots.bust.kind, 'gift');
  assert.ok(logs.some((l) => l.kind === 'giftEquip'));
  assert.equal(eco.unequip('bust').ok, false, '自分では外せない');
  eco.forceGift(enemies[0], 'bust');
  assert.equal(p.equipment.slots.bust.level, 2, '同じ子の贈り物は馴染んでいく');
  assert.ok(eco.drainMulFrom('blondeBunny') > 1.3, 'その子に吸われやすい');
  assert.ok(eco.resistanceOf('bust') < 0, 'その部位の耐性が下がる');
  assert.ok(eco.expRewardMul() > 1, '恩恵：経験値が増える');
  // 部位ごとの名前
  const names = ['mouth', 'hand', 'hip', 'foot'].map((a) => eco.forceGift(enemies[0], a).name);
  assert.deepEqual(names, ['グラマーバニーさんの刻印', 'グラマーバニーさんの手袋', 'グラマーバニーさんのパンツ', 'グラマーバニーさんの靴下']);
  // 商人ちゃんに、お金か経験値で外してもらう
  save.currentRun.gold = 0;
  assert.equal(eco.removeGift('bust', 'gold').ok, false);
  const lv = combat.hs.level;
  assert.equal(eco.removeGift('bust', 'exp').ok, true, '経験値払い');
  assert.ok(combat.hs.level < lv || combat.hs.exp >= 0);
  assert.equal(p.equipment.slots.bust, null);
}
{
  // 装備：耐性が上がり、拘束されるたびに溶かされる
  const { combat, save, enemies, logs } = setup([['blondeBunny', 6, 5]]);
  const eco = combat.eco;
  save.currentRun.gold = 1000;
  assert.ok(eco.buyGear('ironPlate', 'gold').ok);
  assert.equal(eco.resistanceOf('bust'), 8);
  const plate = save.persistent.equipment.slots.bust;
  for (let i = 0; i < plate.maxDur; i++) eco.wearGear([{ attr: 'bust', unit: enemies[0] }]);
  assert.equal(save.persistent.equipment.slots.bust, null, '溶かされて無くなる');
  assert.ok(logs.some((l) => l.kind === 'gearMelted'));
  // 堕ち度が上がるほど値上がり、負け癖を差し出すと半額
  const base = eco.price(100);
  eco.dealLoseHabit('kitten');
  assert.equal(eco.price(100), Math.round(base * B.merchant.dealDiscount));
  // アイテム
  eco.buyItem('manaVial', 'gold');
  combat.hs.mp = 0;
  assert.ok(eco.useItem('manaVial').ok);
  assert.ok(combat.hs.mp > 0);
}
{
  // 盗む技：お金とアイテムを盗まれ、商人ちゃんの店で買い戻せる
  const { combat, save, enemies, logs } = setup([['thiefGirl', 6, 5]]);
  save.currentRun.gold = 200;
  save.persistent.consumables.manaVial = 1;
  withRandom(0.01, () => combat.eco.steal(enemies[0], 'heartjackMaster'));
  assert.ok(save.currentRun.gold < 200);
  assert.equal(save.persistent.stolenItems.length, 1);
  assert.ok(logs.some((l) => l.kind === 'goldStolen') && logs.some((l) => l.kind === 'itemStolen'));
  // 拘束中に貢ぐ：脱出が進み、その子が強くなる
  combat.startBound(enemies[0], 'thiefHold', true, { answer: 'accept', drainMul: 1 });
  save.currentRun.gold = 300;
  const before = combat.bound.escapeProgress;
  combat.bound.request = { unit: enemies[0], line: '', age: 0, timeoutSec: 5 };
  combat.answerBindRequest('tribute');
  assert.ok(combat.bound.escapeProgress > before);
  assert.ok(save.persistent.tributes.thiefGirl > 0);
  assert.ok(combat.eco.drainMulFrom('thiefGirl') > 1);
}
{
  // 拠点：最大MP・所持金・お守り
  const save = createDefaultSave();
  save.persistent.baseUpgrades = { maxMp: 2 };
  const hero = newRunHero(save.persistent, B.battle.levelUp);
  assert.equal(hero.maxMp, saveSchema.currentRun.hero.maxMp + 40);
}


// 拘束で吸われている間も、その子専用の蓄積デバフが進み、発症すれば永続段階へ近づく
{
  const { combat, save, enemies } = setup([['kitten', 6, 5]]);
  const condId = conditionOfRace('kitten');
  combat.startBound(enemies[0], 'kittenKissHold', true, { answer: 'resist', drainMul: 1 });
  const before = save.currentRun.heroStatus.gauges[condId] ?? 0;
  for (let i = 0; i < 25; i++) {
    combat.hs.mp = combat.hs.maxMp;
    combat.boundPulse(1.2);
  }
  assert.ok((save.currentRun.heroStatus.gauges[condId] ?? 0) > before, '拘束の吸収で、その子の蓄積デバフが進む');
  assert.ok(save.persistent.conditioning[condId]?.onsetKeys.length > 0 || save.persistent.conditioning[condId]?.stage > 0, '発症して、永続段階へ近づく');
}

// 余韻中でも、蓄積デバフは進む
{
  const { combat, save, enemies } = setup([['kitten', 6, 5]]);
  combat.climax.afterglowLeft = 5;
  const condId = conditionOfRace('kitten');
  withRandom(0.99, () => combat.useSkill(enemies[0], 'kittenTease', {}));
  finish(combat);
  combat.bindCondGain(enemies[0], 'kittenKissHold', 1);
  assert.ok((save.currentRun.heroStatus.gauges[condId] ?? 0) > 0, '余韻中も進む');
}

// 拘束攻撃を受けると、その子専用の蓄積デバフが進む
{
  const { combat, save, enemies } = setup([['mikuGirl', 6, 5], ['kitten', 4, 5]]);
  combat.startBound(enemies[0], 'mikuBegKiss', true, { answer: 'resist', drainMul: 1 });
  assert.ok((save.currentRun.heroStatus.gauges[conditionOfRace('mikuGirl')] ?? 0) >= B.conditioning.bindHitGain);
  combat.addBoundBinder(enemies[1], 'kittenKissHold');
  assert.ok((save.currentRun.heroStatus.gauges[conditionOfRace('kitten')] ?? 0) >= B.conditioning.bindHitGain, '加わった子のぶんも進む');
}

// 離れた所からの誘惑を受け入れると、強く効き、自分から歩み寄って拘束される
{
  const near = setup([['mikuGirl', 9, 5]]);
  const mp0 = near.combat.hs.mp;
  withRandom(0.99, () => near.combat.useSkill(near.enemies[0], 'mikuBlowKiss', { choiceResolved: true, choiceAnswer: 'accept', choiceDrainMul: 1 }));
  finish(near.combat);
  assert.ok(near.combat.hs.mp < mp0);
  assert.ok(near.logs.some((l) => l.kind === 'rangedAccept'));
  assert.equal(Math.max(Math.abs(near.hero.tx - 9), Math.abs(near.hero.ty - 5)), 1, '自分から隣まで歩いていく');
  assert.ok(near.combat.bound, 'そのまま拘束される');
  assert.ok(near.combat.bound.surrenderRate >= B.temptation.rangedAccept.surrender);
}

console.log('features: all checks passed');
