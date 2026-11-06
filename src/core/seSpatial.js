// File: src/core/seSpatial.js
// 座標はタイル座標。hero = { tx, ty, dir: { dx, dy } }。
// 主人公が下向き(dir = 0,1)のとき、画面右の敵は主人公視点の左 → pan < 0（左耳）。

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * 探索中・遠距離の定位。
 * 旧実装は relativeRight / fadeTiles で、隣接（1タイル）では pan が約±0.11にしか振れなかった。
 * 現在は方向の余弦（relativeRight / dist）で決めるため、隣接でも左右が明確に分かる。
 */
export function spatialFromTiles(hero, tx, ty, cfg) {
  const dx = tx - hero.tx;
  const dy = ty - hero.ty;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return { pan: 0, behind: false, vertical: 0, distTiles: 0 };
  // 斜め向き(1,1)でも大きさが変わらないよう正規化する
  const dl = Math.hypot(hero.dir.dx, hero.dir.dy) || 1;
  const fx = hero.dir.dx / dl;
  const fy = hero.dir.dy / dl;
  const relativeRight = (dx * -fy + dy * fx) / dist;
  const forward = (dx * fx + dy * fy) / dist;
  return {
    pan: clamp(relativeRight, -1, 1) * cfg.panStrength,
    behind: forward < -0.35, // 真横は背後扱いにしない
    vertical: Math.sign(forward),
    distTiles: dist,
  };
}

/**
 * 拘束中の定位。side は主人公から見た方向（bindSide() の分類）。
 * 'down' は主人公の前方、'back' は背面。
 */
export function spatialFromSide(side, cfg) {
  switch (side) {
    case 'left':
      return { pan: -cfg.panStrength, behind: false, vertical: 0, distTiles: 1 };
    case 'right':
      return { pan: cfg.panStrength, behind: false, vertical: 0, distTiles: 1 };
    case 'down':
      return { pan: 0, behind: false, vertical: 1, distTiles: 1 };
    case 'back':
      return { pan: 0, behind: true, vertical: -1, distTiles: 1 };
    default:
      return null;
  }
}

/** se イベントのペイロードから定位を決める。side があれば最優先、次に tx/ty。無ければ null（中央）。 */
export function resolveSpatial(payload, hero, cfg) {
  if (payload.side) {
    const s = spatialFromSide(payload.side, cfg);
    if (s) return s;
  }
  if (payload.tx != null && payload.ty != null) {
    return spatialFromTiles(hero, payload.tx, payload.ty, cfg);
  }
  return null;
}