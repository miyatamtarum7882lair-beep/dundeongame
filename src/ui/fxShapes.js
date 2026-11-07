// File: src/ui/fxShapes.js
// 演出用の小さな図形。どれも原点を中心に、大きさ s（おおよその半径）で描く。
// 色は呼び出し側で fillStyle / strokeStyle に入れておく。

const HEART = new Path2D('M0 0.9 C-1.3 0.1 -0.9 -0.9 0 -0.35 C0.9 -0.9 1.3 0.1 0 0.9 Z');
const PETAL = new Path2D('M0 -1 C0.62 -0.55 0.62 0.45 0 1 C-0.62 0.45 -0.62 -0.55 0 -1 Z');
const LIPS_TOP = new Path2D('M-1 0 C-0.6 -0.55 -0.25 -0.6 0 -0.3 C0.25 -0.6 0.6 -0.55 1 0 C0.4 0.05 -0.4 0.05 -1 0 Z');
const LIPS_BOTTOM = new Path2D('M-1 0 C-0.5 0.7 0.5 0.7 1 0 C0.4 0.12 -0.4 0.12 -1 0 Z');
const RIBBON = new Path2D(
  'M0 0 C-0.35 -0.55 -1 -0.75 -1 -0.1 C-1 0.45 -0.4 0.3 0 0 Z '
  + 'M0 0 C0.35 -0.55 1 -0.75 1 -0.1 C1 0.45 0.4 0.3 0 0 Z '
  + 'M-0.12 0.05 L-0.45 0.95 L-0.2 0.85 L-0.05 1 Z M0.12 0.05 L0.45 0.95 L0.2 0.85 L0.05 1 Z'
);

function star4(g, s, inner = 0.28) {
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? s : s * inner;
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
}

function note(g, s) {
  g.beginPath();
  g.ellipse(-s * 0.35, s * 0.55, s * 0.42, s * 0.3, -0.45, 0, Math.PI * 2);
  g.fill();
  g.fillRect(-s * 0.02, -s * 0.95, s * 0.16, s * 1.5);
  g.beginPath();
  g.moveTo(s * 0.12, -s * 0.95);
  g.quadraticCurveTo(s * 0.75, -s * 0.6, s * 0.55, -s * 0.05);
  g.quadraticCurveTo(s * 0.5, -s * 0.45, s * 0.12, -s * 0.55);
  g.fill();
}

export const SHAPES = {
  dot(g, s) {
    g.beginPath();
    g.arc(0, 0, s, 0, Math.PI * 2);
    g.fill();
  },
  heart(g, s) {
    g.save();
    g.scale(s, s);
    g.fill(HEART);
    g.restore();
  },
  heartLine(g, s) {
    g.save();
    g.scale(s, s);
    g.lineWidth = 0.22;
    g.stroke(HEART);
    g.restore();
  },
  star(g, s) {
    star4(g, s);
  },
  petal(g, s) {
    g.save();
    g.scale(s * 0.7, s);
    g.fill(PETAL);
    g.restore();
  },
  note(g, s) {
    note(g, s);
  },
  ribbon(g, s) {
    g.save();
    g.scale(s, s);
    g.fill(RIBBON);
    g.restore();
  },
  lips(g, s) {
    g.save();
    g.scale(s, s);
    g.fill(LIPS_TOP);
    g.fill(LIPS_BOTTOM);
    g.restore();
  },
  bubble(g, s) {
    g.lineWidth = Math.max(1, s * 0.16);
    g.beginPath();
    g.arc(0, 0, s, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha *= 0.8;
    g.beginPath();
    g.arc(-s * 0.35, -s * 0.35, s * 0.22, 0, Math.PI * 2);
    g.fill();
  },
  // ふわっとした毛玉・煙。中心が濃く、外へ薄れる
  fluff(g, s, color) {
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, s);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, s, 0, Math.PI * 2);
    g.fill();
  },
  // 速さの向きに伸びた光の筋（rotate は呼び出し側で速度の向きに合わせる）
  streak(g, s) {
    g.beginPath();
    g.moveTo(-s * 1.6, 0);
    g.lineTo(0, -s * 0.18);
    g.lineTo(s * 0.5, 0);
    g.lineTo(0, s * 0.18);
    g.closePath();
    g.fill();
  }
};

export function drawShape(g, shape, s, color) {
  const fn = SHAPES[shape] ?? SHAPES.dot;
  g.fillStyle = color;
  g.strokeStyle = color;
  fn(g, s, color);
}

// 魔法陣の中心に描く紋様
export function drawGlyphCore(g, style, r) {
  g.save();
  switch (style) {
    case 'heart':
      g.scale(r * 0.42, r * 0.42);
      g.lineWidth = 0.09;
      g.stroke(HEART);
      g.scale(0.6, 0.6);
      g.stroke(HEART);
      break;
    case 'ribbon':
      g.scale(r * 0.45, r * 0.45);
      g.lineWidth = 0.08;
      g.stroke(RIBBON);
      break;
    case 'fox': {
      // 狐の耳と、渦を巻く尻尾
      g.lineWidth = Math.max(1.5, r * 0.035);
      g.beginPath();
      g.moveTo(-r * 0.42, r * 0.1);
      g.lineTo(-r * 0.28, -r * 0.42);
      g.lineTo(-r * 0.08, -r * 0.05);
      g.moveTo(r * 0.42, r * 0.1);
      g.lineTo(r * 0.28, -r * 0.42);
      g.lineTo(r * 0.08, -r * 0.05);
      g.stroke();
      g.beginPath();
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const a = t * Math.PI * 3.2;
        const rr = r * 0.4 * (1 - t * 0.85);
        const x = Math.cos(a) * rr;
        const y = r * 0.2 + Math.sin(a) * rr * 0.5;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
      break;
    }
    default: {
      g.lineWidth = Math.max(1.5, r * 0.03);
      g.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const x = Math.cos(a) * r * 0.6;
        const y = Math.sin(a) * r * 0.6;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.closePath();
      g.stroke();
    }
  }
  g.restore();
}
