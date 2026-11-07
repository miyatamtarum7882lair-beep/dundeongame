import assert from 'node:assert/strict';
import { B } from '../src/data/balance.js';
import { BoundTicker } from '../src/battle/boundTicker.js';
import { tickBindImmunity } from '../src/battle/bindImmunity.js';
import { BuffManager } from '../src/battle/buffs.js';
import { chooseTarget } from '../src/battle/targeting.js';
import { InputGate } from '../src/core/inputGate.js';
import { buildStatusEntries } from '../src/ui/statusPanel.js';

// ---- BoundTicker ----
{
  const t = new BoundTicker();
  let ticks = 0;
  for (let i = 0; i < 60 * 10; i++) ticks += t.update(1 / 60, 2);
  assert.equal(ticks, 5, '2s interval for 10s');
  ticks = 0;
  for (let i = 0; i < 60 * 5; i++) ticks += t.update(1 / 60, 1);
  assert.equal(ticks, 5, '1s interval for 5s');
  assert.ok(new BoundTicker().update(1000, 1) <= 8, 'bounded for huge dt');
  assert.equal(new BoundTicker().update(1, 0), 0);
}

// ---- 拘束免疫（拘束攻撃が1度で止まる問題の回帰）----
{
  // 脱出以外の解除（escapeInvulnTurns = 0）でも、次のターン終了で免疫が解ける
  const enemies = [{ bindImmune: true }, { bindImmune: true }, { bindImmune: false }];
  assert.equal(tickBindImmunity(enemies, 0), 0);
  assert.ok(enemies.every((e) => e.bindImmune === false));
}
{
  // 通常の脱出（1）は従来どおり次のターン終了で解除
  const enemies = [{ bindImmune: true }];
  assert.equal(tickBindImmunity(enemies, 1), 0);
  assert.equal(enemies[0].bindImmune, false);
}
{
  // 2ターン指定なら1ターン目は解除されない
  const enemies = [{ bindImmune: true }];
  assert.equal(tickBindImmunity(enemies, 2), 1);
  assert.equal(enemies[0].bindImmune, true);
  assert.equal(tickBindImmunity(enemies, 1), 0);
  assert.equal(enemies[0].bindImmune, false);
}

// ---- BuffManager ----
{
  const b = new BuffManager();
  assert.equal(b.add('nope'), null);
  assert.deepEqual(b.add('atkUp'), { id: 'atkUp', refreshed: false });
  for (let i = 0; i < 5; i++) b.tick();
  assert.equal(b.entries()[0].turnsLeft, B.buffs.durationTurns - 5);
  assert.deepEqual(b.add('atkUp'), { id: 'atkUp', refreshed: true });
  assert.equal(b.entries()[0].turnsLeft, B.buffs.durationTurns);
  assert.equal(b.items.length, 1, 'refresh does not duplicate');
  b.add('drainGuard');
  assert.ok(Math.abs(b.mult('damage') - 1.3) < 1e-9);
  assert.ok(Math.abs(b.mult('drainTaken') - 0.7) < 1e-9);
  assert.equal(b.mult('escapeNeed'), 1);
  let expired = [];
  for (let i = 0; i < B.buffs.durationTurns; i++) expired = expired.concat(b.tick());
  assert.equal(b.items.length, 0);
  assert.ok(expired.includes('atkUp') && expired.includes('drainGuard'));
  const r = new BuffManager();
  r.restore([
    { id: 'atkUp', turnsLeft: 3 },
    { id: 'bad', turnsLeft: 3 },
    { id: 'atkUp', turnsLeft: 0 },
  ]);
  assert.equal(r.items.length, 1);
}

// ---- 狙い先 ----
{
  const base = { enemyId: 'kitten', priestTargetable: true };
  assert.equal(chooseTarget({ ...base, heroReach: true, priestReach: false }), 'hero');
  assert.equal(chooseTarget({ ...base, heroReach: false, priestReach: true }), 'priest');
  assert.equal(chooseTarget({ ...base, heroReach: false, priestReach: false }), null);
  assert.equal(chooseTarget({ ...base, heroReach: true, priestReach: true, rng: () => 0 }), 'priest');
  assert.equal(chooseTarget({ ...base, heroReach: true, priestReach: true, rng: () => 0.99 }), 'hero');
  assert.equal(
    chooseTarget({ ...base, priestTargetable: false, heroReach: true, priestReach: true, rng: () => 0 }),
    'hero'
  );
}

// ---- InputGate ----
{
  let active = false;
  const gate = new InputGate({ lockSec: 0.35, isActive: () => active });
  gate.onAction(0.2);
  assert.equal(gate.canAct(), true);
  active = true;
  gate.onAction(0.2);
  assert.equal(gate.canAct(), false);
  gate.update(0.54);
  assert.equal(gate.canAct(), false);
  gate.update(0.02);
  assert.equal(gate.canAct(), true);
  gate.clear();
  assert.equal(gate.canAct(), true);
}

// ---- status panel ----
{
  assert.deepEqual(buildStatusEntries({}), []);
  const entries = buildStatusEntries({
    buffs: [{ id: 'atkUp', label: 'Attack Up', turnsLeft: 12 }],
    buffTurns: 20,
    afterglowTurns: 7,
    erectTurns: 2,
    erectTotalTurns: 3
  });
  assert.deepEqual(entries.map((entry) => entry.id), ['erect', 'afterglow', 'atkUp']);
  assert.equal(entries[0].detail, '2ターン');
  assert.equal(entries[1].detail, '7ターン');
  assert.equal(entries[2].icon, 'sword');
  assert.equal(entries[2].detail, '12');
}
console.log('battle-logic: all checks passed');
