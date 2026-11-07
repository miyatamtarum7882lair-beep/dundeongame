// File: src/ui/flashbackFx.js
import {
  envelope, visualParams, buildFilter, motionFor,
  beatTimes, beatScale, ringProgress, smallHeartAlpha
} from '../core/flashbackMath.js';
import { tintFor } from '../data/flashbackRules.js';

const NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;

const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const lighten = (c, k) => c.map((v) => Math.round(v + (255 - v) * k));

function svgNode(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

// 中心 (cx, cy)、s は幅のおよそ半分
function heartPath(g, cx, cy, s) {
  g.beginPath();
  g.moveTo(cx, cy + s * 0.9);
  g.bezierCurveTo(cx - s * 1.3, cy + s * 0.1, cx - s * 0.9, cy - s * 0.9, cx, cy - s * 0.35);
  g.bezierCurveTo(cx + s * 0.9, cy - s * 0.9, cx + s * 1.3, cy + s * 0.1, cx, cy + s * 0.9);
  g.closePath();
}

export class FlashbackFx {
  /**
   * @param {object} o
   * @param {object} o.cfg B.flashbackFx
   * @param {{logicalWidth:number, logicalHeight:number}} o.render B.render
   * @param {() => Array<HTMLElement>} [o.getTargets] 暗転・ぼかし・ゆがみをかけるキャンバス（ドット絵レイヤー）
   */
  constructor({ cfg, render, getTargets = () => [] }) {
    this.cfg = cfg;
    this.render = render;
    this.getTargets = getTargets;
    this.active = null;
    this.saved = new Map();
    this.warpEl = null;
    this.seq = 0;
  }

  /** @returns {number} この演出のID。0 は演出なし。絵を後から渡すときに使う */
  start({ kind, attr, mode, durationSec }) {
    const p = visualParams(mode ?? 'full', this.cfg);
    if (!p || !(durationSec > 0)) {
      this.cancel();
      return 0;
    }
    this.seq += 1;
    this.active = {
      id: this.seq,
      mode,
      attr,
      age: 0,
      total: durationSec,
      p,
      art: null,
      tint: tintFor(attr),
      scale: this.cfg.kindScale?.[kind] ?? 1,
      hearts: p.hearts ? this.buildHearts(p.hearts, durationSec) : null
    };
    return this.seq;
  }

  // 拍の時刻と、拍ごとに飛び出す小さなハートを、開始時に決める
  buildHearts(h, total) {
    const times = beatTimes(this.cfg.riseSec, h);
    const small = [];
    for (let i = 0; i < h.smallCount; i += 1) {
      const t0 = times[i % times.length] + rand(0, 0.08);
      small.push({
        t0,
        life: Math.min(h.smallLifeSec * rand(0.85, 1.15), Math.max(0.2, total - t0 - 0.05)),
        angle: rand(0, TAU),
        reach: rand(h.smallReachPx[0], h.smallReachPx[1]),
        size: rand(h.smallSizePx[0], h.smallSizePx[1]),
        sway: rand(0, TAU)
      });
    }
    return { times, small };
  }

  /** 読み込みが終わった絵を渡す。別の演出に切り替わっていたら無視する */
  setArt(id, canvas) {
    if (this.active && this.active.id === id) this.active.art = canvas;
  }

  cancel() {
    this.active = null;
    for (const [el, prev] of this.saved) {
      if (el?.style) el.style.filter = prev;
    }
    this.saved.clear();
    this.warpEl?.setAttribute('scale', '0');
  }

  level(a) {
    const holdSec = a.mode === 'reduced' ? 0 : this.cfg.holdSec ?? 0;
    return envelope(a.age, a.total, this.cfg.riseSec, holdSec) * a.scale;
  }

  update(dtSec) {
    const a = this.active;
    if (!a) return;
    a.age += dtSec;
    if (a.age >= a.total) {
      this.cancel();
      return;
    }
    this.applyCss(this.level(a));
  }

  applyCss(level) {
    const p = this.active.p;
    const warp = p.warpScale * level;
    const filter = buildFilter({
      blurPx: p.blurPx * level,
      invert: p.invert * level,
      desaturate: p.desaturate * level,
      brightness: 1 - p.dim * level,
      warp
    });
    if (p.warpScale > 0) this.setWarp(warp);
    for (const el of this.getTargets()) {
      if (!el?.style) continue;
      if (!this.saved.has(el)) this.saved.set(el, el.style.filter);
      el.style.filter = filter || this.saved.get(el) || '';
    }
  }

  setWarp(scale) {
    if (!this.warpEl) {
      const svg = svgNode('svg', { width: 0, height: 0, 'aria-hidden': 'true' });
      svg.style.position = 'absolute';
      const filter = svgNode('filter', {
        id: 'fbWarp', x: 0, y: 0, width: '100%', height: '100%',
        'color-interpolation-filters': 'sRGB'
      });
      filter.append(
        svgNode('feTurbulence', {
          type: 'fractalNoise', baseFrequency: '0.006 0.04', numOctaves: 1, seed: 3, result: 'n'
        })
      );
      this.warpEl = svgNode('feDisplacementMap', {
        in: 'SourceGraphic', in2: 'n', scale: 0, xChannelSelector: 'R', yChannelSelector: 'G'
      });
      filter.append(this.warpEl);
      svg.append(filter);
      document.body.append(svg);
    }
    this.warpEl.setAttribute('scale', scale.toFixed(2));
  }

  // チャームポイントの絵。HUD より下に描く（ドット絵レイヤーの直後）
  drawArt(g) {
    const a = this.active;
    if (!a) return;
    const level = this.level(a);
    if (level <= 0.003) return;
    const art = this.cfg.art;
    const ap = a.p.art;
    const { logicalWidth: lw, logicalHeight: lh } = this.render;
    const cx = lw / 2;
    const cy = lh / 2;
    const [r, gr, b] = a.tint;

    g.save();

    // 属性色の淡い光（通常合成）
    if (ap.glowAlpha > 0) {
      const radius = art.sizePx * 0.7;
      const grad = g.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, `rgba(${r}, ${gr}, ${b}, ${(ap.glowAlpha * level).toFixed(4)})`);
      grad.addColorStop(1, `rgba(${r}, ${gr}, ${b}, 0)`);
      g.fillStyle = grad;
      g.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }

    // 残像（遅れて追う）→ 本体の順に重ねる
    if (a.art && ap.alpha > 0) {
      for (let i = ap.echoCount; i >= 0; i -= 1) {
        const alpha = (i === 0 ? ap.alpha : ap.echoAlpha / i) * level;
        if (alpha <= 0.003) continue;
        const m = motionFor(a.attr, Math.max(0, a.age - i * art.echoLagSec), a.total, art, ap.still);
        const size = art.sizePx * m.scale * (1 + 0.07 * i);
        g.globalAlpha = Math.min(1, alpha);
        g.drawImage(a.art, cx + m.dx - size / 2, cy + m.dy - size / 2, size, size);
      }
    }

    g.restore();
  }

  // ドキッとするハート（大きなハートの鼓動・波紋・飛び出す小さなハート）。絵の上に重ねる
  drawOverlay(g) {
    const a = this.active;
    if (!a || !a.hearts) return;
    const h = a.p.hearts;
    const { times, small } = a.hearts;
    const level = this.level(a);
    const { logicalWidth: lw, logicalHeight: lh } = this.render;
    const cx = lw / 2;
    const cy = lh / 2;
    const base = a.tint;
    const light = lighten(base, 0.45);
    const lightRgb = `${light[0]}, ${light[1]}, ${light[2]}`;
    const baseRgb = `${base[0]}, ${base[1]}, ${base[2]}`;

    g.save();

    // 波紋: 拍ごとに、ハート形の輪が外へ広がって消える
    g.lineJoin = 'round';
    for (const t of times) {
      const life = Math.min(h.ringLifeSec, Math.max(0.1, a.total - t - 0.05));
      const u = ringProgress(a.age, t, life);
      if (u == null) continue;
      const ease = 1 - (1 - u) * (1 - u);
      const half = (h.sizePx * 0.45) + (h.ringMaxPx * 0.5 - h.sizePx * 0.45) * ease;
      const alpha = h.ringAlpha * (1 - u) * (1 - u) * a.scale;
      if (alpha <= 0.003) continue;
      g.strokeStyle = `rgba(${lightRgb}, ${alpha.toFixed(4)})`;
      g.lineWidth = Math.max(1, h.lineWidthPx * 0.6 * (1 - u));
      heartPath(g, cx, cy, half);
      g.stroke();
    }

    // 大きなハート: 淡い塗りと縁取り。拍の瞬間に大きさだけ膨らむ
    if (level > 0.003) {
      const s = (h.sizePx / 2) * beatScale(a.age, times, h);
      heartPath(g, cx, cy, s);
      g.fillStyle = `rgba(${baseRgb}, ${(h.fillAlpha * level).toFixed(4)})`;
      g.fill();
      g.strokeStyle = `rgba(${lightRgb}, ${(h.lineAlpha * level).toFixed(4)})`;
      g.lineWidth = h.lineWidthPx;
      g.stroke();
    }

    // 小さなハート: 拍のタイミングで中央から飛び出し、漂いながら消える
    g.fillStyle = `rgb(${lightRgb})`;
    for (const q of small) {
      const u = (a.age - q.t0) / q.life;
      const alpha = h.smallAlpha * smallHeartAlpha(u);
      if (alpha <= 0.003) continue;
      const ease = 1 - (1 - u) * (1 - u);
      const x = cx + Math.cos(q.angle) * q.reach * ease + Math.sin(q.sway + a.age * 3) * 8 * u;
      const y = cy + Math.sin(q.angle) * q.reach * 0.8 * ease - 36 * u;
      g.globalAlpha = Math.min(1, alpha);
      heartPath(g, x, y, (q.size / 2) * (0.6 + 0.5 * ease));
      g.fill();
    }

    g.restore();
  }
}
