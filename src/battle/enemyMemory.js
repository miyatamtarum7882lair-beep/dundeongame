// File: src/battle/enemyMemory.js
// 追加18体の「敵ごとの記憶」。種族ごとに永続保存する（persistent.enemyMemory[raceId]）。
//   escapes  ヤンデレちゃん：拘束から逃げた回数 → 逃げるほど抜けにくく、階に入ると最初から追ってくる
//   learn    キョンシーちゃん：覚えた逃げ方の数 → 同じように抜けにくくなる
//   kamo     白銀の小悪魔：一度でもお願いを聞いた（カモ認定）→ おねだりが増え、吸う量も増える
//   giveUps  無表情サキュバス：抵抗をやめた回数 → 拘束の始まりから身を任せてしまう
export const MEMORY_LABELS = {
  escapes: (n) => `逃げた回数 ${n}回（逃げるほど、抜け出しにくくなる）`,
  learn: (n) => `覚えた逃げ方 ${n}つ（同じ逃げ方は効きにくい）`,
  kamo: () => 'カモ認定（おねだりが増え、吸われる量が増える）',
  giveUps: (n) => `抵抗をやめた回数 ${n}回（拘束の始まりから、身を任せてしまう）`,
  confidence: (n) => `自信 ${'★'.repeat(n)}（技が強くなっている）`,
  absorbed: (n) => `奪った魔力の累計 ${n}（吸い方がうまくなっていく）`,
  weakLearn: (n) => `盗めた弱点 ${n}つ（経験値ドレインが強くなっている）`,
  faceAways: (n) => `顔を逸らした回数 ${n}回（逸らしにくくなっている）`
};

// どの種族が、どの記憶を持つか
const KEYS = {
  yandereGirl: ['escapes'],
  jiangshiGirl: ['learn'],
  silverDevil: ['kamo'],
  expressionlessSuccubus: ['giveUps']
};

export function memoryOf(p, raceId) {
  p.enemyMemory ??= {};
  p.enemyMemory[raceId] ??= {};
  return p.enemyMemory[raceId];
}

export function hasMemory(raceId, key) {
  return (KEYS[raceId] ?? []).includes(key);
}

/** 記憶を1つ進める。進んだら true */
export function remember(p, raceId, key, B) {
  if (!hasMemory(raceId, key)) return false;
  const m = memoryOf(p, raceId);
  if (key === 'kamo') {
    if (m.kamo) return false;
    m.kamo = true;
    return true;
  }
  const max = B.memory.max;
  if ((m[key] ?? 0) >= max) return false;
  m[key] = (m[key] ?? 0) + 1;
  return true;
}

/** この種族の拘束の、脱出必要数の倍率 */
export function escapeMulFor(p, raceId, B) {
  const m = p.enemyMemory?.[raceId];
  if (!m) return 1;
  const M = B.memory;
  return (1 + M.yandereEscapeMul * (m.escapes ?? 0)) * (1 + M.jiangshiLearnMul * (m.learn ?? 0));
}

/** この種族から受ける吸収の倍率 */
export function drainMulFor(p, raceId, B) {
  return p.enemyMemory?.[raceId]?.kamo ? B.memory.kamoDrainMul : 1;
}

/** 拘束の始まりの「身を任せ」の上乗せ */
export function startSurrenderFor(p, raceId, B) {
  const n = p.enemyMemory?.[raceId]?.giveUps ?? 0;
  return Math.min(B.memory.giveUpCap, n * B.memory.giveUpSurrender);
}

/** 図鑑に出す、その子が覚えていること */
export function memoryLines(p, raceId) {
  const m = p.enemyMemory?.[raceId];
  if (!m) return [];
  return Object.entries(m).filter(([, v]) => v).map(([k, v]) => MEMORY_LABELS[k]?.(v)).filter(Boolean);
}
