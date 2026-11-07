// File: src/ui/charmPointEditor.js
// チャームポイント設定。敵ごとに「チャームポイントの数だけ」枠が固定で並ぶ（追加・削除・「全」は無い）。
// 画像の隅にあるチャームポイントも中心に置ける（はみ出した部分は透明）。
import { buildCharmCanvas } from './charmCanvas.js';
import { charmCrop } from './boundCharmMath.js';
import { charmAttrsOf } from '../data/charmAttrs.js';

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
 * @param {Array<{id:string, name:string}>} o.enemies
 * @param {Record<string,string>} o.attrLabels
 * @param {Record<string,string>} [o.attrColors]
 * @param {object} o.cfg B.charm（centerTransparency / innerRatio は設定値）
 * @param {(speciesId: string) => Array<{attr, cx, cy, zoom}>} o.getPoints チャームポイントの数だけ返す
 * @param {(speciesId: string, points: Array) => Array} o.setPoints 保存して、丸めた値を返す
 * @param {(speciesId: string) => Array} o.resetPoint 初期値に戻して、その値を返す
 */
export function openCharmPointEditor({
  enemies, attrLabels, attrColors = {}, cfg, loadPortrait, importPortrait, getPoints, setPoints, resetPoint,
  onTransparencyChange, onTransparencyCommit, onInnerChange, onClose
}) {
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
  const list = el('div', { width: '260px', overflowY: 'auto', borderRight: '1px solid #444', padding: '8px' });
  const center = el('div', { flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px' });
  const side = el('div', { width: '300px', borderLeft: '1px solid #444', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' });
  root.append(list, center, side);

  const title = el('div', { fontSize: '16px', fontWeight: 'bold' }, { textContent: 'チャームポイント設定' });
  const hint = el('div', { color: '#bbb', maxWidth: `${SRC}px`, textAlign: 'center' });
  const src = el('canvas', { cursor: 'crosshair', background: '#222', touchAction: 'none' }, { width: SRC, height: SRC });
  center.append(title, hint, src);

  // チャームポイントの数だけ並ぶ切り替えボタン
  const slotTitle = el('div', { color: '#ffb9dc', fontWeight: 'bold' }, { textContent: 'チャームポイント' });
  const slotBar = el('div', { display: 'flex', flexWrap: 'wrap', gap: '6px' });
  const previewTitle = el('div', {}, { textContent: '拘束時の見え方（透過込み）' });
  const preview = el('canvas', {
    width: `${PREVIEW}px`, height: `${PREVIEW}px`,
    background: 'repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 50% / 24px 24px'
  }, { width: PREVIEW, height: PREVIEW });
  const zoomLabel = el('div');
  const zoom = el('input', { width: '100%' }, {
    type: 'range', min: String(cfg.zoomMin), max: String(cfg.zoomMax), step: String(cfg.zoomStep)
  });
  const transparencyLabel = el('div');
  const transparency = el('input', { width: '100%' }, {
    type: 'range', min: '0', max: '0.9', step: '0.05', value: String(cfg.centerTransparency)
  });
  const innerLabel = el('div');
  const inner = el('input', { width: '100%' }, {
    type: 'range', min: '0.3', max: '0.9', step: '0.02', value: String(cfg.innerRatio)
  });
  const resetBtn = el('button', { padding: '6px' }, { textContent: 'この敵を初期値に戻す' });
  const portraitBtn = el('button', { padding: '6px' }, { textContent: 'この敵の画像を選ぶ' });
  const portraitInput = el('input', { display: 'none' }, { type: 'file', accept: 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp' });
  const closeBtn = el('button', { padding: '6px' }, { textContent: '閉じる（Esc）' });
  const message = el('div', { color: '#ff9ccf', minHeight: '1.2em' });
  side.append(slotTitle, slotBar, previewTitle, preview, zoomLabel, zoom, transparencyLabel, transparency,
    innerLabel, inner, portraitBtn, portraitInput, resetBtn, closeBtn, message);

  const buttons = new Map();
  for (const e of enemies) {
    const labels = charmAttrsOf(e.id).map((a) => attrLabels[a] ?? a).join('・');
    const b = el('button', {
      display: 'block', width: '100%', textAlign: 'left', padding: '6px', marginBottom: '4px',
      background: '#2a2536', color: '#fff', border: '1px solid #555', cursor: 'pointer'
    }, { textContent: `${e.name}（${labels}）` });
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
    innerLabel.textContent = `はっきり見える中心の広さ ${(cfg.innerRatio * 100).toFixed(0)}%`;
    if (!img || !point) return;

    const { w, h, scale, ox, oy } = layout();
    g.drawImage(img, ox, oy, w * scale, h * scale);
    const color = attrColors[point.attr] ?? '#ff4fa3';
    const c = charmCrop(w, h, point, cfg);
    g.save();
    g.strokeStyle = color;
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
    // はっきり見える範囲の目安
    g.setLineDash([5, 4]);
    g.beginPath();
    g.ellipse(px, py, (c.sw * scale / 2) * cfg.innerRatio, (c.sh * scale / 2) * cfg.innerRatio, 0, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
    // ほかのチャームポイントの位置
    points.forEach((other, i) => {
      if (i === activePointIndex) return;
      const x2 = ox + other.cx * w * scale;
      const y2 = oy + other.cy * h * scale;
      g.fillStyle = attrColors[other.attr] ?? '#ffffff';
      g.globalAlpha = 0.8;
      g.beginPath();
      g.arc(x2, y2, 6, 0, Math.PI * 2);
      g.fill();
      g.font = 'bold 13px sans-serif';
      g.fillText(attrLabels[other.attr] ?? other.attr, x2 + 8, y2 - 6);
      g.globalAlpha = 1;
    });
    g.restore();

    p.drawImage(buildCharmCanvas(img, point, { ...cfg, centerTransparency: cfg.centerTransparency, innerRatio: cfg.innerRatio, outputPx: PREVIEW }), 0, 0, PREVIEW, PREVIEW);
  }

  function syncPointControls() {
    slotBar.replaceChildren();
    points.forEach((entry, index) => {
      const active = index === activePointIndex;
      const color = attrColors[entry.attr] ?? '#ff9ccf';
      const b = el('button', {
        padding: '6px 14px', cursor: 'pointer', borderRadius: '999px', color: '#fff',
        border: `2px solid ${color}`, background: active ? color : '#2a2536', fontWeight: active ? 'bold' : 'normal'
      }, { textContent: attrLabels[entry.attr] ?? entry.attr });
      b.addEventListener('click', () => selectSlot(index));
      slotBar.append(b);
    });
    hint.textContent = points.length > 1
      ? `チャームポイントが${points.length}つあります。右のボタンで切り替えて、それぞれの中心をクリック／ドラッグで決めます`
      : '1枚絵をクリック／ドラッグで中心を決めます（画像の隅でも中心に置けます）';
  }

  function selectSlot(index) {
    commit();
    activePointIndex = index;
    point = { ...points[activePointIndex] };
    zoom.value = String(point.zoom);
    syncPointControls();
    redraw();
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
      message.textContent = loaded ? '' : `${id} の1枚絵がありません。画像を選んで登録できます`;
    } catch (error) {
      if (token !== loadToken) return;
      console.error('1枚絵の読み込みに失敗しました', error);
      message.textContent = '画像を読み込めませんでした';
    }
    redraw();
  }

  function commit() {
    if (!currentId || !point) return;
    points[activePointIndex] = { ...point };
    points = setPoints(currentId, points).map((entry) => ({ ...entry }));
    point = { ...points[activePointIndex] };
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
  inner.addEventListener('input', () => {
    onInnerChange?.(Number(inner.value));
    redraw();
  });
  inner.addEventListener('change', () => onTransparencyCommit?.());
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
