// File: src/core/debugTools.js
// デバッグ用の操作。設定部屋のパネルは、DEBUG_ACTIONS から自動で作る。
import { clamp } from './util.js';
import { ENEMIES, ENEMIES_BY_ID } from '../data/enemies.js';
import { RACE_ABILITIES, isAbilityAvailable } from '../data/raceAbilities.js';
import { ensureCodexEntry } from '../battle/learning.js';
import { totalAbilityLevel, maxLevelOf } from '../battle/raceGrowth.js';

const sign = (n) => (n >= 0 ? `+${n}` : String(n));
const LEARNABLE = ['blowKiss', 'pinkBreath', 'sexyPose'];

function unlockEntry(persistent, def) {
  const entry = ensureCodexEntry(persistent, def.id);
  entry.seen = true;
  entry.encounters = Math.max(1, entry.encounters);
  entry.firstSeenRun ??= persistent.runCount;
  entry.seenSkills = [...def.skills];
}

// group: 'run' | 'player' | 'race' | 'all' / needsRace: 敵を選んでいるときだけ使える
// input: 数値欄の設定（def は既定値を返す関数）。無ければボタンだけ
export const DEBUG_ACTIONS = [
  {
    id: 'addGold', group: 'run', label: '所持金を増やす',
    input: { label: '金額', def: (B) => B.debug.goldDefault, min: -999999, max: 999999 },
    run(save, B, { value }) {
      const run = save.currentRun;
      run.gold = Math.max(0, run.gold + value);
      return `所持金 ${sign(value)} → ${run.gold}G`;
    }
  },
  {
    id: 'heroLevel', group: 'run', label: '主人公のレベルを上下',
    input: { label: 'Lv', def: () => 1, min: -98, max: 98 },
    run(save, B, { value }) {
      const hero = save.currentRun.hero;
      const level = Number.isFinite(hero.level) ? hero.level : 20;
      hero.level = clamp(level + value, 1, B.debug.heroLevelMax);
      hero.exp = 0;
      return `主人公のレベル ${sign(value)} → Lv${hero.level}`;
    }
  },
  {
    id: 'healAll', group: 'run', label: '全員を全回復（仲間も復帰）',
    run(save, B) {
      const run = save.currentRun;
      run.hero.hp = run.hero.maxHp;
      run.hero.mp = run.hero.maxMp;
      for (const ally of Object.values(run.allies)) {
        ally.status = 'ACTIVE';
        ally.hp = B.ally.hp;
        ally.mp = B.ally.mp;
        ally.charmGauge = 0;
      }
      run.pendingRescue = [];
      return '主人公と仲間を全回復した';
    }
  },
  {
    id: 'setErosion', group: 'run', label: '浸食ゲージを設定',
    input: { label: '値', def: () => 0, min: 0, max: 100 },
    run(save, B, { value }) {
      save.currentRun.erosion = clamp(value, 0, B.erosion.limit);
      return `浸食ゲージを ${save.currentRun.erosion} にした`;
    }
  },
  {
    id: 'addRp', group: 'player', label: '雪辱ポイントを増やす',
    input: { label: 'pt', def: (B) => B.debug.rpDefault, min: -99999, max: 99999 },
    run(save, B, { value }) {
      const p = save.persistent;
      p.rp = Math.max(0, p.rp + value);
      return `雪辱ポイント ${sign(value)} → ${p.rp}`;
    }
  },
  {
    id: 'addCureItems', group: 'player', label: '安らぎの香・浄めの雫を増やす',
    input: { label: '各個数', def: () => 3, min: -99, max: 99 },
    run(save, B, { value }) {
      const c = save.persistent.consumables;
      c.soothingIncense = Math.max(0, c.soothingIncense + value);
      c.purifyingDrop = Math.max(0, c.purifyingDrop + value);
      return `安らぎの香 ${c.soothingIncense}個、浄めの雫 ${c.purifyingDrop}個`;
    }
  },
  {
    id: 'setResistAll', group: 'player', label: '耐性4属性を一括設定',
    input: { label: '値', def: () => 0, min: -100, max: 100 },
    run(save, B, { value }) {
      const r = save.persistent.resistances;
      for (const key of Object.keys(r)) r[key] = value;
      return `耐性（口・胸・尻・足）をすべて ${value} にした`;
    }
  },
  {
    id: 'clearHabits', group: 'player', label: '癖を全消去（負け癖・堕ち癖など）',
    run(save) {
      const d = save.persistent.debuffs;
      d.loseHabit.byRace = {};
      d.fallHabit.stage = 0;
      d.touchHabit = { count: 0, stage: 0 };
      d.beggingHabit.stage = 0;
      d.allyTarget = { mage: 0, priest: 0 };
      return '癖をすべて消した';
    }
  },
  {
    id: 'unlockCodex', group: 'race', needsRace: true, label: 'この敵を図鑑に登録',
    run(save, B, { raceId }) {
      const def = ENEMIES_BY_ID[raceId];
      unlockEntry(save.persistent, def);
      return `${def.name} を図鑑に登録した`;
    }
  },
  {
    id: 'setMarkScore', group: 'race', needsRace: true, label: 'この敵のカモ度を設定',
    input: { label: '値', def: () => 100, min: 0, max: 100 },
    run(save, B, { value, raceId }) {
      save.persistent.learning.markScore[raceId] = clamp(value, 0, B.learning.markMax);
      return `${ENEMIES_BY_ID[raceId].name} のカモ度を ${save.persistent.learning.markScore[raceId]} にした`;
    }
  },
  {
    id: 'forgetSkill', group: 'race', needsRace: true, label: 'この敵の「覚えている技」を消す',
    run(save, B, { raceId }) {
      delete save.persistent.learning.lastDefeatSkill[raceId];
      return `${ENEMIES_BY_ID[raceId].name} の記憶を消した`;
    }
  },
  {
    id: 'abilityLevel', group: 'race', needsRace: true, label: 'この敵の永続能力を全て±Lv',
    input: { label: 'Lv', def: () => 1, min: -10, max: 10 },
    run(save, B, { value, raceId }) {
      const def = ENEMIES_BY_ID[raceId];
      const p = save.persistent;
      const byRace = (p.raceAbilities[raceId] ??= {});
      const cap = B.abilities.totalCapPerRace;
      let total = totalAbilityLevel(p, raceId);
      for (const ability of RACE_ABILITIES) {
        if (!isAbilityAvailable(ability, def)) continue;
        const state = (byRace[ability.id] ??= { level: 0, progress: 0 });
        let next = clamp(state.level + value, 0, maxLevelOf(ability, B));
        if (next > state.level) next = Math.min(next, state.level + Math.max(0, cap - total));   // 合計上限
        total += next - state.level;
        state.level = next;
        state.progress = 0;
      }
      return `${def.name} の永続能力を全て ${sign(value)}（合計Lv ${totalAbilityLevel(p, raceId)} / ${cap}）`;
    }
  },
  {
    id: 'resetAbilities', group: 'race', needsRace: true, label: 'この敵の永続能力をリセット',
    run(save, B, { raceId }) {
      delete save.persistent.raceAbilities[raceId];
      return `${ENEMIES_BY_ID[raceId].name} の永続能力をリセットした`;
    }
  },
  {
    id: 'setLoseHabit', group: 'race', needsRace: true, label: 'この敵への負け癖の段数',
    input: { label: '段', def: () => 3, min: 0, max: 99 },
    run(save, B, { value, raceId }) {
      const stage = clamp(value, 0, B.habit.loseMax);
      save.persistent.debuffs.loseHabit.byRace[raceId] = stage;
      return `${ENEMIES_BY_ID[raceId].name} への負け癖を ${stage} 段にした`;
    }
  },
  {
    id: 'setHabits', group: 'player', label: '癖の段数を一括設定（堕ち・感触・妥協・カモ化）',
    input: { label: '段', def: () => 3, min: 0, max: 8 },
    run(save, B, { value }) {
      const d = save.persistent.debuffs;
      const H = B.habit;
      d.fallHabit.stage = Math.min(value, H.fallMax);
      d.touchHabit.stage = Math.min(value, H.touchMax);
      d.touchHabit.count = d.touchHabit.stage * H.touchPerStage;
      d.beggingHabit.stage = Math.min(value, H.beggingMax);
      d.allyTarget.mage = Math.min(value, H.allyTargetMax);
      d.allyTarget.priest = Math.min(value, H.allyTargetMax);
      return `癖を ${value} 段にした（上限の範囲内）`;
    }
  },
  {
    id: 'learnAllSkills', group: 'race', needsRace: true, label: 'この敵に習得技を全部覚えさせる',
    run(save, B, { raceId }) {
      const def = ENEMIES_BY_ID[raceId];
      save.persistent.learnedSkills[raceId] = LEARNABLE.filter((id) => !def.skills.includes(id));
      return `${def.name} に習得技を覚えさせた（${save.persistent.learnedSkills[raceId].length}個）`;
    }
  },
  {
    id: 'unlockCodexAll', group: 'all', label: '図鑑に全敵を登録',
    run(save) {
      for (const def of ENEMIES) unlockEntry(save.persistent, def);
      return `図鑑に ${ENEMIES.length} 種を登録した`;
    }
  }
];

// 戻り値: { ok, message }。呼び出し側で、ログに流して scheduleSave(save) を呼ぶ
export function runDebugAction(actionId, save, B, { value = null, raceId = null } = {}) {
  const action = DEBUG_ACTIONS.find((a) => a.id === actionId);
  if (!action) return { ok: false, message: `未定義のデバッグ操作です: ${actionId}` };
  if (action.needsRace && !ENEMIES_BY_ID[raceId]) {
    return { ok: false, message: '敵を選んでから押してください' };
  }

  let v = value === null || value === '' ? Number.NaN : Number(value);
  if (action.input) {
    if (!Number.isFinite(v)) v = action.input.def(B);
    v = Math.round(clamp(v, action.input.min, action.input.max));
  }
  try {
    return { ok: true, message: action.run(save, B, { value: v, raceId }) };
  } catch (error) {
    console.error(error);
    return { ok: false, message: `失敗しました: ${error.message}` };
  }
}
