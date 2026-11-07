// File: src/ui/portraitLoader.js
import { getImage, putImage, deleteImage, requestPersistentImageStorage } from '../core/imageStore.js';

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
    img.onerror = (event) => {
      console.error(`[portrait] Image request failed: ${url}`, event);
      resolve(null);
    };
    img.src = url;
  });
}

// 拡張子を順に試して、最初に見つかった画像を返す（例: assets/portraits/kitten.jpg）
async function loadFirstImage(basePath) {
  const tried = [];
  for (const ext of cfg.exts) {
    const relative = `${basePath}.${ext}`;
    // Resolve assets from the deployment root, including when hosted under a subpath.
    // Route-relative fallbacks can hit an SPA index.html response instead of the image.
    const url = new URL(`${import.meta.env.BASE_URL}${relative}`, document.baseURI).href;
    tried.push(url);
    const img = await loadImage(url);
    if (img) return img;
  }
  console.error(`[portrait] No asset loaded for ${basePath}; tried:`, tried, 'document.baseURI:', document.baseURI);
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
    // Store a plain Blob, not a File carrying a device-specific file handle/name.
    return file.slice(0, file.size, file.type || 'application/octet-stream');
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
  // A failed asset load is transient (for example during dev-server startup).
  // Do not let a cached null permanently prevent a later retry.
  if (cache.has(id)) {
    if (cache.get(id)?.image) return;
    cache.delete(id);
  }
  const generation = generations.get(id) ?? 0;
  const active = pending.get(id);
  if (active?.generation === generation) return active.promise;
  const task = (async () => {
    let result;
    try {
      const stored = await getImage(id);
      if (stored) {
        // Normalize older File records to portable Blob records while migrating them.
        const blob = stored.slice(0, stored.size, stored.type || 'application/octet-stream');
        if (stored.constructor?.name === 'File') await putImage(id, blob);
        result = { image: await createImageBitmap(blob), source: 'user' };
      }
    } catch (error) {
      console.warn('差し替え画像の読み込みに失敗したため、標準の絵を使います', error);
    }
    if (!result) {
      const image = await loadFirstImage(`assets/portraits/${id}`);
      result = image ? { image, source: 'asset' } : { image: null, source: 'none' };
    }
    if ((generations.get(id) ?? 0) === generation && result.image) cache.set(id, result);
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
    const stored = await getImage(id);
    if (!stored || stored.size !== blob.size) throw new Error('画像をブラウザー保存領域から確認できませんでした');
    // Request persistent quota after the image is safely written and read back.
    void requestPersistentImageStorage();
    cache.get(id)?.image?.close?.();
    cache.set(id, { image: await createImageBitmap(stored), source: 'user' });
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
