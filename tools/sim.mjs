// File: tools/sim.mjs
// 画面なしの数値確認。npm run sim
import { B } from '../src/data/balance.js';
import { createDefaultSave } from '../src/data/saveSchema.js';
import { ENEMIES } from '../src/data/enemies.js';
import { getSoftness, softnessEffects, softnessTier, SOFT_TIER_NAMES } from '../src/battle/softness.js';
import { addAbilityProgress, getAbilityLevel } from '../src/battle/raceGrowth.js';
import {
  applyLearning, markTier, recordDefeat, recordMarkEvent, getMarkScore, MARK_TIER_NAMES
} from '../src/battle/learning.js';
import { buildCodexEntry } from '../src/ui/codexData.js';
import { recordEncounter } from '../src/battle/learning.js';

// 1. カモ度ごとの行動の傾向
const base = B.learning.codexBase;
const actions = [
  { id: 'attack', category: 'attack', weight: base.attack },
  { id: 'bind', category: 'bind', skillId: 'levelDrainKiss', weight: base.bind },
  { id: 'special', category: 'special', weight: base.special },
  { id: 'tactic', category: 'tactic', weight: base.tactic }
];

console.log('■ カモ度ごとの行動の割合（%）');
const rows = [];
for (const score of [0, 30, 65, 100]) {
  for (const remembered of [null, 'levelDrainKiss']) {
    const weighted = applyLearning(actions, { markScore: score, teasingPlayLv: 0, rememberedSkillId: remembered }, B);
    const total = weighted.reduce((s, a) => s + a.weight, 0);
    const row = {
      カモ度: score,
      段階: MARK_TIER_NAMES[markTier(score, B)],
      記憶: remembered ? 'あり' : 'なし'
    };
    for (const a of weighted) row[a.id] = Math.round((a.weight / total) * 100);
    rows.push(row);
  }
}
console.table(rows);

// 2. 敗北を重ねたときの変化（kitten）
console.log('■ 敗北を重ねたときの kitten のカモ度');
const save = createDefaultSave();
const p = save.persistent;
recordEncounter(p, 'kitten', 1);
const skills = ['levelDrainKiss', 'levelDrainKiss', 'sexyPose', 'beggingTrap', 'levelDrainKiss'];
const history = [];
for (let i = 0; i < 12; i++) {
  const skillId = skills[i % skills.length];
  const events = recordDefeat(p, {
    causeRaceId: 'kitten', skillId, defeatType: i % 3 === 2 ? 'charmDefeat' : 'beatenDown',
    presentRaceIds: ['kitten', 'dancer'], run: 1, floor: 1 + (i % 3)
  }, B);
  history.push({
    敗北: i + 1,
    記録した技: skillId,
    kittenのカモ度: getMarkScore(p, 'kitten'),
    dancerのカモ度: getMarkScore(p, 'dancer'),
    通知: events.filter((e) => e.kind === 'markTierUp').map((e) => `${e.raceId}:${MARK_TIER_NAMES[e.tier]}`).join(' ')
  });
  if (i % 4 === 3) recordMarkEvent(p, 'kitten', 'kill', B);   // たまに撃破
}
console.table(history);

console.log('■ 図鑑（kitten）');
console.log(JSON.stringify(buildCodexEntry('kitten', p, B), null, 2));

console.log('■ 柔らかさ（敵ごと）');
const softRows = [];
for (const enemy of ENEMIES) {
  const attrs = enemy.attr === 'all' ? ['mouth', 'bust', 'hip', 'foot'] : [enemy.attr];
  for (const attr of attrs) {
    const value = getSoftness(enemy.id, attr, B);
    const effects = softnessEffects(value, B);
    softRows.push({
      敵: enemy.name,
      属性: attr,
      値: value,
      段階: SOFT_TIER_NAMES[softnessTier(value, B)],
      吸収: `×${effects.drainMul.toFixed(2)}`,
      脱出: `×${effects.escapeMul.toFixed(2)}`,
      接触率: `+${Math.round(effects.touchChanceAdd * 100)}%`
    });
  }
}
console.table(softRows);

console.log('■ kitten の drainMouth の成長（1戦闘につき3pt、10戦）');
const growthRows = [];
for (let battle = 1; battle <= 10; battle++) {
  const grownThisBattle = new Set();
  const events = addAbilityProgress(p, 'kitten', 'drainMouth', B, {
    pts: 3,
    grownThisBattle
  });
  growthRows.push({
    戦闘: battle,
    Lv: getAbilityLevel(p, 'kitten', 'drainMouth'),
    進行: p.raceAbilities.kitten.drainMouth.progress,
    成長: events.length ? 'Lv上昇' : ''
  });
}
console.table(growthRows);

console.log('■ nurse（胸）は drainMouth を持てない');
console.log(
  '結果:',
  addAbilityProgress(p, 'nurse', 'drainMouth', B),
  '／保存データ:',
  p.raceAbilities.nurse ?? '作られていない'
);