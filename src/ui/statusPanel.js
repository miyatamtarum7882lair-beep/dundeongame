const clamp01 = (value) => Math.max(0, Math.min(1, value));
const BUFF_ICONS = { atkUp: 'sword', drainGuard: 'shield', escapeAid: 'wing' };

export function buildStatusEntries({
  buffs = [],
  buffTurns = 20,
  afterglowTurns = 0,
  erectTurns = 0,
  erectTotalTurns = 1
} = {}) {
  const rows = [];
  if (erectTurns > 0) {
    rows.push({
      id: 'erect',
      kind: 'state',
      label: '勃起',
      detail: `${erectTurns}ターン`,
      ratio: clamp01(erectTurns / Math.max(1, erectTotalTurns)),
      color: '#ff7bb5'
    });
  }
  if (afterglowTurns > 0) {
    rows.push({
      id: 'afterglow',
      kind: 'state',
      label: '余韻',
      detail: `${afterglowTurns}ターン`,
      ratio: null,
      color: '#8fe3ff'
    });
  }
  for (const buff of buffs) {
    rows.push({
      id: buff.id,
      kind: 'buff',
      icon: buff.icon ?? BUFF_ICONS[buff.id] ?? 'star',
      detail: String(buff.turnsLeft),
      ratio: clamp01(buff.turnsLeft / Math.max(1, buffTurns)),
      color: '#9bffb8'
    });
  }
  return rows;
}

function drawBuffIcon(g, icon, x, y, color) {
  g.save();
  g.translate(x, y);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = 2.3;
  g.strokeStyle = color;
  g.fillStyle = 'rgba(155, 255, 184, 0.16)';
  g.beginPath();
  g.arc(0, 0, 12, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  g.beginPath();
  if (icon === 'sword') {
    g.moveTo(-5, 6);
    g.lineTo(5, -6);
    g.moveTo(-2, -2);
    g.lineTo(3, 3);
    g.moveTo(-7, 4);
    g.lineTo(-3, 8);
  } else if (icon === 'shield') {
    g.moveTo(0, -7);
    g.lineTo(6, -4);
    g.lineTo(5, 2);
    g.quadraticCurveTo(3, 6, 0, 8);
    g.quadraticCurveTo(-3, 6, -5, 2);
    g.lineTo(-6, -4);
    g.closePath();
  } else if (icon === 'wing') {
    g.moveTo(-7, 5);
    g.quadraticCurveTo(-5, -5, 6, -6);
    g.quadraticCurveTo(4, 0, 0, 2);
    g.moveTo(-4, 3);
    g.quadraticCurveTo(1, 1, 4, -3);
    g.moveTo(-1, 5);
    g.quadraticCurveTo(2, 4, 5, 1);
  } else {
    g.moveTo(-6, 0);
    g.lineTo(0, -6);
    g.lineTo(6, 0);
    g.lineTo(0, 6);
    g.closePath();
  }
  g.stroke();
  g.restore();
}

export function drawStatusPanel(g, entries, { width, height, fontFamily, margin = 16 }) {
  if (entries.length === 0) return;
  const ROW_H = 30;
  const GAP = 4;
  const stateW = 210;
  const buffW = 56;
  g.save();
  g.textBaseline = 'middle';
  entries.slice(0, 8).forEach((entry, index) => {
    const isBuff = entry.kind === 'buff';
    const w = isBuff ? buffW : stateW;
    const x = width - margin - w;
    const y = height - margin - ROW_H - index * (ROW_H + GAP);
    g.fillStyle = 'rgba(20, 14, 32, 0.82)';
    g.fillRect(x, y, w, ROW_H);
    g.fillStyle = entry.color;
    g.fillRect(x, y, 4, ROW_H);
    if (isBuff) {
      drawBuffIcon(g, entry.icon, x + 20, y + ROW_H / 2, entry.color);
      g.font = `bold 14px ${fontFamily}`;
      g.fillStyle = '#ffffff';
      g.textAlign = 'right';
      g.fillText(entry.detail, x + w - 7, y + ROW_H / 2);
    } else {
      g.font = `bold 15px ${fontFamily}`;
      g.fillStyle = '#ffffff';
      g.textAlign = 'left';
      g.fillText(entry.label, x + 12, y + ROW_H / 2 - 1);
      g.textAlign = 'right';
      g.fillText(entry.detail, x + w - 8, y + ROW_H / 2 - 1);
      if (entry.ratio != null) {
        g.fillStyle = 'rgba(255, 255, 255, 0.18)';
        g.fillRect(x + 4, y + ROW_H - 4, w - 4, 3);
        g.fillStyle = entry.color;
        g.fillRect(x + 4, y + ROW_H - 4, (w - 4) * entry.ratio, 3);
      }
    }
  });
  g.restore();
}
