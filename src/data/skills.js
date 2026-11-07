// File: src/data/skills.js
// 敵の技の定義（構造のみ）。数値は balance.js の skills。
// category: attack | bind | special。fx: 演出の種類。motion: スプライトのタグ
export const SKILL_DEFS = {
  normalAttack: { category: 'attack', fx: 'hit', se: 'thud' },
  kissAttack: { category: 'attack', attr: 'mouth', fx: 'kiss', se: 'kissAir' },
  pafuAttack: { category: 'attack', attr: 'bust', fx: 'embrace', se: 'bustRub' },
  hipAttack: { category: 'attack', attr: 'hip', fx: 'hit', se: 'thud' },
  footRubAttack: { category: 'attack', attr: 'foot', fx: 'embrace', se: 'footPress' },
  levelDrainKiss: { category: 'bind', attr: 'mouth', fx: 'kiss', se: 'vacuumKiss' },
  onechanPafu: { category: 'bind', attr: 'bust', fx: 'embrace', se: 'pafuDrain' },
  backRub: { category: 'bind', attr: 'hip', fx: 'embrace', se: 'hipStroke' },
  footRub: { category: 'bind', attr: 'foot', fx: 'embrace', se: 'footPress' },
  footStomp: { category: 'bind', attr: 'foot', fx: 'stomp', se: 'footPress' },
  blowKiss: { category: 'special', attr: 'mouth', fx: 'blowKiss', se: 'kissAir', motion: 'skill_blowKiss' },
  pinkBreath: { category: 'special', attr: 'mouth', fx: 'breath', se: 'breath', motion: 'skill_pinkBreath' },
  sexyPose: { category: 'special', attr: 'mouth', fx: 'pose', se: 'warning', motion: 'skill_sexyPose' },
  deepDrainKiss: { category: 'special', attr: 'mouth', fx: 'kiss', se: 'deepDrainKiss', motion: 'skill_sexyPose', windupSe: 'warning' },
  foxPounce: { category: 'special', attr: 'hip', fx: 'hit', se: 'thud', motion: 'skill_sexyPose', windupSe: 'warning' },
  drainBerochu: { category: 'special', attr: 'mouth', fx: 'kiss', se: 'vacuumKiss', motion: 'skill_sexyPose', windupSe: 'warning' }
};
