// File: src/ui/skillHudMath.js
const smooth = (t) => t * t * (3 - 2 * t);

/** 技名の不透明度。素早く現れ、holdSec まで保持し、fadeOutSec で消える */
export function bannerAlpha(age, holdSec, fadeInSec, fadeOutSec) {
  if (age < 0) return 0;
  if (age < fadeInSec) return smooth(age / fadeInSec);
  if (age < holdSec) return 1;
  const u = (age - holdSec) / fadeOutSec;
  return u >= 1 ? 0 : 1 - smooth(u);
}

/** 現れるときの横ずれ（px）。現れ終わると 0 */
export function bannerSlide(age, fadeInSec, px) {
  if (age >= fadeInSec) return 0;
  return -px * (1 - smooth(Math.max(0, age) / fadeInSec));
}

/** 技前の発光。0 → 1 → 0 の山形を1回だけ（点滅しない） */
export function flashEnvelope(age, sec, peak = 0.4) {
  const t = age / sec;
  if (!(sec > 0) || t <= 0 || t >= 1) return 0;
  if (t < peak) return smooth(t / peak);
  const u = (t - peak) / (1 - peak);
  return (1 - u) * (1 - u);
}

/**
 * 同じ技名が表示中なら、出し直さず表示時間だけ延ばす。
 * holdSec は、いまの時点からの秒数。
 */
export function nextBanner(cur, { key, title, sub, attr, holdSec }) {
  if (cur && cur.key === key && cur.age < cur.holdSec) {
    return { ...cur, holdSec: Math.max(cur.holdSec, cur.age + holdSec) };
  }
  return { key, title, sub, attr, age: 0, holdSec };
}