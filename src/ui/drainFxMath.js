// File: src/ui/drainFxMath.js
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** MP割合 → 0〜1。start 以上なら 0、MP0 なら 1 */
export function lowMpIntensity(mpRatio, start) {
  if (!(start > 0)) return 0;
  return clamp01((start - mpRatio) / start);
}

/** パルス膜の強さ（0〜1）。素早く立ち上がり、ゆっくり消える */
export function membraneEnvelope(age, riseSec, decaySec) {
  if (age < 0) return 0;
  if (age < riseSec) return age / riseSec;
  const u = (age - riseSec) / decaySec;
  if (u >= 1) return 0;
  return (1 - u) * (1 - u);
}

/**
 * 画面の縁のピンクの不透明度。
 * @param {{mpRatio:number, time:number, membrane:number, climaxProgress:number|null, mode:'full'|'reduced'|'off'}} s
 * @param {object} e B.drainFx.edge
 */
export function edgeAlpha({ mpRatio, time, membrane, climaxProgress, mode }, e) {
  if (mode === 'off') return 0;
  const low = lowMpIntensity(mpRatio, e.lowMpStart);
  const wave = mode === 'reduced'
    ? 0.75
    : 0.55 + 0.45 * (0.5 + 0.5 * Math.sin((Math.PI * 2 * time) / e.periodSec));
  let a = e.lowMpAlpha * low * wave + e.membraneAlpha * clamp01(membrane);
  let cap = e.capAlpha;
  if (climaxProgress != null) {
    a += e.climaxAlpha * (0.6 + 0.4 * clamp01(climaxProgress)) * (mode === 'reduced' ? 0.5 : 1);
    if (mode !== 'reduced') cap = e.climaxCapAlpha;
  }
  return Math.min(cap, Math.max(0, a));
}