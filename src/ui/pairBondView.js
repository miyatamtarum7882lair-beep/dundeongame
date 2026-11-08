// File: src/ui/pairBondView.js
// 敵どうしのこすり合わせのカットイン。見えている二人のうち、いちばん進んでいる組を画面の左に出す。
// 二人のチャームポイント（こすり合わせている部位）の一枚絵を丸く切り抜き、進むほど近づいて押し付け合う。
// 口ならキス（顔が重なる）、胸なら押しつぶし合う、尻なら揺れながらこすれる、足・手なら絡み合う。
import { buildCharmCanvas } from './charmCanvas.js';
import { ATTRS } from '../data/enemies.js';

const SIZE = 132;          // 一枚絵の丸の大きさ
const CX = 186;            // 中心（画面左）
const CY = 360;

export class PairBondView {
  /**
   * @param {object} o
   * @param {(id: string) => Promise<CanvasImageSource|null>} o.loadPortrait
   * @param {(speciesId: string, attr: string) => {cx, cy, zoom}} o.getPoint
   * @param {() => object} o.getCharmCfg
   * @param {string} o.fontFamily
   */
  constructor({ loadPortrait, getPoint, getCharmCfg, fontFamily }) {
    this.loadPortrait = loadPortrait;
    this.getPoint = getPoint;
    this.getCharmCfg = getCharmCfg;
    this.font = fontFamily;
    this.art = new Map();      // `${speciesId}:${attr}` → canvas | 'loading'
    this.time = 0;
    this.shown = null;         // いま出している組
    this.fade = 0;
  }

  artFor(speciesId, attr) {
    const key = `${speciesId}:${attr}`;
    const hit = this.art.get(key);
    if (hit && hit !== 'loading') return hit;
    if (!hit) {
      this.art.set(key, 'loading');
      void this.loadPortrait(speciesId).then((img) => {
        if (!img) return this.art.delete(key);
        const canvas = buildCharmCanvas(img, this.getPoint(speciesId, attr), { ...this.getCharmCfg(), outputPx: 256, centerTransparency: 0 }, 'front');
        this.art.set(key, canvas);
      }).catch(() => this.art.delete(key));
    }
    return null;
  }

  update(dt, pair) {
    this.time += dt;
    if (pair) this.shown = pair;
    this.fade = Math.max(0, Math.min(1, this.fade + (pair ? dt * 3 : -dt * 2)));
    if (this.fade <= 0) this.shown = null;
  }

  /** @param {(unit) => {main, glow, sub}} themeOf @param {(pair) => number} progressOf */
  draw(g, themeOf, progressOf, remainingOf) {
    const pair = this.shown;
    if (!pair || this.fade <= 0) return;
    const t = this.time;
    const k = progressOf(pair);
    const [attrA, attrB] = pair.attrs;
    const ta = themeOf(pair.a);
    const tb = themeOf(pair.b);
    const artA = this.artFor(pair.a.speciesId, attrA);
    const artB = this.artFor(pair.b.speciesId, attrB);
    const speed = 3 + 6 * k;
    const rub = Math.sin(t * speed);
    // 進むほど近づく。部位ごとに動きを変える
    const gap = 150 - 110 * k;
    let dxA = -gap / 2 - 4 * rub;
    let dxB = gap / 2 + 4 * rub;
    let dyA = 0;
    let dyB = 0;
    let sqA = 1;
    let sqB = 1;
    if (attrA === 'mouth') {
      dxA += 6 * Math.max(0, rub);
      dxB -= 6 * Math.max(0, rub);
    } else if (attrA === 'bust') {
      sqA = 1 - 0.08 * Math.max(0, rub) * (0.5 + k);
      sqB = 1 - 0.08 * Math.max(0, -rub) * (0.5 + k);
    } else if (attrA === 'hip') {
      dyA = 8 * Math.sin(t * speed * 0.7);
      dyB = -8 * Math.sin(t * speed * 0.7);
    } else {
      dyA = 5 * rub;
      dyB = -5 * rub;
    }

    g.save();
    g.globalAlpha = this.fade;
    // 背景：二人の色が混ざった、脈打つ光
    const beat = 0.5 + 0.5 * Math.pow(Math.max(0, Math.sin(t * (4 + 4 * k))), 3);
    const bg = g.createRadialGradient(CX, CY, 10, CX, CY, 170);
    bg.addColorStop(0, `rgba(255, 79, 163, ${(0.25 + 0.25 * k + 0.1 * beat).toFixed(3)})`);
    bg.addColorStop(1, 'rgba(255, 79, 163, 0)');
    g.fillStyle = bg;
    g.fillRect(CX - 180, CY - 150, 360, 300);

    const drawArt = (art, x, y, sq, th, flip) => {
      g.save();
      g.translate(x, y);
      g.scale(flip ? -sq : sq, 1 / Math.max(0.85, sq));
      g.beginPath();
      g.arc(0, 0, SIZE / 2, 0, Math.PI * 2);
      g.save();
      g.clip();
      if (art) g.drawImage(art, -SIZE / 2, -SIZE / 2, SIZE, SIZE);
      else {
        g.fillStyle = th.main;
        g.globalAlpha *= 0.4;
        g.fillRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE);
      }
      g.restore();
      g.lineWidth = 3;
      g.strokeStyle = th.main;
      g.shadowColor = th.main;
      g.shadowBlur = 10 + 14 * k;
      g.stroke();
      g.restore();
    };
    drawArt(artA, CX + dxA, CY + dyA, sqA, ta, false);
    drawArt(artB, CX + dxB, CY + dyB, sqB, tb, true);

