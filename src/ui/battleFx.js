// File: src/ui/battleFx.js
// 戦闘の演出。Combat の 'fx' イベントを受けて、高解像度層に描く。座標はワールド座標（ドット層と同じ）。
//
// 種類（e.type）:
//   damage / slash / impact / sparks / poof / sparkle / ring / breath   … 従来の演出
//   hearts / bindHeartWave / stream / heartProjectile / kiss            … HeartFx・KissMarkLayer へ渡す
//   tint / shake                                                       … 画面の桃色の膜・揺れ
//   burst     一点から飛び散る粒子（shape: heart/star/petal/note/ribbon/lips/bubble/fluff/streak/dot）
//   swirl     中心のまわりを回る粒子（r0 → r1。吸い込み・広がり）
//   flow      from から to へ流れる粒子
//   cloud     色つきの霧・吐息
//   glyph     足元の魔法陣（style: heart/ribbon/fox/star）
//   telegraph 予告線 / tileMark 予告マス
//   callout   大きな文字 / bubble 吹き出し
//   wash      画面全体の色（mode: edge/full） / speedLines 集中線 / flash 閃光
import { clamp01 } from '../core/util.js';
import { drawShape, drawGlyphCore } from './fxShapes.js';
import { expPopupStyle, expPopupText } from './expPopupStyle.js';

const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const STYLE_COLORS = { enemy: '#ffffff', hero: '#ff6b8a', heal: '#9bffb8', mp: '#8fe3ff', info: '#ffd36b', exp: '#b77cff' };

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
  g.fillStyle = it.color;
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
  g.fillStyle = it.color;
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
  const r = 10 + (it.r - 10) * (1 - Math.pow(1 - t, 2));
  g.save();
  g.translate(it.x, it.y);
  g.scale(1, it.squash);
  g.globalAlpha = it.alpha * (1 - t);
  if (it.glow) g.globalCompositeOperation = 'lighter';
  g.strokeStyle = it.color;
  g.lineWidth = it.width * (1 - t) + 1;
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.stroke();
  if (it.fill) {
    g.globalAlpha = it.alpha * 0.25 * (1 - t);
    g.fillStyle = it.color;
    g.fill();
  }
  g.restore();
}

// ---- 追加の演出（粒子・魔法陣・文字など）----
const easeOut = (t) => 1 - Math.pow(1 - t, 2);
const fadeInOut = (t, inT = 0.12, outT = 0.35) =>
  Math.max(0, Math.min(1, t / Math.max(1e-6, inT), (1 - t) / Math.max(1e-6, outT)));

function partAlpha(local, life, fadeIn) {
  const k = local / life;
  return Math.max(0, Math.min(1, fadeIn > 0 ? local / fadeIn : 1, (1 - k) / 0.45));
}

function drawMotes(g, it) {
  g.save();
  if (it.glow) g.globalCompositeOperation = 'lighter';
  for (const p of it.parts) {
    const local = it.age - p.delay;
    if (local < 0 || local > p.life) continue;
    const dragK = it.drag > 0 ? (1 - Math.exp(-it.drag * local)) / it.drag : local;
    const x = it.x + p.vx * dragK + Math.sin(local * p.swayHz + p.phase) * p.sway;
    const y = it.y + p.vy * dragK + 0.5 * it.gravity * local * local;
    const shape = p.shape ?? it.shape;
    g.save();
    g.translate(x, y);
    g.rotate(shape === 'streak' ? Math.atan2(p.vy * Math.exp(-it.drag * local) + it.gravity * local, p.vx) : p.rot + p.spin * local);
    g.globalAlpha = partAlpha(local, p.life, it.fadeIn) * it.alpha;
    const s = p.size * (it.grow ? 1 + it.grow * (local / p.life) : 1 - 0.35 * (local / p.life));
    drawShape(g, shape, s, p.color);
    g.restore();
  }
  g.restore();
}

function drawSwirl(g, it) {
  g.save();
  if (it.glow) g.globalCompositeOperation = 'lighter';
  for (const p of it.parts) {
    const local = it.age - p.delay;
    if (local < 0 || local > p.life) continue;
    const k = local / p.life;
    const r = it.r0 + (it.r1 - it.r0) * easeOut(k);
    const a = p.angle + it.turns * Math.PI * 2 * k * it.dirSign;
    const x = it.x + Math.cos(a) * r;
    const y = it.y + Math.sin(a) * r * it.squash - it.rise * k;
    g.save();
    g.translate(x, y);
    g.rotate(Math.sin(a) * 0.4);
    g.globalAlpha = Math.max(0, Math.sin(k * Math.PI)) * it.alpha;
    drawShape(g, p.shape ?? it.shape, p.size, p.color);
    g.restore();
  }
  g.restore();
}

