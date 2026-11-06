// File: src/ui/battleFx.js
// 戦闘の演出。Combat の 'fx' イベントを受けて、高解像度層に描く。座標はワールド座標（ドット層と同じ）。
import { clamp01 } from '../core/util.js';

const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const STYLE_COLORS = { enemy: '#ffffff', hero: '#ff6b8a', heal: '#9bffb8', mp: '#8fe3ff', info: '#ffd36b' };

function makeParticles(n, speedLo, speedHi, sizeLo, sizeHi, colors, base = 0, spread = Math.PI * 2) {
  return Array.from({ length: n }, () => {
    const a = base + (Math.random() - 0.5) * spread;
    const s = rand(speedLo, speedHi);
    return {
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      size: rand(sizeLo, sizeHi),
      color: colors[Math.floor(Math.random() * colors.length)]
    };
  });
}

// ---- 描画（it.age は経過秒、t は 0〜1 の進み具合）----
function drawDamage(g, it, t) {
  const rise = 48 * (1 - Math.pow(1 - t, 2));
  const pop = t < 0.12 ? 0.6 + (t / 0.12) * 0.6 : 1.2 - 0.2 * clamp01((t - 0.12) / 0.1);
  const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
  g.save();
  g.translate(it.x + it.dx, it.y - rise);
  g.scale(pop, pop);
  g.globalAlpha = alpha;
  g.font = it.font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 5;
  g.strokeStyle = 'rgba(0, 0, 0, 0.9)';
  g.fillStyle = it.color;
  g.strokeText(it.text, 0, 0);
  g.fillText(it.text, 0, 0);
  g.restore();
}

function drawSlash(g, it, t) {
  const p = 1 - Math.pow(1 - clamp01(t * 1.6), 3);
  g.save();
  g.globalAlpha = 0.35 * (1 - t);
  g.strokeStyle = '#dff2ff';
  g.lineCap = 'round';
  g.lineWidth = 12 * (1 - t) + 2;
  g.beginPath();
  g.arc(it.cx, it.cy, it.r, it.base - 1.0, it.base - 1.0 + 2.0 * p);
  g.stroke();
  g.restore();
}

function drawImpact(g, it, t) {
  const s = (0.6 + 0.7 * t) * it.size;
  g.save();
  g.translate(it.x, it.y);
  g.rotate(it.rot);
  g.globalAlpha = 0.45 * (1 - t);
  g.fillStyle = '#fff0b8';
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? s : s * 0.38;
    const a = (i * Math.PI) / 8;
    if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  g.restore();
}

