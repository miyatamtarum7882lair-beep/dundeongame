import { bindSideOf, placementFor } from './boundCharmMath.js';
import { buildCharmCanvas } from './charmCanvas.js';
import { expPopupStyle, expPopupText } from './expPopupStyle.js';
import { drawShape } from './fxShapes.js';

const smooth = (t) => t * t * (3 - 2 * t);

export class BoundCharmView {
  constructor({ cfg, getPoint, loadPortrait, getHero, getAnchor }) {
    this.cfg = cfg;
    this.getPoint = getPoint;
    this.loadPortrait = loadPortrait;
    this.getHero = getHero;
    this.getAnchor = getAnchor;
    this.entries = new Map();
    this.pending = new Set();
    this.wanted = new Set();
    this.expPopups = [];
  }

  // 拘束中に敵が吸い取った経験値。量が多いほど大きく濃く出す（ref は主人公の必要EXP）
  addExpPopup(unit, amount, ref = 0, fontFamily = 'sans-serif') {
    if (!this.entries.has(unit)) return false;
    const style = expPopupStyle(amount, ref);
    const n = this.expPopups.filter((p) => p.unit === unit).length;
    this.expPopups.push({
      unit, text: expPopupText(amount), style, age: 0, life: style.life,
      font: `900 ${style.size}px ${fontFamily}`, jitter: (n % 3 - 1) * 40
    });
    return true;
  }

  /** Match overlays to current binders; their side stays fixed until released. */
  async sync(binders) {
    const units = binders.map((binder) => binder.unit);
    this.wanted = new Set(units);
    for (const u of [...this.entries.keys()]) {
      if (!this.wanted.has(u)) this.entries.delete(u);
    }
    const added = binders.filter(({ unit }) => !this.entries.has(unit) && !this.pending.has(unit));
    await Promise.all(added.map((binder) => this.load(binder)));
  }

  async load({ unit, attr, skillId }) {
    this.pending.add(unit);
    try {
      const img = await this.loadPortrait(unit.speciesId);
      if (!img || !this.wanted.has(unit)) return;
      const hero = this.getHero();
      const side = bindSideOf(unit.tx - hero.tx, unit.ty - hero.ty, hero.dir);
      const points = this.getPoint(unit.speciesId, attr, skillId);
      const canvases = points.map((point) => buildCharmCanvas(img, point, this.cfg, side));
      this.entries.set(unit, { side, canvases, age: 0 });
    } finally {
      this.pending.delete(unit);
    }
  }

  clear() {
    this.wanted = new Set();
    this.entries.clear();
    this.expPopups = [];
  }

  update(dt) {
    for (const e of this.entries.values()) e.age += dt;
    for (const popup of this.expPopups) popup.age += dt;
    this.expPopups = this.expPopups.filter((popup) => popup.age < popup.life && this.entries.has(popup.unit));
  }

  draw(g) {
    if (this.entries.size === 0) return;
    const anchor = this.getAnchor?.() ?? { x: this.cfg.anchorX, y: this.cfg.anchorY };
    const place = {
      anchorX: anchor.x,
      anchorY: anchor.y,
      offsetPx: this.cfg.offsetPx,
      sideOffsetPx: this.cfg.sideOffsetPx,
      sizePx: this.cfg.sizePx
    };
    for (const e of this.entries.values()) {
      const a = smooth(Math.min(1, e.age / this.cfg.fadeInSec));
      if (a <= 0) continue;
      const base = placementFor(e.side, place);
      e.canvases.forEach((canvas, index) => {
        const spread = (index - (e.canvases.length - 1) / 2) * this.cfg.sizePx * 0.58;
        const horizontal = e.side === 'front' || e.side === 'back';
        g.save();
        g.globalAlpha = a;
        g.drawImage(canvas, base.x + (horizontal ? spread : 0), base.y + (horizontal ? 0 : spread), base.size, base.size);
        g.restore();
      });
      for (const popup of this.expPopups) {
        if (popup.unit !== e.unit) continue;
        const st = popup.style;
        const t = popup.age / popup.life;
        const popIn = Math.min(1, popup.age / 0.16);
        const pop = (0.5 + 0.5 * popIn) * (1 + (1 - popIn) * 0.5 * st.t);
        const x = base.x + base.size / 2 + popup.jitter;
        const y = base.y + base.size / 2 - (1 - Math.pow(1 - t, 2)) * st.rise * 1.4;
        g.save();
        g.translate(x, y);
        g.scale(pop, pop);
        g.globalAlpha = Math.max(0, Math.min(1, (1 - t) / 0.3));
        g.font = popup.font;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.lineJoin = 'round';
        g.lineWidth = 4 + st.size * 0.12;
        g.strokeStyle = 'rgba(70, 0, 36, 0.92)';
        g.strokeText(popup.text, 0, 0);
        g.shadowColor = st.glow;
        g.shadowBlur = 8 + 24 * st.t;
        g.fillStyle = st.color;
        g.fillText(popup.text, 0, 0);
        g.shadowBlur = 0;
        if (st.hearts > 0) {
          const w = g.measureText(popup.text).width / 2 + st.size * 0.45;
          const beat = 1 + 0.15 * Math.sin(popup.age * 14);
          for (let i = 0; i < st.hearts; i++) {
            g.save();
            g.translate((i === 0 ? -1 : 1) * w, 0);
            g.scale(beat, beat);
            drawShape(g, 'heart', st.size * 0.36, st.color);
            g.restore();
          }
        }
        g.restore();
      }
    }
  }
}
