// File: src/battle/learning.js
// 敵の学習（カモ度・最後に負けた技の記憶）と、敵図鑑の記録。画面に依存しない。
import { clamp } from '../core/util.js';
import { DEFEAT_SKILLS } from '../data/defeatSkills.js';

export const MARK_TIERS = ['stranger', 'familiar', 'knowing'];
export const MARK_TIER_NAMES = { stranger: '初見', familiar: '見慣れ', knowing: '見切り' };

// ---- 図鑑の記録 ----
export function ensureCodexEntry(persistent, raceId) {
  const entries = persistent.codex.entries;
  entries[raceId] ??= {
    seen: false, encounters: 0, kills: 0, defeats: 0, charms: 0, begs: 0,
    firstSeenRun: null, seenSkills: []
  };
  return entries[raceId];
}

// 戦闘開始時（その敵に初めて遭遇したとき）に呼ぶ
export function recordEncounter(persistent, raceId, run) {
  const entry = ensureCodexEntry(persistent, raceId);
  entry.encounters += 1;
  if (!entry.seen) {
    entry.seen = true;
    entry.firstSeenRun = run;
  }
}

// key: 'kills' | 'defeats' | 'charms' | 'begs'
export function recordCount(persistent, raceId, key) {
  ensureCodexEntry(persistent, raceId)[key] += 1;
}

// その敵の固有の特殊攻撃を、初めて見たときに呼ぶ
export function recordSkillSeen(persistent, raceId, skillId) {
  const entry = ensureCodexEntry(persistent, raceId);
  if (!entry.seenSkills.includes(skillId)) entry.seenSkills.push(skillId);
}

// ---- カモ度 ----
export function getMarkScore(persistent, raceId) {
  return persistent.learning.markScore[raceId] ?? 0;
}

export function markTier(score, B) {
  const t = B.learning.tiers;
  if (score >= t.knowing) return 'knowing';
  if (score >= t.familiar) return 'familiar';
  return 'stranger';
}

// eventId は B.learning.gain か B.learning.loss のキー。rate は加算率（同席の別種族は 0.5）
export function applyMarkEvent(persistent, raceId, eventId, B, rate = 1) {
  const L = B.learning;
  let delta;
  if (L.gain[eventId] !== undefined) delta = L.gain[eventId];
  else if (L.loss[eventId] !== undefined) delta = -L.loss[eventId];
  else throw new Error(`未定義のカモ度イベントです: ${eventId}`);

  const before = getMarkScore(persistent, raceId);
  const after = clamp(Math.round((before + delta * rate) * 10) / 10, 0, L.markMax);
  persistent.learning.markScore[raceId] = after;

  const tierBefore = markTier(before, B);
  const tierAfter = markTier(after, B);
  const tierUp = MARK_TIERS.indexOf(tierAfter) > MARK_TIERS.indexOf(tierBefore);
  return { before, after, tierBefore, tierAfter, tierUp };
}

const COUNT_KEY = { kill: 'kills', charmSuccess: 'charms', beggingSuccess: 'begs' };

// 撃破・見とれ成立・命乞い成立など、敗北以外のイベント用。戻り値は通知用のイベント配列
export function recordMarkEvent(persistent, raceId, eventId, B) {
  const result = applyMarkEvent(persistent, raceId, eventId, B);
  const key = COUNT_KEY[eventId];
  if (key) recordCount(persistent, raceId, key);
  return result.tierUp ? [{ kind: 'markTierUp', raceId, tier: result.tierAfter }] : [];
}

// ダンジョンクリア時
export function onDungeonClear(persistent, B) {
  for (const raceId of Object.keys(persistent.learning.markScore)) {
    const score = persistent.learning.markScore[raceId];
    persistent.learning.markScore[raceId] = Math.max(0, score - B.learning.clearDungeonLoss);
  }
}

// ---- 最後に負けた技の記憶 ----
export function getRememberedSkill(persistent, raceId) {
  return persistent.learning.lastDefeatSkill[raceId] ?? null;
}

// 戦闘敗北・完全敗北のときに1回呼ぶ。
//   causeRaceId: HPを0にした最後の一撃を与えた敵の種族
//   skillId: そのとき使っていた技（DEFEAT_SKILLS のキー）
//   defeatType: B.learning.gain のキー（beatenDown, climaxDefeat, charmDefeat, beggingDefeat, betrayalDefeat）
//   presentRaceIds: 同じ戦闘にいた種族
// 戻り値は、通知用のイベント配列（UI 側でログにする）
export function recordDefeat(persistent, { causeRaceId, skillId, defeatType, presentRaceIds = [], run = 0, floor = 1 }, B) {
  if (!DEFEAT_SKILLS[skillId]) throw new Error(`未定義の技IDです: ${skillId}`);

  const events = [];
  const previous = getRememberedSkill(persistent, causeRaceId);
  persistent.learning.lastDefeatSkill[causeRaceId] = { skillId, run, floor };
  events.push({ kind: 'rememberSkill', raceId: causeRaceId, skillId, changed: previous?.skillId !== skillId });

  const main = applyMarkEvent(persistent, causeRaceId, defeatType, B, 1);
  recordCount(persistent, causeRaceId, 'defeats');
  if (main.tierUp) events.push({ kind: 'markTierUp', raceId: causeRaceId, tier: main.tierAfter });

  for (const raceId of new Set(presentRaceIds)) {
    if (raceId === causeRaceId) continue;
    const other = applyMarkEvent(persistent, raceId, defeatType, B, B.learning.bystanderRate);
    if (other.tierUp) events.push({ kind: 'markTierUp', raceId, tier: other.tierAfter });
  }
  return events;
}

// ---- 行動の重み ----
// actions: [{ id, category: 'move'|'attack'|'bind'|'special'|'tactic', skillId?, weight }]
// ctx: { markScore, teasingPlayLv, rememberedSkillId }
export function applyLearning(actions, ctx, B) {
  const L = B.learning;
  const m = clamp(ctx.markScore ?? 0, 0, L.markMax) / L.markMax;
  const tier = markTier(ctx.markScore ?? 0, B);
  const categoryMul = {
    move: 1,
    attack: 1 - L.weight.attackCut * m,
    bind: 1 + L.weight.bindGain * m,
    special: 1 + L.weight.specialGain * m,
    tactic: 1 + L.weight.tacticGain * m
  };
  const teasing = 1 + L.teasingPerLevel * (ctx.teasingPlayLv ?? 0);
  const rememberBoost = L.rememberBoost + L.rememberTierBonus[tier];

  return actions.map((a) => {
    let weight = a.weight * (categoryMul[a.category] ?? 1);
    if (a.category === 'bind' || a.category === 'tactic') weight *= teasing;
    if (ctx.rememberedSkillId && a.skillId === ctx.rememberedSkillId) weight *= 1 + rememberBoost;
    return { ...a, weight };
  });
}

export function pickWeighted(actions, rng = Math.random) {
  const total = actions.reduce((sum, a) => sum + Math.max(0, a.weight), 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const a of actions) {
    r -= Math.max(0, a.weight);
    if (r <= 0) return a;
  }
  return actions[actions.length - 1];
}