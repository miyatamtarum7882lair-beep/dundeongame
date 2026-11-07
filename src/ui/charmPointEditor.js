// File: src/ui/charmPointEditor.js
import { buildCharmCanvas } from './charmCanvas.js';
import { charmCrop } from './boundCharmMath.js';
import { defaultPointFor } from '../data/charmPoint.js';

const SRC = 520;       // 1枚絵の表示領域（正方形）
const PREVIEW = 256;

function el(tag, style = {}, props = {}) {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  Object.assign(node, props);
  return node;
}

/**
 * @param {object} o
 * @param {Array<{id:string, name:string, attr:string}>} o.enemies
 * @param {Record<string,string>} o.attrLabels
 * @param {object} o.cfg B.charm
 * @param {(speciesId: string) => Promise<CanvasImageSource>} o.loadPortrait
 * @param {(speciesId: string) => {cx:number, cy:number, zoom:number}} o.getPoint
 * @param {(speciesId: string, point: object) => {cx:number, cy:number, zoom:number}} o.setPoint 保存して、丸めた値を返す
 * @param {(speciesId: string) => {cx:number, cy:number, zoom:number}} o.resetPoint 初期値に戻して、その値を返す
 * @param {() => void} [o.onClose]
 */
export function openCharmPointEditor({ enemies, attrLabels, cfg, loadPortrait, importPortrait, getPoints, setPoints, resetPoint, onTransparencyChange, onTransparencyCommit, onClose }) {
  let currentId = null;
  let img = null;
  let point = null;
  let points = [];
  let activePointIndex = 0;
  let dragging = false;
  let loadToken = 0;

  const root = el('div', {
    position: 'fixed', inset: '0', zIndex: '1000', display: 'flex',
    background: 'rgba(10,8,16,0.96)', color: '#fff', font: '14px sans-serif'
  });
  const list = el('div', { width: '240px', overflowY: 'auto', borderRight: '1px solid #444', padding: '8px' });
  const center = el('div', { flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px' });
  const side = el('div', { width: '300px', borderLeft: '1px solid #444', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' });
  root.append(list, center, side);

  const title = el('div', { fontSize: '16px', fontWeight: 'bold' }, { textContent: 'チャームポイント設定' });
  const hint = el('div', { color: '#bbb' }, { textContent: '1枚絵をクリック／ドラッグで中心を決めます' });
  const src = el('canvas', { cursor: 'crosshair', background: '#222', touchAction: 'none' }, { width: SRC, height: SRC });
  center.append(title, hint, src);

  const previewTitle = el('div', {}, { textContent: '拘束時の見え方（透過込み）' });
  const preview = el('canvas', {
    width: `${PREVIEW}px`, height: `${PREVIEW}px`,
    background: 'repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 50% / 24px 24px'
  }, { width: PREVIEW, height: PREVIEW });
  const zoomLabel = el('div');
  const zoom = el('input', { width: '100%' }, {
    type: 'range', min: String(cfg.zoomMin), max: String(cfg.zoomMax), step: String(cfg.zoomStep)
  });
  const pointPicker = el('select', { width: '100%', padding: '6px' });
  const pointAttr = el('select', { width: '100%', padding: '6px' });
  for (const [attr, label] of Object.entries(attrLabels)) {
    pointAttr.append(el('option', {}, { value: attr, textContent: label }));
  }
  const addPointBtn = el('button', { padding: '6px' }, { textContent: 'ポイントを追加' });
  const removePointBtn = el('button', { padding: '6px' }, { textContent: '選択中を削除' });
  const transparencyLabel = el('div');
  const transparency = el('input', { width: '100%' }, {
    type: 'range', min: '0', max: '0.9', step: '0.05', value: String(cfg.centerTransparency)
  });
  const resetBtn = el('button', { padding: '6px' }, { textContent: '初期値に戻す' });
  const portraitBtn = el('button', { padding: '6px' }, { textContent: 'この敵の画像を選ぶ' });
  const portraitInput = el('input', { display: 'none' }, { type: 'file', accept: 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp' });
  const closeBtn = el('button', { padding: '6px' }, { textContent: '閉じる（Esc）' });
  const message = el('div', { color: '#ff9ccf', minHeight: '1.2em' });
  side.append(pointPicker, pointAttr, addPointBtn, removePointBtn, previewTitle, preview, zoomLabel, zoom, transparencyLabel, transparency, portraitBtn, portraitInput, resetBtn, closeBtn, message);

  const buttons = new Map();
  for (const e of enemies) {
    const b = el('button', {
      display: 'block', width: '100%', textAlign: 'left', padding: '6px', marginBottom: '4px',
      background: '#2a2536', color: '#fff', border: '1px solid #555', cursor: 'pointer'
    }, { textContent: `${e.name}（${attrLabels[e.attr] ?? e.attr}）` });
    b.addEventListener('click', () => void select(e.id));
    list.append(b);
    buttons.set(e.id, b);
  }

  function imageSize() {
    return { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
  }

  function layout() {
    const { w, h } = imageSize();
    const scale = Math.min(SRC / w, SRC / h);
    return { w, h, scale, ox: (SRC - w * scale) / 2, oy: (SRC - h * scale) / 2 };
  }

  function redraw() {
    const g = src.getContext('2d');
    g.clearRect(0, 0, SRC, SRC);
    const p = preview.getContext('2d');
    p.clearRect(0, 0, PREVIEW, PREVIEW);
    zoomLabel.textContent = point ? `拡大率 ×${point.zoom.toFixed(2)}` : '';
    transparencyLabel.textContent = `中心の透過率 ${(cfg.centerTransparency * 100).toFixed(0)}%`;
    if (!img || !point) return;

    const { w, h, scale, ox, oy } = layout();
    g.drawImage(img, ox, oy, w * scale, h * scale);
    const c = charmCrop(w, h, point, cfg);
    g.strokeStyle = '#ff4fa3';
    g.lineWidth = 2;
    g.strokeRect(ox + c.sx * scale, oy + c.sy * scale, c.sw * scale, c.sh * scale);
    const px = ox + point.cx * w * scale;
    const py = oy + point.cy * h * scale;
    g.beginPath();
    g.moveTo(px - 10, py);
    g.lineTo(px + 10, py);
    g.moveTo(px, py - 10);
    g.lineTo(px, py + 10);
    g.stroke();

    p.drawImage(buildCharmCanvas(img, point, { ...cfg, outputPx: PREVIEW }), 0, 0, PREVIEW, PREVIEW);
  }

  function syncPointControls() {
    pointPicker.replaceChildren();
    points.forEach((entry, index) => {
      pointPicker.append(el('option', {}, {
        value: String(index),
        textContent: `${attrLabels[entry.attr] ?? entry.attr} ${index + 1}`
      }));
    });
    pointPicker.value = String(activePointIndex);
    pointAttr.value = point?.attr ?? 'all';
    addPointBtn.disabled = !currentId;
    removePointBtn.disabled = points.length <= 1;
  }

  async function select(id) {
    currentId = id;
    const token = ++loadToken;
    for (const [bid, b] of buttons) b.style.background = bid === id ? '#6b2f55' : '#2a2536';
    message.textContent = '読み込み中…';
    img = null;
    points = getPoints(id).map((entry) => ({ ...entry }));
    activePointIndex = 0;
    point = { ...points[activePointIndex] };
    zoom.value = String(point.zoom);
    syncPointControls();
    redraw();
    try {
      const loaded = await loadPortrait(id);
      if (token !== loadToken) return;
      img = loaded;
      message.textContent = loaded ? '' : 'No portrait for ' + id + '. Choose a file to register it.';
    } catch (error) {
      if (token !== loadToken) return;
      console.error('1枚絵の読み込みに失敗しました', error);
      message.textContent = '画像を読み込めませんでした';
    }
    if (!img && token === loadToken) {
      message.textContent = 'No portrait loaded for ' + id + '. Check the matching image in public/assets/portraits or choose a file to register it.';
    }
    redraw();
  }

  function commit() {
    if (!currentId || !point) return;
    point.attr = pointAttr.value;
    points[activePointIndex] = { ...point };
    points = setPoints(currentId, points).map((entry) => ({ ...entry }));
    redraw();
  }

  function moveTo(ev) {
    if (!img || !point) return;
    const { w, h, scale, ox, oy } = layout();
    point.cx = Math.min(1, Math.max(0, (ev.offsetX - ox) / (w * scale)));
    point.cy = Math.min(1, Math.max(0, (ev.offsetY - oy) / (h * scale)));
    redraw();
  }

  src.addEventListener('pointerdown', (ev) => {
    dragging = true;
    src.setPointerCapture(ev.pointerId);
    moveTo(ev);
  });
  src.addEventListener('pointermove', (ev) => {
    if (dragging) moveTo(ev);
  });
  src.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    commit();
  });
  zoom.addEventListener('input', () => {
    if (!point) return;
    point.zoom = Number(zoom.value);
    redraw();
  });
  zoom.addEventListener('change', commit);
  pointPicker.addEventListener('change', () => {
    commit();
    activePointIndex = Number(pointPicker.value);
    point = { ...points[activePointIndex] };
    pointAttr.value = point.attr;
    zoom.value = String(point.zoom);
    syncPointControls();
    redraw();
  });
  pointAttr.addEventListener('change', () => {
    if (!point) return;
    point.attr = pointAttr.value;
    commit();
    syncPointControls();
  });
  addPointBtn.addEventListener('click', () => {
    const attr = pointAttr.value || Object.keys(attrLabels)[0];
    if (!currentId || !attr) return;
    point = { attr, ...defaultPointFor(currentId, cfg, attr) };
    points.push(point);
    activePointIndex = points.length - 1;
    zoom.value = String(point.zoom);
    points = setPoints(currentId, points).map((entry) => ({ ...entry }));
    point = { ...points[activePointIndex] };
    syncPointControls();
    redraw();
  });
  removePointBtn.addEventListener('click', () => {
    if (!currentId || points.length <= 1) return;
    points.splice(activePointIndex, 1);
    activePointIndex = Math.max(0, activePointIndex - 1);
    points = setPoints(currentId, points).map((entry) => ({ ...entry }));
    point = { ...points[activePointIndex] };
    pointAttr.value = point.attr;
    zoom.value = String(point.zoom);
    syncPointControls();
    redraw();
  });
  portraitBtn.addEventListener('click', () => {
    if (!currentId) return;
    portraitInput.value = '';
    portraitInput.click();
  });
  portraitInput.addEventListener('change', async () => {
    const file = portraitInput.files?.[0];
    if (!file || !currentId || !importPortrait) return;
    const id = currentId;
    const token = loadToken;
    message.textContent = '画像を登録しています…';
    portraitBtn.disabled = true;
    try {
      const loaded = await importPortrait(id, file);
      if (token !== loadToken) return;
      img = loaded;
      message.textContent = loaded ? `${file.name} を登録しました` : '登録しましたが画像を表示できません';
      redraw();
    } catch (error) {
      if (token !== loadToken) return;
      console.error('Portrait import failed', error);
      message.textContent = error.message || '画像を登録できませんでした';
    } finally {
      portraitBtn.disabled = false;
    }
  });
  transparency.addEventListener('input', () => {
    onTransparencyChange?.(Number(transparency.value));
    redraw();
  });
  transparency.addEventListener('change', () => onTransparencyCommit?.());
  resetBtn.addEventListener('click', () => {
    if (!currentId) return;
    points = resetPoint(currentId).map((entry) => ({ ...entry }));
    activePointIndex = 0;
    point = { ...points[activePointIndex] };
    zoom.value = String(point.zoom);
    syncPointControls();
    redraw();
  });

  // 設定画面を開いている間は、ゲーム側のキー入力に届かせない（Esc だけ閉じる）
  function onKey(ev) {
    ev.stopPropagation();
    if (ev.key === 'Escape') {
      ev.preventDefault();
      close();
    }
  }
  window.addEventListener('keydown', onKey, true);

  function close() {
    window.removeEventListener('keydown', onKey, true);
    root.remove();
    onClose?.();
  }
  closeBtn.addEventListener('click', close);

  document.body.append(root);
  if (enemies.length > 0) void select(enemies[0].id);
  return { close };
}

