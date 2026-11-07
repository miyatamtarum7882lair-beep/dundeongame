// File: src/core/flashbackMath.js
const SAFE_MAX = 0.3;   // 発光・反転・大きな塗りの上限
const DIM_MAX = 0.5;    // ドット絵レイヤーを暗くする量の上限（暗転であり、発光ではない）
const TAU = Math.PI * 2;
const cap = (v) => Math.min(SAFE_MAX, Math.max(0, v ?? 0));
const clamp01 = (v) => Math.min(1, Math.max(0, v ?? 0));

/** 演出の長さ（秒）。off は 0 */
export function durationFor(kind, mode, cfg) {
  if (mode === 'off') return 0;
  const base = cfg.durationSec[kind] ?? 1;
  return mode === 'reduced' ? base * cfg.reducedScale : base;
}

/**
 * 0 → 1（立ち上がり）→ 保持 → 0（ゆっくり減衰）の山形。1回だけで、点滅しない。
 */
export function envelope(age, total, riseSec, holdSec = 0) {
  if (!(total > 0) || age <= 0 || age >= total) return 0;
  if (age < riseSec) {
    const t = age / riseSec;
    return t * t * (3 - 2 * t);
  }
  const decayStart = riseSec + holdSec;
  if (age < decayStart) return 1;
  const u = (age - decayStart) / Math.max(1e-6, total - decayStart);
  if (u >= 1) return 0;
  return (1 - u) * (1 - u);
}

/** 設定モードごとの映像パラメータ。off は null */
export function visualParams(mode, cfg) {
  if (mode === 'off') return null;
  const art = cfg.art ?? {};
  if (mode === 'reduced') {
    const r = cfg.reduced;
    return {
      blurPx: 0,
      invert: 0,
      desaturate: 0,
      dim: 0,
      warpScale: 0,
      art: { alpha: clamp01(r.artAlpha), echoAlpha: 0, echoCount: 0, glowAlpha: 0, still: true },
      hearts: null
    };
  }
  const f = cfg.full;
  const h = cfg.hearts ?? {};
  const beats = Math.max(0, Math.min(2, Math.floor(h.beats ?? 0)));
  const range = (v, d) => (Array.isArray(v) ? [v[0], Math.max(v[0], v[1])] : d);
  return {
    blurPx: f.blurPx,
    invert: cap(f.invert),
    desaturate: clamp01(f.desaturate),
    dim: Math.min(DIM_MAX, Math.max(0, f.dim ?? 0)),
    warpScale: cfg.warp?.enabled ? f.warpScale : 0,
    art: {
      alpha: clamp01(art.alpha),
      echoAlpha: clamp01(art.echoAlpha),
      echoCount: Math.max(0, Math.min(4, Math.floor(art.echoCount ?? 0))),
      glowAlpha: cap(art.glowAlpha),
      still: false
    },
    hearts: beats > 0
      ? {
        beats,
        gapSec: Math.max(0.2, h.beatGapSec ?? 0.2),
        popAmp: Math.min(0.4, Math.max(0, h.popAmp ?? 0)),
        popAttackSec: Math.max(0.01, h.popAttackSec ?? 0.05),
        popDecaySec: Math.max(0.05, h.popDecaySec ?? 0.3),
        sizePx: h.sizePx ?? 280,
        fillAlpha: cap(h.fillAlpha),
        lineAlpha: clamp01(h.lineAlpha),
        lineWidthPx: h.lineWidthPx ?? 5,
        ringAlpha: clamp01(h.ringAlpha),
        ringMaxPx: h.ringMaxPx ?? 560,
        ringLifeSec: Math.max(0.1, h.ringLifeSec ?? 0.7),
        smallCount: Math.max(0, Math.min(24, Math.floor(h.smallCount ?? 0))),
        smallSizePx: range(h.smallSizePx, [14, 30]),
        smallReachPx: range(h.smallReachPx, [180, 340]),
        smallLifeSec: Math.max(0.2, h.smallLifeSec ?? 1),
        smallAlpha: clamp01(h.smallAlpha)
      }
      : null
  };
}

