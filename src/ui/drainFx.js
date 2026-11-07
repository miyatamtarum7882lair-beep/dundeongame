// File: src/ui/drainFx.js
import { edgeAlpha, membraneEnvelope } from './drainFxMath.js';

const TAU = Math.PI * 2;
const rand = (lo, hi) => lo + Math.random() * (hi - lo);

function heartPath(g, s) {
  g.beginPath();
  g.moveTo(0, s * 0.9);
  g.bezierCurveTo(-s * 1.3, s * 0.1, -s * 0.9, -s * 0.9, 0, -s * 0.35);
  g.bezierCurveTo(s * 0.9, -s * 0.9, s * 1.3, s * 0.1, 0, s * 0.9);
  g.closePath();
}

export class DrainFx {
  /**
   * @param {object} o
   * @param {object} o.cfg B.drainFx
   * @param {{logicalWidth:number, logicalHeight:number}} o.render B.render
   * @param {() => object} o.getSettings
   * @param {() => {
   *   mpRatio:number,
   *   hero:{x:number, y:number},
   *   climax:{progress:number}|null,
   *   binders:Array<{dx:number, dy:number}>
   * }} o.getState hero は画面の論理座標
   */
  constructor({ cfg, render, getSettings, getState }) {
    this.cfg = cfg;
    this.render = render;
    this.getSettings = getSettings;
    this.getState = getState;
    this.time = 0;
    this.mode = 'full';
    this.membranes = [];
    this.particles = [];
    this.flowAcc = 0;
    this.burstAcc = 0;
    this.edgeA = 0;
    this.climax = null;
    this.hero = null;
  }

  /** ドレインの瞬間に呼ぶ。縁がふっと濃くなってから、ゆっくり薄れる */
  pulse(strength = 1) {
    this.membranes.push({ age: 0, strength });
    if (this.membranes.length > 4) this.membranes.shift();
  }

  update(dtSec) {
    const dt = Math.min(dtSec, 0.1);
    const { edge: e, flow: f, climax: c } = this.cfg;
    this.mode = this.getSettings().flashback ?? 'full';
    this.time += dt;
    if (this.mode === 'off') {
      this.membranes.length = 0;
      this.particles.length = 0;
      this.edgeA = 0;
      this.climax = null;
      return;
    }

    const s = this.getState();
    this.hero = s.hero;
    this.climax = s.climax;

    let membrane = 0;
    for (const m of this.membranes) {
      m.age += dt;
      membrane = Math.max(
        membrane,
        m.strength * membraneEnvelope(m.age, e.membraneRiseSec, e.membraneDecaySec)
      );
    }
    const memLife = e.membraneRiseSec + e.membraneDecaySec;
    this.membranes = this.membranes.filter((m) => m.age < memLife);

    this.edgeA = edgeAlpha({
      mpRatio: s.mpRatio,
      time: this.time,
      membrane,
      climaxProgress: s.climax ? s.climax.progress : null,
      mode: this.mode
    }, e);

    const reduced = this.mode === 'reduced';
    const n = s.binders.length;
    const p = s.climax ? s.climax.progress : 0;
    if (n > 0 && s.hero) {
      const rate = (f.perSec + f.climaxExtraPerSec * p) * Math.min(3, n) * (reduced ? 0.5 : 1);
      this.flowAcc += rate * dt;
      while (this.flowAcc >= 1) {
        this.flowAcc -= 1;
        if (this.particles.length < f.maxParticles) {
          this.spawnFlow(s.hero, s.binders[Math.floor(Math.random() * n)]);
        }
      }
    } else {
      this.flowAcc = 0;
    }

    if (s.climax && s.hero && !reduced) {
      this.burstAcc += (c.burstPerSec + c.burstExtraPerSec * p) * dt;
      while (this.burstAcc >= 1) {
        this.burstAcc -= 1;
        if (this.particles.length < f.maxParticles) this.spawnBurst(s.hero);
      }
    } else {
      this.burstAcc = 0;
    }

    for (const q of this.particles) q.age += dt;
    this.particles = this.particles.filter((q) => q.age < q.life);
  }

