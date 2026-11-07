// File: src/data/conditioning.js
// 主人公の「蓄積デバフ」（v4）と「一時状態」の定義。数値は balance.js の conditioning。
//
// 蓄積デバフ（CONDITIONS）
//   敵の技を受けるたびにゲージが増える。warnAt で前兆、onsetAt で発症（onsetStatus を付与）、
//   dangerAt 以上が危険域。異なる階で permanentOnsets 回発症すると、永続段階（I〜IV）が1つ進む。
//   boost: ゲージが発症域にある間、source の敵から受けるドレインと脱出必要数が増える。
//
// 一時状態（STATUSES）
//   mult: 倍率（evade 回避率 / escapeNeed 脱出必要数 / drainTaken 受けるドレイン）
//   stun: 付与時に主人公の行動を失わせるターン数
//   graceTurns: 解除後、同じ状態にかからない猶予（無限拘束の防止）
//   backBind: 拘束が背面拘束になる（attrs の属性の拘束だけ）
//   consumeOnBind: 次の拘束で使い切る
export const CONDITIONS = {
  temptHabit: {
    name: '誘惑癖',
    source: 'kitten',
    color: '#ff4fa3',
    onsetStatus: 'careless',
    onsetTurns: 3,
    boost: { drain: 0.05, escape: 0.04 },
    hint: '挑発を拒否して身構えると防げる'
  },
  pinkDrunk: {
    name: '桃色酔い',
    source: 'blackRibbon',
    color: '#ff7ec4',
    onsetStatus: 'charmed',
    onsetTurns: 1,
    boost: { drain: 0.06, escape: 0.03 },
    hint: '吐息を横へ避けると防げる'
  },
  hipPressure: {
    name: '尻圧慣れ',
    source: 'pinkFox',
    color: '#ff7fb0',
    onsetStatus: 'offBalance',
    onsetTurns: 2,
    boost: { drain: 0.04, escape: 0.06 },
    hint: '足場を確保して押し返すと防げる'
  },

  // ---- 前半9体 ----
  thiefMark: {
    name: 'スリの刻印', source: 'thiefGirl', color: '#ff7ab8',
    onsetStatus: 'exposed', onsetTurns: 3, boost: { drain: 0.05, escape: 0.03 },
    hint: '向きを切り替え、壁を背にすると防げる'
  },
  heartCaptive: {
    name: 'ハートの虜', source: 'mikuGirl', color: '#ff6fb0',
    onsetStatus: 'charmed', onsetTurns: 1, boost: { drain: 0.06, escape: 0.04 },
    hint: '投げキッスは横へ避ける。射線を切ると溜まらない'
  },
  cantRefuse: {
    name: 'お願い断れない癖', source: 'pleadingBunny', color: '#ff8fc4',
    onsetStatus: 'hesitant', onsetTurns: 2, boost: { drain: 0.05, escape: 0.03 },
    hint: 'お願いはきっぱり断って、距離を取り直す'
  },
  falseRelief: {
    name: '偽りの安心', source: 'angelGirl', color: '#ff9fd0',
    onsetStatus: 'falseBlessing', onsetTurns: 3, boost: { drain: 0.05, escape: 0.04 },
    hint: '祝福は断って身構える。回復に見えても受けない'
  },
  boneless: {
    name: '骨抜き癖', source: 'blondeBunny', color: '#ff5c9d',
    onsetStatus: 'limp', onsetTurns: 3, boost: { drain: 0.06, escape: 0.05 },
    hint: '正面に立たず、視線を切って下がる'
  },
  clingy: {
    name: '密着慣れ', source: 'blueHairGal', color: '#ff7ab8',
    onsetStatus: 'weakened', onsetTurns: 3, boost: { drain: 0.04, escape: 0.06 },
    hint: '気を引き締めて、密着される前に間合いを取る'
  },
  submission: {
    name: '審判への屈服', source: 'darkSister', color: '#e0479a',
    onsetStatus: 'obedient', onsetTurns: 3, boost: { drain: 0.05, escape: 0.05 },
    hint: 'カウントは集中して中断する。ゼロになる前に抜け出す'
  },
  drowsy: {
    name: '眠気', source: 'dreamLady', color: '#ffa6cf',
    onsetStatus: 'asleep', onsetTurns: 2, boost: { drain: 0.06, escape: 0.04 },
    hint: '子守唄は耳を塞いで身構える。長く足止めされる場所を避ける'
  },
  chased: {
    name: '追われ癖', source: 'kissHunter', color: '#ff4f9a',
    onsetStatus: 'marked', onsetTurns: 4, boost: { drain: 0.05, escape: 0.03 },
    hint: 'マーキングは横へ避ける。遮蔽物で射線を切る'
  },

  // ---- 後半9体 ----
  ladyCareless: {
    name: '上品な油断癖', source: 'littleDevilLady', color: '#ff6fae',
    onsetStatus: 'careless', onsetTurns: 3, boost: { drain: 0.05, escape: 0.05 },
    hint: '誘いに乗らず、慎重に構えて間合いを保つ'
  },
  pampered: {
    name: '甘え癖', source: 'pamperingLady', color: '#ff9ccb',
    onsetStatus: 'dependent', onsetTurns: 3, boost: { drain: 0.05, escape: 0.06 },
    hint: '甘やかしは断って踏みとどまる'
  },
  chargeFear: {
    name: '突進恐怖', source: 'powerBunny', color: '#ff6f9f',
    onsetStatus: 'flinch', onsetTurns: 2, boost: { drain: 0.05, escape: 0.04 },
    hint: '予告線から横へ離れる。正面で受け止めない'
  },
  manaLeakBody: {
    name: '魔力漏れ体質', source: 'silverFoxMaid', color: '#ff8cc0',
    onsetStatus: 'manaLeak', onsetTurns: 4, boost: { drain: 0.06, escape: 0.03 },
    hint: '漏出を放置しない。回収の前に距離を取る'
  },
  pressureHabit: {
    name: '圧負け癖', source: 'velvetBunny', color: '#ff3f8e',
    onsetStatus: 'cornered', onsetTurns: 3, boost: { drain: 0.05, escape: 0.06 },
    hint: '広い場所へ誘導し、押し込まれる前に側面へ回る'
  },
  whisperWeak: {
    name: '囁きへの弱さ', source: 'whisperDevil', color: '#ff8fbf',
    onsetStatus: 'unfocused', onsetTurns: 3, boost: { drain: 0.06, escape: 0.05 },
    hint: '囁きは耳を塞いで遮る。集中を立て直してから戦う'
  },
  weakSpot: {
    name: '妖手の弱点', source: 'demonicChinaGirl', color: '#ff3fa0',
    onsetStatus: 'weakExposed', onsetTurns: 4, boost: { drain: 0.06, escape: 0.05 },
    hint: '挑発は聞き流して距離を取る。盗取の予備動作を見たら離れる'
  },
  sakuraFall: {
    name: '花堕ち', source: 'sakuraEnchantress', color: '#ff9fc6',
    onsetStatus: 'corrupted', onsetTurns: 4, boost: { drain: 0.07, escape: 0.05 },
    hint: '花吹雪から視線を外して離れる。花印は長期戦の前に断つ'
  },
  trapHabit: {
    name: '罠踏み癖', source: 'tricksterDevil', color: '#ff2f8f',
    onsetStatus: 'offBalance', onsetTurns: 3, boost: { drain: 0.05, escape: 0.05 },
    hint: '足元の魔法陣を見て迂回する。うそ泣きには近寄らない'
  }
};

