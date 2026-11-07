export const FLASHBACK_STRONG = new Set([
  'levelDrainKiss',
  'deepDrainKiss',
  'pinkBreath',
  'foxPounce',
  // 上位技だけ。通常の特殊技は、技の演出が隠れないようにフラッシュバックを出さない
  'kittenFullTemptation',
  'supremePeachBreath',
  'foxHipPress'
]);

const TINT = {
  mouth: [255, 70, 120],
  bust: [255, 130, 190],
  hip: [170, 100, 255],
  foot: [70, 200, 200],
  hand: [255, 120, 110],
  all: [255, 170, 210]
};

export function tintFor(attr) {
  return TINT[attr] ?? TINT.all;
}
