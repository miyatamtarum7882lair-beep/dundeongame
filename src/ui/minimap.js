// File: src/ui/minimap.js
// ミニマップ（高解像度層）。見たことのある場所だけを描く。
import { TILE } from '../dungeon/generate.js';

// 高解像度層（gHires）に描く
export function drawMinimap(g, exp, B) {
  const map = exp.map;
  const s = B.explore.minimapScale;
  const w = map.w * s;
  const h = map.h * s;
  const x0 = B.render.logicalWidth - w - 16;
  const y0 = 16;

  g.save();
  g.fillStyle = 'rgba(10, 6, 20, 0.45)';
  g.fillRect(x0 - 4, y0 - 4, w + 8, h + 8);

  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      const i = y * map.w + x;
      if (!map.explored[i]) continue;
      const t = map.tiles[i];
      const seen = map.visible[i] === 1;
      if (t === TILE.WALL) {
        if (!map.edge[i]) continue;
        g.fillStyle = seen ? '#6a5a98' : '#4a4170';
      } else if (t === TILE.STAIRS) {
        g.fillStyle = '#ffd36b';
      } else {
        g.fillStyle = seen ? '#b9b0e0' : '#8f86b8';
      }
      g.fillRect(x0 + x * s, y0 + y * s, s, s);
    }
  }

  for (const u of exp.units) {
    if (u.kind === 'enemy' && !map.isVisible(u.tx, u.ty)) continue;
    g.fillStyle = u.kind === 'hero' ? '#4da3ff' : u.kind === 'ally' ? '#ffffff' : '#ff7bb5';
    const size = u.kind === 'hero' ? s + 2 : s + 1;
    g.fillRect(x0 + u.tx * s - (size - s) / 2, y0 + u.ty * s - (size - s) / 2, size, size);
  }
  g.restore();
}