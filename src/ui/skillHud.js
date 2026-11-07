// File: src/ui/skillHud.js
import { ATTRS } from '../data/enemies.js';
import { bannerAlpha, bannerSlide, flashEnvelope, nextBanner } from './skillHudMath.js';

const hexRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export class SkillHud {
  /**
   * @param {object} o
   * @param {object} o.cfg B.stage
   * @param {{logicalWidth:number, logicalHeight:number}} o.render B.render
   * @param {string} o.fontFamily
   * @param {() => object} o.getSettings
   * @param {(x:number, y:number) => {x:number, y:number}} o.toScreen ワールド座標 → 画面の論理座標
   */
  constructor({ cfg, render, fontFamily, getSettings, toScreen }) {
    this.cfg = cfg;
    this.render = render;
    this.fontFamily = fontFamily;
    this.getSettings = getSettings;
    this.toScreen = toScreen;
    this.banner = null;
    this.flashState = null;
  }

  show(info) {
    this.banner = nextBanner(this.banner, info);
  }

  // color があれば、属性の色より優先する（敵のテーマ色）
  flash({ x, y, attr, color = null, sec }) {
    this.flashState = { x, y, attr, color, sec, age: 0 };
  }

  update(dtSec) {
    if (this.banner) {
      this.banner.age += dtSec;
      if (this.banner.age >= this.banner.holdSec + this.cfg.banner.fadeOutSec) this.banner = null;
    }
    if (this.flashState) {
      this.flashState.age += dtSec;
      if (this.flashState.age >= this.flashState.sec) this.flashState = null;
    }
  }

  // 敵の位置の淡い光。ワールド演出（battleFx.drawWorld）の直後に呼ぶ
  drawFlash(g) {
    const f = this.flashState;
    if (!f) return;
    const mode = this.getSettings().flashback ?? 'full';
    if (mode === 'off') return;
    const level = flashEnvelope(f.age, f.sec) * (mode === 'reduced' ? 0.5 : 1);
    if (level <= 0.003) return;
    const c = this.cfg.flash;
    const { logicalWidth: lw, logicalHeight: lh } = this.render;
    const [r, gr, b] = hexRgb(f.color ?? ATTRS[f.attr]?.color ?? '#ffffff');
    const s = this.toScreen(f.x, f.y);
    g.save();
    const grad = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, c.radiusPx);
    grad.addColorStop(0, `rgba(255, 255, 255, ${(c.localAlpha * level).toFixed(4)})`);
    grad.addColorStop(0.45, `rgba(${r}, ${gr}, ${b}, ${(c.localAlpha * 0.6 * level).toFixed(4)})`);
    grad.addColorStop(1, `rgba(${r}, ${gr}, ${b}, 0)`);
    g.fillStyle = grad;
    g.fillRect(s.x - c.radiusPx, s.y - c.radiusPx, c.radiusPx * 2, c.radiusPx * 2);
    if (c.veilAlpha > 0) {
      g.fillStyle = `rgba(${r}, ${gr}, ${b}, ${(c.veilAlpha * level).toFixed(4)})`;
      g.fillRect(0, 0, lw, lh);
    }
    g.restore();
  }

  // 技名の帯。HUD の描画の並びに置く
  drawBanner(g) {
    const b = this.banner;
    if (!b) return;
    const c = this.cfg.banner;
    const alpha = bannerAlpha(b.age, b.holdSec, c.fadeInSec, c.fadeOutSec);
    if (alpha <= 0.003) return;
    const { logicalWidth: lw } = this.render;
    const color = b.color ?? ATTRS[b.attr]?.color ?? '#ffffff';

    g.save();
    g.globalAlpha = alpha;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `bold ${c.fontPx}px ${this.fontFamily}`;
    const w = Math.max(c.minWidthPx, g.measureText(b.title).width + 96);
    const h = c.fontPx + (b.sub ? c.subPx + 26 : 22);
    const x = Math.round(lw / 2 - w / 2 + bannerSlide(b.age, c.fadeInSec, c.slidePx));
    const y = c.y;
    const cx = x + w / 2;

    g.fillStyle = 'rgba(20, 14, 32, 0.82)';
    g.fillRect(x, y, w, h);
    g.fillStyle = color;
    g.fillRect(x, y, 6, h);
    g.fillRect(x + w - 6, y, 6, h);

    if (b.sub) {
      g.font = `${c.subPx}px ${this.fontFamily}`;
      g.fillStyle = '#d8cfe8';
      g.fillText(b.sub, cx, y + 8 + c.subPx / 2);
    }
    g.font = `bold ${c.fontPx}px ${this.fontFamily}`;
    g.lineJoin = 'round';
    g.lineWidth = 5;
    g.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    g.fillStyle = '#ffffff';
    const titleY = y + h - 10 - c.fontPx / 2;
    g.strokeText(b.title, cx, titleY);
    g.fillText(b.title, cx, titleY);
    g.restore();
  }
}