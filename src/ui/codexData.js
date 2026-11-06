// File: src/ui/codexData.js
// 敵図鑑に表示する内容を作る。画面に依存しない。UI（ステップ6.5）はこの結果を描くだけにする。
import { ENEMIES, ENEMIES_BY_ID, ATTRS } from '../data/enemies.js';
import { DEFEAT_SKILLS } from '../data/defeatSkills.js';
import { RACE_ABILITIES } from '../data/raceAbilities.js';
import {
  MARK_TIER_NAMES, markTier, getMarkScore, getRememberedSkill, applyLearning
} from '../battle/learning.js';
import {
  getAbilityState, getAbilityLevel, totalAbilityLevel, maxLevelOf, neededPoints
} from '../battle/raceGrowth.js';
import { buildSoftnessList } from '../battle/softness.js';
import { isAbilityAvailable } from '../data/raceAbilities.js';

const UNKNOWN = '？？？';

export function isDiscovered(persistent, raceId) {
  return persistent.codex.entries[raceId]?.seen === true;
}

// 一覧用。未遭遇は名前も属性も隠す
export function listCodex(persistent, B) {
  return ENEMIES.map((e) => {
    const found = isDiscovered(persistent, e.id);
    const tier = found ? markTier(getMarkScore(persistent, e.id), B) : null;
    return {
      id: e.id,
      rank: e.rank,
      discovered: found,
      name: found ? e.name : UNKNOWN,
      attr: found ? e.attr : null,
      tier,
      tierName: tier ? MARK_TIER_NAMES[tier] : null
    };
  });
}

// 「いまの傾向」。実際の確率ではなく、行動の重みの割合の目安（%）
function buildTendency(markScore, teasingLv, B) {
  const base = B.learning.codexBase;
  const actions = [
    { id: 'attack', label: '通常攻撃', category: 'attack', weight: base.attack },
    { id: 'bind', label: '拘束', category: 'bind', weight: base.bind },
    { id: 'special', label: '特殊攻撃', category: 'special', weight: base.special },
    { id: 'tactic', label: '手口', category: 'tactic', weight: base.tactic }
  ];
  const weighted = applyLearning(actions, { markScore, teasingPlayLv: teasingLv, rememberedSkillId: null }, B);
  const total = weighted.reduce((sum, a) => sum + a.weight, 0);
  return weighted.map((a) => ({ id: a.id, label: a.label, percent: Math.round((a.weight / total) * 100) }));
}

// その敵の永続能力。その敵が持てる能力だけを返す
export function buildGrowth(persistent, raceId, B) {
  const def = ENEMIES_BY_ID[raceId];
  return RACE_ABILITIES.filter((a) => isAbilityAvailable(a, def)).map((ability) => {
    const state = getAbilityState(persistent, raceId, ability.id);
    const max = maxLevelOf(ability, B);
    const atMax = state.level >= max;
    return {
      id: ability.id,
      name: ability.name,
      effect: ability.effect,
      trigger: ability.trigger,
      level: state.level,
      maxLevel: max,
      progress: state.progress,
      needed: atMax ? null : neededPoints(state.level, B)
    };
  });
}

// あなた側の記録
export function buildPlayerRecord(persistent) {
  return {
    resistances: { ...persistent.resistances },
    fallHabit: persistent.debuffs.fallHabit.stage,
    touchHabit: persistent.debuffs.touchHabit.stage,
    beggingHabit: persistent.debuffs.beggingHabit.stage,
    climaxCount: persistent.stats.climaxCount,
    defeatCount: persistent.stats.defeatCount
  };
}

// 「全体」タブ。遭遇済みの敵の、合計Lvとカモ度の一覧と、あなた側の記録
export function buildOverview(persistent, B) {
  const races = ENEMIES.filter((e) => isDiscovered(persistent, e.id)).map((e) => {
    const score = getMarkScore(persistent, e.id);
    return {
      id: e.id,
      name: e.name,
      totalLevel: totalAbilityLevel(persistent, e.id),
      totalCap: B.abilities.totalCapPerRace,
      markScore: score,
      tierName: MARK_TIER_NAMES[markTier(score, B)]
    };
  });
  return { races, player: buildPlayerRecord(persistent) };
}

// 個別ページ用。未遭遇は { discovered: false } だけを返す
export function buildCodexEntry(raceId, persistent, B) {
  const def = ENEMIES_BY_ID[raceId];
  if (!def) throw new Error(`未定義の敵IDです: ${raceId}`);

  const record = persistent.codex.entries[raceId];
  if (!record?.seen) return { id: raceId, discovered: false, name: UNKNOWN };

  const score = getMarkScore(persistent, raceId);
  const tier = markTier(score, B);
  const teasingLv = getAbilityLevel(persistent, raceId, 'teasingPlay');
  const remembered = getRememberedSkill(persistent, raceId);
  const loseStage = persistent.debuffs.loseHabit.byRace[raceId] ?? 0;
  const H = B.habit;

  return {
    id: raceId,
    discovered: true,
    name: def.name,
    rank: def.rank,
    attr: { id: def.attr, ...ATTRS[def.attr] },
    softness: buildSoftnessList(raceId, B),
    stats: {
      encounters: record.encounters,
      kills: record.kills,
      defeats: record.defeats,
      charms: record.charms,
      begs: record.begs,
      firstSeenRun: record.firstSeenRun
    },
    learning: {
      score,
      tier,
      tierName: MARK_TIER_NAMES[tier],
      tendency: buildTendency(score, teasingLv, B)
    },
    remembered: remembered
      ? {
          skillId: remembered.skillId,
          name: DEFEAT_SKILLS[remembered.skillId]?.name ?? UNKNOWN,
          run: remembered.run,
          floor: remembered.floor
        }
      : null,
    skills: {
      innate: def.skills.map((id) =>
        record.seenSkills.includes(id)
          ? { id, name: DEFEAT_SKILLS[id]?.name ?? id }
          : { id: null, name: UNKNOWN }
      ),
      learned: (persistent.learnedSkills[raceId] ?? []).map((id) => ({
        id,
        name: DEFEAT_SKILLS[id]?.name ?? id
      }))
    },
    loseHabit: {
      stage: loseStage,
      max: H.loseMax,
      absorbUp: loseStage * H.loseAbsorbPerStage,
      mpDrainUp: loseStage * H.loseMpPerStage,
      attackDown: Math.min(loseStage * H.loseAttackPerStage, H.loseAttackCap)
    },
    revenge: persistent.revengeEnemies
      .filter((r) => r.species === raceId)
      .map((r) => ({ level: r.level })),
    growth: buildGrowth(persistent, raceId, B),
    totalLevel: totalAbilityLevel(persistent, raceId),
    totalCap: B.abilities.totalCapPerRace
  };
}