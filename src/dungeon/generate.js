// File: src/dungeon/generate.js
// 部屋と通路のダンジョン生成。同じ seed と floor なら、必ず同じ階になる。
// 複数の敵に囲まれやすいよう、大広間・広めの部屋・幅2〜3マスの通路で作る。敵は数体ずつの群れで置く。
import { mulberry32 } from '../core/util.js';
import { ENEMIES_BY_ID } from '../data/enemies.js';
import { relatedSpecies } from '../data/enemyGroups.js';
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

// その階に出る敵の種族を、ランクの重み（とデバッグの上書き）で選ぶ。rnd は 0〜1 を返す関数
export function speciesPicker(floor, B, enemySpawnWeights = {}) {
  const D = B.dungeon;
  const rankWeights = D.enemyRankWeightByFloor[Math.min(Math.max(1, floor), D.floorsPerDungeon)];
  const weighted = D.enemySpecies.map((species) => ({
    species,
    weight: Math.max(0, Number(enemySpawnWeights[species]
      ?? rankWeights[ENEMIES_BY_ID[species]?.rank] ?? 0) || 0)
  })).filter((entry) => entry.weight > 0);
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  return {
    total,
    pick(rnd) {
      let roll = rnd() * total;
      for (const entry of weighted) {
        roll -= entry.weight;
        if (roll < 0) return entry.species;
      }
      return weighted.at(-1)?.species;
    },
    // 群れの仲間を選ぶ：B.dungeon.relatedPackChance の確率で、群れの頭と関連のある種族（同じまとまり）から
    pickRelated(leaderSpecies, rnd, chance) {
      const allowed = new Set(weighted.map((e) => e.species));
      const related = relatedSpecies(leaderSpecies).filter((s) => allowed.has(s));
      if (related.length && rnd() < chance) return related[Math.floor(rnd() * related.length)];
      return this.pick(rnd);
    }
  };
}

export function generateFloor(seed, floor, B, enemySpawnWeights = {}) {
  const D = B.dungeon;
  const w = D.width;
  const h = D.height;
  const rnd = mulberry32((seed ^ Math.imul(floor + 1, 0x9e3779b1)) >>> 0);
  const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const tiles = new Uint8Array(w * h);   // 0 = 壁

  const carve = (x, y) => {
    if (x > 0 && y > 0 && x < w - 1 && y < h - 1) tiles[y * w + x] = TILE.FLOOR;
  };

  // 1. 部屋を置く。先に大広間、そのあと普通の部屋
  const rooms = [];
  const halls = ri(D.halls.min, D.halls.max);
  for (let i = 0; i < D.rooms.attempts && rooms.filter((r) => r.hall).length < halls; i++) {
    const rw = ri(D.halls.minW, D.halls.maxW);
    const rh = ri(D.halls.minH, D.halls.maxH);
    const room = { x: ri(2, w - rw - 3), y: ri(2, h - rh - 3), w: rw, h: rh, hall: true };
    if (rooms.some((r) => overlaps(room, r, 3))) continue;
    rooms.push(room);
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) carve(x, y);
    }
  }
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

  // 2. 通路でつなぐ（左から順に全部つなぎ、さらにループを作る）。通路は幅 cw マス
  const hLine = (x0, x1, y, cw) => {
    for (let dy = 0; dy < cw; dy++) {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1) + cw - 1; x++) carve(x, y + dy);
    }
  };
  const vLine = (y0, y1, x, cw) => {
    for (let dx = 0; dx < cw; dx++) {
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1) + cw - 1; y++) carve(x + dx, y);
    }
  };
  const connect = (a, b) => {
    const ca = centerOf(a);
    const cb = centerOf(b);
    const cw = ri(D.corridorWidth.min, D.corridorWidth.max);
    if (rnd() < 0.5) {
      hLine(ca.x, cb.x, ca.y, cw);
      vLine(ca.y, cb.y, cb.x, cw);
    } else {
      vLine(ca.y, cb.y, ca.x, cw);
      hLine(ca.x, cb.x, cb.y, cw);
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

  // 4. 敵の初期位置（開始位置から離れた、部屋の中）。数体ずつの群れで置く
  const spawnPool = cells.filter(
    (c) => !c.start && c.d >= D.enemyMinDistance && !(c.x === stairs.x && c.y === stairs.y)
  );
  const perFloor = D.enemiesPerFloor;
  const deeper = (Math.min(Math.max(1, floor), D.floorsPerDungeon) - 1) * (perFloor.perFloor ?? 0);
  const count = Math.min(ri(perFloor.min + deeper, perFloor.max + deeper), spawnPool.length);
  const enemySpawns = [];
  const species = speciesPicker(floor, B, enemySpawnWeights);
  const pickSpecies = () => species.pick(rnd);
  const taken = new Set();
  while (species.total > 0 && enemySpawns.length < count && spawnPool.length > 0) {
    const leader = spawnPool.splice(ri(0, spawnPool.length - 1), 1)[0];
    if (taken.has(leader.y * w + leader.x)) continue;
    const pack = [leader];
    const size = Math.min(count - enemySpawns.length, ri(D.packSize.min, D.packSize.max));
    const near = spawnPool.filter((c) => Math.max(Math.abs(c.x - leader.x), Math.abs(c.y - leader.y)) <= D.packRadius);
    while (pack.length < size && near.length > 0) pack.push(near.splice(ri(0, near.length - 1), 1)[0]);
    // 群れの頭を選び、仲間は関連のある敵が多くなるようにする（連携攻撃・絆のこすり合わせが起きやすい）
    let packLeader = null;
    for (const c of pack) {
      const key = c.y * w + c.x;
      if (taken.has(key)) continue;
      taken.add(key);
      const sp = packLeader ? species.pickRelated(packLeader, rnd, D.relatedPackChance ?? 0) : pickSpecies();
      packLeader ??= sp;
      enemySpawns.push({ x: c.x, y: c.y, species: sp });
    }
  }

  return { w, h, tiles, rooms, start, stairs: { x: stairs.x, y: stairs.y }, enemySpawns };
}

// 回想部屋の模擬戦用：ひと部屋だけのアリーナ。主人公は中央寄りの左、敵は画面に収まる距離に二人ずつ並ぶ
// （隣り合った二人は、絆のこすり合わせが起きやすい）
export function generateArena(count, { w = 22, h = 15 } = {}) {
  const tiles = new Uint8Array(w * h);
  const room = { x: 3, y: 2, w: w - 6, h: h - 4 };
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) tiles[y * w + x] = TILE.FLOOR;
  }
  const start = { x: room.x + 3, y: room.y + Math.floor(room.h / 2) };
  const stairs = { x: room.x, y: room.y };   // 左上の階段 = 回想を終える出口
  tiles[stairs.y * w + stairs.x] = TILE.STAIRS;
  // 二人組の置き場所（主人公から 5〜8 マス）
  const slots = [[6, -2], [7, -2], [6, 2], [7, 2], [9, 0], [10, 0]];
  const enemySpawns = [];
  for (let i = 0; i < count; i++) {
    const [dx, dy] = slots[i % slots.length];
    enemySpawns.push({ x: Math.min(room.x + room.w - 1, start.x + dx), y: start.y + dy + Math.floor(i / slots.length), index: i });
  }
  return { w, h, tiles, rooms: [room], start, stairs, enemySpawns };
}
