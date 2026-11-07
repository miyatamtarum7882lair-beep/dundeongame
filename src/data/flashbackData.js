// File: src/data/flashbackData.js
// 属性名は日本語・英語のどちらでも受け付け、内部では mouth / bust / hip / foot に正規化する。
// enemies.js の実際の属性名が上のどれにも当たらない場合は、ALIAS に追記すること。
const ALIAS = {
  口: 'mouth',
  胸: 'bust',
  尻: 'hip',
  足: 'foot',
  mouth: 'mouth',
  bust: 'bust',
  chest: 'bust',
  breast: 'bust',
  hip: 'hip',
  butt: 'hip',
  foot: 'foot',
  feet: 'foot',
  leg: 'foot',
};

export function normalizeAttr(attr) {
  return ALIAS[attr] ?? null;
}

// 「特に強力な技」。ここに入れた技が発動すると kind: 'strong' のフラッシュバックを要求する。
// 属性ごとの付随SE（seTable.js に存在する ID）。
const ATTR_SE = {
  mouth: 'kissDrain',
  bust: 'bustRub',
  hip: 'hipStroke',
  foot: 'footPress',
};

const ATTR_COLOR = {
  mouth: [255, 90, 150],
  bust: [255, 150, 200],
  hip: [255, 110, 170],
  foot: [255, 160, 190],
};

const DEFAULT_COLOR = [255, 100, 170];

// 拘束者が追加されたときの演出（属性ごと）。fx は battleFx.js 側の type 名（要照合）。
const JOIN_EFFECTS = {
  mouth: { se: 'vacuumKiss', gain: 1.0, color: [255, 100, 180], fx: ['kiss', 'bindHeartWave'] },
  bust: { se: 'pafuDrain', gain: 1.0, color: [255, 170, 210], fx: ['hearts'] },
  hip: { se: 'hipStroke', gain: 0.8, color: [255, 130, 170], fx: ['hearts'] },
  foot: { se: 'footPress', gain: 0.7, color: [255, 160, 190], fx: ['sparkle'] },
};

export function flashbackSeFor(attr) {
  return ATTR_SE[normalizeAttr(attr)] ?? null;
}

export function flashbackColorFor(attr) {
  return ATTR_COLOR[normalizeAttr(attr)] ?? DEFAULT_COLOR;
}

export function joinEffectFor(attr) {
  return JOIN_EFFECTS[normalizeAttr(attr)] ?? null;
}
