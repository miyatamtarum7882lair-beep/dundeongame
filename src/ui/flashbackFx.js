// File: src/ui/flashbackFx.js
import { B } from '../data/balance.js';
import { flashbackColorFor } from '../data/flashbackData.js';

const W = 1280;
const H = 720;
const NOISE_W = 160;
const NOISE_H = 90;

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function easeOut(t) {
  const x = clamp01(t);
  return 1 - (1 - x) * (1 - x);
}

/** 0..1 の進行度に対する全体の強さ。素早く立ち上がり、後半で減衰する。 */
export function flashEnvelope(t) {
  const x = clamp01(t);
  const attack = clamp01(x / 0.06);
  const release = x > 0.6 ? 1 - (x - 0.6) / 0.4 : 1;
  return attack * clamp01(release);
}

/** 色反転フラッシュ（0〜0.12秒と0.22〜0.32秒の2回）。 */
export function invertPulse(sec) {
  const pulse = (a, b) => (sec >= a && sec < b ? 1 - (sec - a) / (b - a) : 0);
  return Math.max(pulse(0, 0.12), 0.7 * pulse(0.22, 0.32));
}

/** チャームポイント (cx, cy: 画像内 0..1) を pivot に合わせる描画矩形。 */
export function charmTransform({
  imgW,
  imgH,
  cx,
  cy,
  zoom,
  pivot = { x: W / 2, y: H * 0.46 },
  baseH = 760,
}) {
  const s = (baseH / imgH) * zoom;
  const w = imgW * s;
  const h = imgH * s;
  return { x: pivot.x - cx * w, y: pivot.y - cy * h, w, h };
}

function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s, y - s * 0.3, x - s * 0.5, y - s, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.5, y - s, x + s, y - s * 0.3, x, y + s * 0.35);
  ctx.closePath();
}

const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;

export class FlashbackFx {
  /**
   * @param {object} deps
   * @param {(enemyId: string) => Promise<({img: CanvasImageSource & {width:number,height:number}, cx: number, cy: number, release?: () => void} | null)>} deps.loadPortrait
   *   一枚絵とチャームポイントを返す。portraitLoader.js の読込を使い、release() で解放すること。
   */
  constructor({ loadPortrait }) {
    this.loadPortrait = loadPortrait;
    this.cur = null;
    this.token = 0;
    this.noise = null;
    this.noiseAcc = 0;
  }

  isActive() {
    return Boolean(this.cur);
  }

  /** flashbackStart イベントのペイロードを渡す。mode が 'off' なら何も描かない。 */
  async start(req) {
    this.stop();
    if (req.mode === 'off') return;
    const token = ++this.token;
    const cur = { ...req, elapsed: 0, ready: false, portrait: null };
    this.cur = cur;

    const load = Promise.resolve(this.loadPortrait(req.enemyId)).catch((err) => {
      console.warn('[FlashbackFx] 一枚絵の読込に失敗。ベクター描画にフォールバック', err);
      return null;
    });
    const wait = new Promise((resolve) =>
      setTimeout(() => resolve(null), B.flashback.portraitWaitMs)
    );
    const got = await Promise.race([load, wait]);

    if (token !== this.token) {
      got?.release?.();
      return;
    }
    if (got) {
      cur.portrait = got;
    } else {
      // 間に合わなかった場合はベクター描画。遅れて届いた画像は解放する
      load.then((late) => late?.release?.());
    }
    cur.ready = true;
  }

  stop() {
    this.token += 1;
    this.cur?.portrait?.release?.();
    this.cur = null;
  }

  update(dt) {
    const c = this.cur;
    if (!c || !c.ready) return;
    c.elapsed += dt;
    if (c.elapsed >= B.flashback.durSec) {
      this.stop();
      return;
    }
    this.noiseAcc += dt;
    if (this.noiseAcc >= 1 / B.flashback.noiseFps) {
      this.noiseAcc = 0;
      this.refreshNoise();
    }
  }

