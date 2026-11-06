// File: src/dungeon/floorMap.js
// 1つの階の地図。壁・床・階段と、見たことのある場所、いま見えている場所を持つ。
import { TILE } from './generate.js';
import { computeFov } from './fov.js';

export class FloorMap {
  constructor(gen) {
    this.w = gen.w;
    this.h = gen.h;
    this.tiles = gen.tiles;
    this.rooms = gen.rooms;
    this.start = gen.start;
    this.stairs = gen.stairs;
    this.explored = new Uint8Array(this.w * this.h);
    this.visible = new Uint8Array(this.w * this.h);

    // 床に接している壁だけを描く（奥の壁は描かない）
    this.edge = new Uint8Array(this.w * this.h);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.tiles[y * this.w + x] !== TILE.WALL) continue;
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (this.tileAt(x + dx, y + dy) !== TILE.WALL) {
              near = true;
              break;
            }
          }
        }
        if (near) this.edge[y * this.w + x] = 1;
      }
    }
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  tileAt(x, y) {
    return this.inBounds(x, y) ? this.tiles[y * this.w + x] : TILE.WALL;
  }

  isWalkable(x, y) {
    return this.tileAt(x, y) !== TILE.WALL;
  }

  isOpaque(x, y) {
    return this.tileAt(x, y) === TILE.WALL;
  }

  isVisible(x, y) {
    return this.inBounds(x, y) && this.visible[y * this.w + x] === 1;
  }

  roomAt(x, y) {
    return this.rooms.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) ?? null;
  }

  // 主人公が動くたびに呼ぶ
  updateVisibility(hx, hy, B) {
    computeFov(this, hx, hy, B.dungeon.fovRadius, this.visible);
    if (B.dungeon.roomLit) {
      const room = this.roomAt(hx, hy);
      if (room) {
        for (let y = room.y - 1; y <= room.y + room.h; y++) {
          for (let x = room.x - 1; x <= room.x + room.w; x++) {
            if (this.inBounds(x, y)) this.visible[y * this.w + x] = 1;
          }
        }
      }
    }
    for (let i = 0; i < this.visible.length; i++) {
      if (this.visible[i]) this.explored[i] = 1;
    }
  }
}