function drawFlow(g, it) {
  g.save();
  if (it.glow) g.globalCompositeOperation = 'lighter';
  const dx = it.to.x - it.from.x;
  const dy = it.to.y - it.from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  for (const p of it.parts) {
    const local = it.age - p.delay;
    if (local < 0 || local > p.life) continue;
    const k = local / p.life;
    const tr = it.ease ? easeOut(k) : k;
    const side = Math.sin(k * Math.PI * p.waves + p.phase) * it.wobble + p.offset;
    const x = it.from.x + dx * tr + nx * side;
    const y = it.from.y + dy * tr + ny * side - Math.sin(k * Math.PI) * it.arc * p.arcMul;
    const shape = p.shape ?? it.shape;
    g.save();
    g.translate(x, y);
    g.rotate(shape === 'streak' ? Math.atan2(dy, dx) : p.rot + p.spin * local);
    g.globalAlpha = Math.max(0, Math.min(1, k / 0.12, (1 - k) / 0.25)) * it.alpha;
    drawShape(g, shape, p.size * (0.7 + 0.5 * Math.sin(k * Math.PI)), p.color);
    g.restore();
  }
  g.restore();
}

function drawCloud(g, it) {
  g.save();
  for (const p of it.puffs) {
    const local = it.age - p.delay;
    if (local < 0 || local > p.life) continue;
    const k = local / p.life;
    const tr = easeOut(Math.min(1, k * 1.25));
    const x = it.from.x + (it.to.x - it.from.x) * tr + p.ox * k;
    const y = it.from.y + (it.to.y - it.from.y) * tr + p.oy * k - p.lift * k;
    const r = p.r0 + (p.r1 - p.r0) * k;
    g.globalAlpha = it.alpha * Math.sin(Math.min(1, k * 1.15) * Math.PI) * 0.9;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, p.color);
    grad.addColorStop(0.55, `${p.color}99`);
    grad.addColorStop(1, `${p.color}00`);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

function drawGlyph(g, it, t) {
  const appear = easeOut(Math.min(1, it.age / 0.25));
  const alpha = it.alpha * fadeInOut(t, 0.15, 0.3);
  const r = it.r * (0.7 + 0.3 * appear);
  const spin = it.age * it.spin;
  g.save();
  g.translate(it.x, it.y);
  g.scale(1, it.squash);
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = alpha;
  const grad = g.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.05);
  grad.addColorStop(0, `${it.color}00`);
  grad.addColorStop(0.8, `${it.color}33`);
  grad.addColorStop(1, `${it.color}00`);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(0, 0, r * 1.05, 0, Math.PI * 2);
  g.fill();
  g.shadowColor = it.color;
  g.shadowBlur = 14;
  g.strokeStyle = it.color;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  g.stroke();
  // 外周の目盛りと小さな印（回転）
  g.save();
  g.rotate(spin);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.save();
    g.translate(Math.cos(a) * r * 0.91, Math.sin(a) * r * 0.91);
    g.rotate(a + Math.PI / 2);
    if (i % 3 === 0) drawShape(g, it.mark, r * 0.07, it.color);
    else {
      g.fillStyle = it.color;
      g.fillRect(-1, -r * 0.04, 2, r * 0.08);
    }
    g.restore();
  }
  g.restore();
  g.rotate(-spin * 0.6);
  g.strokeStyle = it.sub;
  drawGlyphCore(g, it.style, r);
  g.restore();
}

