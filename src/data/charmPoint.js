import { ENEMIES_BY_ID } from './enemies.js';
import { charmAttrsOf } from './charmAttrs.js';

// 仮置き。タイトルの設定画面で敵ごとに上書きできる画像上の位置（0〜1）。
export const ATTR_DEFAULT_POINTS = {
  mouth: { cx: 0.5, cy: 0.18 },
  bust: { cx: 0.5, cy: 0.38 },
  hand: { cx: 0.28, cy: 0.5 },
  hip: { cx: 0.5, cy: 0.64 },
  foot: { cx: 0.5, cy: 0.88 },
  all: { cx: 0.5, cy: 0.5 }
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round = (v, digits) => Math.round(v * 10 ** digits) / 10 ** digits;

/** @param {{zoomMin:number, zoomMax:number, defaultZoom:number}} range */
export function clampPoint({ cx, cy, zoom } = {}, range) {
  return {
    cx: clamp(Number.isFinite(cx) ? cx : 0.5, 0, 1),
    cy: clamp(Number.isFinite(cy) ? cy : 0.5, 0, 1),
    zoom: clamp(Number.isFinite(zoom) ? zoom : range.defaultZoom, range.zoomMin, range.zoomMax)
  };
}

export function defaultPointFor(speciesId, range, attrOverride) {
  const attr = attrOverride ?? charmAttrsOf(speciesId)[0] ?? ENEMIES_BY_ID[speciesId]?.attr ?? 'all';
  const base = ATTR_DEFAULT_POINTS[attr] ?? ATTR_DEFAULT_POINTS.all;
  return clampPoint({ ...base, zoom: range.defaultZoom }, range);
}

// 保存形式は「配列 [{ attr, cx, cy, zoom }]」。古い「1点だけ」「全」の保存も読めるようにする
function savedList(persistent, speciesId) {
  const saved = persistent?.charmPoints?.[speciesId];
  if (Array.isArray(saved)) return saved;
  if (saved && typeof saved === 'object') return [{ attr: 'all', ...saved }];
  return [];
}

/** その敵のチャームポイントの数だけ、属性ごとに1点ずつ返す（順番は charmAttrsOf） */
export function getCharmPoints(persistent, speciesId, range) {
  const saved = savedList(persistent, speciesId);
  const attrs = charmAttrsOf(speciesId);
  // 古い保存：「全」や属性違いで登録していた点は、空いている枠へ順番に割り当てる
  const leftovers = saved.filter((p) => !attrs.includes(p.attr));
  return attrs.map((attr) => {
    const hit = saved.find((p) => p.attr === attr) ?? leftovers.shift();
    return { attr, ...(hit ? clampPoint(hit, range) : defaultPointFor(speciesId, range, attr)) };
  });
}

export function getCharmPoint(persistent, speciesId, range) {
  const { attr, ...point } = getCharmPoints(persistent, speciesId, range)[0];
  return point;
}

export function getCharmPointForAttr(persistent, speciesId, attr, range, skillId = null) {
  return getCharmPointsForAttr(persistent, speciesId, attr, range, skillId)[0];
}

/** 技の属性に合うチャームポイント。その属性を持たない敵は、いちばん目のチャームポイント */
export function getCharmPointsForAttr(persistent, speciesId, attr, range) {
  const points = getCharmPoints(persistent, speciesId, range);
  const hit = points.find((p) => p.attr === attr) ?? points[0];
  const { attr: _a, ...point } = hit;
  return [point];
}

export function setCharmPoints(persistent, speciesId, points, range) {
  const attrs = charmAttrsOf(speciesId);
  const stored = attrs.map((attr) => {
    const p = points.find((q) => q.attr === attr) ?? { attr, ...defaultPointFor(speciesId, range, attr) };
    const v = clampPoint(p, range);
    return { attr, cx: round(v.cx, 4), cy: round(v.cy, 4), zoom: round(v.zoom, 2) };
  });
  persistent.charmPoints ??= {};
  persistent.charmPoints[speciesId] = stored;
  return stored;
}

export function setCharmPoint(persistent, speciesId, point, range) {
  const attr = charmAttrsOf(speciesId)[0];
  const others = getCharmPoints(persistent, speciesId, range).filter((p) => p.attr !== attr);
  const stored = setCharmPoints(persistent, speciesId, [{ attr, ...point }, ...others], range)[0];
  const { attr: _a, ...rest } = stored;
  return rest;
}

export function resetCharmPoint(persistent, speciesId) {
  if (persistent?.charmPoints) delete persistent.charmPoints[speciesId];
}
