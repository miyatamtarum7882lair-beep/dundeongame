// File: src/ui/spriteSheet.js
// スプライトシート（assets/sprites/<ID>.png と <ID>.json）の読み込みと描画。
// シートは npm run sprite が出力する PNG（透過・24色）。JPG は透過を持てないため使えない。
const sheets = new Map();   // キャラID → { image, meta } または null（見つからなかった）

async function readSheet(id, bust = false) {
  const q = bust ? `?v=${Date.now()}` : '';
  const jsonUrl = `assets/sprites/${id}.json${q}`;
  const pngUrl = `assets/sprites/${id}.png${q}`;
  try {
    const res = await fetch(jsonUrl);
    if (!res.ok) {
      console.warn(`[sprite] ${id}: JSON が見つかりません（HTTP ${res.status}）: ${jsonUrl}`);
      return null;
    }
    const type = res.headers.get('content-type') ?? '';
    if (type.includes('text/html')) {
      console.warn(`[sprite] ${id}: JSON の場所に index.html が返されました。assets の置き場所を確認してください: ${jsonUrl}`);
      return null;
    }
    const meta = await res.json();
    if (!meta.tags?.idle) {
      console.warn(`[sprite] ${id}: JSON に idle がありません。npm run sprite -- build ${id} をやり直してください`);
      return null;
    }

    const image = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = pngUrl;
    });
    if (!image) {
      console.warn(`[sprite] ${id}: PNG を読めませんでした: ${pngUrl}`);
      return null;
    }
    return { image, meta };
  } catch (error) {
    console.warn(`[sprite] ${id}: 読み込み中にエラーが起きました`, error);
    return null;
  }
}

// 起動時に、使うキャラごとに1回呼ぶ。force: true で読み直す（失敗しても、前に読めた絵は残す）
export async function loadSpriteSheet(id, { force = false } = {}) {
  if (force || !sheets.has(id)) {
    const next = await readSheet(id, force);
    if (next || !sheets.has(id)) sheets.set(id, next);
  }
  return sheets.get(id);
}

// 描画側から同期的に使う。null のときはプレースホルダを描く
export function getSpriteSheet(id) {
  return sheets.get(id) ?? null;
}

// そのモーションがシートに入っているか（無ければ idle で代用される）
export function hasMotion(sheet, tag) {
  return Boolean(sheet.meta.tags[tag]);
}

// 繰り返し再生（待機・歩き）。fps を省略すると、JSON のモーションごとの値を使う
export function pickFrame(sheet, tag, timeSec, fps = null) {
  const range = sheet.meta.tags[tag] ?? sheet.meta.tags.idle;
  if (!range) return 0;
  const count = range.to - range.from + 1;
  const rate = fps ?? range.fps ?? 6;
  return range.from + (Math.floor(timeSec * rate) % count);
}

// 1回だけ再生し、最後のコマで止まる（攻撃・特殊攻撃・被弾用）。elapsedSec は開始からの経過秒
export function pickFrameOnce(sheet, tag, elapsedSec, fps = null) {
  const range = sheet.meta.tags[tag] ?? sheet.meta.tags.idle;
  if (!range) return 0;
  const count = range.to - range.from + 1;
  const rate = fps ?? range.fps ?? 8;
  return range.from + Math.min(count - 1, Math.floor(elapsedSec * rate));
}

// 足元の中心 (feetX, feetY) に描く。flip: true で左右反転（左向き）
export function drawFrame(g, sheet, frame, feetX, feetY, { flip = false } = {}) {
  const { frameW, frameH } = sheet.meta;
  const top = feetY - frameH;
  g.save();
  if (flip) {
    g.translate(feetX, 0);
    g.scale(-1, 1);
    g.drawImage(sheet.image, frame * frameW, 0, frameW, frameH, -frameW / 2, top, frameW, frameH);
  } else {
    g.drawImage(sheet.image, frame * frameW, 0, frameW, frameH, feetX - frameW / 2, top, frameW, frameH);
  }
  g.restore();
}