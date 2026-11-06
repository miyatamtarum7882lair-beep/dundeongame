// File: src/battle/raceGrowth.js
// 種族ごとの永続能力の読み書き。画面に依存しない。
import { ENEMIES_BY_ID } from '../data/enemies.js';
import { RACE_ABILITIES_BY_ID, isAbilityAvailable } from '../data/raceAbilities.js';

// 読むだけ。データが無ければ Lv0 を返す（保存データは変えない）
export function getAbilityState(persistent, raceId, abilityId) {
  return persistent.raceAbilities[raceId]?.[abilityId] ?? { level: 0, progress: 0 };
}

export function getAbilityLevel(persistent, raceId, abilityId) {
  return getAbilityState(persistent, raceId, abilityId).level;
}

// 複数の種族の平均Lv（拘束役が複数いるときの効果量に使う）
export function averageAbilityLevel(persistent, raceIds, abilityId) {
  if (raceIds.length === 0) return 0;
  const sum = raceIds.reduce((s, id) => s + getAbilityLevel(persistent, id, abilityId), 0);
  return sum / raceIds.length;
}

export function totalAbilityLevel(persistent, raceId) {
  const byRace = persistent.raceAbilities[raceId] ?? {};
  return Object.values(byRace).reduce((sum, state) => sum + (state.level ?? 0), 0);
}

export function maxLevelOf(ability, B) {
  return ability.maxLevel ?? B.abilities.maxLevel;
}

// 現在のLvから、次のLvに必要なポイント
export function neededPoints(level, B) {
  return (level + 1) * B.abilities.ptPerLevel;
}

// 成長のきっかけで呼ぶ。grownThisBattle には戦闘ごとの Set を渡す（同じ能力は1戦闘に+1Lvまで）
// 戻り値は通知用のイベント配列。UI 側で logMessages の raceAbilityGrow にする
export function addAbilityProgress(persistent, raceId, abilityId, B, { pts = 1, grownThisBattle = null } = {}) {
  const enemy = ENEMIES_BY_ID[raceId];
  const ability = RACE_ABILITIES_BY_ID[abilityId];
  if (!enemy) throw new Error(`未定義の敵IDです: ${raceId}`);
  if (!ability) throw new Error(`未定義の能力IDです: ${abilityId}`);
  if (!isAbilityAvailable(ability, enemy)) return [];

  const max = maxLevelOf(ability, B);
  const byRace = (persistent.raceAbilities[raceId] ??= {});
  const state = (byRace[abilityId] ??= { level: 0, progress: 0 });
  if (state.level >= max) return [];
  if (totalAbilityLevel(persistent, raceId) >= B.abilities.totalCapPerRace) return [];

  const key = `${raceId}:${abilityId}`;
  const need = neededPoints(state.level, B);
  state.progress += pts;
  if (state.progress < need) return [];

  if (grownThisBattle?.has(key)) {   // この戦闘では、すでに1Lv上がっている
    state.progress = need;
    return [];
  }

  state.level += 1;
  state.progress = Math.min(state.progress - need, neededPoints(state.level, B) - 1);
  grownThisBattle?.add(key);
  return [{ kind: 'raceAbilityGrow', raceId, abilityId, level: state.level }];
}