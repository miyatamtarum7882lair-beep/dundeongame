// File: src/ui/partyPanel.js
// 左上の仲間ステータス（高解像度層）。小さめに、HP・MP・魅了ゲージを出す。
import { clamp01 } from '../core/util.js';

const NAMES = { priest: '僧侶', mage: '魔法使い' };
const TOP = 104;
const ROW_H = 42;
const BAR_W = 96;

function bar(g, x, y, w, h, ratio, color) {
  g.fillStyle = 'rgba(0, 0, 0, 0.55)';
  g.fillRect(x, y, w, h);
  g.fillStyle = color;
  g.fillRect(x, y, w * clamp01(ratio), h);
}

export function drawPartyPanel(g, exp, B) {
  const allies = exp.units.filter((u) => u.kind === 'ally');
  g.save();
  g.lineJoin = 'round';
  g.lineWidth = 3;
  g.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  g.textBaseline = 'top';
  g.textAlign = 'left';

  allies.forEach((u, i) => {
    const st = exp.save.currentRun.allies[u.speciesId];
    if (!st) return;
    const x = 16;
    const y = TOP + i * ROW_H;

    g.font = `bold 12px ${B.ui.fontFamily}`;
    g.fillStyle = st.status === 'ACTIVE' ? '#ffffff' : '#aaaaaa';
    const label = NAMES[u.speciesId] ?? u.name;
    g.strokeText(label, x, y);
    g.fillText(label, x, y);

    bar(g, x, y + 16, BAR_W, 5, st.hp / B.ally.hp, '#ff9bb0');
    bar(g, x, y + 23, BAR_W, 5, st.mp / B.ally.mp, '#7fc4ff');
    bar(g, x + 12, y + 30, BAR_W - 12, 4, st.charmGauge / 100, '#ff4fa3');
    g.font = `10px ${B.ui.fontFamily}`;
    g.fillStyle = '#ff9ccf';
    g.strokeText('♥', x, y + 28);
    g.fillText('♥', x, y + 28);
  });
  g.restore();
}