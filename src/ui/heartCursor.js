// File: src/ui/heartCursor.js
// マウスカーソルを小さなハートにする。堕ち度（mood 0〜1）が上がるほどピンクに染まり、速く強く脈打つ。
// 敵を見つめている間（gaze 0〜1）は、さらに大きく濃く、目のような光が差す。
// CSS の cursor に、canvas で描いた PNG を data URL で渡す。絵はキャッシュし、変わったときだけ差し替える。

const SIZE = 32;
const FRAMES = 8;      // 脈の段階
const MOODS = 6;       // 色の段階
const GAZES = 3;       // 見つめの段階

function lerp(a, b, t) { return a + (b - a) * t; }

function heartPath(g, cx, cy, s) {
  g.beginPath();
  g.moveTo(cx, cy + s * 0.9);
  g.bezierCurveTo(cx - s * 0.2, cy + s * 0.7, cx - s * 1.1, cy + s * 0.1, cx - s * 1.05, cy - s * 0.35);
  g.bezierCurveTo(cx - s, cy - s, cx - s * 0.2, cy - s * 1.05, cx, cy - s * 0.45);
  g.bezierCurveTo(cx + s * 0.2, cy - s * 1.05, cx + s, cy - s, cx + s * 1.05, cy - s * 0.35);
  g.bezierCurveTo(cx + s * 1.1, cy + s * 0.1, cx + s * 0.2, cy + s * 0.7, cx, cy + s * 0.9);
  g.closePath();
}

/** 1枚描く。mood/gaze は 0〜1、beat は 0〜1（脈の膨らみ） */
export function drawHeartCursor(g, mood, gaze, beat) {
  const c = SIZE / 2;
  // 白に近い淡いピンク → 濃いピンク → 見つめると紅
  const r = 255;
  const gg = Math.round(lerp(lerp(214, 79, mood), 45, gaze));
  const b = Math.round(lerp(lerp(236, 163, mood), 134, gaze));
  const s = (6.5 + 1.5 * mood + 2.5 * gaze) * (1 + (0.06 + 0.16 * mood + 0.12 * gaze) * beat);
  g.clearRect(0, 0, SIZE, SIZE);
  g.save();
  // 光（堕ちるほど広がる）
  g.shadowColor = `rgba(255, 60, 150, ${(0.35 + 0.5 * mood + 0.3 * gaze) * (0.6 + 0.4 * beat)})`;
  g.shadowBlur = 3 + 6 * mood + 4 * gaze;
  heartPath(g, c, c + 1, s);
  g.fillStyle = `rgb(${r}, ${gg}, ${b})`;
  g.fill();
  g.shadowBlur = 0;
  g.lineWidth = 1.4;
  g.strokeStyle = 'rgba(70, 0, 40, 0.85)';
  g.stroke();
  // つや
  g.fillStyle = 'rgba(255, 255, 255, 0.75)';
  g.beginPath();
  g.ellipse(c - s * 0.45, c - s * 0.35, s * 0.22, s * 0.14, -0.6, 0, Math.PI * 2);
  g.fill();
  // 見つめているときは、中に小さなハートが灯る
  if (gaze > 0.05) {
    heartPath(g, c, c + 1, s * 0.38 * gaze);
    g.fillStyle = `rgba(255, 240, 248, ${0.5 + 0.5 * beat})`;
    g.fill();
  }
  g.restore();
}

export class HeartCursor {
  /** @param {HTMLElement} target カーソルを変える要素 */
  constructor(target) {
    this.target = target;
    this.cache = new Map();
    this.current = '';
    this.time = 0;
    this.canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (this.canvas) {
      this.canvas.width = SIZE;
      this.canvas.height = SIZE;
    }
  }

  url(moodStep, gazeStep, frame) {
    const key = `${moodStep}:${gazeStep}:${frame}`;
    let hit = this.cache.get(key);
    if (!hit) {
      const g = this.canvas.getContext('2d');
      const beat = Math.pow(Math.max(0, Math.sin((frame / FRAMES) * Math.PI)), 2);
      drawHeartCursor(g, moodStep / (MOODS - 1), gazeStep / (GAZES - 1), beat);
      hit = `url(${this.canvas.toDataURL('image/png')}) ${SIZE / 2} ${SIZE / 2}, pointer`;
      this.cache.set(key, hit);
    }
    return hit;
  }

  /** 毎フレーム。dt は実時間の秒（一時停止中も脈打つ）。visible=false なら普通のカーソル */
  update(dt, { mood = 0, gaze = 0, visible = true } = {}) {
    if (!this.canvas) return;
    if (!visible) {
      if (this.current) this.target.style.cursor = '';
      this.current = '';
      return;
    }
    // 堕ちるほど、見つめるほど、脈が速い
    const bpm = 50 + 70 * mood + 50 * gaze;
    this.time += dt * (bpm / 60);
    const frame = Math.floor((this.time % 1) * FRAMES);
    const moodStep = Math.round(Math.max(0, Math.min(1, mood)) * (MOODS - 1));
    const gazeStep = Math.round(Math.max(0, Math.min(1, gaze)) * (GAZES - 1));
    const css = this.url(moodStep, gazeStep, frame);
    if (css !== this.current) {
      this.target.style.cursor = css;
      this.current = css;
    }
  }
}
