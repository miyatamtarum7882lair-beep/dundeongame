/**
 * 音源の相対位置から左右・前後の定位を計算する。
 * 左右は方向の正弦で決め、距離による減衰は行わない。
 *
 * @param {number} dx 音源のタイル x − 主人公のタイル x
 * @param {number} dy 音源のタイル y − 主人公のタイル y
 * @param {{dx:number, dy:number}} dir 主人公の向き（斜めも可）
 * @param {{panStrength?:number, behindDot?:number}} spatial
 * @returns {{pan:number, vertical:number, behind:boolean}}
 */
export function spatialFromOffset(dx, dy, dir, { panStrength = 0.9, behindDot = -0.3 } = {}) {
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return { pan: 0, vertical: 0, behind: false };

  const length = Math.hypot(dir.dx, dir.dy) || 1;
  const right = (dx * -dir.dy + dy * dir.dx) / length;
  const forward = (dx * dir.dx + dy * dir.dy) / length;
  const unit = (value) => Math.max(-1, Math.min(1, value));
  const vertical = unit(forward / dist);

  return {
    pan: unit(right / dist) * panStrength,
    vertical,
    behind: vertical <= behindDot
  };
}
