// File: src/ui/corruptionCrest.js
// 堕ち度のハートの刻印（画面左・高解像度層）。段階ごとにハートが1つずつ濃いピンクに染まり、
// 今の段階の進みは、ハートの下から液が満ちていくように見せる。
// 段階が上がると、ハートがはじけて名前が出る。画面の縁もうっすら桃色に染まっていく。
import { CORRUPTION, corruptionState } from '../data/corruption.js';
import { drawShape } from './fxShapes.js';

const HEART = new Path2D('M0 0.9 C-1.3 0.1 -0.9 -0.9 0 -0.35 C0.9 -0.9 1.3 0.1 0 0.9 Z');

export class CorruptionCrest {
  constructor({ B, getPersistent, getSettings }) {
    this.B = B;
    this.cfg = B.corruptionUi;
    this.getPersistent = getPersistent;
    this.getSettings = getSettings;
    this.state = corruptionState(getPersistent());
    this.time = 0;
    this.rise = null;     // 段階が上がった演出 { age, level }
    this.sparks = [];
  }

  // 永続データが変わったら呼ぶ。段階が上がったら true（呼び出し側でログ・音）
  refresh() {
    const next = corruptionState(this.getPersistent());
    const up = next.level > this.state.level;
    this.state = next;
    if (up) {
      this.rise = { age: 0, level: next.level };
      for (let i = 0; i < 24; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 60 + Math.random() * 160;
        this.sparks.push({ x: 0, y: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, life: 0.8 + Math.random() * 0.5, size: 4 + Math.random() * 6 });
      }
    }
    return up;
  }

  update(dt) {
    this.time += dt;
    if (this.rise) {
      this.rise.age += dt;
      if (this.rise.age > 2.6) this.rise = null;
    }
    for (const p of this.sparks) {
      p.age += dt;
      p.vy += 120 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.sparks = this.sparks.filter((p) => p.age < p.life);
  }

  // 画面の縁の桃色（drawTint の層）
  drawVignette(g) {
    const mood = this.state.mood;
    if (mood <= 0.01 || this.getSettings().flashback === 'reduced') return;
    const { logicalWidth: lw, logicalHeight: lh } = this.B.render;
    const breathe = 0.85 + 0.15 * Math.sin(this.time * 1.4);
    const a = this.cfg.edgeAlpha * mood * breathe;
    const grad = g.createRadialGradient(lw / 2, lh / 2, lh * 0.35, lw / 2, lh / 2, lh * 0.95);
    grad.addColorStop(0, 'rgba(255, 79, 163, 0)');
    grad.addColorStop(1, `rgba(255, 79, 163, ${a.toFixed(3)})`);
    g.save();
    g.fillStyle = grad;
    g.fillRect(0, 0, lw, lh);
    g.restore();
  }

  draw(g, fontFamily) {
    const { x, y } = this.cfg;
    const st = this.state;
    const size = 11;
    const gap = 26;
    g.save();
    g.font = `bold 11px ${fontFamily}`;
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.lineJoin = 'round';
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(30, 0, 20, 0.85)';
    g.fillStyle = '#ffb3d9';
    const label = st.level > 0 ? `堕ち度【${CORRUPTION.names[st.level]}】` : '堕ち度';
    g.strokeText(label, x, y);
    g.fillText(label, x, y);

    for (let i = 0; i < 5; i++) {
      const cx = x + 10 + i * gap;
      const cy = y + 22;
      const filled = i < st.level;
      const current = i === st.level;
      const beat = filled && st.level >= 3 ? 1 + 0.08 * Math.max(0, Math.sin(this.time * 4 + i)) : 1;
      const pop = this.rise && i === this.rise.level - 1 ? 1 + 0.6 * Math.max(0, 1 - this.rise.age / 0.5) : 1;
      g.save();
      g.translate(cx, cy);
      g.scale(size * beat * pop, size * beat * pop);
      // 殻（空のハート）
      g.fillStyle = 'rgba(40, 6, 30, 0.75)';
      g.fill(HEART);
      // 中身。満ちたハートは段階の色、今の段階は下から満ちる
      if (filled || (current && st.fill > 0)) {
        g.save();
        if (current) {
          g.beginPath();
          g.rect(-1.5, 0.9 - 1.8 * st.fill, 3, 3);
          g.clip();
        }
        g.fillStyle = CORRUPTION.colors[Math.min(CORRUPTION.colors.length - 1, i + 1)];
        g.shadowColor = '#ff4fa3';
        g.shadowBlur = filled ? 10 : 4;
        g.fill(HEART);
        g.restore();
      }
      g.lineWidth = 0.14;
      g.strokeStyle = filled ? 'rgba(255, 230, 245, 0.9)' : 'rgba(255, 179, 217, 0.55)';
      g.stroke(HEART);
      g.restore();
    }

    // 段階が上がった瞬間：はじけるハートと名前
    if (this.rise) {
      const k = this.rise.age / 2.6;
      const cx = x + 10 + (this.rise.level - 1) * gap;
      const cy = y + 22;
      for (const p of this.sparks) {
        g.save();
        g.translate(cx + p.x, cy + p.y);
        g.globalAlpha = Math.max(0, 1 - p.age / p.life);
        drawShape(g, 'heart', p.size, CORRUPTION.colors[this.rise.level]);
        g.restore();
      }
      g.globalAlpha = Math.max(0, Math.min(1, (1 - k) / 0.3));
      g.font = `900 20px ${fontFamily}`;
      g.lineWidth = 5;
      g.shadowColor = '#ff2d86';
      g.shadowBlur = 14;
      g.strokeStyle = 'rgba(40, 0, 25, 0.95)';
      g.fillStyle = CORRUPTION.colors[this.rise.level];
      const text = `堕ち度 上昇【${CORRUPTION.names[this.rise.level]}】`;
      g.strokeText(text, x, y + 52 + 6 * (1 - Math.min(1, this.rise.age / 0.3)));
      g.fillText(text, x, y + 52 + 6 * (1 - Math.min(1, this.rise.age / 0.3)));
    }
    g.restore();
  }
}
