import { B } from '../data/balance.js';
import { PRIEST_TARGET_RATE } from '../data/priestTargeting.js';

export function priestTargetRateOf(enemyId) {
  return PRIEST_TARGET_RATE[enemyId] ?? B.priest.defaultTargetRate;
}

/** フロア生成時に1回ロールし、敵が接近する対象の好みとして使う。 */
export function rollPrefersPriest(enemyId, rng = Math.random) {
  return rng() < priestTargetRateOf(enemyId);
}

/**
 * 攻撃対象の選択。両方に届くときだけ確率で決める。
 * @returns {'hero' | 'priest' | null} null はどちらにも届かない
 */
export function chooseTarget({
  enemyId,
  heroReach,
  priestReach,
  priestTargetable,
  rng = Math.random,
}) {
  const p = Boolean(priestTargetable && priestReach);
  if (heroReach && p) return rng() < priestTargetRateOf(enemyId) ? 'priest' : 'hero';
  if (p) return 'priest';
  if (heroReach) return 'hero';
  return null;
}
