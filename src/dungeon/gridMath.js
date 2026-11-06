// File: src/dungeon/gridMath.js
// マス目に関する計算。画面に依存しない。
import { clamp } from '../core/util.js';

export const DIRS8 = [
  { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 0 }, { dx: 1, dy: 1 },
  { dx: 0, dy: 1 }, { dx: -1, dy: 1 }, { dx: -1, dy: 0 }, { dx: -1, dy: -1 }
];

// 入力のアクション名 → [dx, dy]
export const ACTION_DIRS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
  upLeft: [-1, -1],
  upRight: [1, -1],
  downLeft: [-1, 1],
  downRight: [1, 1]
};

export const chebyshev = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

// 1歩進めるか。斜めは、角の2マスが両方とも通れるときだけ
export function canStep(isWalkable, x, y, dx, dy) {
  if (!isWalkable(x + dx, y + dy)) return false;
  if (dx !== 0 && dy !== 0) {
    if (!isWalkable(x + dx, y) || !isWalkable(x, y + dy)) return false;
  }
  return true;
}

// (sx, sy) からの歩数。行けない場所は -1
export function bfsDistances(w, h, isWalkable, sx, sy) {
  const dist = new Int16Array(w * h).fill(-1);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  dist[sy * w + sx] = 0;
  queue[tail++] = sy * w + sx;
  while (head < tail) {
    const idx = queue[head++];
    const x = idx % w;
    const y = (idx - x) / w;
    for (const d of DIRS8) {
      const nx = x + d.dx;
      const ny = y + d.dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (dist[ny * w + nx] !== -1) continue;
      if (!canStep(isWalkable, x, y, d.dx, d.dy)) continue;
      dist[ny * w + nx] = dist[idx] + 1;
      queue[tail++] = ny * w + nx;
    }
  }
  return dist;
}

// 2点を結ぶ線上のマス（両端を含む）
export function lineTiles(x0, y0, x1, y1) {
  const pts = [];
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    pts.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  return pts;
}

// マス (tx, ty) の足元の中心（ピクセル）。小数のマス座標も使える
export function tileFeet(tx, ty, T) {
  return { x: tx * T + T / 2, y: ty * T + T };
}

// 足元の y から、描画の行を求める。ちょうどマスの下端にいるときは、そのマスの行
export function depthRow(feetY, T) {
  return Math.ceil(feetY / T - 1e-6) - 1;
}

// カメラの位置を、マップの内側に収める。マップが画面より小さいときは中央に置く
export function clampCamera(cx, cy, mapPxW, mapPxH, lw, lh) {
  return {
    x: mapPxW <= lw ? (mapPxW - lw) / 2 : clamp(cx, 0, mapPxW - lw),
    y: mapPxH <= lh ? (mapPxH - lh) / 2 : clamp(cy, 0, mapPxH - lh)
  };
}

// 画面に入るマスの範囲。下は、キャラの頭が見える分を1行足す
export function visibleRange(camX, camY, lw, lh, T, mapW, mapH) {
  return {
    x0: Math.max(0, Math.floor(camX / T)),
    x1: Math.min(mapW - 1, Math.floor((camX + lw - 1) / T)),
    y0: Math.max(0, Math.floor(camY / T)),
    y1: Math.min(mapH - 1, Math.floor((camY + lh - 1) / T) + 1)
  };
}