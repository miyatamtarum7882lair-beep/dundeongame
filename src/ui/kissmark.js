// 画面に残るキスマーク。画像差し替えがなければ立体感のある唇を描く。
const upperLip = new Path2D('M-1.08 0 C-0.8 -0.15 -0.52 -0.58 -0.2 -0.46 C-0.08 -0.42 0 -0.32 0 -0.3 C0 -0.32 0.08 -0.42 0.2 -0.46 C0.52 -0.58 0.8 -0.15 1.08 0 C0.78 0.18 0.42 0.19 0 0.09 C-0.42 0.19 -0.78 0.18 -1.08 0 Z');
const lowerLip = new Path2D('M-1.04 0.05 C-0.65 0.18 -0.32 0.16 0 0.09 C0.32 0.16 0.65 0.18 1.04 0.05 C0.83 0.52 0.38 0.73 0 0.74 C-0.38 0.73 -0.83 0.52 -1.04 0.05 Z');
const mouthLine = new Path2D('M-0.98 0.035 C-0.55 -0.005 -0.28 0.025 0 0.09 C0.28 0.025 0.55 -0.005 0.98 0.035');
const upperShine = new Path2D('M-0.72 -0.08 C-0.51 -0.33 -0.32 -0.4 -0.18 -0.35');
const lowerShine = new Path2D('M-0.42 0.48 C-0.18 0.62 0.18 0.62 0.42 0.48');
let overrides = [];

function loadImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

export async function loadKissmarkOverrides() {
  const images = await Promise.all(
    Array.from({ length: 16 }, (_, i) =>
      loadImage(`assets/fx/kissmark_${String(i + 1).padStart(2, '0')}.png`))
  );
  overrides = images.filter(Boolean);
}

function drawLips(g) {
  const red = g.createLinearGradient(0, -0.55, 0, 0.78);
  red.addColorStop(0, '#ffb1c8');
  red.addColorStop(0.26, '#f14b80');
  red.addColorStop(0.58, '#b5134b');
  red.addColorStop(1, '#690a35');

  g.fillStyle = 'rgba(63, 0, 25, 0.2)';
  g.translate(0, 0.05);
  g.fill(upperLip);
  g.fill(lowerLip);
  g.translate(0, -0.05);

  g.fillStyle = red;
  g.fill(upperLip);
  g.fill(lowerLip);

  g.strokeStyle = 'rgba(94, 5, 39, 0.85)';
  g.lineWidth = 0.035;
  g.stroke(mouthLine);

  g.strokeStyle = 'rgba(255, 227, 236, 0.78)';
  g.lineCap = 'round';
  g.lineWidth = 0.065;
  g.stroke(upperShine);
  g.strokeStyle = 'rgba(255, 211, 226, 0.48)';
  g.lineWidth = 0.045;
  g.stroke(lowerShine);
}

export class KissMarkLayer {
  constructor(B, getSettings = () => ({})) {
    this.cfg = B.kissMark;
    this.getSettings = getSettings;
    this.marks = [];
    this.areas = new Map();
    this.index = 0;
  }

  setArea(target, area) {
    this.areas.set(target, area);
  }

  clearNow() {
    this.marks = [];
  }

  stamp({ target = 'screen', x, y } = {}) {
    if (this.getSettings().flashback === 'reduced' || this.getSettings().kissMarks === false) return;
    const area = this.areas.get(target);
    if (!area) return;
    const randomPoint = () => {
      const marginX = Math.min(this.cfg.sizePx * 0.45, area.w * 0.2);
      const marginY = Math.min(this.cfg.sizePx * 0.45, area.h * 0.2);
      return {
        x: area.x + marginX + Math.random() * Math.max(0, area.w - marginX * 2),
        y: area.y + marginY + Math.random() * Math.max(0, area.h - marginY * 2)
      };
    };
    let markX;
    let markY;
    if (Number.isFinite(x) && Number.isFinite(y)) {
      markX = x + (Math.random() - 0.5) * 16;
      markY = y + (Math.random() - 0.5) * 16;
    } else {
      let point = randomPoint();
      for (let attempt = 0; attempt < 12; attempt++) {
        point = randomPoint();
        if (!this.marks.some((mark) => Math.hypot(mark.x - point.x, mark.y - point.y) < this.cfg.minDistance)) break;
      }
      markX = point.x;
      markY = point.y;
    }
    if (this.marks.length >= this.cfg.max) this.marks.shift();
    this.marks.push({
      x: markX,
      y: markY,
      age: 0,
      life: this.cfg.fadeOutSec,
      angle: (Math.random() - 0.5) * 0.5,
      scaleX: 0.9 + Math.random() * 0.22,
      scaleY: 0.82 + Math.random() * 0.3,
      image: overrides.length ? overrides[this.index++ % overrides.length] : null
    });
  }

  update(dt) {
    for (const mark of this.marks) mark.age += dt;
    this.marks = this.marks.filter((mark) => mark.age < mark.life);
  }

  draw(g) {
    if (this.getSettings().flashback === 'reduced' || this.getSettings().kissMarks === false) return;
    for (const mark of this.marks) {
      const fadeStart = Math.min(this.cfg.fadeHoldSec, mark.life * 0.8);
      const fadeT = Math.max(0, (mark.age - fadeStart) / (mark.life - fadeStart));
      const alpha = Math.pow(Math.max(0, 1 - fadeT), 1.65);
      const pop = mark.age < this.cfg.popSec ? 0.72 + 0.28 * mark.age / this.cfg.popSec : 1;
      const size = this.cfg.sizePx * pop;
      g.save();
      g.translate(mark.x, mark.y);
      g.rotate(mark.angle);
      g.scale(mark.scaleX, mark.scaleY);
      g.globalAlpha = alpha;
      if (mark.image) {
        g.drawImage(mark.image, -size / 2, -size / 2, size, size);
      } else {
        g.scale(size / 2.2, size / 2.2);
        drawLips(g);
      }
      g.restore();
    }
  }
}
