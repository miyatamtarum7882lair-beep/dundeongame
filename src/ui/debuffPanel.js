// File: src/ui/debuffPanel.js
// 右側の永続デバフ（高解像度層）。強いものほどピンクになり、ゆっくり脈打つ。
import { ENEMIES_BY_ID, ATTRS } from '../data/enemies.js';

const ALLY_NAMES = { mage: '魔法使い', priest: '僧侶' };
const ATTR_KEYS = ['mouth', 'bust', 'hip', 'foot'];

function parseHex(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(a, b, t) {
  const A = parseHex(a);
  const Bc = parseHex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (Bc[i] - v) * t)).join(', ')})`;
}

// 表示するデバフの一覧。強い順
export function collectDebuffs(persistent, B) {
  const d = persistent.debuffs;
  const H = B.habit;
  const list = [];
  const push = (id, label, detail, ratio) => {
    if (ratio > 0) list.push({ id, label, detail, strength: Math.min(1, ratio) });
  };

  let worst = null;
  for (const [raceId, stage] of Object.entries(d.loseHabit.byRace)) {
    if (!worst || stage > worst.stage) worst = { raceId, stage };
  }
  if (worst) {
    const name = ENEMIES_BY_ID[worst.raceId]?.name ?? worst.raceId;
    push('lose', '負け癖', `${name} ${worst.stage}段`, worst.stage / H.loseMax);
  }
  push('fall', '堕ち癖', `${d.fallHabit.stage}段`, d.fallHabit.stage / H.fallMax);
  push('touch', '感触の記憶', `${d.touchHabit.stage}段`, d.touchHabit.stage / H.touchMax);
  push('beg', '甘い妥協', `${d.beggingHabit.stage}段`, d.beggingHabit.stage / H.beggingMax);
  for (const [id, stage] of Object.entries(d.allyTarget)) {
    push(`ally_${id}`, `${ALLY_NAMES[id] ?? id}のカモ化`, `${stage}段`, stage / H.allyTargetMax);
  }
  for (const attr of ATTR_KEYS) {
    const v = persistent.resistances[attr] ?? 0;
    if (v < 0) push(`res_${attr}`, `${ATTRS[attr].label}耐性`, String(v), -v / Math.abs(B.resist.floor));
  }
  list.sort((a, b) => b.strength - a.strength);
  return list.slice(0, B.debuffPanel.maxRows);
}

// ピンクの光（ぼかした楕円）。加算合成は使わない
function glow(g, cx, cy, halfW, halfH, alpha) {
  g.save();
  g.translate(cx, cy);
  g.scale(halfW / halfH, 1);
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, halfH);
  grad.addColorStop(0, `rgba(255, 105, 180, ${alpha})`);
  grad.addColorStop(1, 'rgba(255, 105, 180, 0)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(0, 0, halfH, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// time: ゲーム内の経過秒。top: 描き始めの y。animate: false なら脈打たない（軽減モード）
export function drawDebuffPanel(g, persistent, B, { time, top, animate }) {
  const items = collectDebuffs(persistent, B);
  if (items.length === 0) return;
  const P = B.debuffPanel;
  const right = B.render.logicalWidth - 16;

  g.save();
  g.lineJoin = 'round';
  g.lineWidth = 3;
  g.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  g.textBaseline = 'middle';
  g.textAlign = 'right';
  g.font = `bold 11px ${B.ui.fontFamily}`;
  g.fillStyle = '#c9a0ff';
  g.strokeText('永続デバフ', right, top);
  g.fillText('永続デバフ', right, top);

  items.forEach((it, i) => {
    const y = top + 22 + i * P.rowH;
    const s = it.strength;
    const color = mixHex('#c9a0ff', '#ff4fa3', s);
    const pink = s >= P.glowFrom;
    const phase = animate ? Math.sin((time / P.pulseSec) * Math.PI * 2 + i * 0.9) * 0.5 + 0.5 : 0.5;
    const k = pink ? (s - P.glowFrom) / (1 - P.glowFrom) : 0;

    if (pink) {
      const alpha = Math.min(P.maxGlow, (0.10 + 0.20 * k) * (0.55 + 0.45 * phase));
      glow(g, right - 90, y, 120 + 30 * k, 15 + 6 * k, alpha);
    }

    const pulse = pink && animate ? 1 + 0.035 * phase * (0.5 + k) : 1;
    g.save();
    g.translate(right, y);
    g.scale(pulse, pulse);

    g.fillStyle = 'rgba(0, 0, 0, 0.55)';
    g.fillRect(-64, -3, 64, 6);
    g.fillStyle = color;
    g.fillRect(-64, -3, 64 * s, 6);

    g.font = `12px ${B.ui.fontFamily}`;
    const text = `${it.label} ${it.detail}`;
    g.fillStyle = color;
    g.strokeText(text, -72, 0);
    g.fillText(text, -72, 0);

    if (s >= 0.67) {
      const w = g.measureText(text).width;
      const bob = animate ? Math.sin((time / P.pulseSec) * Math.PI * 2 + i) * 2 : 0;
      g.fillStyle = '#ff9ccf';
      g.strokeText('♥', -72 - w - 10, -2 + bob);
      g.fillText('♥', -72 - w - 10, -2 + bob);
    }
    g.restore();
  });
  g.restore();
}