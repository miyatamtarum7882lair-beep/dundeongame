import { bindSideOf, placementFor } from './boundCharmMath.js';
import { buildCharmCanvas } from './charmCanvas.js';

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

  addExpPopup(unit, amount) {
    if (!this.entries.has(unit)) return false;
    this.expPopups.push({ unit, text: `+${Math.max(1, Math.round(amount))} EXP`, age: 0 });
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
    this.expPopups = this.expPopups.filter((popup) => popup.age < 1.05 && this.entries.has(popup.unit));
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
        const t = popup.age / 1.05;
        g.save();
        g.globalAlpha = Math.min(1, (1 - t) * 1.8);
        g.font = 'bold 17px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.lineJoin = 'round';
        g.lineWidth = 4;
        g.strokeStyle = 'rgba(0,0,0,0.9)';
        g.fillStyle = '#ffd36b';
        const x = base.x + base.size / 2;
        const y = base.y + base.size / 2 - t * 42;
        g.strokeText(popup.text, x, y);
        g.fillText(popup.text, x, y);
        g.restore();
      }
    }
  }
}
