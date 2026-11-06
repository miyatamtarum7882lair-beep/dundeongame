/**
 * 再拘束防止の免疫を毎ターン判定する。
 * 旧実装は escapeInvulnTurns > 0 のときだけ免疫を解除していたため、
 * 脱出以外の解除（クライマックス終了など）で免疫が永久に残る可能性があった。
 *
 * @param {Array<{bindImmune?: boolean}>} enemies
 * @param {number} escapeInvulnTurns 現在の脱出無効ターン数
 * @returns {number} 更新後の escapeInvulnTurns
 */
export function tickBindImmunity(enemies, escapeInvulnTurns) {
  const left = Math.max(0, escapeInvulnTurns - 1);
  if (left === 0) {
    for (const e of enemies) {
      if (e.bindImmune) e.bindImmune = false;
    }
  }
  return left;
}
