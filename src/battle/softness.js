// File: src/battle/softness.js
import { clamp } from '../core/util.js';
import { ENEMIES_BY_ID, ATTRS } from '../data/enemies.js';
import { SOFTNESS } from '../data/softness.js';

export const SOFT_TIER_NAMES = { firm: 'しっかり', normal: 'ふつう', soft: 'やわらか', melting: 'とろける' };
const ALL_ATTRS = ['mouth', 'bust', 'hip', 'foot'];

export function getSoftness(raceId, attr, B) {
  return SOFTNESS[raceId]?.[attr] ?? B.softness.default;
}

export function softnessTier(value, B) {
  const t = B.softness.tiers;
  if (value >= t.melting) return 'melting';
  if (value >= t.soft) return 'soft';
  if (value >= t.normal) return 'normal';
  return 'firm';
}

// 1つの値から、3つの影響を求める
export function softnessEffects(value, B) {
  const s = clamp(value, 0, 100) / 100;
  const S = B.softness;
  return {
    drainMul: 1 + S.drainBonus * s,
    escapeMul: 1 + S.escapeBonus * s,
    touchChanceAdd: S.touchBonus * s
  };
}

// 拘束役の平均。binders: [{ raceId, attr }]（attr はそのとき使っている技の属性）
// 戻り値の escapeMul は calcRequiredClicks の ctx.softEscapeMul に、drainMul は吸収倍率に渡す
export function bindersSoftness(binders, B) {
  if (binders.length === 0) return { drainMul: 1, escapeMul: 1 };
  const list = binders.map((b) => softnessEffects(getSoftness(b.raceId, b.attr, B), B));
  const avg = (key) => list.reduce((sum, e) => sum + e[key], 0) / list.length;
  return { drainMul: avg('drainMul'), escapeMul: avg('escapeMul') };
}

// 拳で殴ったときの、柔らかさによる接触率の加算分
export function touchChanceAddFor(raceId, attr, B) {
  return softnessEffects(getSoftness(raceId, attr, B), B).touchChanceAdd;
}

// 図鑑用
export function buildSoftnessList(raceId, B) {
  const def = ENEMIES_BY_ID[raceId];
  const attrs = def.attr === 'all' ? ALL_ATTRS : [def.attr];
  return attrs.map((attr) => {
    const value = getSoftness(raceId, attr, B);
    const tier = softnessTier(value, B);
    return { attr, label: ATTRS[attr].label, value, tier, tierName: SOFT_TIER_NAMES[tier] };
  });
}