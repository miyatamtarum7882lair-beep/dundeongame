// File: src/core/renderScale.js
// ドット層（低解像度・補間なし）と高解像度層（画面の実ピクセル・補間あり）を重ねる。
// どちらも、描画コードは論理座標（1280×720）で書く。

export function createLayers(container, B) {
  container.style.position = 'absolute';

  const pixel = document.createElement('canvas');
  const hires = document.createElement('canvas');
  for (const canvas of [pixel, hires]) {
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
  }
  pixel.style.imageRendering = 'pixelated';
  container.append(pixel, hires);

  pixel.width = B.render.logicalWidth;
  pixel.height = B.render.logicalHeight;

  return {
    container,
    pixel,
    hires,
    gPixel: pixel.getContext('2d'),
    gHires: hires.getContext('2d'),
    scale: 1
  };
}

// 起動時と、ウィンドウのリサイズのたびに呼ぶ
export function fitLayers(layers, B, integerOnly = false) {
  const lw = B.render.logicalWidth;
  const lh = B.render.logicalHeight;

  let scale = Math.min(window.innerWidth / lw, window.innerHeight / lh);
  if (integerOnly && scale >= 1) scale = Math.floor(scale);
  const cssW = Math.floor(lw * scale);
  const cssH = Math.floor(lh * scale);

  const style = layers.container.style;
  style.width = `${cssW}px`;
  style.height = `${cssH}px`;
  style.left = `${Math.floor((window.innerWidth - cssW) / 2)}px`;
  style.top = `${Math.floor((window.innerHeight - cssH) / 2)}px`;

  // 高解像度層は、画面の実ピクセルに合わせる（負荷を抑えるため上限あり）
  const dpr = Math.min(window.devicePixelRatio || 1, B.hires.maxDpr);
  layers.hires.width = Math.round(cssW * dpr);
  layers.hires.height = Math.round(cssH * dpr);
  layers.scale = scale;
  return layers;
}

// 毎フレームの最初に呼ぶ。戻り値の gPixel と gHires に描く
export function beginFrame(layers, B) {
  const lw = B.render.logicalWidth;
  const lh = B.render.logicalHeight;
  const { gPixel, gHires, pixel, hires } = layers;

  gPixel.setTransform(1, 0, 0, 1, 0, 0);
  gPixel.imageSmoothingEnabled = false;
  gPixel.clearRect(0, 0, pixel.width, pixel.height);

  gHires.setTransform(hires.width / lw, 0, 0, hires.height / lh, 0, 0);
  gHires.imageSmoothingEnabled = true;
  gHires.imageSmoothingQuality = 'high';
  gHires.clearRect(0, 0, lw, lh);

  return { gPixel, gHires };
}

// マウスの画面座標 → 論理座標。layers.hires を渡す
export function clientToLogical(canvas, B, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (B.render.logicalWidth / rect.width),
    y: (clientY - rect.top) * (B.render.logicalHeight / rect.height)
  };
}