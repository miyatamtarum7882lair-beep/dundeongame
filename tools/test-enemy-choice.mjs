import assert from 'node:assert/strict';
import { B } from '../src/data/balance.js';
import { createDefaultSave } from '../src/data/saveSchema.js';
import { ENEMIES_BY_ID } from '../src/data/enemies.js';
import { ENEMY_DIALOGUE, choiceFor } from '../src/data/enemyDialogue.js';
import { Combat } from '../src/battle/combat.js';
import { Unit } from '../src/dungeon/unit.js';

for (const [raceId, entry] of Object.entries(ENEMY_DIALOGUE)) {
  const enemy = ENEMIES_BY_ID[raceId];
  assert.ok(enemy, `unknown enemy: ${raceId}`);
  if (!entry.choice) continue;
  assert.ok([...enemy.skills, ...enemy.bindSkills].includes(entry.choice.skillId), `${raceId} cannot use ${entry.choice.skillId}`);
  assert.equal(choiceFor(raceId, entry.choice.skillId), entry.choice);
  assert.equal(choiceFor(raceId, 'normalAttack'), null);
}

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
  const combat = new Combat(B, createDefaultSave(), exp);
  return { combat, hero, enemy, refreshed: () => refreshed };
}

{
  const { combat, hero, enemy, refreshed } = setup('kitten');
  combat.useSkill(enemy, 'blowKiss', {});
  assert.ok(combat.choice);
  assert.equal(combat.director.busy(), false);
  assert.equal(combat.resolveChoice('resist'), true);
  assert.equal(combat.choice, null);
  assert.equal(combat.director.busy(), false);
  assert.notDeepEqual([hero.tx, hero.ty], [2, 2]);
  assert.equal(refreshed(), 1);
}

{
  const { combat, enemy } = setup('kitten');
  combat.useSkill(enemy, 'blowKiss', {});
  combat.resolveChoice('accept');
  assert.equal(combat.director.current.payload.choiceDrainMul, B.temptation.acceptDrainMul);
  combat.clearChoice();
  combat.director.clear();
}

{
  const { combat, enemy } = setup('kitten');
  combat.useSkill(enemy, 'blowKiss', {});
  combat.resolveChoice('timeout');
  assert.equal(combat.director.current.payload.choiceDrainMul, B.temptation.timeoutDrainMul);
}

{
  const { combat, enemy } = setup('kitten', { walkable: (x, y) => (x === 2 && y === 2) || (x === 3 && y === 2) });
  combat.useSkill(enemy, 'blowKiss', {});
  combat.resolveChoice('resist');
  assert.equal(combat.director.current.payload.choiceDrainMul, 1);
}

{
  const { combat, enemy } = setup('blackRibbon');
  combat.startBound(enemy, 'levelDrainKiss');
  assert.ok(combat.choice);
  assert.equal(combat.bound, null);
  combat.resolveChoice('timeout');
  assert.equal(combat.choice, null);
  assert.equal(combat.bound.choiceDrainMul, B.temptation.timeoutDrainMul);
}

console.log('enemy choice: all checks passed');
