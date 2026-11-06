// File: tools/checkDungeon.mjs
// 使い方:
//   npm run dungeon                  300シード × 3階を生成し、つながり・階段・敵の位置を確認する
//   npm run dungeon -- show 7 1      シード7の1階を文字で表示する（# 壁 . 床 > 階段 @ 開始 e 敵）
import { B } from '../src/data/balance.js';
import { generateFloor, TILE } from '../src/dungeon/generate.js';
import { FloorMap } from '../src/dungeon/floorMap.js';
import { bfsDistances } from '../src/dungeon/gridMath.js';

const [, , command, seedArg, floorArg] = process.argv;

function build(seed, floor) {
  const gen = generateFloor(seed, floor, B);
  const map = new FloorMap(gen);
  const dist = bfsDistances(map.w, map.h, (x, y) => map.isWalkable(x, y), gen.start.x, gen.start.y);
  return { gen, map, dist };
}

if (command === 'show') {
  const { gen, map } = build(Number(seedArg ?? 1), Number(floorArg ?? 1));
  const lines = [];
  for (let y = 0; y < map.h; y++) {
    let row = '';
    for (let x = 0; x < map.w; x++) {
      const t = map.tileAt(x, y);
      if (gen.enemySpawns.some((e) => e.x === x && e.y === y)) row += 'e';
      else if (x === gen.start.x && y === gen.start.y) row += '@';
      else if (t === TILE.STAIRS) row += '>';
      else if (t === TILE.FLOOR) row += '.';
      else row += map.edge[y * map.w + x] ? '#' : ' ';
    }
    lines.push(row);
  }
  console.log(lines.join('\n'));
  process.exit(0);
}

const SEEDS = 300;
const problems = [];
let rooms = 0;
let enemies = 0;
let stairsDist = 0;
let minStairs = Infinity;
let count = 0;

for (let seed = 1; seed <= SEEDS; seed++) {
  for (let floor = 1; floor <= B.dungeon.floorsPerDungeon; floor++) {
    const { gen, map, dist } = build(seed, floor);
    const at = (p) => dist[p.y * map.w + p.x];
    const tag = `シード${seed} ${floor}階`;

    if (gen.rooms.length < B.dungeon.rooms.min) problems.push(`${tag}: 部屋が少ない（${gen.rooms.length}）`);
    if (at(gen.stairs) < 0) problems.push(`${tag}: 階段に行けない`);
    if (map.tileAt(gen.stairs.x, gen.stairs.y) !== TILE.STAIRS) problems.push(`${tag}: 階段のマスがない`);
    for (const e of gen.enemySpawns) {
      if (at(e) < 0) problems.push(`${tag}: 行けない場所に敵（${e.x},${e.y}）`);
    }
    map.updateVisibility(gen.start.x, gen.start.y, B);
    if (map.visible.reduce((a, b) => a + b, 0) < 2) problems.push(`${tag}: 視界が計算できない`);

    rooms += gen.rooms.length;
    enemies += gen.enemySpawns.length;
    stairsDist += at(gen.stairs);
    minStairs = Math.min(minStairs, at(gen.stairs));
    count += 1;
  }
}

console.log(`■ ${count} 階を生成`);
console.table([{
  部屋の平均: (rooms / count).toFixed(1),
  敵の平均: (enemies / count).toFixed(1),
  階段までの歩数の平均: (stairsDist / count).toFixed(1),
  階段までの最短: minStairs,
  問題: problems.length
}]);
if (problems.length) {
  console.log(problems.slice(0, 20).join('\n'));
  process.exit(1);
}