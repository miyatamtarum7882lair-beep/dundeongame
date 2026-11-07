import assert from 'node:assert/strict';
import { B } from '../src/data/balance.js';
import { createDefaultSave } from '../src/data/saveSchema.js';
import { HeroConditions } from '../src/battle/conditioning.js';
import { SKILL_STAGES } from '../src/data/skillStages.js';
import { SKILL_DEFS } from '../src/data/skills.js';
import { STAGE_FX } from '../src/battle/stageFx.js';
import { SE_TABLE } from '../src/data/seTable.js';
import { CONDITIONS, STATUSES } from '../src/data/conditioning.js';
import { formationFor } from '../src/data/bindFormations.js';

const C = B.conditioning;
const kinds = (events) => events.map((e) => e.kind);

// 0〜2 は予兆だけ、警告 → 発症 → 危険域 → 最大
{
  const save = createDefaultSave();
  const hc = new HeroConditions(B, () => save);
  assert.deepEqual(kinds(hc.gain('pinkDrunk', 2)), ['condGain']);
  assert.ok(kinds(hc.gain('pinkDrunk', 1)).includes('condWarn'));
  const onset = hc.gain('pinkDrunk', 2, { floorKey: 'a' });
  assert.ok(kinds(onset).includes('condOnset'));
  assert.ok(onset.some((e) => e.kind === 'statusAdd' && e.id === 'charmed' && e.stun === 1));
  assert.ok(kinds(hc.gain('pinkDrunk', 2)).includes('condDanger'));
  assert.ok(kinds(hc.gain('pinkDrunk', 5)).includes('condMax'));
  assert.equal(hc.value('pinkDrunk'), C.max);
  // 魅了が切れたら、少しの間は再発しない
  for (let i = 0; i < 2; i++) hc.tickTurn(new Set(['blackRibbon']));
  assert.equal(hc.has('charmed'), false);
  assert.deepEqual(hc.addStatus('charmed', 1), []);
}

// 別の遭遇で3回発症すると、永続段階 I。対抗行動で1段階戻る
{
  const save = createDefaultSave();
  const hc = new HeroConditions(B, () => save);
  for (const key of ['f1', 'f1', 'f2']) {
    hc.gain('temptHabit', C.onsetAt, { floorKey: key });
    save.currentRun.heroStatus.gauges.temptHabit = 0;
  }
  assert.equal(hc.stage('temptHabit'), 0, '同じ階の発症は1回として数える');
  const ev = hc.gain('temptHabit', C.onsetAt, { floorKey: 'f3' });
  assert.ok(ev.some((e) => e.kind === 'condPermanent' && e.stage === 1));
  assert.equal(hc.stage('temptHabit'), 1);
  for (let i = 0; i < C.recoveryNeed[0] - 1; i++) hc.recordResist('temptHabit');
  assert.ok(kinds(hc.recordResist('temptHabit')).includes('condRecover'));
  assert.equal(hc.stage('temptHabit'), 0);
}

// 階をまたぐと一時状態は消え、ゲージは半分だけ残る。近くに発生源がいないと減っていく
{
  const save = createDefaultSave();
  const hc = new HeroConditions(B, () => save);
  hc.gain('hipPressure', 6);
  assert.ok(hc.has('offBalance'));
  assert.ok(hc.backBind('hip'));
  assert.equal(hc.backBind('mouth'), false);
  hc.onFloorStart();
  assert.equal(hc.has('offBalance'), false);
  assert.equal(hc.value('hipPressure'), 3);
  for (let i = 0; i < C.decayEveryTurns; i++) hc.tickTurn(new Set());
  assert.equal(hc.value('hipPressure'), 2);
}

// 台本の検査：存在する演出・SE・状態だけを参照している
for (const [skillId, stage] of Object.entries(SKILL_STAGES)) {
  const cues = [
    ...(stage.fx ?? []), ...(stage.windup ?? []),
    ...(stage.bind?.start ?? []), ...(stage.bind?.pulse ?? [])
  ];
  for (const cue of cues) assert.ok(STAGE_FX[cue.id], `${skillId}: 演出 ${cue.id} が無い`);
  // テーマ色（'$main' など）が、どの部品でも実際の色に置き換わっている
  const ctx = {
    hero: { body: { x: 0, y: 0 }, head: { x: 0, y: -50 } }, enemy: { body: { x: 64, y: 0 }, head: { x: 64, y: -50 } },
    dir: { dx: 1, dy: 0 }, def: SKILL_DEFS[skillId] ?? {}, attr: 'mouth', index: 0, count: 1, progress: 0,
    hpLoss: 0, mpLoss: 0, expLost: 0, theme: { main: '#ff0000', sub: '#00ff00', glow: '#0000ff', accent: '#ffff00' }
  };
  for (const cue of cues) {
    const json = JSON.stringify(STAGE_FX[cue.id]({ ...ctx, opts: cue }));
    assert.ok(!json.includes('"$'), `${skillId}: 演出 ${cue.id} でテーマ色が置き換わっていない`);
  }
  for (const cue of stage.se ?? []) {
    const id = cue.id === '$skill' ? SKILL_DEFS[skillId]?.se : cue.id;
    assert.ok(SE_TABLE[id], `${skillId}: SE ${id} が無い`);
  }
}
for (const [skillId, def] of Object.entries(SKILL_DEFS)) {
  assert.ok(SE_TABLE[def.se], `${skillId}: SE ${def.se} が無い`);
  if (def.windupSe) assert.ok(SE_TABLE[def.windupSe], `${skillId}: SE ${def.windupSe} が無い`);
  if (def.cond) assert.ok(CONDITIONS[def.cond.id], `${skillId}: 蓄積 ${def.cond.id} が無い`);
  for (const s of [def.status, def.acceptStatus]) if (s) assert.ok(STATUSES[s.id], `${skillId}: 状態 ${s.id} が無い`);
}

// 複数方向の拘束の陣形
{
  const one = formationFor(['front']);
  assert.deepEqual(one.ids, []);
  assert.equal(one.drain('mouth'), 1);
  const ears = formationFor(['left', 'right']);
  assert.deepEqual(ears.ids, ['earsBlocked']);
  assert.ok(ears.drain('mouth') > 1 && ears.drain('hip') === 1 && ears.muffle > 0);
  const sandwich = formationFor(['front', 'back', 'back']);
  assert.deepEqual(sandwich.ids, ['sandwich']);
  assert.equal(sandwich.muffle, 0);
  assert.ok(formationFor(['front', 'left', 'right']).ids.includes('surrounded'));
  const all = formationFor(['front', 'back', 'left', 'right']);
  assert.deepEqual(all.ids, ['earsBlocked', 'sandwich', 'surrounded', 'fullSurround']);
  assert.ok(all.drain('mouth') <= 2.5 && all.escape <= 2.2, '倍率には上限がある');
  assert.deepEqual(new Set(all.edges), new Set(['left', 'right', 'top', 'bottom']));
}

console.log('conditioning: all checks passed');