  // 主人公から、拘束者のいる側へ流れていく粒子
  spawnFlow(hero, dir) {
    const f = this.cfg.flow;
    const len = Math.hypot(dir.dx, dir.dy) || 1;
    const ux = dir.dx / len || 0;
    const uy = dir.dy / len || 1;
    const a = rand(0, TAU);
    const r = rand(6, 26);
    const reach = f.reachPx * rand(0.85, 1.1);
    this.particles.push({
      kind: Math.random() < 0.3 ? 'heart' : 'dot',
      sx: hero.x + Math.cos(a) * r,
      sy: hero.y + Math.sin(a) * r,
      ex: hero.x + ux * reach + rand(-14, 14),
      ey: hero.y + uy * reach + rand(-14, 14),
      px: -uy,
      py: ux,
      phase: rand(0, TAU),
      wobble: rand(0.4, 1) * f.wobblePx,
      size: rand(2.5, 5),
      age: 0,
      life: f.lifeSec * rand(0.8, 1.2)
    });
  }

  // 絶頂中に、主人公から四方へ広がるハート
  spawnBurst(hero) {
    const c = this.cfg.climax;
    const a = rand(0, TAU);
    const reach = c.burstReachPx * rand(0.6, 1);
    this.particles.push({
      kind: 'burst',
      sx: hero.x,
      sy: hero.y,
      ex: hero.x + Math.cos(a) * reach,
      ey: hero.y + Math.sin(a) * reach * 0.8,
      size: rand(6, 10),
      age: 0,
      life: rand(0.9, 1.3)
    });
  }

  // 画面の縁のピンク。drawTint の直後に呼ぶ
  drawEdge(g) {
    if (this.edgeA <= 0.002) return;
    const { logicalWidth: lw, logicalHeight: lh } = this.render;
    const [r, gr, b] = this.cfg.edge.color;
    const inner = lh * (this.climax ? 0.22 : 0.3);
    const grad = g.createRadialGradient(lw / 2, lh / 2, inner, lw / 2, lh / 2, lh * 0.95);
    grad.addColorStop(0, `rgba(${r}, ${gr}, ${b}, 0)`);
    grad.addColorStop(1, `rgba(${r}, ${gr}, ${b}, ${this.edgeA.toFixed(4)})`);
    g.save();
    g.fillStyle = grad;
    g.fillRect(0, 0, lw, lh);
    g.restore();
  }

  // 粒子と周回粒子。拘束の表示より上に呼ぶ
  drawParticles(g) {
    if (this.mode === 'off' || !this.hero) return;
    g.save();
    for (const q of this.particles) {
      const t = q.age / q.life;
      let x;
      let y;
      let alpha;
      let scale = 1;
      if (q.kind === 'burst') {
        const e = 1 - (1 - t) * (1 - t);
        x = q.sx + (q.ex - q.sx) * e;
        y = q.sy + (q.ey - q.sy) * e;
        alpha = Math.min(1, t * 8) * (1 - t) * 0.85;
        scale = 0.6 + 0.6 * t;
      } else {
        const e = t * t * (3 - 2 * t);
        const w = Math.sin(q.phase + q.age * 5) * q.wobble * Math.sin(Math.PI * t);
        x = q.sx + (q.ex - q.sx) * e + q.px * w;
        y = q.sy + (q.ey - q.sy) * e + q.py * w;
        alpha = Math.sin(Math.PI * t) * 0.85;
      }
      g.globalAlpha = alpha;
      if (q.kind === 'dot') {
        g.fillStyle = '#ff9fcf';
        g.beginPath();
        g.arc(x, y, q.size * (1 - t * 0.3), 0, TAU);
        g.fill();
      } else {
        g.fillStyle = q.kind === 'burst' ? '#ff7bb8' : '#ff5fa8';
        g.save();
        g.translate(x, y);
        g.scale(scale, scale);
        heartPath(g, q.kind === 'burst' ? q.size : q.size * 2.2);
        g.fill();
        g.restore();
      }
    }
    if (this.climax && this.mode === 'full') this.drawOrbit(g);
    g.restore();
  }

  // 絶頂中、主人公のまわりを周回する粒子
  drawOrbit(g) {
    const c = this.cfg.climax;
    const p = this.climax.progress;
    g.fillStyle = '#ffc2e0';
    g.globalAlpha = 0.35 + 0.45 * p;
    for (let i = 0; i < c.orbitCount; i += 1) {
      const a = this.time * c.orbitSpeed + (i * TAU) / c.orbitCount;
      const r = c.orbitRadiusPx * (0.85 + 0.15 * Math.sin(this.time * 2 + i)) * (0.9 + 0.3 * p);
      g.beginPath();
      g.arc(this.hero.x + Math.cos(a) * r, this.hero.y + Math.sin(a) * r * 0.55, 3, 0, TAU);
      g.fill();
    }
  }
}