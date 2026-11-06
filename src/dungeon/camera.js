// File: src/dungeon/camera.js
import { clampCamera, tileFeet } from './gridMath.js';

export class Camera {
  constructor(B) {
    this.B = B;
    this.x = 0;
    this.y = 0;
  }

  target(feet, map) {
    const { logicalWidth: lw, logicalHeight: lh } = this.B.render;
    const T = this.B.tile.size;
    return clampCamera(feet.x - lw / 2, feet.y - T / 2 - lh / 2, map.w * T, map.h * T, lw, lh);
  }

  snap(feet, map) {
    const t = this.target(feet, map);
    this.x = t.x;
    this.y = t.y;
  }

  // dtSec は共通タイマーの値（ポーズ中は 0）
  update(dtSec, feet, map) {
    const t = this.target(feet, map);
    const follow = this.B.explore.cameraFollow;
    if (follow <= 0) {
      this.x = t.x;
      this.y = t.y;
      return;
    }
    const k = 1 - Math.exp(-follow * dtSec);
    this.x += (t.x - this.x) * k;
    this.y += (t.y - this.y) * k;
  }
}

export { tileFeet };