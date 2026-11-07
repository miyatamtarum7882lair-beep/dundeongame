// File: src/battle/skillEvolution.js
// 技ごとの進化（v5）と、選択肢の受容回数による追加ルート（v6）。上位技の永続習得も扱う。
// 保存先: persistent.skillEvolution[種族ID][技ID] = { manual, timeout, progress, evolved }
//         persistent.learnedSkills[種族ID] = [上位技ID, ...]
// 現在、敵は種族ごとに成長を保存しているので、「同じ敵個体」は種族単位で数える。
//
// 進化条件は skills.js の evolve: { type, need }
//   debuff_max   この技の命中で、対応する蓄積デバフのゲージが最大になった
//   finish       この拘束技で MP0 フィニッシュ（絶頂）させた
//   repeated_use この技の命中回数が need に達した
//   choice_count 選択肢の受け入れ、または力比べの敗北が need 回に達した
// どの技でも、自発的受容 manualAccept 回 OR 時間切れ受容 timeoutAccept 回でも進化する（一度だけ）。

export function evoState(p, raceId, skillId) {
  p.skillEvolution ??= {};
  p.skillEvolution[raceId] ??= {};
  p.skillEvolution[raceId][skillId] ??= { manual: 0, timeout: 0, progress: 0, evolved: false };
  return p.skillEvolution[raceId][skillId];
}

export function isEvolved(p, raceId, skillId) {
  return Boolean(p.skillEvolution?.[raceId]?.[skillId]?.evolved);
}

function evolve(st, raceId, skillId, cause) {
  if (st.evolved) return [];
  st.evolved = true;
  return [{ kind: 'skillEvolved', raceId, skillId, cause }];
}

// 選択肢の結果を記録する。answer: accept / timeout / resist
export function recordChoice(p, raceId, skillId, answer, B) {
  const st = evoState(p, raceId, skillId);
  if (answer === 'accept') st.manual += 1;
  else if (answer === 'timeout') st.timeout += 1;
  else return [];
  const c = B.temptation;
  if (st.manual >= c.evolveManualAccept) return evolve(st, raceId, skillId, 'manualAccept');
  if (st.timeout >= c.evolveTimeoutAccept) return evolve(st, raceId, skillId, 'timeoutAccept');
  return [];
}

// 技固有の進化条件の進み。type が技の条件と違えば何もしない
export function recordEvoProgress(p, raceId, skillId, def, type, amount = 1) {
  const rule = def?.evolve;
  if (!rule || rule.type !== type) return [];
  const st = evoState(p, raceId, skillId);
  if (st.evolved) return [];
  st.progress += amount;
  if (st.progress >= (rule.need ?? 1)) return evolve(st, raceId, skillId, type);
  return [];
}

export function hasLearned(p, raceId, skillId) {
  return Boolean(skillId && p.learnedSkills?.[raceId]?.includes(skillId));
}

// 上位技を永続習得する。新しく覚えたら true
export function learnAdvanced(p, raceId, skillId) {
  if (!skillId) return false;
  p.learnedSkills ??= {};
  const list = (p.learnedSkills[raceId] ??= []);
  if (list.includes(skillId)) return false;
  list.push(skillId);
  return true;
}
