const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** 1枚絵からポイント中心の正方形を切り出す。 */
export function charmCrop(iw, ih, { cx, cy, zoom }, { zoomMin = 1, zoomMax = 5 } = {}) {
  const z = clamp(zoom, zoomMin, zoomMax);
  const side = Math.min(iw, ih) / z;
  return {
    sx: clamp(cx * iw - side / 2, 0, iw - side),
    sy: clamp(cy * ih - side / 2, 0, ih - side),
    sw: side,
    sh: side
  };
}

/** t（中心0〜外縁1）から不透明度を計算する。 */
export function charmAlphaAt(t, { centerTransparency = 0.4, innerRatio = 0.45 } = {}) {
  const peak = 1 - centerTransparency;
  if (t <= innerRatio) return peak;
  if (t >= 1) return 0;
  const u = (t - innerRatio) / (1 - innerRatio);
  const s = u * u * (3 - 2 * u);
  return peak * (1 - s);
}

/** 向きを上下左右に丸める。横方向優先。 */
export function snapDir(dir) {
  if (dir.dx !== 0 && Math.abs(dir.dx) >= Math.abs(dir.dy)) return { dx: Math.sign(dir.dx), dy: 0 };
  if (dir.dy !== 0) return { dx: 0, dy: Math.sign(dir.dy) };
  return { dx: 0, dy: 1 };
}

/** 拘束者の相対位置を front/back/left/right に分類する。 */
export function bindSideOf(dx, dy, dir) {
  const d = snapDir(dir);
  const forward = dx * d.dx + dy * d.dy;
  const right = dx * -d.dy + dy * d.dx;
  if (Math.abs(forward) >= Math.abs(right)) return forward > 0 ? 'front' : 'back';
  return right > 0 ? 'right' : 'left';
}

/** 前=上、後=下、左=左、右=右の画面配置。 */
export function placementFor(side, { anchorX, anchorY, offsetPx, sideOffsetPx = offsetPx, sizePx }) {
  const cx = anchorX + (side === 'right' ? sideOffsetPx : side === 'left' ? -sideOffsetPx : 0);
  const cy = anchorY + (side === 'back' ? offsetPx : side === 'front' ? -offsetPx : 0);
  return { x: cx - sizePx / 2, y: cy - sizePx / 2, size: sizePx };
}