function drawTelegraph(g, it, t) {
  const dx = it.to.x - it.from.x;
  const dy = it.to.y - it.from.y;
  const len = Math.hypot(dx, dy) || 1;
  const pulse = 0.65 + 0.35 * Math.sin(it.age * 18);
  g.save();
  g.translate(it.from.x, it.from.y);
  g.rotate(Math.atan2(dy, dx));
  g.globalAlpha = it.alpha * fadeInOut(t, 0.1, 0.25) * pulse;
  g.globalCompositeOperation = 'lighter';
  const grad = g.createLinearGradient(0, 0, len, 0);
  grad.addColorStop(0, `${it.color}00`);
  grad.addColorStop(0.3, `${it.color}88`);
  grad.addColorStop(1, `${it.color}ee`);
  g.fillStyle = grad;
  g.fillRect(0, -it.width / 2, Math.max(0, len - 14), it.width);
  // 流れる山形
  g.fillStyle = it.color;
  const step = 34;
  const shift = (it.age * 140) % step;
  for (let x = shift; x < len - 20; x += step) {
    g.beginPath();
    g.moveTo(x, -it.width * 0.9);
    g.lineTo(x + 10, 0);
    g.lineTo(x, it.width * 0.9);
    g.lineTo(x + 5, 0);
    g.closePath();
    g.fill();
  }
  g.beginPath();
  g.moveTo(len, 0);
  g.lineTo(len - 22, -it.width * 1.4);
  g.lineTo(len - 22, it.width * 1.4);
  g.closePath();
  g.fill();
  g.restore();
}

function drawTileMark(g, it, t) {
  const half = it.size / 2;
  const pulse = 0.55 + 0.45 * Math.sin(it.age * 14);
  g.save();
  g.translate(it.x, it.y);
  g.scale(1, 0.55);
  g.globalAlpha = it.alpha * fadeInOut(t, 0.1, 0.3) * pulse;
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = `${it.color}44`;
  g.fillRect(-half, -half, it.size, it.size);
  g.strokeStyle = it.color;
  g.lineWidth = 4;
  const c = half * 0.45;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    g.beginPath();
    g.moveTo(sx * half, sy * (half - c));
    g.lineTo(sx * half, sy * half);
    g.lineTo(sx * (half - c), sy * half);
    g.stroke();
  }
  g.restore();
}