  ensureNoise() {
    if (this.noise || typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = NOISE_W;
    canvas.height = NOISE_H;
    const ctx = canvas.getContext('2d');
    this.noise = { canvas, ctx, data: ctx.createImageData(NOISE_W, NOISE_H) };
  }

  refreshNoise() {
    this.ensureNoise();
    if (!this.noise) return;
    const d = this.noise.data.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() * 255;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 255;
    }
    this.noise.ctx.putImageData(this.noise.data, 0, 0);
  }

  draw(ctx) {
    const c = this.cur;
    if (!c || !c.ready) return;
    const full = c.mode === 'full';
    const dur = B.flashback.durSec;
    const t = clamp01(c.elapsed / dur);
    const env = flashEnvelope(t);
    if (env <= 0.001) return;

    const color = flashbackColorFor(c.attr);
    const zoomMax = full ? B.flashback.maxZoom : B.flashback.reducedMaxZoom;
    const zoom = 1 + (zoomMax - 1) * easeOut(c.elapsed / (dur * 0.55));
    const pivot = { x: W / 2, y: H * 0.46 };

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    // 1. 背景を暗くする
    ctx.fillStyle = `rgba(12,0,24,${((full ? 0.6 : 0.35) * env).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);

    // 2. チャームポイントの拡大（一枚絵、無ければハート）
    ctx.globalAlpha = (full ? 0.95 : 0.7) * env;
    const hasFilter = 'filter' in ctx;
    if (full && hasFilter) {
      const blur = 10 * (1 - clamp01(c.elapsed / 0.5)) + 1.5;
      ctx.filter = `blur(${blur.toFixed(1)}px)`;
    }
    if (c.portrait) {
      const { img, cx, cy } = c.portrait;
      const tr = charmTransform({ imgW: img.width, imgH: img.height, cx, cy, zoom, pivot });
      ctx.drawImage(img, tr.x, tr.y, tr.w, tr.h);
      if (full) {
        // 色ずれのゴースト
        const off = 8 * env;
        ctx.globalAlpha = 0.3 * env;
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(img, tr.x + off, tr.y, tr.w, tr.h);
        ctx.drawImage(img, tr.x - off, tr.y, tr.w, tr.h);
        ctx.globalCompositeOperation = 'source-over';
      }
    } else {
      const s = 140 * zoom;
      const grad = ctx.createRadialGradient(pivot.x, pivot.y, 0, pivot.x, pivot.y, s * 1.4);
      grad.addColorStop(0, rgba(color, 0.9));
      grad.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(pivot.x - s * 1.4, pivot.y - s * 1.4, s * 2.8, s * 2.8);
      ctx.fillStyle = rgba(color, 0.85);
      heartPath(ctx, pivot.x, pivot.y, s);
      ctx.fill();
    }
    if (hasFilter) ctx.filter = 'none';
    ctx.globalAlpha = 1;

    // 3. 桃色の色味とビネット
    ctx.fillStyle = rgba(color, (full ? 0.2 : 0.1) * env);
    ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, Math.hypot(W, H) / 2);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(20,0,30,${(0.55 * env).toFixed(3)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    // 4. 拡大の中心を示すリング
    const ringR = 60 + 160 * easeOut(c.elapsed / 0.8);
    ctx.strokeStyle = rgba(color, 0.55 * env);
    ctx.lineWidth = 2 + 4 * (1 - t);
    ctx.beginPath();
    ctx.arc(pivot.x, pivot.y, ringR, 0, Math.PI * 2);
    ctx.stroke();

    if (full) {
      // 5. ノイズ
      if (this.noise) {
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = 0.14 * env;
        ctx.globalCompositeOperation = 'overlay';
        ctx.drawImage(this.noise.canvas, 0, 0, W, H);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      // 6. 色反転フラッシュ
      const inv = invertPulse(c.elapsed);
      if (inv > 0.01) {
        ctx.globalCompositeOperation = 'difference';
        ctx.fillStyle = `rgba(255,255,255,${(0.8 * inv).toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
    ctx.restore();
  }
}