import { ENEMIES_BY_ID } from './enemies.js';

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
  const attr = attrOverride ?? ENEMIES_BY_ID[speciesId]?.attr ?? 'all';
  const base = ATTR_DEFAULT_POINTS[attr] ?? ATTR_DEFAULT_POINTS.all;
  return clampPoint({ ...base, zoom: range.defaultZoom }, range);
}

export function getCharmPoint(persistent, speciesId, range) {
  const saved = persistent?.charmPoints?.[speciesId];
  return saved ? clampPoint(saved, range) : defaultPointFor(speciesId, range);
}

/** Return all per-enemy points. Legacy single-point saves are upgraded in memory. */
export function getCharmPoints(persistent, speciesId, range) {
  const saved = persistent?.charmPoints?.[speciesId];
  if (Array.isArray(saved)) {
    const points = saved.map((point) => ({
      attr: ATTR_DEFAULT_POINTS[point.attr] ? point.attr : 'all',
      ...clampPoint(point, range)
    }));
    return points.length ? points : [defaultPointFor(speciesId, range)];
  }
  if (saved && typeof saved === 'object') {
    return [{ attr: ENEMIES_BY_ID[speciesId]?.attr ?? 'all', ...clampPoint(saved, range) }];
  }
  const attr = ENEMIES_BY_ID[speciesId]?.attr ?? 'all';
  return [{ attr, ...defaultPointFor(speciesId, range, attr) }];
}

export function getCharmPointForAttr(persistent, speciesId, attr, range, skillId = null) {
  return getCharmPointsForAttr(persistent, speciesId, attr, range, skillId)[0];
}

export function getCharmPointsForAttr(persistent, speciesId, attr, range, skillId = null) {
  const points = getCharmPoints(persistent, speciesId, range);
  // 背面すりすりは敵の手を使う拘束なので、手ポイントがあれば全部表示する。
  const hands = skillId === 'backRub' ? points.filter((point) => point.attr === 'hand') : [];
  if (hands.length) return hands.map((point) => clampPoint(point, range));
  const matching = points.filter((point) => point.attr === attr);
  if (matching.length) return matching.map((point) => clampPoint(point, range));
  const all = points.filter((point) => point.attr === 'all');
  if (all.length) return all.map((point) => clampPoint(point, range));
  return [defaultPointFor(speciesId, range, attr)];
}

export function setCharmPoints(persistent, speciesId, points, range) {
  const stored = points.map((point) => ({
    attr: ATTR_DEFAULT_POINTS[point.attr] ? point.attr : 'all',
    cx: round(clampPoint(point, range).cx, 4),
    cy: round(clampPoint(point, range).cy, 4),
    zoom: round(clampPoint(point, range).zoom, 2)
  }));
  persistent.charmPoints ??= {};
  persistent.charmPoints[speciesId] = stored;
  return stored;
}

export function setCharmPoint(persistent, speciesId, point, range) {
  const v = clampPoint(point, range);
  const stored = { cx: round(v.cx, 4), cy: round(v.cy, 4), zoom: round(v.zoom, 2) };
  persistent.charmPoints ??= {};
  persistent.charmPoints[speciesId] = stored;
  return stored;
}

export function resetCharmPoint(persistent, speciesId) {
  if (persistent?.charmPoints) delete persistent.charmPoints[speciesId];
}
