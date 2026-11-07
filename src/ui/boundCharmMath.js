const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * 1枚絵からポイント中心の正方形を切り出す。中心は常にポイントのまま（画像の外にはみ出してよい）。
 * 画像の隅にあるチャームポイントも中心に置けるように、はみ出した部分は透明として扱う。
 */
export function charmCrop(iw, ih, { cx, cy, zoom }, { zoomMin = 1, zoomMax = 5 } = {}) {
  const z = clamp(zoom, zoomMin, zoomMax);
  const side = Math.min(iw, ih) / z;
  return { sx: cx * iw - side / 2, sy: cy * ih - side / 2, sw: side, sh: side };
}

/** 切り出し範囲のうち、画像の中にある部分だけを描く（はみ出した部分は透明） */
export function drawCrop(g, img, iw, ih, crop, dx, dy, dw, dh) {
  const x0 = Math.max(0, crop.sx);
  const y0 = Math.max(0, crop.sy);
  const x1 = Math.min(iw, crop.sx + crop.sw);
  const y1 = Math.min(ih, crop.sy + crop.sh);
  if (x1 <= x0 || y1 <= y0) return;
  const kx = dw / crop.sw;
  const ky = dh / crop.sh;
  g.drawImage(img, x0, y0, x1 - x0, y1 - y0, dx + (x0 - crop.sx) * kx, dy + (y0 - crop.sy) * ky, (x1 - x0) * kx, (y1 - y0) * ky);
}

/** t（中心0〜外縁1）から不透明度を計算する。 */
export function charmAlphaAt(t, { centerTransparency = 0.4, innerRatio = 0.45, edgeSharpness = 1 } = {}) {
  const peak = 1 - centerTransparency;
  if (t <= innerRatio) return peak;
  if (t >= 1) return 0;
  const u = (t - innerRatio) / (1 - innerRatio);
  // edgeSharpness が大きいほど、中心を出たあとすぐに消える
  const k = Math.pow(u, 1 / Math.max(0.2, edgeSharpness));
  const s = k * k * (3 - 2 * k);
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
