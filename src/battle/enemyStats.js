// File: src/battle/enemyStats.js
import { ENEMIES_BY_ID } from '../data/enemies.js';
import { totalAbilityLevel } from './raceGrowth.js';

// 階、格、永続能力の合計から決まる。能力が育った種族ほど、レベルが高く出る
export function enemyLevel(raceId, floor, persistent, B) {
  const def = ENEMIES_BY_ID[raceId];
  const E = B.enemy;
  const base = 1 + (floor - 1) * E.levelPerFloor + (E.rankBonus[def.rank] ?? 0);
  return base + Math.floor(totalAbilityLevel(persistent, raceId) / E.abilityPerLevel);
}

export function enemyMaxHp(level, B) {
  return Math.round(B.enemy.baseHp + B.enemy.hpPerLevel * (level - 1));
}