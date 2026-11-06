// File: src/ui/portraitLoader.js
import { getImage, putImage, deleteImage } from '../core/imageStore.js';

const ACCEPT = ['image/png', 'image/jpeg', 'image/webp'];
const EXT_PATTERN = /\.(png|jpe?g|webp)$/i;
const cache = new Map();   // キャラID → { image, source: 'user' | 'asset' | 'none' }
const pending = new Map();
const generations = new Map();
let cfg = { maxSide: 4096, jpegQuality: 0.95, exts: ['png', 'jpg', 'jpeg', 'webp'] };

// 起動時に1回呼ぶ
export function initPortraitLoader(B) {
  cfg = { ...cfg, ...B.portrait };
}

// 画像を1枚読む。なければ null
export function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// 拡張子を順に試して、最初に見つかった画像を返す（例: assets/portraits/kitten.jpg）
async function loadFirstImage(basePath) {
  for (const ext of cfg.exts) {
    const img = await loadImage(`${basePath}.${ext}`);
    if (img) return img;
  }
  return null;
}

// ブラウザによっては file.type が空になるため、そのときは拡張子で判定する
function isAccepted(file) {
  if (ACCEPT.includes(file.type)) return true;
  return !file.type && EXT_PATTERN.test(file.name ?? '');
}

// 上限以内なら元のファイルをそのまま保存する（再エンコードしない）。
// 超えたときだけ縮小する。JPEG は JPEG のまま、それ以外は PNG にする
async function prepare(file) {
  const bmp = await createImageBitmap(file);
  const longSide = Math.max(bmp.width, bmp.height);
  if (longSide <= cfg.maxSide) {
    bmp.close();
    return file;
  }

  const s = cfg.maxSide / longSide;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bmp.width * s));
  canvas.height = Math.max(1, Math.round(bmp.height * s));
  const g = canvas.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();

  const isJpeg = file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name ?? '');
  const type = isJpeg ? 'image/jpeg' : 'image/png';
  const quality = isJpeg ? cfg.jpegQuality : undefined;
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new Error('画像の変換に失敗しました');
  return blob;
}

// 今の階に出る敵や、設定部屋で選んだキャラについて呼ぶ
export async function preloadPortrait(id) {
  if (cache.has(id)) return;
  const generation = generations.get(id) ?? 0;
  const active = pending.get(id);
  if (active?.generation === generation) return active.promise;
  const task = (async () => {
    let result;
    try {
      const blob = await getImage(id);
      if (blob) result = { image: await createImageBitmap(blob), source: 'user' };
    } catch (error) {
      console.warn('差し替え画像の読み込みに失敗したため、標準の絵を使います', error);
    }
    if (!result) {
      const image = await loadFirstImage(`assets/portraits/${id}`);
      result = image ? { image, source: 'asset' } : { image: null, source: 'none' };
    }
    if (generations.get(id) === generation) cache.set(id, result);
    else result.image?.close?.();
  })();
  pending.set(id, { generation, promise: task });
  try {
    await task;
  } finally {
    if (pending.get(id)?.promise === task) pending.delete(id);
  }
}

// 使い終わったキャラのメモリを解放する（階の移動、設定部屋を閉じるときなど）
export function releasePortrait(id) {
  generations.set(id, (generations.get(id) ?? 0) + 1);
  cache.get(id)?.image?.close?.();
  cache.delete(id);
}

// 描画側から同期的に使う。null のときはプレースホルダを表示する
export function getPortrait(id) {
  return cache.get(id)?.image ?? null;
}

export function getPortraitSource(id) {
  return cache.get(id)?.source ?? 'none';
}

// 戻り値: { ok: true } または { ok: false, message }
export async function importPortrait(id, file) {
  if (!isAccepted(file)) {
    return { ok: false, message: 'PNG・JPEG・WebP の画像を選んでください' };
  }
  try {
    const blob = await prepare(file);
    await putImage(id, blob);
    cache.get(id)?.image?.close?.();
    cache.set(id, { image: await createImageBitmap(blob), source: 'user' });
    return { ok: true };
  } catch (error) {
    console.warn('画像の取り込みに失敗しました', error);
    return { ok: false, message: '画像を取り込めませんでした' };
  }
}

export async function resetPortrait(id) {
  await deleteImage(id);
  releasePortrait(id);
  await preloadPortrait(id);
}