import { charmCrop, charmAlphaAt, drawCrop } from './boundCharmMath.js';

const MAX_CACHED_PER_IMAGE = 16;
const cache = new WeakMap();

function imageSize(img) {
  return { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
}

/** 切り出し画像と外縁の透過マスクを合成したキャンバスを返す。 */
export function buildCharmCanvas(img, point, cfg, side = 'front') {
  const horizontal = side === 'front' || side === 'back';
  const key = [point.cx, point.cy, point.zoom, cfg.outputPx, cfg.centerTransparency, cfg.innerRatio, cfg.edgeSharpness, horizontal].join('|');
  let perImage = cache.get(img);
  if (!perImage) {
    perImage = new Map();
    cache.set(img, perImage);
  }
  const hit = perImage.get(key);
  if (hit) return hit;

  const size = cfg.outputPx;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  const { w, h } = imageSize(img);
  const crop = charmCrop(w, h, point, cfg);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  drawCrop(g, img, w, h, crop, 0, 0, size, size);

  g.globalCompositeOperation = 'destination-in';
  const ovalX = horizontal ? 1 : 0.72;
  const ovalY = horizontal ? 0.72 : 1;
  g.translate(size / 2, size / 2);
  g.scale(ovalX, ovalY);
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, size / 2);
  const steps = 24;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    grad.addColorStop(t, `rgba(0,0,0,${charmAlphaAt(t, cfg).toFixed(4)})`);
  }
  g.fillStyle = grad;
  g.fillRect(-size / 2, -size / 2, size, size);
  g.globalCompositeOperation = 'source-over';

  if (perImage.size >= MAX_CACHED_PER_IMAGE) perImage.delete(perImage.keys().next().value);
  perImage.set(key, canvas);
  return canvas;
}
