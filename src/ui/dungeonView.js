// File: src/ui/dungeonView.js
// ダンジョンの描画（ドット層）。床 → 壁とキャラ（奥の行から手前の行へ）の順に描く。
import { SpriteActor } from './spriteActor.js';
import { loadSpriteSheet } from './spriteSheet.js';
import { TILE } from '../dungeon/generate.js';
import { tileFeet, depthRow, visibleRange } from '../dungeon/gridMath.js';

const COLORS = {
  floorA: '#2a2540',
  floorB: '#241f38',
  wallTop: '#6a5a98',
  wallFace: '#3b3158',
  wallLine: '#2c2442',
  wallFlat: '#4a3f6e',
  wallFlatInner: '#54487a',
  dim: 'rgba(0, 0, 0, 0.55)'
};
const STAIR_SHADES = ['#e6d28f', '#c9b46d', '#a8944f', '#857535'];

export class DungeonView {
  constructor(B) {
    this.B = B;
    this.views = new Map();   // ユニットID → SpriteActor
    this.overlays = [];
  }

  preload(ids) {
    return Promise.all(ids.map((id) => loadSpriteSheet(id)));
  }

  viewFor(unit) {
    let v = this.views.get(unit.id);
    if (!v) {
      v = new SpriteActor({ id: unit.spriteId, name: unit.name, x: 0, y: 0, speed: 0, color: unit.color });
      this.views.set(unit.id, v);
    }
    return v;
  }

  // dtSec は共通タイマーの値（ポーズ中は 0）
  update(dtSec, exp) {
    const alive = new Set(exp.units.map((u) => u.id));
    for (const id of [...this.views.keys()]) {
      if (!alive.has(id)) this.views.delete(id);
    }
    for (const u of exp.units) {
      const v = this.viewFor(u);
      v.moving = u.walkLinger > 0;
      v.face(u.dir.dx, u.dir.dy);
      v.update(dtSec);
    }
  }

  drawFloor(g, x, y, stairs) {
    const T = this.B.tile.size;
    const px = x * T;
    const py = y * T;
    g.fillStyle = (x + y) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
    g.fillRect(px, py, T, T);
    if (!stairs) return;
    for (let i = 0; i < STAIR_SHADES.length; i++) {
      g.fillStyle = STAIR_SHADES[i];
      g.fillRect(px + 8 + i * 3, py + 8 + i * 13, T - 16 - i * 6, 9);
    }
  }

  drawWall(g, x, y, face) {
    const T = this.B.tile.size;
    const px = x * T;
    const py = y * T;
    if (face) {
      g.fillStyle = COLORS.wallFace;
      g.fillRect(px, py, T, T);
      g.fillStyle = COLORS.wallTop;
      g.fillRect(px, py, T, 18);
      g.fillStyle = COLORS.wallLine;
      g.fillRect(px, py + 18, T, 2);
      g.fillRect(px, py + 41, T, 2);
      g.fillRect(px + (y % 2 ? 20 : 42), py + 20, 2, 21);
      g.fillRect(px + (y % 2 ? 42 : 20), py + 43, 2, 21);
    } else {
      g.fillStyle = COLORS.wallFlat;
      g.fillRect(px, py, T, T);
      g.fillStyle = COLORS.wallFlatInner;
      g.fillRect(px + 4, py + 4, T - 8, T - 8);
    }
  }

  dim(g, x, y) {
    const T = this.B.tile.size;
    g.fillStyle = COLORS.dim;
    g.fillRect(x * T, y * T, T, T);
  }

  // ドット層（gPixel）に描く。shake は BattleFx の画面の揺れ
  draw(g, exp, shake = { x: 0, y: 0 }) {
    const B = this.B;
    const T = B.tile.size;
    const { logicalWidth: lw, logicalHeight: lh } = B.render;
    const map = exp.map;
    const camX = Math.round(exp.camera.x + shake.x);
    const camY = Math.round(exp.camera.y + shake.y);
    const { x0, x1, y0, y1 } = visibleRange(camX, camY, lw, lh, T, map.w, map.h);
    const p = exp.progress();
    this.overlays = [];

    g.save();
    g.translate(-camX, -camY);

    // 1. 床と階段
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * map.w + x;
        if (!map.explored[i]) continue;
        const t = map.tiles[i];
        if (t === TILE.WALL) continue;
        this.drawFloor(g, x, y, t === TILE.STAIRS);
        if (!map.visible[i]) this.dim(g, x, y);
      }
    }

    // 2. キャラを、足元の行ごとに分ける
    const rows = new Map();
    for (const u of exp.units) {
      const seen = u.kind !== 'enemy' || map.isVisible(u.tx, u.ty) || map.isVisible(u.fromX, u.fromY);
      if (!seen) continue;
      const r = u.renderTile(p);
      const feet = tileFeet(r.x, r.y, T);
      const row = depthRow(feet.y, T);
      if (!rows.has(row)) rows.set(row, []);
      rows.get(row).push({ unit: u, feet });
    }

    // 3. 奥の行から手前の行へ。各行で、壁 → キャラの順に描く
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * map.w + x;
        if (!map.explored[i] || map.tiles[i] !== TILE.WALL || !map.edge[i]) continue;
        this.drawWall(g, x, y, map.tileAt(x, y + 1) !== TILE.WALL);
        if (!map.visible[i]) this.dim(g, x, y);
      }
      const list = rows.get(y);
      if (!list) continue;
      list.sort((a, b) => a.feet.y - b.feet.y);
      for (const d of list) {
        const v = this.viewFor(d.unit);
        v.x = d.feet.x;
        v.y = d.feet.y;
        v.draw(g);
        if (d.unit.kind === 'enemy') {
          this.overlays.push({ unit: d.unit, x: d.feet.x - camX, y: d.feet.y - camY });
        }
      }
    }
    g.restore();
  }
}