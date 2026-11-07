// File: src/ui/expPopupStyle.js
// 吸い取られた経験値のポップアップの見た目。紫が基本で、量が多いほど大きく、濃い紫になる。
// ref は「主人公の今のレベルの必要EXP」。ref の maxRatio 倍で最大の見た目になる。

const STOPS = [
  { t: 0, rgb: [214, 186, 255] },     // 淡い紫
  { t: 0.45, rgb: [168, 85, 247] },   // 紫
  { t: 1, rgb: [102, 0, 170] }        // 濃い紫
];

// 吸われた経験値の文字の色（主人公側の「EXP -N」）
export const EXP_DRAIN_COLOR = '#b77cff';

function mixStops(t) {
  for (let i = 1; i < STOPS.length; i++) {
    const a = STOPS[i - 1];
    const b = STOPS[i];
    if (t > b.t) continue;
    const k = (t - a.t) / (b.t - a.t);
    return a.rgb.map((v, j) => Math.round(v + (b.rgb[j] - v) * k));
  }
  return STOPS[STOPS.length - 1].rgb;
}

const hex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/**
 * @param {number} amount 吸い取った量
 * @param {number} ref    基準量（主人公の必要EXP）
 * @returns {{ t, size, color, glow, outline, hearts, life, rise }}
 */
export function expPopupStyle(amount, ref, { minPx = 18, maxPx = 56, maxRatio = 0.5 } = {}) {
  const ratio = ref > 0 ? Math.max(0, amount) / ref : 0;
  // 少量でも差が見えるよう、平方根で伸ばす
  const t = Math.min(1, Math.sqrt(ratio / maxRatio));
  const rgb = mixStops(t);
  return {
    t,
    size: Math.round(minPx + (maxPx - minPx) * t),
    color: hex(rgb),
    glow: `rgba(${rgb.join(', ')}, ${(0.35 + 0.55 * t).toFixed(2)})`,
    outline: t > 0.6 ? 'rgba(255, 240, 250, 0.95)' : 'rgba(40, 0, 24, 0.9)',
    hearts: t < 0.25 ? 0 : t < 0.6 ? 1 : 2,
    life: 1.0 + 0.8 * t,
    rise: 40 + 30 * t
  };
}

export function expPopupText(amount) {
  return `+${Math.max(1, Math.round(amount))} EXP`;
}
