import { ENEMIES_BY_ID, ATTRS } from '../data/enemies.js';

const ALLY_NAMES = { mage: '魔法使い', priest: '僧侶' };
const ATTR_KEYS = ['mouth', 'bust', 'hip', 'foot'];

function parseHex(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(a, b, t) {
  const from = parseHex(a);
  const to = parseHex(b);
  return `rgb(${from.map((value, i) => Math.round(value + (to[i] - value) * t)).join(', ')})`;
}

export function collectDebuffs(persistent, B) {
  const d = persistent.debuffs;
  const H = B.habit;
  const list = [];
  const push = (id, label, ratio) => {
    if (ratio > 0) list.push({ id, label, strength: Math.min(1, ratio) });
  };

  for (const [raceId, stage] of Object.entries(d.loseHabit.byRace)) {
    if (stage <= 0) continue;
    const name = ENEMIES_BY_ID[raceId]?.name ?? raceId;
    push(`lose:${raceId}`, `負け癖・${name}`, stage / H.loseMax);
  }
  push('fall', '転倒癖', d.fallHabit.stage / H.fallMax);
  push('touch', '接触の記憶', d.touchHabit.stage / H.touchMax);
  push('beg', '命乞い癖', d.beggingHabit.stage / H.beggingMax);
  for (const [id, stage] of Object.entries(d.allyTarget)) {
    push(`ally_${id}`, `${ALLY_NAMES[id] ?? id}狙われ癖`, stage / H.allyTargetMax);
  }
  for (const attr of ATTR_KEYS) {
    const resistance = persistent.resistances[attr] ?? 0;
    if (resistance < 0) push(`res_${attr}`, `${ATTRS[attr].label}耐性`, -resistance / Math.abs(B.resist.floor));
  }
  return list.sort((a, b) => b.strength - a.strength).slice(0, B.debuffPanel.maxRows);
}

function roundedRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r);
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

function fitLabel(g, label, maxWidth) {
  if (g.measureText(label).width <= maxWidth) return label;
  let text = label;
  while (text.length > 1 && g.measureText(`${text}…`).width > maxWidth) text = text.slice(0, -1);
  return `${text}…`;
}

function drawHeart(g, x, y, size, color) {
  g.save();
  g.translate(x, y);
  g.scale(size / 18, size / 18);
  g.beginPath();
  g.moveTo(0, 7);
  g.bezierCurveTo(-2, 5, -9, 0, -9, -4);
  g.bezierCurveTo(-9, -10, -2, -11, 0, -5);
  g.bezierCurveTo(2, -11, 9, -10, 9, -4);
  g.bezierCurveTo(9, 0, 2, 5, 0, 7);
  g.closePath();
  g.shadowColor = 'rgba(255, 40, 175, 0.65)';
  g.shadowBlur = 4;
  g.fillStyle = color;
  g.fill();
  g.shadowBlur = 0;
  g.strokeStyle = 'rgba(255, 235, 248, 0.68)';
  g.lineWidth = 0.8;
  g.stroke();
  g.restore();
}

function drawChip(g, item, x, y, cfg, index, font) {
  const { chipW: w, chipH: h, majorFrom } = cfg;
  const severity = item.strength;
  const major = severity >= majorFrom;
  const t = major
    ? (severity - majorFrom) / Math.max(0.001, 1 - majorFrom)
    : severity / Math.max(0.001, majorFrom);
  const topColor = major ? mixHex('#fa35b7', '#d90083', t) : mixHex('#39303d', '#51404c', t);
  const bottomColor = major ? mixHex('#d6008d', '#91004d', t) : mixHex('#211d27', '#342531', t);
  const edgeColor = major ? '#ff8bd7' : '#817381';

  g.save();
  g.shadowColor = major ? `rgba(255, 0, 150, ${0.2 + severity * 0.28})` : 'rgba(0, 0, 0, 0.3)';
  g.shadowBlur = major ? 5 + severity * 7 : 2;
  const gradient = g.createLinearGradient(x, y, x, y + h);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  roundedRect(g, x, y, w, h, 5);
  g.fillStyle = gradient;
  g.fill();
  g.shadowBlur = 0;
  g.lineWidth = major ? 1.2 : 1;
  g.strokeStyle = edgeColor;
  g.stroke();

  // Small bevel highlight along the top and left edges.
  g.beginPath();
  g.moveTo(x + 7, y + 2);
  g.lineTo(x + w - 8, y + 2);
  g.moveTo(x + 2, y + 8);
  g.lineTo(x + 2, y + h - 9);
  g.strokeStyle = major ? 'rgba(255, 230, 249, 0.72)' : 'rgba(255, 255, 255, 0.3)';
  g.lineWidth = 1;
  g.stroke();

  // A few glossy drips grow as the debuff advances.
  const drips = Math.ceil(severity * 4);
  g.fillStyle = major ? 'rgba(255, 112, 207, 0.9)' : 'rgba(236, 139, 184, 0.7)';
  for (let i = 0; i < drips; i += 1) {
    const dx = x + 18 + ((i * 43 + index * 17) % Math.max(1, w - 36));
    const dropH = 2 + severity * 3;
    g.beginPath();
    g.ellipse(dx, y + h - 1, 2 + severity, dropH, 0, 0, Math.PI * 2);
    g.fill();
  }

  const heartCount = Math.max(1, Math.min(3, Math.ceil(severity * 3)));
  const heartsX = x + w - 13 - (heartCount - 1) * 17;
  const heartColor = major ? '#ffc9ed' : '#ef8ac4';
  for (let i = 0; i < heartCount; i += 1) {
    drawHeart(g, heartsX + i * 17, y + h / 2 + 1, 15, heartColor);
  }

  g.font = `bold 14px ${font}`;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  const textColor = major ? '#fff0fa' : mixHex('#f2dce7', '#ffb6d7', t);
  const label = fitLabel(g, item.label, w - 56);
  g.fillStyle = major ? 'rgba(92, 0, 53, 0.8)' : 'rgba(0, 0, 0, 0.72)';
  g.fillText(label, x + 9, y + h / 2 + 1);
  g.fillStyle = textColor;
  g.fillText(label, x + 8, y + h / 2);
  g.restore();
}

export function drawDebuffPanel(g, persistent, B, { top = 24 } = {}) {
  const items = collectDebuffs(persistent, B);
  if (items.length === 0) return;
  const cfg = B.debuffPanel;
  const totalW = cfg.columns * cfg.chipW + (cfg.columns - 1) * cfg.gap;
  const left = B.render.logicalWidth - 16 - totalW;
  const font = B.ui.fontFamily;
  items.forEach((item, index) => {
    const col = index % cfg.columns;
    const row = Math.floor(index / cfg.columns);
    drawChip(g, item, left + col * (cfg.chipW + cfg.gap), top + row * (cfg.chipH + cfg.gap), cfg, index, font);
  });
}
