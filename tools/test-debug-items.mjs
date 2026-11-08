// レベル上限1000・触れたがりの手袋・アイテムを奪われて使われる・左右の拘束絵の位置
import assert from 'node:assert/strict';
import { B } from '../src/data/balance.js';
import { createDefaultSave } from '../src/data/saveSchema.js';
import { Combat } from '../src/battle/combat.js';
import { Unit } from '../src/dungeon/unit.js';
import { makeGear } from '../src/battle/economy.js';
import { placementFor } from '../src/ui/boundCharmMath.js';

function setup(specs) {
  const hero = new Unit({ id: 1, kind: 'hero', speciesId: 'hero', name: '主人公', tx: 5, ty: 5 });
  const enemies = specs.map(([raceId, tx, ty], i) => new Unit({ id: 2 + i, kind: 'enemy', speciesId: raceId, name: raceId, tx, ty, level: 1, maxHp: 600 }));
  const units = [hero, ...enemies];
  const walk = (x, y) => x >= 0 && y >= 0 && x < 30 && y < 30;
  const exp = {
    hero, units, walk, turnCount: 0, map: { isWalkable: walk, isVisible: () => true },
    unitAt: (x, y) => units.find((u) => u.tx === x && u.ty === y) ?? null, refresh: () => {}, removeUnit: (u) => units.splice(units.indexOf(u), 1), stepToward: () => false
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

// レベルの上限は 1000
{
  assert.equal(B.battle.heroLevelMax, 1000);
  assert.equal(B.debug.heroLevelMax, 1000);
  const s = setup([['kitten', 6, 5]]);
  s.save.currentRun.hero.level = 999;
  s.save.currentRun.hero.exp = 10 ** 9;
  s.combat.killEnemy(s.enemies[0], 0);
  assert.equal(s.save.currentRun.hero.level, 1000, '1000 で止まる');
}

// 触れたがりの手袋：剣でも、攻撃するたびに必ずチャームポイントに触れてしまう
{
  const s = setup([['kitten', 6, 5]]);
  s.save.persistent.equipment.slots.hand = makeGear('clingyGloves');
  s.save.currentRun.hero.weapon = 'sword';
  for (let i = 0; i < 3; i++) withRandom(0.99, () => s.combat.heroAttack(s.enemies[0]));
  assert.equal(s.logs.filter((l) => l.kind === 'gearTouch').length, 3, '毎回触れる');
  assert.equal(s.logs.filter((l) => l.kind === 'touchPenalty').length, 3);
  assert.ok(s.save.persistent.debuffs.touchHabit.count >= 3);
  // 外すと、剣では触れない
  const t = setup([['kitten', 6, 5]]);
  t.save.currentRun.hero.weapon = 'sword';
  withRandom(0.0, () => t.combat.heroAttack(t.enemies[0]));
  assert.equal(t.logs.filter((l) => l.kind === 'touchPenalty').length, 0);
}

// アイテムを奪われて、その場で使われる
{
  const s = setup([['kitten', 6, 5]]);
  s.save.persistent.consumables.manaVial = 1;
  s.combat.hs.mp = 200;
  s.enemies[0].hp = 100;
  const res = withRandom(0.0, () => s.combat.enemyDecide(s.enemies[0], { dist: 1, sees: true }));
  finish(s.combat);
  assert.equal(res, null);
  assert.equal(s.save.persistent.consumables.manaVial, 0, '奪われた');
  assert.ok(s.combat.hs.mp < 200, '口移しで MP を吸われた');
  assert.ok(s.enemies[0].hp > 100, '敵が回復した');
  assert.ok(s.logs.some((l) => l.kind === 'itemSnatched'));
  // 同じ敵は、しばらく漁らない
  s.save.persistent.consumables.soothingIncense = 1;
  assert.equal(s.combat.eco.snatchAndUse(s.enemies[0]), null);
  // ほかのアイテムも、それぞれ使われる
  for (const id of ['soothingIncense', 'purifyingDrop', 'lurePerfume', 'charmAmulet']) {
    const t = setup([['mikuGirl', 6, 5]]);
    t.save.persistent.consumables[id] = 1;
    const r = t.combat.eco.snatchAndUse(t.enemies[0]);
    finish(t.combat);
    assert.equal(r?.id, id);
    assert.equal(t.save.persistent.consumables[id], 0);
  }
  // 何も持っていなければ漁られない
  const u = setup([['kitten', 6, 5]]);
  assert.equal(u.combat.eco.snatchAndUse(u.enemies[0]), null);
}

// 左右から拘束されたときの絵は、少し外側
{
  const C = B.charm;
  const cfg = { anchorX: C.anchorX, anchorY: C.anchorY, offsetPx: C.offsetPx, sideOffsetPx: C.sideOffsetPx, sizePx: C.sizePx };
  assert.equal(placementFor('right', cfg).x + C.sizePx / 2 - C.anchorX, C.sideOffsetPx);
  assert.ok(C.sideOffsetPx > 310);
}

// 見つめてしまう：カーソルを乗せ続けると目が離せなくなり、その子の蓄積デバフが進む
{
  const s = setup([['kitten', 7, 5]]);
  const e = s.enemies[0];
  const G = B.gaze;
  s.combat.gaze.update(G.startSec * 0.5, e);
  assert.equal(s.combat.conditions.has('gazeLocked'), false, 'まだ平気');
  s.combat.gaze.update(G.startSec * 0.6, e);
  assert.ok(s.combat.conditions.has('gazeLocked'), '目が離せない');
  const before = Object.values(s.save.currentRun.heroStatus.gauges).reduce((a, b) => a + b, 0);
  for (let i = 0; i < 4; i++) s.combat.gaze.update(G.tickSec, e);
  const after = Object.values(s.save.currentRun.heroStatus.gauges).reduce((a, b) => a + b, 0);
  assert.ok(after > before, '見つめるほど蓄積デバフが進む');
  assert.ok(s.combat.gaze.intensity() > 0.5);
  // 目を離すと止まる
  s.combat.gaze.update(0.1, null);
  assert.equal(s.combat.gaze.target, null);
  const g2 = Object.values(s.save.currentRun.heroStatus.gauges).reduce((a, b) => a + b, 0);
  s.combat.gaze.update(5, null);
  assert.equal(Object.values(s.save.currentRun.heroStatus.gauges).reduce((a, b) => a + b, 0), g2);
}

console.log('debug items / gloves / snatch / gaze: all checks passed');