function drawParticles(g, it, t) {
  g.save();
  g.globalAlpha = it.alpha * (1 - t);
  for (const p of it.parts) {
    const x = it.x + p.vx * it.age;
    const y = it.y + p.vy * it.age + 0.5 * it.gravity * it.age * it.age;
    g.fillStyle = p.color;
    g.beginPath();
    g.arc(x, y, p.size * (1 - t * 0.5), 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

function drawBreath(g, it) {
  g.save();
  g.fillStyle = '#ff9ccf';
  for (const p of it.puffs) {
    const local = it.age - p.d;
    if (local < 0 || local > p.life) continue;
    const k = local / p.life;
    g.globalAlpha = 0.3 * (1 - k);
    g.beginPath();
    g.arc(it.x + p.vx * local, it.y + p.vy * local, p.r0 + (p.r1 - p.r0) * k, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

function drawRing(g, it, t) {
  g.save();
  g.globalAlpha = 0.35 * (1 - t);
  g.strokeStyle = '#cfe8ff';
  g.lineWidth = 4 * (1 - t) + 1;
  g.beginPath();
  g.arc(it.x, it.y, 10 + (it.r - 10) * (1 - Math.pow(1 - t, 2)), 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

const DRAWERS = {
  damage: drawDamage,
  slash: drawSlash,
  impact: drawImpact,
  particles: drawParticles,
  breath: drawBreath,
  ring: drawRing
};

export class BattleFx {
  // hearts: HeartFx / kissMarks: KissMarkLayer / getCam: () => { x, y } / getSettings: () => settings
  constructor(B, { hearts, kissMarks, getCam, getSettings }) {
    this.B = B;
    this.cfg = B.fx;
    this.fontFamily = B.ui.fontFamily;
    this.hearts = hearts;
    this.kissMarks = kissMarks;
    this.getCam = getCam;
    this.getSettings = getSettings;
    this.items = [];
    this.pending = [];
    this.shake = null;
    this.tint = null;
    this.sinceTint = Infinity;
    this.offset = { x: 0, y: 0 };   // 画面の揺れ。ドット層の描画にも渡す
  }

  get reduced() {
    return this.getSettings().flashback === 'reduced';
  }

  // ワールド座標 → 画面の論理座標
  toScreen(wx, wy) {
    const cam = this.getCam();
    return { x: wx - Math.round(cam.x + this.offset.x), y: wy - Math.round(cam.y + this.offset.y) };
  }

  handle(e) {
    this.pending.push({ t: e.delay ?? 0, fn: () => this.fire(e) });
  }

  fire(e) {
    const c = this.cfg;
    switch (e.type) {
      case 'damage':
        this.items.push({
          kind: 'damage', x: e.x, y: e.y, dx: rand(-8, 8), text: e.text,
          color: STYLE_COLORS[e.style] ?? '#ffffff',
          font: `bold ${e.big ? 30 : 24}px ${this.fontFamily}`, age: 0, life: 0.95
        });
        break;
      case 'slash': {
        const len = Math.hypot(e.dx, e.dy) || 1;
        this.items.push({
          kind: 'slash', cx: e.x - (e.dx / len) * 30, cy: e.y - (e.dy / len) * 30,
          r: 58, base: Math.atan2(e.dy, e.dx), age: 0, life: 0.24
        });
        break;
      }
      case 'impact':
        this.items.push({ kind: 'impact', x: e.x, y: e.y, size: e.size ?? 34, rot: rand(0, 1), age: 0, life: 0.22 });
        break;
      case 'sparks':
        this.items.push({
          kind: 'particles', x: e.x, y: e.y, gravity: 380, alpha: 1, age: 0, life: 0.38,
          parts: makeParticles(e.count ?? 8, 90, 240, 2, 4, [e.color ?? '#fff0b8', '#ffffff'])
        });
        break;
      case 'poof':
        this.items.push({
          kind: 'particles', x: e.x, y: e.y, gravity: -70, alpha: 0.8, age: 0, life: 0.75,
          parts: makeParticles(16, 50, 190, 4, 10, ['#ff9ccf', '#ffd36b', '#ffffff'])
        });
        break;
      case 'sparkle':
        this.items.push({
          kind: 'particles', x: e.x, y: e.y, gravity: -20, alpha: 0.9, age: 0, life: 0.95,
          parts: makeParticles(12, 20, 70, 2, 4, [e.color ?? '#b8ffcf', '#ffffff', '#ffd36b'], -Math.PI / 2, Math.PI)
        });
        break;
      case 'ring':
        this.items.push({ kind: 'ring', x: e.x, y: e.y, r: e.r ?? 50, age: 0, life: 0.32 });
        break;
      case 'breath': {
        const dx = e.to.x - e.from.x;
        const dy = e.to.y - e.from.y;
        const len = Math.hypot(dx, dy) || 1;
        const puffs = Array.from({ length: 9 }, (_, i) => {
          const sp = rand(120, 190);
          return {
            d: i * 0.05, life: 0.65,
            vx: (dx / len) * sp + rand(-20, 20), vy: (dy / len) * sp + rand(-20, 20),
            r0: 8, r1: rand(26, 40)
          };
        });
        this.items.push({ kind: 'breath', x: e.from.x, y: e.from.y, puffs, age: 0, life: 1.1 });
        break;
      }
      case 'hearts': {
        if (this.reduced) break;
        const s = this.toScreen(e.x, e.y);
        this.hearts.burst({ x: s.x, y: s.y, count: e.count ?? 8, size: e.size ?? 1, color: e.color });
        break;
      }
      case 'bindHeartWave': {
        if (this.reduced) break;
        const s = this.toScreen(e.x, e.y);
        this.hearts.bindHeartWave({ x: s.x, y: s.y, color: e.color });
        break;
      }
      case 'stream': {
        if (this.reduced) break;
        this.hearts.stream({
          from: this.toScreen(e.from.x, e.from.y),
          to: this.toScreen(e.to.x, e.to.y),
          count: e.count ?? 12, size: e.size ?? 0.55, durSec: e.durSec ?? 0.5, arcPx: e.arcPx ?? 60
        });
        break;
      }
      case 'heartProjectile': {
        if (this.reduced) break;
        this.hearts.projectile({
          from: this.toScreen(e.from.x, e.from.y),
          to: this.toScreen(e.to.x, e.to.y),
          durSec: e.durSec ?? 0.8,
          arcPx: e.arcPx ?? 80,
          size: e.size ?? 1
        });
        break;
      }
      case 'kiss':
        if (this.getSettings().kissMarks !== false) {
          const point = Number.isFinite(e.x) && Number.isFinite(e.y)
            ? this.toScreen(e.x, e.y)
            : null;
          this.kissMarks.stamp({
            target: 'screen',
            dir: { dx: e.dx, dy: e.dy },
            x: point?.x,
            y: point?.y
          });
        }
        break;
      case 'tint':
        if (!this.reduced && this.sinceTint >= c.tintMinSec) {
          this.tint = { age: 0 };
          this.sinceTint = 0;
        }
        break;
      case 'shake':
        if (!this.reduced && this.getSettings().screenShake !== false) {
          this.shake = { age: 0, amp: c.shake.px * (e.power ?? 1) };
        }
        break;
      default:
        break;
    }
  }

  // dtSec は共通タイマーの値（ポーズ中は 0）
  update(dtSec) {
    const c = this.cfg;
    for (const p of this.pending) p.t -= dtSec;
    const ready = this.pending.filter((p) => p.t <= 0);
    this.pending = this.pending.filter((p) => p.t > 0);
    for (const p of ready) p.fn();

    for (const it of this.items) it.age += dtSec;
    this.items = this.items.filter((it) => it.age < it.life);

    this.sinceTint += dtSec;
    if (this.tint) {
      this.tint.age += dtSec;
      if (this.tint.age >= c.tintSec) this.tint = null;
    }
    if (this.shake) {
      this.shake.age += dtSec;
      if (this.shake.age >= c.shake.sec) this.shake = null;
    }
    if (this.shake) {
      const k = 1 - this.shake.age / c.shake.sec;
      const t = this.shake.age;
      this.offset = { x: Math.sin(t * 90) * this.shake.amp * k, y: Math.cos(t * 73) * this.shake.amp * k * 0.6 };
    } else {
      this.offset = { x: 0, y: 0 };
    }
  }

  // 画面の端を桃色にする膜。ゆっくり出て、一方向に薄れる（点滅しない）
  drawTint(g) {
    if (!this.tint) return;
    const c = this.cfg;
    const { logicalWidth: lw, logicalHeight: lh } = this.B.render;
    const t = this.tint.age / c.tintSec;
    const alpha = c.tintAlpha * (1 - t) * Math.min(1, this.tint.age / 0.15);
    const grad = g.createRadialGradient(lw / 2, lh / 2, lh * 0.3, lw / 2, lh / 2, lh * 0.95);
    grad.addColorStop(0, 'rgba(255, 120, 180, 0)');
    grad.addColorStop(1, `rgba(255, 120, 180, ${alpha})`);
    g.save();
    g.fillStyle = grad;
    g.fillRect(0, 0, lw, lh);
    g.restore();
  }

  // ワールド座標の演出（ダメージ数字・斬撃・火花など）
  drawWorld(g) {
    const cam = this.getCam();
    g.save();
    g.translate(-Math.round(cam.x + this.offset.x), -Math.round(cam.y + this.offset.y));
    for (const it of this.items) DRAWERS[it.kind]?.(g, it, it.age / it.life);
    g.restore();
  }
}