    // 二人のあいだのハート：近づくほど大きく、拍に合わせて弾む
    const hs = (10 + 22 * k) * (1 + 0.15 * beat);
    g.save();
    g.translate(CX, CY - 6);
    g.fillStyle = '#ff2d86';
    g.shadowColor = '#ff4fa3';
    g.shadowBlur = 16;
    g.beginPath();
    g.moveTo(0, hs * 0.9);
    g.bezierCurveTo(-hs * 0.2, hs * 0.7, -hs * 1.1, hs * 0.1, -hs * 1.05, -hs * 0.35);
    g.bezierCurveTo(-hs, -hs, -hs * 0.2, -hs * 1.05, 0, -hs * 0.45);
    g.bezierCurveTo(hs * 0.2, -hs * 1.05, hs, -hs, hs * 1.05, -hs * 0.35);
    g.bezierCurveTo(hs * 1.1, hs * 0.1, hs * 0.2, hs * 0.7, 0, hs * 0.9);
    g.fill();
    g.restore();
    // 舞い上がる小さなハート
    for (let i = 0; i < 6 + Math.round(10 * k); i += 1) {
      const ph = (t * (0.5 + 0.4 * k) + i * 0.37) % 1;
      const x = CX + Math.sin(i * 2.1 + t) * (30 + 40 * ph);
      const y = CY - 20 - ph * 110;
      g.globalAlpha = this.fade * (1 - ph) * 0.9;
      g.fillStyle = i % 2 ? ta.main : tb.main;
      g.font = `bold ${10 + (i % 3) * 3}px ${this.font}`;
      g.textAlign = 'center';
      g.fillText('♥', x, y);
    }
    g.globalAlpha = this.fade;

    // 名前・していること・残り時間
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.font = `bold 14px ${this.font}`;
    const title = `${pair.a.name} × ${pair.b.name}`;
    g.lineWidth = 4;
    g.strokeStyle = 'rgba(40, 0, 25, 0.9)';
    g.strokeText(title, CX, CY - SIZE / 2 - 22);
    g.fillStyle = '#ffe3f2';
    g.fillText(title, CX, CY - SIZE / 2 - 22);
    const verb = attrA === attrB
      ? { mouth: 'キス', bust: '胸の押し付け合い', hip: 'お尻のこすり合わせ', foot: '脚の絡め合い', hand: '恋人つなぎ' }[attrA] ?? 'こすり合わせ'
      : `${ATTRS[attrA]?.label}と${ATTRS[attrB]?.label}`;
    g.font = `bold 13px ${this.font}`;
    g.fillStyle = ta.glow;
    g.strokeText(`♡ ${verb} ♡`, CX, CY + SIZE / 2 + 16);
    g.fillText(`♡ ${verb} ♡`, CX, CY + SIZE / 2 + 16);
    // 進み具合のバー（3つの段階の印つき）
    const bw = 220;
    const bx = CX - bw / 2;
    const by = CY + SIZE / 2 + 32;
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillRect(bx, by, bw, 8);
    const grad = g.createLinearGradient(bx, 0, bx + bw, 0);
    grad.addColorStop(0, ta.main);
    grad.addColorStop(1, tb.main);
    g.fillStyle = grad;
    g.fillRect(bx, by, bw * k, 8);
    g.fillStyle = '#ffffff';
    for (const f of [1 / 3, 2 / 3]) g.fillRect(bx + bw * f - 1, by - 2, 2, 12);
    g.font = `bold 12px ${this.font}`;
    g.fillStyle = '#ffffff';
    g.fillText(`あと ${Math.ceil(remainingOf(pair))} 秒で絆が結ばれる`, CX, by + 22);
    g.restore();
  }
}
