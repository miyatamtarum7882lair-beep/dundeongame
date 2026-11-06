// File: src/ui/statusPanel.js
import { B } from '../data/balance.js';

const W = 1280;
const H = 720;
const BOX_W = 260;
const BOX_H = 46;
const GAP = 6;
const MARGIN = 16;

const KIND_COLOR = {
  buff: [90, 200, 140],
  state: [200, 120, 230],
  debuff: [240, 90, 110],
};

/**
 * @param {{buffs?: Array<{id:string,label:string,desc:string,turnsLeft:number}>, afterglowTurns?: number, erectLeftSec?: number}} src
 */
export function buildStatusEntries({ buffs = [], afterglowTurns = 0, erectLeftSec = 0 } = {}) {
  const out = [];
  if (afterglowTurns > 0) {
    out.push({
      id: 'afterglow',
      kind: 'state',
      label: '余韻',
      desc: 'ドレイン1/5・状態異常無効・拘束は自動防御',
      remain: `残り${afterglowTurns}T`,
    });
  }
  if (erectLeftSec > 0) {
    out.push({
      id: 'erect',
      kind: 'debuff',
      label: '勃起状態',
      desc: '行動が遅くなる',
      remain: `${erectLeftSec.toFixed(1)}s`,
    });
  }
  for (const b of buffs) {
    out.push({
      id: b.id,
      kind: 'buff',
      label: b.label,
      desc: b.desc,
      remain: `残り${b.turnsLeft}T`,
    });
  }
  return out;
}

/** 右下に下から上へ積む。 */
export function drawStatusPanel(ctx, entries, font = B.ui.fontFamily) {
  if (entries.length === 0) return;
  ctx.save();
  ctx.textBaseline = 'middle';
  entries.forEach((e, i) => {
    const x = W - MARGIN - BOX_W;
    const y = H - MARGIN - BOX_H - i * (BOX_H + GAP);
    const c = KIND_COLOR[e.kind] ?? KIND_COLOR.buff;
    ctx.fillStyle = 'rgba(10,10,20,0.72)';
    ctx.fillRect(x, y, BOX_W, BOX_H);
    ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    ctx.fillRect(x, y, 5, BOX_H);
    ctx.fillStyle = '#fff';
    ctx.font = `bold 15px ${font}`;
    ctx.textAlign = 'left';
    ctx.fillText(e.label, x + 14, y + 14);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `12px ${font}`;
    ctx.fillText(e.desc, x + 14, y + 33);
    ctx.fillStyle = '#fff';
    ctx.font = `bold 14px ${font}`;
    ctx.textAlign = 'right';
    ctx.fillText(e.remain, x + BOX_W - 10, y + 14);
  });
  ctx.restore();
}