function drawCallout(g, it, t) {
  const pop = it.age < 0.14 ? 0.4 + (it.age / 0.14) * 0.9 : 1.3 - 0.3 * Math.min(1, (it.age - 0.14) / 0.12);
  const rise = it.rise * easeOut(t);
  g.save();
  g.translate(it.x, it.y - rise);
  g.rotate(Math.sin(it.age * 9) * it.wobble);
  g.scale(pop, pop);
  g.globalAlpha = Math.max(0, Math.min(1, (1 - t) / 0.3));
  g.font = it.font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 7;
  g.strokeStyle = 'rgba(30, 6, 26, 0.92)';
  g.strokeText(it.text, 0, 0);
  g.shadowColor = it.color;
  g.shadowBlur = 16;
  g.fillStyle = it.color;
  g.fillText(it.text, 0, 0);
  g.shadowBlur = 0;
  g.lineWidth = 1.5;
  g.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  g.strokeText(it.text, 0, 0);
  g.restore();
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function drawBubble(g, it, t) {
  const pop = it.age < 0.12 ? 0.6 + (it.age / 0.12) * 0.4 : 1;
  g.save();
  g.translate(it.x, it.y - 6 * easeOut(Math.min(1, it.age / 0.3)));
  g.scale(pop, pop);
  g.globalAlpha = Math.max(0, Math.min(1, (1 - t) / 0.18));
  g.font = it.font;
  const w = Math.min(it.maxW, g.measureText(it.text).width) + 26;
  const h = 34;
  const paper = 'rgba(255, 250, 253, 0.95)';
  roundRect(g, -w / 2, -h - 12, w, h, 14);
  g.fillStyle = paper;
  g.fill();
  g.lineWidth = 2.5;
  g.strokeStyle = it.color;
  g.stroke();
  g.beginPath();
  g.moveTo(-8, -13.5);
  g.lineTo(0, 0);
  g.lineTo(8, -13.5);
  g.closePath();
  g.fillStyle = paper;
  g.fill();
  g.beginPath();
  g.moveTo(-8, -12);
  g.lineTo(0, 0);
  g.lineTo(8, -12);
  g.stroke();
  g.fillStyle = '#3a1834';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(it.text, 0, -h / 2 - 12, it.maxW);
  g.restore();
}

// 敵が吸い取った経験値。量が多いほど大きく、濃く、ハートが増える
function drawExpGain(g, it, t) {
  const st = it.style;
  const popIn = Math.min(1, it.age / 0.16);
  const pop = (0.5 + 0.5 * popIn) * (1 + (1 - popIn) * 0.5 * st.t);
  const rise = st.rise * easeOut(t);
  const shake = st.t > 0.6 && it.age < 0.35 ? Math.sin(it.age * 80) * 3 * st.t : 0;
  g.save();
  g.translate(it.x + shake, it.y - rise);
  g.scale(pop, pop);
  g.globalAlpha = Math.max(0, Math.min(1, (1 - t) / 0.3));
  g.font = it.font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 4 + st.size * 0.12;
  g.strokeStyle = st.outline === 'rgba(255, 240, 250, 0.95)' ? 'rgba(90, 0, 45, 0.95)' : st.outline;
  g.strokeText(it.text, 0, 0);
  g.shadowColor = st.glow;
  g.shadowBlur = 6 + 22 * st.t;
  g.fillStyle = st.color;
  g.fillText(it.text, 0, 0);
  g.shadowBlur = 0;
  if (st.t > 0.6) {
    g.lineWidth = 1.5;
    g.strokeStyle = st.outline;
    g.strokeText(it.text, 0, 0);
  }
  if (st.hearts > 0) {
    const w = g.measureText(it.text).width / 2 + st.size * 0.45;
    const beat = 1 + 0.15 * Math.sin(it.age * 14);
    for (let i = 0; i < st.hearts; i++) {
      const side = i === 0 ? -1 : 1;
      g.save();
      g.translate(side * w, -st.size * 0.05);
      g.scale(beat, beat);
      drawShape(g, 'heart', st.size * 0.36, st.color);
      g.restore();
    }
  }
  g.restore();
}

const DRAWERS = {
  damage: drawDamage,
  slash: drawSlash,
  impact: drawImpact,
  particles: drawParticles,
  breath: drawBreath,
  ring: drawRing,
  motes: drawMotes,
  swirl: drawSwirl,
  flow: drawFlow,
  cloud: drawCloud,
  glyph: drawGlyph,
  telegraph: drawTelegraph,
  tileMark: drawTileMark,
  callout: drawCallout,
  bubble: drawBubble,
  expGain: drawExpGain
};

// 足元に描く種類（先に描く）と、文字の種類（最後に描く）
const GROUND_KINDS = new Set(['glyph', 'tileMark', 'telegraph']);
const TOP_KINDS = new Set(['damage', 'callout', 'bubble', 'expGain']);

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const range = (v, lo, hi) => (Array.isArray(v) ? rand(v[0], v[1]) : (v ?? rand(lo, hi)));
const MAX_ITEMS = 240;

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
    this.washes = [];      // 画面全体の色（drawTint の層）
    this.screen = [];      // 画面に重ねる集中線・閃光（drawScreen の層）
    this.offset = { x: 0, y: 0 };   // 画面の揺れ。ドット層の描画にも渡す
  }

  get reduced() {
    return this.getSettings().flashback === 'reduced';
  }

  // 粒子の数。演出を控えめにする設定では減らす
  n(count) {
    return Math.max(1, Math.round((count ?? 8) * (this.reduced ? 0.4 : 1)));
  }

  push(item) {
    if (this.items.length >= MAX_ITEMS) this.items.shift();
    this.items.push(item);
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
        this.push({
          kind: 'damage', x: e.x, y: e.y, dx: rand(-8, 8), text: e.text,
          color: STYLE_COLORS[e.style] ?? e.color ?? '#ffffff',
          font: `bold ${e.big ? 30 : 24}px ${this.fontFamily}`, age: 0, life: 0.95
        });
        break;
      case 'slash': {
        const len = Math.hypot(e.dx, e.dy) || 1;
        this.push({
          kind: 'slash', cx: e.x - (e.dx / len) * 30, cy: e.y - (e.dy / len) * 30,
          r: 58, base: Math.atan2(e.dy, e.dx), age: 0, life: 0.24
        });
        break;
      }
      case 'impact':
        this.push({
          kind: 'impact', x: e.x, y: e.y, size: e.size ?? 34, color: e.color ?? '#fff0b8',
          rot: rand(0, 1), age: 0, life: e.life ?? 0.22
        });
        break;
      case 'sparks':
        this.push({
          kind: 'particles', x: e.x, y: e.y, gravity: 380, alpha: 1, age: 0, life: 0.38,
          parts: makeParticles(e.count ?? 8, 90, 240, 2, 4, [e.color ?? '#fff0b8', '#ffffff'])
        });
        break;
      case 'poof':
        this.push({
          kind: 'particles', x: e.x, y: e.y, gravity: -70, alpha: 0.8, age: 0, life: 0.75,
          parts: makeParticles(16, 50, 190, 4, 10, ['#ff9ccf', '#ff5fa8', '#ffffff'])
        });
        break;
      case 'sparkle':
        this.push({
          kind: 'particles', x: e.x, y: e.y, gravity: -20, alpha: 0.9, age: 0, life: 0.95,
          parts: makeParticles(12, 20, 70, 2, 4, [e.color ?? '#ffb3d9', '#ffffff', '#ff7ac0'], -Math.PI / 2, Math.PI)
        });
        break;
      case 'ring':
        this.push({
          kind: 'ring', x: e.x, y: e.y, r: e.r ?? 50, color: e.color ?? '#ffc2e0',
          width: e.width ?? 4, squash: e.squash ?? 1, alpha: e.alpha ?? 0.45,
          fill: e.fill ?? false, glow: e.glow ?? false, age: 0, life: e.life ?? 0.32
        });
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
        this.push({ kind: 'breath', x: e.from.x, y: e.from.y, color: e.color ?? '#ff9ccf', puffs, age: 0, life: 1.1 });
        break;
      }
      case 'expGain': {
        const style = expPopupStyle(e.amount, e.ref);
        this.push({
          kind: 'expGain', x: e.x, y: e.y, text: expPopupText(e.amount), style,
          font: `900 ${style.size}px ${this.fontFamily}`, age: 0, life: style.life
        });
        if (style.t > 0.55) {
          this.fireBurst({
            x: e.x, y: e.y, shapes: ['heart', 'heartLine'], colors: [style.color, '#e6d6ff', '#ff4fa3'],
            count: Math.round(6 + 14 * style.t), speed: [80, 200], size: [5, 10], life: 0.9, gravity: -60, glow: true
          });
        }
        break;
      }
      case 'burst':
        this.fireBurst(e);
        break;
      case 'swirl':
        this.fireSwirl(e);
        break;
      case 'flow':
        this.fireFlow(e);
        break;
      case 'cloud':
        this.fireCloud(e);
        break;
      case 'glyph':
        this.push({
          kind: 'glyph', x: e.x, y: e.y, r: e.r ?? 60, color: e.color ?? '#ff7ac0', sub: e.sub ?? e.color ?? '#ffd6ec',
          style: e.style ?? 'heart', mark: e.mark ?? 'heart', squash: e.squash ?? 0.42, spin: e.spin ?? 1.2,
          alpha: (e.alpha ?? 0.85) * (this.reduced ? 0.6 : 1), age: 0, life: e.life ?? 1.4
        });
        break;
      case 'telegraph':
        this.push({
          kind: 'telegraph', from: e.from, to: e.to, color: e.color ?? '#ff7ac0', width: e.width ?? 10,
          alpha: e.alpha ?? 0.8, age: 0, life: e.life ?? 1.0
        });
        break;
      case 'tileMark':
        this.push({
          kind: 'tileMark', x: e.x, y: e.y, size: e.size ?? this.B.tile.size, color: e.color ?? '#ff7ac0',
          alpha: e.alpha ?? 0.8, age: 0, life: e.life ?? 1.0
        });
        break;
      case 'callout':
        this.push({
          kind: 'callout', x: e.x, y: e.y, text: e.text, color: e.color ?? '#ff7ac0',
          font: `bold ${e.size ?? 30}px ${this.fontFamily}`, rise: e.rise ?? 34, wobble: e.wobble ?? 0.05,
          age: 0, life: e.life ?? 1.1
        });
        break;
      case 'bubble':
        this.push({
          kind: 'bubble', x: e.x, y: e.y, text: e.text, color: e.color ?? '#ff7ac0',
          font: `bold ${e.size ?? 17}px ${this.fontFamily}`, maxW: e.maxW ?? 360, age: 0, life: e.life ?? 2.2
        });
        break;
      case 'wash':
        if (this.reduced && e.mode === 'full') break;
        this.washes.push({
          color: e.color ?? '#ff78b4', alpha: (e.alpha ?? 0.2) * (this.reduced ? 0.5 : 1),
          mode: e.mode ?? 'edge', inSec: e.inSec ?? 0.15, age: 0, life: e.life ?? 0.9
        });
        break;
      case 'speedLines':
        if (this.reduced) break;
        this.screen.push({
          kind: 'speedLines', color: e.color ?? '#ffffff', count: e.count ?? 46, alpha: e.alpha ?? 0.55,
          x: e.x, y: e.y, seed: Math.floor(Math.random() * 100000), age: 0, life: e.life ?? 0.45
        });
        break;
      case 'flash':
        if (this.reduced) break;
        this.screen.push({ kind: 'flash', color: e.color ?? '#ffffff', alpha: e.alpha ?? 0.35, age: 0, life: e.life ?? 0.25 });
        break;
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
          this.kissMarks.stamp({
            target: 'screen'
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
          const amp = c.shake.px * (e.power ?? 1);
          // 揺れの最中に弱い揺れが来ても、強い方を残す
          if (!this.shake || amp >= this.shake.amp * (1 - this.shake.age / c.shake.sec)) {
            this.shake = { age: 0, amp };
          }
        }
        break;
      default:
        break;
    }
  }

  // 一点から飛び散る粒子
  fireBurst(e) {
    const colors = e.colors ?? [e.color ?? '#ff7ac0'];
    const count = this.n(e.count);
    const base = e.angle ?? -Math.PI / 2;
    const spread = e.spread ?? Math.PI * 2;
    const parts = Array.from({ length: count }, () => {
      const a = base + (Math.random() - 0.5) * spread;
      const sp = range(e.speed, 60, 200);
      return {
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        size: range(e.size, 5, 10), color: pick(colors), shape: e.shapes ? pick(e.shapes) : null,
        rot: rand(0, Math.PI * 2), spin: rand(-1, 1) * (e.spin ?? 3),
        delay: rand(0, e.stagger ?? 0), life: range(e.life, 0.5, 0.9),
        sway: e.sway ?? 0, swayHz: rand(3, 6), phase: rand(0, 6)
      };
    });
    const life = Math.max(...parts.map((p) => p.delay + p.life));
    this.push({
      kind: 'motes', x: e.x, y: e.y, shape: e.shape ?? 'heart', parts,
      gravity: e.gravity ?? 0, drag: e.drag ?? 2.2, glow: e.glow ?? false, grow: e.grow ?? 0,
      fadeIn: e.fadeIn ?? 0.05, alpha: e.alpha ?? 1, age: 0, life
    });
  }

  // 中心のまわりを回る粒子。r0 > r1 なら吸い込まれ、r0 < r1 なら広がる
  fireSwirl(e) {
    const colors = e.colors ?? [e.color ?? '#ff7ac0'];
    const count = this.n(e.count ?? 12);
    const life = e.life ?? 1.0;
    const stagger = e.stagger ?? 0.15;
    const parts = Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * Math.PI * 2 + rand(-0.2, 0.2),
      size: range(e.size, 5, 9), color: pick(colors), shape: e.shapes ? pick(e.shapes) : null,
      delay: rand(0, stagger), life: life * rand(0.8, 1)
    }));
    this.push({
      kind: 'swirl', x: e.x, y: e.y, r0: e.r0 ?? 90, r1: e.r1 ?? 20, turns: e.turns ?? 1.2,
      dirSign: e.clockwise === false ? -1 : 1, squash: e.squash ?? 0.55, rise: e.rise ?? 0,
      shape: e.shape ?? 'heart', glow: e.glow ?? false, alpha: e.alpha ?? 1, parts, age: 0,
      life: life + stagger
    });
  }

  // from から to へ、間をあけて流れていく粒子
  fireFlow(e) {
    const colors = e.colors ?? [e.color ?? '#ff7ac0'];
    const count = this.n(e.count ?? 10);
    const life = e.life ?? 0.6;
    const span = e.spanSec ?? 0.4;
    const parts = Array.from({ length: count }, (_, i) => ({
      delay: (i / count) * span, life: life * rand(0.85, 1.1),
      size: range(e.size, 5, 9), color: pick(colors), shape: e.shapes ? pick(e.shapes) : null,
      waves: rand(1, 2.5), phase: rand(0, 6), offset: rand(-1, 1) * (e.spread ?? 6),
      arcMul: rand(0.7, 1.2), rot: rand(0, 6), spin: rand(-2, 2)
    }));
    this.push({
      kind: 'flow', from: e.from, to: e.to, shape: e.shape ?? 'heart', arc: e.arc ?? 40,
      wobble: e.wobble ?? 10, ease: e.ease ?? true, glow: e.glow ?? false, alpha: e.alpha ?? 1,
      parts, age: 0, life: span + life * 1.1
    });
  }

  // 色つきの霧・吐息
  fireCloud(e) {
    const colors = e.colors ?? [e.color ?? '#ff9ccf'];
    const count = this.n(e.count ?? 10);
    const life = e.life ?? 1.0;
    const span = e.spanSec ?? 0.45;
    const [r0, r1] = e.r ?? [10, 40];
    const puffs = Array.from({ length: count }, (_, i) => ({
      delay: (i / count) * span, life: life * rand(0.8, 1.15), color: pick(colors),
      r0: r0 * rand(0.7, 1.2), r1: r1 * rand(0.75, 1.25),
      ox: rand(-1, 1) * (e.spread ?? 26), oy: rand(-1, 1) * (e.spread ?? 26) * 0.6, lift: rand(0, e.lift ?? 14)
    }));
    this.push({
      kind: 'cloud', from: e.from, to: e.to ?? e.from, puffs, alpha: (e.alpha ?? 0.55) * (this.reduced ? 0.6 : 1),
      age: 0, life: span + life * 1.2
    });
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
    for (const w of this.washes) w.age += dtSec;
    this.washes = this.washes.filter((w) => w.age < w.life);
    for (const it of this.screen) it.age += dtSec;
    this.screen = this.screen.filter((it) => it.age < it.life);

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

  // 画面全体の色
  drawWashes(g) {
    if (this.washes.length === 0) return;
    const { logicalWidth: lw, logicalHeight: lh } = this.B.render;
    g.save();
    for (const w of this.washes) {
      const t = w.age / w.life;
      const a = w.alpha * Math.min(1, w.age / Math.max(0.01, w.inSec)) * (1 - t * t);
      if (a <= 0.003) continue;
      g.globalAlpha = a;
      if (w.mode === 'full') {
        g.fillStyle = w.color;
        g.fillRect(0, 0, lw, lh);
        continue;
      }
      const grad = g.createRadialGradient(lw / 2, lh / 2, lh * 0.25, lw / 2, lh / 2, lh * 0.95);
      grad.addColorStop(0, `${w.color}00`);
      grad.addColorStop(1, w.color);
      g.fillStyle = grad;
      g.fillRect(0, 0, lw, lh);
    }
    g.restore();
  }

  // 画面の端を桃色にする膜。ゆっくり出て、一方向に薄れる（点滅しない）
  drawTint(g) {
    this.drawWashes(g);
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
    for (const it of this.items) if (GROUND_KINDS.has(it.kind)) DRAWERS[it.kind](g, it, it.age / it.life);
    for (const it of this.items) {
      if (!GROUND_KINDS.has(it.kind) && !TOP_KINDS.has(it.kind)) DRAWERS[it.kind]?.(g, it, it.age / it.life);
    }
    for (const it of this.items) if (TOP_KINDS.has(it.kind)) DRAWERS[it.kind](g, it, it.age / it.life);
    g.restore();
  }

  // 集中線・閃光。ワールド演出より上、HUD より下に描く
  drawScreen(g) {
    if (this.screen.length === 0) return;
    const { logicalWidth: lw, logicalHeight: lh } = this.B.render;
    g.save();
    for (const it of this.screen) {
      const t = it.age / it.life;
      if (it.kind === 'flash') {
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = it.alpha * (1 - t) * (1 - t);
        g.fillStyle = it.color;
        g.fillRect(0, 0, lw, lh);
        g.globalCompositeOperation = 'source-over';
        continue;
      }
      const c = Number.isFinite(it.x) ? this.toScreen(it.x, it.y) : { x: lw / 2, y: lh / 2 };
      const outer = Math.hypot(lw, lh);
      g.globalAlpha = it.alpha * Math.min(1, t / 0.15) * (1 - t);
      g.fillStyle = it.color;
      let seed = it.seed;
      const rnd = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
      for (let i = 0; i < it.count; i++) {
        const a = rnd() * Math.PI * 2;
        const inner = 150 + rnd() * 160 + 60 * (1 - t);
        const w = 2 + rnd() * 7;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        g.beginPath();
        g.moveTo(c.x + ca * inner, c.y + sa * inner);
        g.lineTo(c.x + ca * outer - sa * w * 4, c.y + sa * outer + ca * w * 4);
        g.lineTo(c.x + ca * outer + sa * w * 4, c.y + sa * outer - ca * w * 4);
        g.closePath();
        g.fill();
      }
    }
    g.restore();
  }
}
