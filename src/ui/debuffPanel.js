// 永続デバフの欄。負け癖（敵ごと）と耐性は、図鑑・メニューで確認する
import { CONDITIONS, PERMANENT_STAGE_NAMES } from '../data/conditioning.js';

const ALLY_NAMES = { mage: '魔法使い', priest: '僧侶' };
const DEEPEN_SEC = 2.4;
const deepened = new Map();   // デバフID → 深まった時刻（clock.time）

// 永続デバフが深まったことを、欄の演出で知らせる
export function markDebuffDeepen(id, time) {
  deepened.set(id, time);
}

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

  // 敵ごとの負け癖は図鑑・回想部屋で、属性の耐性はメニューの「ステータス」で確認する（この欄には出さない）
  push('fall', '転倒癖', d.fallHabit.stage / H.fallMax);
  push('touch', '接触の記憶', d.touchHabit.stage / H.touchMax);
  push('beg', '命乞い癖', d.beggingHabit.stage / H.beggingMax);
  for (const [id, stage] of Object.entries(d.allyTarget)) {
    push(`ally_${id}`, `${ALLY_NAMES[id] ?? id}狙われ癖`, stage / H.allyTargetMax);
  }
  // 蓄積デバフの永続段階（I〜IV）
  for (const [id, st] of Object.entries(persistent.conditioning ?? {})) {
    if (!CONDITIONS[id] || !(st?.stage > 0)) continue;
    push(`cond:${id}`, `${CONDITIONS[id].name} ${PERMANENT_STAGE_NAMES[st.stage]}`, st.stage / B.conditioning.maxStage);
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

// 軽いものは枠だけが透けて見え、重くなるほどピンクが濃くなり、粘つく雫が垂れていく
function drawChip(g, item, x, y, cfg, index, font, time, animate) {
  const { chipW: w, chipH: h } = cfg;
  const s = item.strength;
  const t = animate ? time : 0;
  const ease = s * s * (3 - 2 * s);
  const since = deepened.has(item.id) ? time - deepened.get(item.id) : Infinity;
  if (since > DEEPEN_SEC) deepened.delete(item.id);
  const hit = since >= 0 && since <= DEEPEN_SEC ? since / DEEPEN_SEC : null;

  g.save();
  if (hit !== null) {
    // 深まった瞬間：欄がふくらみ、光の輪が広がり、雫が飛び散る
    const pop = 1 + 0.18 * Math.max(0, 1 - since / 0.35) * Math.sin(Math.min(1, since / 0.35) * Math.PI);
    g.translate(x + w / 2, y + h / 2);
    g.scale(pop, pop);
    g.translate(-(x + w / 2), -(y + h / 2));
    g.save();
    g.globalAlpha = 0.8 * (1 - hit);
    g.strokeStyle = '#ff2d86';
    g.shadowColor = '#ff2d86';
    g.shadowBlur = 18;
    g.lineWidth = 3;
    const grow = 4 + 26 * (1 - Math.pow(1 - hit, 2));
    roundedRect(g, x - grow, y - grow * 0.6, w + grow * 2, h + grow * 1.2, 10);
    g.stroke();
    g.shadowBlur = 0;
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2 + index;
      const d = 10 + 60 * hit;
      const px = x + w / 2 + Math.cos(a) * (w / 2 + d * 0.6);
      const py = y + h / 2 + Math.sin(a) * (h / 2 + d * 0.4) + 40 * hit * hit;
      g.globalAlpha = 0.9 * (1 - hit);
      g.fillStyle = i % 2 ? '#c2006b' : '#ff4fa3';
      g.beginPath();
      g.arc(px, py, 3.5 * (1 - hit * 0.5), 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
  // 本体。軽い：ほぼ透明 → 重い：濃い紅のゼリー
  const fillA = 0.08 + 0.82 * ease;
  const top = mixHex('#ff9cd0', '#e0007a', ease);
  const bottom = mixHex('#ff7ab8', '#7a0040', ease);
  g.shadowColor = `rgba(255, 0, 140, ${(0.15 + 0.55 * ease).toFixed(2)})`;
  g.shadowBlur = 2 + 14 * ease;
  const gradient = g.createLinearGradient(x, y, x, y + h);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  roundedRect(g, x, y, w, h, 6);
  g.globalAlpha = fillA;
  g.fillStyle = gradient;
  g.fill();
  g.shadowBlur = 0;

  // 重いものは、表面がゆっくり波打つ液のように見せる
  if (s > 0.35) {
    g.save();
    roundedRect(g, x, y, w, h, 6);
    g.clip();
    g.globalAlpha = 0.25 + 0.45 * ease;
    g.fillStyle = mixHex('#ff4fa3', '#b0005a', ease);
    g.beginPath();
    const level = y + h * (0.55 - 0.35 * ease);
    g.moveTo(x, y + h);
    for (let px = 0; px <= w; px += 6) {
      g.lineTo(x + px, level + Math.sin(px * 0.08 + t * 2.2 + index) * (2 + 2 * ease));
    }
    g.lineTo(x + w, y + h);
    g.closePath();
    g.fill();
    g.restore();
  }

  // 枠。軽いものは細く透けた線、重いものは光る濃いピンク
  g.globalAlpha = 0.35 + 0.65 * ease;
  g.lineWidth = 1 + 1.4 * ease;
  g.strokeStyle = mixHex('#ffc2e0', '#ff2d8f', ease);
  roundedRect(g, x, y, w, h, 6);
  g.stroke();

  // 上の縁の照り
  g.globalAlpha = 0.25 + 0.5 * ease;
  g.strokeStyle = 'rgba(255, 240, 250, 0.9)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x + 8, y + 2.5);
  g.lineTo(x + w - 10, y + 2.5);
  g.stroke();

  // 垂れる雫。重いほど数が増え、長く伸び、ときどき滴り落ちる
  const drips = s < 0.2 ? 0 : Math.ceil(s * 6);
  for (let i = 0; i < drips; i += 1) {
    const seed = (i * 47 + index * 23) % 97;
    const dx = x + 12 + ((i * 41 + index * 17) % Math.max(1, w - 24));
    const cycle = 2.4 + (seed % 10) * 0.25;
    const phase = ((t + seed * 0.13) % cycle) / cycle;
    const maxLen = 4 + 14 * ease;
    const len = maxLen * (0.35 + 0.65 * Math.min(1, phase * 1.4));
    const width = 2 + 2.5 * ease;
    const color = mixHex('#ff6fb5', '#a8004f', ease);
    g.globalAlpha = 0.55 + 0.4 * ease;
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(dx - width, y + h - 2);
    g.quadraticCurveTo(dx - width * 0.6, y + h + len * 0.6, dx, y + h + len);
    g.quadraticCurveTo(dx + width * 0.6, y + h + len * 0.6, dx + width, y + h - 2);
    g.closePath();
    g.fill();
    g.beginPath();
    g.arc(dx, y + h + len, width * 0.9, 0, Math.PI * 2);
    g.fill();
    // 伸びきった雫が落ちていく
    if (animate && s > 0.45 && phase > 0.72) {
      const fall = (phase - 0.72) / 0.28;
      g.globalAlpha = (1 - fall) * (0.5 + 0.4 * ease);
      g.beginPath();
      g.arc(dx, y + h + len + 4 + fall * fall * 26, width * 0.75, 0, Math.PI * 2);
      g.fill();
    }
    // 照り
    g.globalAlpha = 0.5;
    g.fillStyle = 'rgba(255, 235, 248, 0.9)';
    g.beginPath();
    g.arc(dx - width * 0.3, y + h + len - width * 0.3, width * 0.3, 0, Math.PI * 2);
    g.fill();
  }

  // ハート。重いほど増え、脈打つ
  g.globalAlpha = 0.5 + 0.5 * ease;
  const heartCount = Math.max(1, Math.min(3, Math.ceil(s * 3)));
  const heartsX = x + w - 13 - (heartCount - 1) * 17;
  const heartColor = mixHex('#ffd6ec', '#ffc9ed', ease);
  for (let i = 0; i < heartCount; i += 1) {
    const beat = 1 + (s > 0.5 ? 0.12 * Math.max(0, Math.sin(t * 5 + i)) : 0);
    drawHeart(g, heartsX + i * 17, y + h / 2 + 1, 15 * beat, heartColor);
  }

  // 深まった瞬間の白い照り
  if (hit !== null && since < 0.6) {
    g.globalAlpha = 0.55 * (1 - since / 0.6);
    g.fillStyle = '#ffe3f2';
    roundedRect(g, x, y, w, h, 6);
    g.fill();
  }

  // 名前
  g.globalAlpha = 1;
  g.font = `bold 14px ${font}`;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  const label = fitLabel(g, item.label, w - 56);
  g.lineJoin = 'round';
  g.lineWidth = 3;
  g.strokeStyle = s < 0.5 ? 'rgba(40, 6, 28, 0.85)' : 'rgba(90, 0, 50, 0.8)';
  g.strokeText(label, x + 8, y + h / 2);
  g.fillStyle = s < 0.5 ? mixHex('#ffe3f2', '#ffc2e0', ease) : '#fff0fa';
  g.fillText(label, x + 8, y + h / 2);
  g.restore();
}

export function drawDebuffPanel(g, persistent, B, { top = 24, time = 0, animate = true } = {}) {
  const items = collectDebuffs(persistent, B);
  if (items.length === 0) return;
  const cfg = B.debuffPanel;
  const totalW = cfg.columns * cfg.chipW + (cfg.columns - 1) * cfg.gap;
  const left = B.render.logicalWidth - 16 - totalW;
  const font = B.ui.fontFamily;
  items.forEach((item, index) => {
    const col = index % cfg.columns;
    const row = Math.floor(index / cfg.columns);
    drawChip(g, item, left + col * (cfg.chipW + cfg.gap), top + row * (cfg.chipH + (cfg.rowGap ?? cfg.gap)), cfg, index, font, time, animate);
  });
}