/** CSS filter の文字列。効果がなければ空文字 */
export function buildFilter({ blurPx = 0, invert = 0, desaturate = 0, brightness = 1, warp = 0 }) {
  const parts = [];
  if (warp > 0.5) parts.push('url(#fbWarp)');
  if (blurPx > 0.05) parts.push(`blur(${blurPx.toFixed(2)}px)`);
  if (invert > 0.005) parts.push(`invert(${invert.toFixed(3)})`);
  if (desaturate > 0.005) parts.push(`saturate(${(1 - desaturate).toFixed(3)})`);
  if (brightness < 0.995) parts.push(`brightness(${brightness.toFixed(3)})`);
  return parts.join(' ');
}

/**
 * 絵の動き。属性ごとに違う。どれも遅く、明るさは変えない。
 * @param {string} attr mouth | bust | hip | foot | all
 * @param {number} age 経過秒（残像は遅らせた値を渡す）
 * @param {number} total 演出の長さ
 * @param {{pushIn:number, pulseHz:number, pulseAmp:number, driftPx:number}} art
 * @param {boolean} still true なら動かさない
 * @returns {{dx:number, dy:number, scale:number}}
 */
export function motionFor(attr, age, total, art, still = false) {
  if (still) return { dx: 0, dy: 0, scale: 1 };
  const progress = total > 0 ? clamp01(age / total) : 0;
  const ease = 1 - (1 - progress) * (1 - progress);
  const pulse = 1 + art.pulseAmp * Math.sin(TAU * art.pulseHz * age);
  const d = art.driftPx;
  let scale = (1 + art.pushIn * ease) * pulse;
  let dx = 0;
  let dy = 0;
  switch (attr) {
    case 'mouth':   // ゆっくり寄ってくる
      scale = (1 + art.pushIn * 1.5 * ease) * pulse;
      break;
    case 'bust':    // 呼吸のような縦の揺れ
      dy = Math.sin(TAU * 0.55 * age) * d;
      break;
    case 'hip':     // 横の揺れ
      dx = Math.sin(TAU * 0.6 * age) * d * 1.5;
      break;
    case 'foot':    // 下からせり上がる
      dy = (1 - ease) * d * 4;
      break;
    default:
      break;
  }
  return { dx, dy, scale };
}

/** 鼓動の拍の時刻（秒）。1拍目は立ち上がりの終わりに合わせる */
export function beatTimes(riseSec, hearts) {
  return Array.from({ length: hearts.beats }, (_, i) => riseSec + i * hearts.gapSec);
}

/**
 * 大きなハートの大きさ。拍の瞬間に素早く膨らみ、ゆっくり戻る。
 * 明るさは変えない（大きさだけ）。
 */
export function beatScale(age, times, h) {
  let pop = 0;
  for (const t of times) {
    const local = age - t;
    if (local <= 0) continue;
    if (local < h.popAttackSec) {
      const k = local / h.popAttackSec;
      pop += h.popAmp * k * k * (3 - 2 * k);
      continue;
    }
    const u = (local - h.popAttackSec) / h.popDecaySec;
    if (u < 1) pop += h.popAmp * (1 - u) * (1 - u);
  }
  return 1 + pop;
}

/** 波紋の進み具合（0〜1）。範囲外は null */
export function ringProgress(age, startSec, lifeSec) {
  if (age < startSec || age >= startSec + lifeSec) return null;
  return (age - startSec) / lifeSec;
}

/** 小さなハートの不透明度の係数。ふわっと現れて、1回だけ薄れる */
export function smallHeartAlpha(u) {
  if (u <= 0 || u >= 1) return 0;
  const IN = 0.15;
  if (u < IN) {
    const t = u / IN;
    return t * t * (3 - 2 * t);
  }
  const k = (u - IN) / (1 - IN);
  return (1 - k) * (1 - k);
}
