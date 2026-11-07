// File: src/ui/levelHud.js
// 主人公のレベル表示（高解像度層・画面座標）。
// ハートの宝石のような円ゲージに Lv を出し、経験値を吸われると、
// 削られた分が濃いピンクの残像になって縮み、ハートの粒が吸い出されていく。
// レベルが下がると、ゲージが砕けて「LEVEL DOWN」が刻まれる。
import { clamp01 } from '../core/util.js';
import { expNeeded } from '../battle/damage.js';
import { drawShape } from './fxShapes.js';

const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const easeOut = (t) => 1 - Math.pow(1 - t, 2);

export class LevelHud {
  /**
   * @param {object} o
   * @param {object} o.B balance
   * @param {() => object} o.getSettings
   */
  constructor({ B, getSettings }) {
    this.B = B;
    this.cfg = B.levelHud;
    this.getSettings = getSettings;
    this.time = 0;
    this.ghost = null;        // 吸われた分の残像 { ratio }（今のゲージより上の部分）
    this.shake = 0;
    this.flash = 0;           // ゲージの発光（吸われた直後）
    this.down = null;         // レベルダウンの演出 { age, level }
    this.levelPop = 0;        // 数字の弾み
    this.particles = [];
    this.texts = [];
    this.lastLevel = null;
    this.lastRatio = null;
  }

  get reduced() {
    return this.getSettings().flashback === 'reduced';
  }

  // 経験値を吸われた（Combat の heroExpDrained）
  onDrain({ amount, levelsLost }, hero) {
    const c = this.cfg;
    const need = expNeeded(hero.level, this.B);
    const nowRatio = clamp01(hero.exp / need);
    // 残像の起点：レベルが下がったなら満タンから、そうでなければ吸われる前の位置から
    const before = levelsLost > 0 ? 1 : clamp01((hero.exp + amount) / need);
    this.ghost = { ratio: Math.max(this.ghost?.ratio ?? 0, before), hold: c.ghostHoldSec };
    const k = clamp01(amount / need / c.bigDrainRatio);
    this.shake = Math.max(this.shake, 0.25 + 0.75 * k);
    this.flash = 1;
    const count = Math.round((c.particleMin + (c.particleMax - c.particleMin) * k) * (this.reduced ? 0.4 : 1));
    for (let i = 0; i < count; i++) this.spawnParticle(nowRatio, before);
    this.texts.push({ text: `-${amount} EXP`, age: 0, life: 1.1, size: 14 + 10 * k, dx: rand(-6, 6) });
    if (levelsLost > 0) {
      this.down = { age: 0, levels: levelsLost };
      this.levelPop = 1;
      for (let i = 0; i < (this.reduced ? 8 : 22); i++) this.spawnShard();
    }
  }

  // ゲージの削られた所から、外へ吸い出されるハート
  spawnParticle(fromRatio, toRatio) {
    const c = this.cfg;
    const t = rand(fromRatio, Math.max(fromRatio + 0.02, toRatio));
    const a = -Math.PI / 2 + Math.PI * 2 * t;
    const r = c.radius;
    const dir = a + rand(-0.4, 0.4);
    this.particles.push({
      x: c.x + Math.cos(a) * r,
      y: c.y + Math.sin(a) * r,
      vx: Math.cos(dir) * rand(40, 120) + rand(20, 80),
      vy: Math.sin(dir) * rand(40, 120) + rand(20, 60),
      size: rand(4, 8),
      color: Math.random() < 0.5 ? '#ff4fa3' : '#ffb3d9',
      shape: Math.random() < 0.7 ? 'heart' : 'dot',
      age: -rand(0, 0.15),
      life: rand(0.7, 1.1),
      spin: rand(-4, 4)
    });
  }

  // レベルダウンでゲージが砕けた破片
  spawnShard() {
    const c = this.cfg;
    const a = rand(0, Math.PI * 2);
    const sp = rand(80, 220);
    this.particles.push({
      x: c.x + Math.cos(a) * c.radius,
      y: c.y + Math.sin(a) * c.radius,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      size: rand(5, 11),
      color: Math.random() < 0.5 ? '#ff2d86' : '#ffd6ec',
      shape: Math.random() < 0.6 ? 'heart' : 'heartLine',
      age: 0,
      life: rand(0.8, 1.3),
      spin: rand(-6, 6),
      gravity: 160
    });
  }

