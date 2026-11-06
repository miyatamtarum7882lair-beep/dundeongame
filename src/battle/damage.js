// File: src/battle/damage.js
import { clamp } from '../core/util.js';

// ダメージ率。レベル差と乱数（±10%）を掛けて、minRate〜maxRate に収める
export function rollRate(base, minRate, maxRate, levelDiff, B, rng = Math.random) {
  const mul = clamp(1 + B.battle.levelDiffRate * levelDiff, 0.5, 1.8);
  const rand = 0.9 + rng() * 0.2;
  return clamp(base * mul * rand, minRate, maxRate);
}

export function calcDamage(maxHp, rate) {
  return Math.max(1, Math.round(maxHp * rate));
}

export function expNeeded(level, B) {
  const E = B.battle.exp;
  return E.need + E.needPerLevel * (level - 1);
}

export function expReward(enemyLevel, B) {
  const E = B.battle.exp;
  return Math.round(E.base + E.perEnemyLevel * enemyLevel);
}