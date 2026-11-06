// File: src/dungeon/generate.js
// 部屋と通路のダンジョン生成。同じ seed と floor なら、必ず同じ階になる。
import { mulberry32 } from '../core/util.js';
import { bfsDistances } from './gridMath.js';

export const TILE = { WALL: 0, FLOOR: 1, STAIRS: 2 };

function overlaps(a, b, margin) {
  return (
    a.x - margin < b.x + b.w && a.x + a.w + margin > b.x &&
    a.y - margin < b.y + b.h && a.y + a.h + margin > b.y
  );
}

const centerOf = (room) => ({
  x: room.x + Math.floor(room.w / 2),
  y: room.y + Math.floor(room.h / 2)
});

export function generateFloor(seed, floor, B) {
  const D = B.dungeon;
  const w = D.width;
  const h = D.height;
  const rnd = mulberry32((seed ^ Math.imul(floor + 1, 0x9e3779b1)) >>> 0);
  const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const tiles = new Uint8Array(w * h);   // 0 = 壁

  const carve = (x, y) => {
    if (x > 0 && y > 0 && x < w - 1 && y < h - 1) tiles[y * w + x] = TILE.FLOOR;
  };

  // 1. 部屋を置く
  const rooms = [];
  for (let round = 0; round < 10 && rooms.length < D.rooms.min; round++) {
    for (let i = 0; i < D.rooms.attempts && rooms.length < D.rooms.max; i++) {
      const rw = ri(D.rooms.minSize, D.rooms.maxSize);
      const rh = ri(D.rooms.minSize, D.rooms.maxSize);
      const room = { x: ri(2, w - rw - 3), y: ri(2, h - rh - 3), w: rw, h: rh };
      if (rooms.some((r) => overlaps(room, r, 2))) continue;
      rooms.push(room);
      for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) carve(x, y);
      }
    }
  }

  // 2. 通路でつなぐ（左から順に全部つなぎ、さらに少しループを作る）
  const hLine = (x0, x1, y) => {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) carve(x, y);
  };
  const vLine = (y0, y1, x) => {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) carve(x, y);
  };
  const connect = (a, b) => {
    const ca = centerOf(a);
    const cb = centerOf(b);
    if (rnd() < 0.5) {
      hLine(ca.x, cb.x, ca.y);
      vLine(ca.y, cb.y, cb.x);
    } else {
      vLine(ca.y, cb.y, ca.x);
      hLine(ca.x, cb.x, cb.y);
    }
  };
  const order = [...rooms].sort((a, b) => centerOf(a).x - centerOf(b).x);
  for (let i = 1; i < order.length; i++) connect(order[i - 1], order[i]);
  const extra = Math.floor(rooms.length * D.extraCorridorRate);
  for (let i = 0; i < extra; i++) {
    const a = rooms[ri(0, rooms.length - 1)];
    const b = rooms[ri(0, rooms.length - 1)];
    if (a !== b) connect(a, b);
  }

  // 3. 開始位置と階段
  const walkable = (x, y) => x >= 0 && y >= 0 && x < w && y < h && tiles[y * w + x] !== TILE.WALL;
  const startRoom = rooms[ri(0, rooms.length - 1)];
  const start = centerOf(startRoom);
  const dist = bfsDistances(w, h, walkable, start.x, start.y);

  const inStartRoom = (x, y) =>
    x >= startRoom.x && x < startRoom.x + startRoom.w && y >= startRoom.y && y < startRoom.y + startRoom.h;
  const cells = [];
  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (dist[y * w + x] >= 0) cells.push({ x, y, d: dist[y * w + x], start: inStartRoom(x, y) });
      }
    }
  }
  const far = cells.filter((c) => !c.start);
  const pool = far.length ? far : cells;
  const maxD = Math.max(...pool.map((c) => c.d));
  const candidates = pool.filter((c) => c.d >= maxD * 0.85);
  const stairs = candidates[ri(0, candidates.length - 1)];
  tiles[stairs.y * w + stairs.x] = TILE.STAIRS;

  // 4. 敵の初期位置（開始位置から離れた、部屋の中）
  const spawnPool = cells.filter(
    (c) => !c.start && c.d >= D.enemyMinDistance && !(c.x === stairs.x && c.y === stairs.y)
  );
  const count = Math.min(ri(D.enemiesPerFloor.min, D.enemiesPerFloor.max), spawnPool.length);
  const enemySpawns = [];
  for (let i = 0; i < count; i++) {
    const k = ri(0, spawnPool.length - 1);
    const c = spawnPool.splice(k, 1)[0];
    enemySpawns.push({ x: c.x, y: c.y, species: D.enemySpecies[ri(0, D.enemySpecies.length - 1)] });
  }

  return { w, h, tiles, rooms, start, stairs: { x: stairs.x, y: stairs.y }, enemySpawns };
}