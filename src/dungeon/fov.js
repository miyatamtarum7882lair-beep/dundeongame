// File: src/dungeon/fov.js
// 視界の計算。2点の間に壁がなければ見える（壁そのものは見える）。
import { lineTiles } from './gridMath.js';

function clear(map, x0, y0, x1, y1) {
  const pts = lineTiles(x0, y0, x1, y1);
  for (let i = 1; i < pts.length - 1; i++) {
    if (map.isOpaque(pts[i][0], pts[i][1])) return false;
  }
  return true;
}

// out は w*h の Uint8Array。見えるマスを 1 にする。線の向きで結果が変わらないよう、両方向を調べる
export function computeFov(map, ox, oy, radius, out) {
  out.fill(0);
  const r2 = radius * radius + 1;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > r2) continue;
      const x = ox + dx;
      const y = oy + dy;
      if (!map.inBounds(x, y)) continue;
      if (clear(map, ox, oy, x, y) || clear(map, x, y, ox, oy)) out[y * map.w + x] = 1;
    }
  }
  out[oy * map.w + ox] = 1;
}