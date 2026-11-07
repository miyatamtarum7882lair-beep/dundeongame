// File: src/data/corruption.js
// 堕ち度：誘惑に負けてきた積み重ね。ハートの刻印（画面左のハート5つ）で見せ、
// 段階が上がるほど BGM が甘く変わり、画面の縁がうっすら桃色に染まる。
// 主人公の永続的な記録から毎回計算する（保存する値は stats の回数だけ）。
// 点数と段階の境目はすべて仮。
import { CONDITIONS } from './conditioning.js';

export const CORRUPTION = {
  // 1回あたりの点数
  points: {
    defeat: 3,           // 敗北
    climax: 2,           // 絶頂させられた
    acceptChoice: 2,     // 選択肢で自分から受け入れた
    timeoutChoice: 2,    // 見とれて時間切れ
    acceptRequest: 1,    // 拘束中のおねだりを受け入れた
    loseHabitStage: 1,   // 負け癖の段階（敵ごと）
    conditionStage: 5    // 蓄積デバフの永続段階
  },
  thresholds: [0, 8, 20, 36, 56, 80],   // 段階 0〜5 になる点数
  names: ['', '揺らぎ', '甘え', '溺れ', '虜', '堕落'],
  colors: ['#ffd6ec', '#ffb3d9', '#ff7ac0', '#ff4fa3', '#e0207f', '#b0005a']
};

export function corruptionPoints(persistent) {
  const P = CORRUPTION.points;
  const s = persistent.stats ?? {};
  let pts = (s.defeatCount ?? 0) * P.defeat
    + (s.climaxCount ?? 0) * P.climax
    + (s.acceptCount ?? 0) * P.acceptChoice
    + (s.timeoutCount ?? 0) * P.timeoutChoice
    + (s.requestAcceptCount ?? 0) * P.acceptRequest;
  for (const stage of Object.values(persistent.debuffs?.loseHabit?.byRace ?? {})) pts += stage * P.loseHabitStage;
  for (const [id, st] of Object.entries(persistent.conditioning ?? {})) {
    if (CONDITIONS[id]) pts += (st?.stage ?? 0) * P.conditionStage;
  }
  return pts;
}

// { level 0〜5, fill 今の段階の中での進み 0〜1, mood 全体の深さ 0〜1 }
export function corruptionState(persistent) {
  const t = CORRUPTION.thresholds;
  const pts = corruptionPoints(persistent);
  let level = 0;
  while (level < t.length - 1 && pts >= t[level + 1]) level += 1;
  const next = t[level + 1];
  const fill = next === undefined ? 1 : (pts - t[level]) / (next - t[level]);
  return { points: pts, level, fill, mood: Math.min(1, (level + fill) / (t.length - 1)) };
}