  update(dt, hero) {
    this.time += dt;
    const need = expNeeded(hero.level, this.B);
    const ratio = clamp01(hero.exp / need);
    if (this.lastLevel !== null && hero.level > this.lastLevel) this.levelPop = 1;
    this.lastLevel = hero.level;
    this.lastRatio = ratio;
    if (this.ghost) {
      if (this.ghost.hold > 0) this.ghost.hold -= dt;
      else this.ghost.ratio -= dt * this.cfg.ghostShrinkPerSec;
      if (this.ghost.ratio <= ratio + 0.002) this.ghost = null;
    }
    this.shake = Math.max(0, this.shake - dt * 2.5);
    this.flash = Math.max(0, this.flash - dt * 2.2);
    this.levelPop = Math.max(0, this.levelPop - dt * 2.5);
    if (this.down) {
      this.down.age += dt;
      if (this.down.age > this.cfg.downSec) this.down = null;
    }
    for (const p of this.particles) {
      p.age += dt;
      if (p.age < 0) continue;
      p.vx *= Math.exp(-1.5 * dt);
      p.vy = p.vy * Math.exp(-1.5 * dt) + (p.gravity ?? 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);
    for (const t of this.texts) t.age += dt;
    this.texts = this.texts.filter((t) => t.age < t.life);
  }

  draw(g, hero, fontFamily) {
    const c = this.cfg;
    const need = expNeeded(hero.level, this.B);
    const ratio = clamp01(hero.exp / need);
    const sx = this.shake > 0 ? Math.sin(this.time * 70) * 4 * this.shake : 0;
    const sy = this.shake > 0 ? Math.cos(this.time * 53) * 3 * this.shake : 0;
    const cx = c.x + sx;
    const cy = c.y + sy;
    const r = c.radius;
    const breath = 0.5 + 0.5 * Math.sin(this.time * 2.2);

    g.save();
    // 外側の光輪（吸われた直後は強く光る）
    const halo = g.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.75);
    halo.addColorStop(0, `rgba(255, 79, 163, ${0.25 + 0.1 * breath + 0.45 * this.flash})`);
    halo.addColorStop(1, 'rgba(255, 79, 163, 0)');
    g.fillStyle = halo;
    g.beginPath();
    g.arc(cx, cy, r * 1.75, 0, Math.PI * 2);
    g.fill();

    // 本体の円盤（濃い紅の宝石）
    const disc = g.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r * 1.05);
    disc.addColorStop(0, '#6b1a4a');
    disc.addColorStop(0.6, '#3a0d2a');
    disc.addColorStop(1, '#1c0615');
    g.fillStyle = disc;
    g.beginPath();
    g.arc(cx, cy, r + 8, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = 'rgba(255, 179, 217, 0.85)';
    g.stroke();

    // ゲージの溝と目盛り
    g.lineCap = 'butt';
    g.lineWidth = 10;
    g.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = 'rgba(255, 214, 236, 0.25)';
    g.lineWidth = 1.5;
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5));
      g.lineTo(cx + Math.cos(a) * (r + 5), cy + Math.sin(a) * (r + 5));
      g.stroke();
    }

    const start = -Math.PI / 2;
    // 吸われた分の残像（濃いピンクのまま縮む。点滅はさせない）
    if (this.ghost && this.ghost.ratio > ratio) {
      g.lineWidth = 10;
      g.strokeStyle = 'rgba(255, 45, 134, 0.9)';
      g.beginPath();
      g.arc(cx, cy, r, start + Math.PI * 2 * ratio, start + Math.PI * 2 * this.ghost.ratio);
      g.stroke();
    }
    // 今の経験値（金から桃色へ）
    if (ratio > 0) {
      const grad = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      grad.addColorStop(0, '#ffe8a3');
      grad.addColorStop(0.5, '#ffb3d9');
      grad.addColorStop(1, '#ff4fa3');
      g.shadowColor = 'rgba(255, 120, 190, 0.9)';
      g.shadowBlur = 10;
      g.lineWidth = 8;
      g.strokeStyle = grad;
      g.beginPath();
      g.arc(cx, cy, r, start, start + Math.PI * 2 * ratio);
      g.stroke();
      g.shadowBlur = 0;
      // ゲージの先端のハート
      const a = start + Math.PI * 2 * ratio;
      g.save();
      g.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      const beat = 1 + 0.12 * Math.sin(this.time * 7);
      g.scale(beat, beat);
      g.shadowColor = '#ff4fa3';
      g.shadowBlur = 8;
      drawShape(g, 'heart', 7, '#fff0f7');
      g.restore();
    }

    // Lv の数字
    const pop = 1 + 0.35 * easeOut(this.levelPop);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.font = `bold 11px ${fontFamily}`;
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(30, 0, 20, 0.9)';
    g.fillStyle = '#ffd6ec';
    g.strokeText('Lv', cx, cy - 15);
    g.fillText('Lv', cx, cy - 15);
    g.save();
    g.translate(cx, cy + 4);
    g.scale(pop, pop);
    g.font = `900 27px ${fontFamily}`;
    const num = String(hero.level);
    const numGrad = g.createLinearGradient(0, -14, 0, 14);
    const hurt = this.down ? 1 - this.down.age / this.cfg.downSec : 0;
    numGrad.addColorStop(0, hurt > 0 ? '#ffd0e6' : '#fffaf0');
    numGrad.addColorStop(1, hurt > 0 ? '#ff2d86' : '#ffc6e2');
    g.lineWidth = 5;
    g.strokeStyle = 'rgba(40, 0, 25, 0.95)';
    g.strokeText(num, 0, 0);
    g.fillStyle = numGrad;
    g.fillText(num, 0, 0);
    g.restore();

    // EXP の札
    const label = `${hero.exp} / ${need}`;
    g.font = `bold 12px ${fontFamily}`;
    const w = Math.max(84, g.measureText(label).width + 22);
    const ly = cy + r + 18;
    g.fillStyle = 'rgba(28, 6, 21, 0.88)';
    g.beginPath();
    g.roundRect(cx - w / 2, ly - 9, w, 18, 9);
    g.fill();
    g.lineWidth = 1;
    g.strokeStyle = this.flash > 0 ? `rgba(255, 79, 163, ${0.5 + 0.5 * this.flash})` : 'rgba(255, 179, 217, 0.6)';
    g.stroke();
    g.fillStyle = '#fff0f7';
    g.fillText(label, cx, ly + 1);
    g.font = `bold 9px ${fontFamily}`;
    g.fillStyle = '#ff9fcf';
    g.fillText('EXP', cx - w / 2 - 14, ly + 1);

    // 吸い出されていくハート
    for (const p of this.particles) {
      if (p.age < 0) continue;
      const k = p.age / p.life;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.spin * p.age);
      g.globalAlpha = Math.max(0, 1 - k);
      drawShape(g, p.shape, p.size * (1 - 0.3 * k), p.color);
      g.restore();
    }
    // -EXP の数字
    for (const t of this.texts) {
      const k = t.age / t.life;
      g.save();
      g.globalAlpha = Math.max(0, Math.min(1, (1 - k) / 0.4));
      g.font = `900 ${Math.round(t.size)}px ${fontFamily}`;
      g.textAlign = 'left';
      g.lineWidth = 4;
      g.strokeStyle = 'rgba(40, 0, 25, 0.95)';
      g.fillStyle = '#b77cff';   // 吸われた経験値は紫
      const tx = cx + r + 14 + t.dx;
      const ty = cy - 6 + easeOut(k) * 26;
      g.strokeText(t.text, tx, ty);
      g.fillText(t.text, tx, ty);
      g.restore();
    }
    // LEVEL DOWN の刻印
    if (this.down) {
      const k = this.down.age / this.cfg.downSec;
      const stamp = this.down.age < 0.12 ? 1.8 - (this.down.age / 0.12) * 0.8 : 1;
      g.save();
      g.translate(cx, cy + r + 44);
      g.scale(stamp, stamp);
      g.rotate(-0.08);
      g.globalAlpha = Math.max(0, Math.min(1, (1 - k) / 0.3));
      g.font = `900 20px ${fontFamily}`;
      g.lineWidth = 6;
      g.strokeStyle = 'rgba(40, 0, 25, 0.95)';
      g.shadowColor = '#ff2d86';
      g.shadowBlur = 16;
      g.fillStyle = '#ff2d86';
      const text = this.down.levels > 1 ? `LEVEL DOWN ×${this.down.levels}` : 'LEVEL DOWN';
      g.strokeText(text, 0, 0);
      g.fillText(text, 0, 0);
      g.restore();
    }
    g.restore();
  }
}
