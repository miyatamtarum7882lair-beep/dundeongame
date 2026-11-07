// File: src/data/bindFormations.js
// 複数の方向から拘束されたときの特殊効果（拘束の陣形）。
// 主人公から見た向き（front / back / left / right）の組み合わせで成立する。
// 成立したものはすべて重なる（例：4方向なら「両耳ふさぎ」「挟み撃ち」「完全包囲」が全部）。
//
// requires   成立に必要な向き。minSides は向きの数だけで判定する
// drain      属性ごとの吸収の倍率（all はすべての属性）
// escape     脱出に必要な回数の倍率
// muffle     音のこもり（0〜1）。両耳をふさがれると、周りの音が遠くなる
// edges      画面の縁を染める位置（left / right / top / bottom）
// lines      成立したとき、その向きの拘束役が言う台詞 / chorus 全員の声（大きな文字で出す）
// 数値はすべて仮。
export const BIND_FORMATIONS = [
  {
    id: 'earsBlocked',
    name: '両耳ふさぎ',
    desc: '左右から囁かれ、口のドレインが増える。周りの音が遠くなる',
    requires: ['left', 'right'],
    drain: { mouth: 1.35 },
    escape: 1.1,
    muffle: 0.75,
    edges: ['left', 'right'],
    color: '#ff7ac0',
    lines: { left: 'びゅー……♡', right: 'だしちゃえ、だしちゃえ……♡' }
  },
  {
    id: 'sandwich',
    name: '挟み撃ち',
    desc: '前後から挟まれ、胸とお尻のドレインが増え、抜け出しにくい',
    requires: ['front', 'back'],
    drain: { bust: 1.3, hip: 1.3 },
    escape: 1.3,
    muffle: 0,
    edges: ['top', 'bottom'],
    color: '#ff4fa3',
    lines: { back: 'むにゅ〜……♡ 背中、あったかいでしょ？', front: 'こっち見て……♡ 目、そらしちゃだめ' }
  },
  {
    id: 'surrounded',
    name: '包囲',
    desc: '3方向から囲まれ、すべてのドレインが増える',
    minSides: 3,
    drain: { all: 1.2 },
    escape: 1.15,
    muffle: 0.2,
    edges: [],
    color: '#e0358f',
    chorus: 'すきすきすき……♡'
  },
  {
    id: 'fullSurround',
    name: '完全包囲',
    desc: '4方向すべてをふさがれた。逃げ場がなく、すべてが吸われていく',
    minSides: 4,
    drain: { all: 1.35 },
    escape: 1.3,
    muffle: 0.9,
    edges: ['left', 'right', 'top', 'bottom'],
    color: '#c2006b',
    chorus: '「「「経験値だせ……♡」」」'
  }
];

const MAX_DRAIN_MUL = 2.5;
const MAX_ESCAPE_MUL = 2.2;

/**
 * 拘束している敵の向き（重複あり）から、成立している陣形と倍率をまとめる
 * @param {string[]} sides 'front' | 'back' | 'left' | 'right'
 */
export function formationFor(sides) {
  const set = new Set(sides);
  const active = BIND_FORMATIONS.filter((f) =>
    f.requires ? f.requires.every((s) => set.has(s)) : set.size >= (f.minSides ?? 99)
  );
  const drain = (attr) => Math.min(MAX_DRAIN_MUL, active.reduce(
    (m, f) => m * (f.drain[attr] ?? 1) * (f.drain.all ?? 1), 1
  ));
  return {
    ids: active.map((f) => f.id),
    active,
    drain,
    escape: Math.min(MAX_ESCAPE_MUL, active.reduce((m, f) => m * f.escape, 1)),
    muffle: Math.max(0, ...active.map((f) => f.muffle)),
    edges: [...new Set(active.flatMap((f) => f.edges))]
  };
}
