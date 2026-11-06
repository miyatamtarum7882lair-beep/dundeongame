// 画面上に浮かぶハート。画像差し替えがなければベクターで描く。
const heartShape = new Path2D('M0 0 C-0.25 -0.25 -1.15 -0.85 -1.15 -1.55 C-1.15 -2.35 -0.18 -2.55 0 -1.72 C0.18 -2.55 1.15 -2.35 1.15 -1.55 C1.15 -0.85 0.25 -0.25 0 0 Z');
const heartHighlight = new Path2D('M-0.76 -1.72 C-0.72 -2.13 -0.28 -2.18 -0.16 -1.92');
const heartGlint = new Path2D('M0.53 -1.91 C0.72 -2.02 0.85 -1.82 0.76 -1.66');
let overrides = [];

function drawHeart(g, size, color, depth = false) {
  g.save();
  g.translate(0, size * 0.52);
  g.scale(size / 2.3, size / 2.3);
  if (depth) {
    g.save();
    g.translate(0.13, 0.1);
    g.fillStyle = 'rgba(57, 0, 27, 0.7)';
    g.fill(heartShape);
    g.restore();
  }
  const shade = g.createLinearGradient(-0.9, -2.35, 0.85, -0.05);
  shade.addColorStop(0, '#fff0f5');
  shade.addColorStop(0.16, '#ffb8d2');
  shade.addColorStop(0.42, color);
  shade.addColorStop(0.76, '#d51e69');
  shade.addColorStop(1, '#730b3d');
  g.fillStyle = shade;
  g.fill(heartShape);
  if (depth) {
    g.strokeStyle = 'rgba(91, 4, 43, 0.9)';
    g.lineWidth = 0.09;
    g.stroke(heartShape);
  }
  const gloss = g.createRadialGradient(-0.38, -1.75, 0.03, -0.2, -1.7, 0.82);
  gloss.addColorStop(0, 'rgba(255,255,255,0.82)');
  gloss.addColorStop(0.22, 'rgba(255,231,240,0.42)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gloss;
  g.fill(heartShape);
  g.strokeStyle = 'rgba(255, 255, 255, 0.84)';
  g.lineWidth = 0.075;
  g.lineCap = 'round';
  g.stroke(heartHighlight);
  g.strokeStyle = 'rgba(255, 232, 241, 0.65)';
  g.lineWidth = 0.05;
  g.stroke(heartGlint);
  g.restore();
}

function loadImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

async function loadOverrides(prefix) {
  const images = await Promise.all(
    Array.from({ length: 16 }, (_, i) => loadImage(`assets/fx/${prefix}_${String(i + 1).padStart(2, '0')}.png`))
  );
  return images.filter(Boolean);
}

export async function loadHeartOverrides() {
  overrides = await loadOverrides('heart');
}

export class HeartFx {
  constructor(B, getSettings = () => ({})) {
    this.cfg = B.fx.heart;
    this.getSettings = getSettings;
    this.items = [];
  }

  add(item) {
    if (this.items.length >= this.cfg.max) this.items.shift();
    this.items.push(item);
  }

  burst({ x, y, count = 8, size = 1 }) {
    for (let i = 0; i < count; i++) {
      const life = this.cfg.lifeMin + Math.random() * (this.cfg.lifeMax - this.cfg.lifeMin);
      this.add({
        kind: 'float',
        x: x + (Math.random() - 0.5) * 32,
        y,
        vx: (Math.random() - 0.5) * 36,
        rise: this.cfg.riseMin + Math.random() * (this.cfg.riseMax - this.cfg.riseMin),
        sway: (Math.random() - 0.5) * this.cfg.swayPx,
        size: this.cfg.basePx * size * (0.78 + Math.random() * 0.42),
        life,
        age: 0,
        image: overrides[i % Math.max(1, overrides.length)] ?? null
      });
    }
  }

  stream({ from, to, count = 12, size = 0.55, durSec = 0.5, arcPx = 60 }) {
    for (let i = 0; i < count; i++) {
      this.add({
        kind: 'stream',
        from,
        to,
        delay: (i / count) * durSec * 0.55,
        life: durSec,
        arcPx,
        size: this.cfg.basePx * size * (0.72 + Math.random() * 0.38),
        age: 0,
        image: overrides[i % Math.max(1, overrides.length)] ?? null
      });
    }
  }

  projectile({ from, to, durSec = 0.8, arcPx = 80, size = 1 }) {
    this.add({
      kind: 'projectile',
      from,
      to,
      life: durSec,
      arcPx,
      size: this.cfg.basePx * size,
      age: 0,
      image: null,
      rotation: (Math.random() - 0.5) * 0.18
    });
  }

  update(dt) {
    for (const item of this.items) item.age += dt;
    this.items = this.items.filter((item) => item.age < item.life + (item.delay ?? 0));
  }

  draw(g) {
    if (this.getSettings().flashback === 'reduced') {
      this.items = [];
      return;
    }
    for (const item of this.items) {
      const age = Math.max(0, item.age - (item.delay ?? 0));
      const t = Math.min(1, age / item.life);
      let x;
      let y;
      let alpha;
      if (item.kind === 'stream' || item.kind === 'projectile') {
        const travel = 1 - Math.pow(1 - t, item.kind === 'projectile' ? 1.15 : 1);
        x = item.from.x + (item.to.x - item.from.x) * travel;
        y = item.from.y + (item.to.y - item.from.y) * travel - Math.sin(t * Math.PI) * item.arcPx;
        alpha = item.kind === 'projectile' ? 1 - Math.max(0, (t - 0.82) / 0.18) * 0.45 : Math.sin(t * Math.PI);
      } else {
        x = item.x + item.vx * age + Math.sin(t * Math.PI * 2) * item.sway;
        y = item.y - item.rise * t;
        const fade = Math.max(0, (1 - Math.max(0, (t - 0.38) / 0.62)));
        alpha = Math.pow(fade, 1.5);
      }

      const pop = item.kind === 'float' && age < this.cfg.popSec
        ? 0.65 + 0.35 * age / this.cfg.popSec
        : 1;
      const s = item.size * pop;
      g.save();
      g.translate(x, y);
      g.globalAlpha = Math.max(0, alpha);
      if (item.kind === 'projectile') {
        g.rotate(item.rotation + Math.sin(t * Math.PI * 2) * 0.12);
        const perspective = 0.9 + 0.1 * Math.sin(t * Math.PI);
        g.scale(perspective, 1);
        drawHeart(g, s, this.cfg.color, true);
      } else if (item.image) {
        g.drawImage(item.image, -s / 2, -s / 2, s, s);
      } else {
        drawHeart(g, s, this.cfg.color);
      }
      g.restore();
    }
  }
}
