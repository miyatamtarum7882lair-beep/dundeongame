// File: src/data/skills.js
// 敵の技の定義（構造のみ）。数値は balance.js の skills。
// category: attack | bind | special。fx: 演出の種類（台本が無いときの従来演出）。motion: スプライトのタグ
//
// 固有技の追加項目（初期3体から使用）
//   cond      { id, gain }  命中時に主人公の蓄積デバフ（conditioning.js）を増やす
//   status    { id, turns, chance }  命中時に一時状態を付与する
//   resist    選択肢で「断る」側を選んだときの処理。dodge: 回避判定に補正 / guard: 身構える / contest: 力比べ
//   evolve    { type, need }  技ごとの進化条件（skillEvolution.js）
//   combo     命中後、次の行動でこの技を優先して使う
//   advancedFrom  上位技の場合、習得の条件になる拘束技
import { WAVE1_SKILL_DEFS } from './skillsWave1.js';
import { WAVE2_SKILL_DEFS } from './skillsWave2.js';
import { WAVE3_SKILL_DEFS } from './skillsWave3.js';
import { WAVE4_SKILL_DEFS } from './skillsWave4.js';

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
  drainBerochu: { category: 'special', attr: 'mouth', fx: 'kiss', se: 'vacuumKiss', motion: 'skill_sexyPose', windupSe: 'warning' },

  // ---- 小悪魔キトゥン（口）----
  kittenTouch: { category: 'attack', attr: 'mouth', fx: 'kiss', se: 'kittenTouch',
    cond: { id: 'temptHabit', gain: 0.5 }, evolve: { type: 'repeated_use', need: 15 } },
  kittenKissHold: { category: 'bind', attr: 'mouth', fx: 'kiss', se: 'kittenKissHold',
    evolve: { type: 'finish', need: 1 } },
  kittenTease: { category: 'special', attr: 'mouth', fx: 'pose', se: 'kittenTease', motion: 'skill_sexyPose',
    cond: { id: 'temptHabit', gain: 1 }, status: { id: 'careless', turns: 2, chance: 0.35 },
    evolve: { type: 'debuff_max', need: 1 } },
  kittenBlowKiss: { category: 'special', attr: 'mouth', fx: 'blowKiss', se: 'kittenBlowKiss', motion: 'skill_blowKiss',
    windupSe: 'warning', cond: { id: 'temptHabit', gain: 1 }, evolve: { type: 'debuff_max', need: 1 } },
  kittenDare: { category: 'special', attr: 'mouth', fx: 'pose', se: 'kittenDare', motion: 'skill_sexyPose',
    windupSe: 'warning', resist: 'guard', cond: { id: 'temptHabit', gain: 1 },
    acceptStatus: { id: 'tempted', turns: 6 }, evolve: { type: 'choice_count', need: 3 } },
  kittenFullTemptation: { category: 'special', attr: 'mouth', fx: 'kiss', se: 'temptSuck', motion: 'skill_blowKiss',
    windupSe: 'kittenDare', cond: { id: 'temptHabit', gain: 2 }, advancedFrom: 'kittenKissHold' },

  // ---- 黒髪リボンちゃん（口）----
  ribbonTouch: { category: 'attack', attr: 'mouth', fx: 'kiss', se: 'ribbonTouch',
    cond: { id: 'pinkDrunk', gain: 0.5 }, evolve: { type: 'repeated_use', need: 15 } },
  peachBreathHold: { category: 'bind', attr: 'mouth', fx: 'breath', se: 'peachBreathHold',
    evolve: { type: 'finish', need: 1 } },
  peachBreath: { category: 'special', attr: 'mouth', fx: 'breath', se: 'peachBreath', motion: 'skill_pinkBreath',
    windupSe: 'warning', resist: 'dodge', cond: { id: 'pinkDrunk', gain: 1.5 }, evolve: { type: 'debuff_max', need: 1 } },
  sweetWhisper: { category: 'special', attr: 'mouth', fx: 'pose', se: 'sweetWhisper', motion: 'skill_sexyPose',
    cond: { id: 'pinkDrunk', gain: 1 }, status: { id: 'inattentive', turns: 2, chance: 1 },
    evolve: { type: 'debuff_max', need: 1 } },
  closeBreath: { category: 'special', attr: 'mouth', fx: 'breath', se: 'closeBreath', motion: 'skill_pinkBreath',
    windupSe: 'warning', cond: { id: 'pinkDrunk', gain: 1.5 }, evolve: { type: 'debuff_max', need: 1 } },
  supremePeachBreath: { category: 'special', attr: 'mouth', fx: 'breath', se: 'supremePeachBreath', motion: 'skill_pinkBreath',
    windupSe: 'peachBreath', cond: { id: 'pinkDrunk', gain: 3 }, advancedFrom: 'peachBreathHold' },

  // ---- ピンク髪きつねちゃん（尻）----
  foxStep: { category: 'attack', attr: 'hip', fx: 'hit', se: 'foxStep',
    cond: { id: 'hipPressure', gain: 0.5 }, evolve: { type: 'repeated_use', need: 15 } },
  foxBackRub: { category: 'bind', attr: 'hip', fx: 'embrace', se: 'foxBackRub',
    evolve: { type: 'finish', need: 1 } },
  foxHipAttack: { category: 'special', attr: 'hip', fx: 'hit', se: 'foxHipAttack', motion: 'skill_sexyPose',
    windupSe: 'warning', cond: { id: 'hipPressure', gain: 1.5 }, status: { id: 'offBalance', turns: 2, chance: 0.5 },
    evolve: { type: 'debuff_max', need: 1 } },
  foxPushContest: { category: 'special', attr: 'hip', fx: 'hit', se: 'foxPushStrain', motion: 'skill_sexyPose',
    resist: 'contest', cond: { id: 'hipPressure', gain: 1.5 }, acceptStatus: { id: 'offBalance', turns: 3 },
    evolve: { type: 'choice_count', need: 3 } },
  tailFeint: { category: 'special', attr: 'hip', fx: 'pose', se: 'tailFeint', motion: 'skill_blowKiss',
    cond: { id: 'hipPressure', gain: 0.5 }, status: { id: 'feinted', turns: 2, chance: 1 }, combo: 'foxHipAttack',
    evolve: { type: 'debuff_max', need: 1 } },
  foxHipPress: { category: 'special', attr: 'hip', fx: 'hit', se: 'hipBounce', motion: 'skill_sexyPose',
    windupSe: 'foxPushStrain', cond: { id: 'hipPressure', gain: 2 }, advancedFrom: 'foxBackRub' },

  // ---- 前半9体（skillsWave1.js）----
  ...WAVE1_SKILL_DEFS,
  // ---- 後半9体（skillsWave2.js）----
  ...WAVE2_SKILL_DEFS,
  ...WAVE3_SKILL_DEFS,
  ...WAVE4_SKILL_DEFS
};