export const STATUSES = {
  careless: { name: '油断', color: '#ff8fc8', mult: { evade: 0.6, escapeNeed: 1.2 } },
  charmed: { name: '魅了', color: '#ff4fa3', stun: 1, mult: { evade: 0 }, graceTurns: 3 },
  inattentive: { name: '注意散漫', color: '#ff9fd6', mult: { evade: 0.6 } },
  offBalance: { name: '体勢崩し', color: '#ff7fb0', mult: { evade: 0.5 }, backBind: true, attrs: ['hip'] },
  feinted: { name: '目移り', color: '#ffb3d9', mult: { evade: 0.5 } },
  tempted: { name: '誘惑受容', color: '#ff4fa3', mult: { drainTaken: 1.3, escapeNeed: 1.25 }, consumeOnBind: true },

  // ---- 前半9体 ----
  exposed: { name: '隙だらけ', color: '#ff7ab8', mult: { evade: 0.6 }, backBind: true, attrs: ['hip'] },
  hesitant: { name: 'ためらい', color: '#ff8fc4', mult: { evade: 0.5 } },
  // 回復に見せかけて、ターンごとに MP が漏れる（mpLeak は最大MPに対する割合）
  falseBlessing: { name: '偽りの祝福', color: '#ffc6e2', mult: { drainTaken: 1.2 }, mpLeak: 0.02 },
  slowed: { name: '鈍足', color: '#ffb3d9', mult: { evade: 0.7, escapeNeed: 1.15 } },
  limp: { name: '骨抜き', color: '#ff5c9d', mult: { evade: 0.6, escapeNeed: 1.3 } },
  weakened: { name: '脱力', color: '#ff9fd0', mult: { evade: 0.7, escapeNeed: 1.25 } },
  pinned: { name: '移動不能', color: '#ff4fa3', stun: 1, mult: { evade: 0.3 }, graceTurns: 2 },
  obedient: { name: '服従', color: '#e0479a', mult: { evade: 0.7, escapeNeed: 1.3 } },
  asleep: { name: '睡眠', color: '#ffa6cf', stun: 2, mult: { evade: 0, escapeNeed: 1.2 }, graceTurns: 4 },
  // 印を付けた敵が、どこにいても追ってくる
  marked: { name: 'マーキング', color: '#ff4f9a', mult: { evade: 0.5 }, lure: true },

  // ---- 後半9体 ----
  // mult.struggle: 拘束中のもがき1回で進む量 / mult.expTaken: 吸われる経験値の倍率
  // condTick: 付いている間、ターンごとに蓄積デバフが増える
  dependent: { name: '依存', color: '#ff9ccb', mult: { escapeNeed: 1.3, drainTaken: 1.1 } },
  flinch: { name: '身構えすぎ', color: '#ff6f9f', mult: { evade: 0.6 } },
  manaLeak: { name: '魔力漏出', color: '#c9a6ff', mpLeak: 0.03 },
  cornered: { name: '圧迫', color: '#ff3f8e', mult: { evade: 0.6, escapeNeed: 1.3 } },
  cowed: { name: '萎縮', color: '#ff8cc0', mult: { evade: 0.6, escapeNeed: 1.15 } },
  unfocused: { name: '集中力低下', color: '#ff8fbf', mult: { struggle: 0.65, escapeNeed: 1.1 } },
  weakExposed: { name: '弱点看破', color: '#ff3fa0', mult: { expTaken: 1.6 } },
  corrupted: { name: '堕落', color: '#c070ff', mult: { drainTaken: 1.25, escapeNeed: 1.2 } },
  flowerMark: { name: '花印', color: '#ff9fc6', condTick: { id: 'sakuraFall', gain: 0.6 } },
  tripped: { name: '転倒', color: '#ff2f8f', stun: 1, mult: { evade: 0.3 }, graceTurns: 2 }
};

export const PERMANENT_STAGE_NAMES = ['', 'I', 'II', 'III', 'IV'];
