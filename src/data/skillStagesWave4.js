// File: src/data/skillStagesWave4.js
// 追加18体・後半10体（elite）の技の演出台本。書式は skillStages.js / skillStagesWave1.js の先頭を参照。
import { gentleCue, touch, drainFlow, bind, finisher } from './skillStagesWave3.js';

// 選択肢付き技の共通の形：始まりの誘い → 受け入れたら染まる／断ったら身構える
function choice({ intro, give, accepted, extraHit = [], resistText = '振り払った' }) {
  return {
    flashSec: 0.3,
    durationSec: 2.0,
    hits: { count: 2, startSec: 0.7, endSec: 1.3 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }, { at: 'end', id: 'temptAccept', when: 'accepted' }],
    fx: [
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: intro, color: '$main', size: 24, oy: -28, life: 1.6 },
      { at: 'hit', id: 'swirl', anchor: 'hero', shapes: ['heart', 'heartLine'], colors: ['$main', '$sub'], count: 10, r0: 90, r1: 24, turns: 0.9, life: 0.8, size: [5, 9] },
      ...extraHit,
      { at: 'end', id: 'callout', text: give, color: '$glow', size: 24, when: '!resisted' },
      { at: 'end', id: 'ring', anchor: 'hero', r: 64, color: '#ffd1e8', width: 5, alpha: 0.8, when: 'resisted' },
      { at: 'end', id: 'callout', text: resistText, color: '#ffd1e8', size: 22, when: 'resisted' },
      { at: 'end', id: 'wash', color: '$main', alpha: 0.28, mode: 'full', life: 1.4, when: 'accepted' },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: accepted, color: '$main', size: 22, oy: -36, life: 1.8, when: 'accepted' },
      gentleCue
    ]
  };
}

// 見つめる系の技：目にハートが灯る
function gazeSkill({ text, after, color = '$main' }) {
  return {
    flashSec: 0.25,
    durationSec: 1.6,
    hits: { count: 1, startSec: 0.9 },
    se: [{ at: 'start', id: '$skill' }],
    windup: [{ at: 'start', id: 'glyph', anchor: 'enemyFeet', style: 'heart', color, sub: '$sub', r: 44, life: 1.0, spin: 2 }],
    fx: [
      { at: 'start', id: 'flow', from: 'enemyHead', to: 'heroHead', shapes: ['heartLine', 'heart'], colors: [color, '$glow'], count: 12, life: 0.6, spanSec: 0.6, arc: 6, size: [5, 9], glow: true },
      { at: 'start', id: 'callout', anchor: 'enemyHead', text, color, size: 22, oy: -28 },
      { at: 'hit', id: 'swirl', anchor: 'heroHead', shape: 'heart', colors: [color, '#ff2d86'], count: 8, r0: 30, r1: 8, turns: 1.5, life: 1.0, size: [5, 8], glow: true },
      { at: 'hit', id: 'callout', text: after, color: '$glow', size: 22 }
    ]
  };
}

export const WAVE4_STAGES = {
  // ======================================================================
  // 魔性のお嬢様：紅い魔眼と、命令の鎖
  // ======================================================================
  ladyHand: touch({ shapes: ['heart', 'star'] }),
  demonicKissHug: bind({ text: '跪きなさい。……ちゅ、♡', shapes: ['lips', 'heart'], extraStart: [{ id: 'kissMark' }], extraPulse: [{ id: 'kissMark', every: 2 }] }),
  charmEye: gazeSkill({ text: '私の目を、ご覧なさい', after: '目が……離せない' }),
  sweetOrder: choice({ intro: '跪いて、私に従いなさい♡', give: '従いたい…', accepted: 'よくできました。……ご褒美に、もっと魅了してあげますわ', resistText: '命令を拒否した' }),
  charmCascade: {
    flashSec: 0.25,
    durationSec: 2.0,
    hits: { count: 4, startSec: 0.4, endSec: 1.6 },
    hitNumbers: false,
    se: [{ at: 'hit', id: 'kissAir', every: 2 }, { at: 'end', id: '$skill' }],
    fx: [
      { at: 'hit', id: 'kissMark' },
      { at: 'hit', ...drainFlow({ shapes: ['lips', 'dot'] }) },
      { at: 'hit', id: 'callout', texts: ['集中できない', '力が抜ける', '魔力が漏れる', '魅了が深まる'], color: '$glow', size: 18, ox: 70, oy: -10, when: 'bonus' },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: '魅了は、連鎖するものですのよ♡', color: '$main', size: 22, oy: -30 }
    ]
  },
  absoluteCharmEye: finisher({ intro: '永遠に、私の虜になりなさい', outro: '……ふふ、見事に堕ちましたわね', shapes: ['heart', 'star'], style: 'star' }),

  // ======================================================================
  // いじわる小悪魔ちゃん：解析の魔法陣と、経験値の直取り
  // ======================================================================
  weakSpotTouch: touch({ shapes: ['star', 'heart'] }),
  weakAnalysisHold: bind({ text: 'つかまえた♡ ……弱点、ぜんぶ見せて？', shapes: ['star', 'heart'], style: 'star' }),
  weakDiagnosis: {
    flashSec: 0.2,
    durationSec: 1.6,
    hits: { count: 1, startSec: 0.9 },
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'start', id: 'flow', from: 'enemyHead', to: 'heroHead', toOffset: { ox: 30 }, shapes: ['note', 'heart'], colors: ['$main', '$sub'], count: 10, life: 0.8, spanSec: 0.6, arc: 30, size: [5, 8] },
      { at: 'hit', id: 'glyph', anchor: 'hero', oy: -16, style: 'star', color: '$sub', sub: '$main', r: 36, life: 1.6 },
      { at: 'hit', id: 'callout', text: 'ぽしょ……ここ、弱いんだ♡', color: '$main', size: 22, ox: 60 },
      { at: 'hit', id: 'callout', text: '弱点を見抜かれた…', color: '$glow', size: 20, oy: 30 }
    ]
  },
  weakPointDrain: {
    flashSec: 0.3,
    durationSec: 1.8,
    hits: { count: 4, startSec: 0.4, endSec: 1.4 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }, { at: 'hit', id: 'expDrained', every: 2, gain: 0.7 }],
    windup: [{ at: 'start', id: 'telegraph', from: 'enemyFeet', to: 'heroFeet', color: '$sub', width: 4, life: 0.8 }],
    fx: [
      { at: 'hit', id: 'impact', anchor: 'hero', oy: -16, size: 26, color: '$sub' },
      { at: 'hit', ...drainFlow({ shapes: ['dot', 'star'], colors: ['#c08bff', '#b85cff'] }) },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: 'レベル、いただき♡', color: '$main', size: 26, oy: -30 }
    ]
  },
  weakRevealed: choice({ intro: 'もう弱点バレちゃったね♡ ……教えてあげよっか？', give: '知りたい…', accepted: 'はい、ここ♡ ……これで、もっと上手に盗めるね', resistText: '分析を拒んだ' }),
  completeLevelDrain: finisher({ intro: '弱点、ぜんぶ攻略済み♡', outro: 'レベル、ぜ～んぶいただきました♡', shapes: ['star', 'dot'], style: 'star' }),

  // ======================================================================
  // 控えめアイドル：ハートのビームと、照れ笑い
  // ======================================================================
  shyStep: touch({ shapes: ['star', 'heart'] }),
  idolHold: bind({ text: 'つ、つかまえちゃいました……♡', shapes: ['star', 'heart'], style: 'star' }),
  sexyBeam: {
    flashSec: 0.3,
    durationSec: 1.4,
    hits: { count: 1, startSec: 0.8 },
    se: [{ at: 'start', id: '$skill' }],
    windup: [{ at: 'start', id: 'telegraph', from: 'enemyHead', to: 'heroHead', color: '$main', width: 6, life: 0.9 }],
    fx: [
      { at: 'start', id: 'flow', from: 'enemyHead', to: 'heroHead', shapes: ['heart', 'heart', 'star'], colors: ['$main', '$sub', '#ffffff'], count: 30, life: 0.5, spanSec: 0.5, arc: 0, size: [6, 11], glow: true },
      { at: 'hit', id: 'heartProjectileFx', durSec: 0.3, arcPx: 0 },
      { at: 'hit', id: 'burst', anchor: 'heroHead', shapes: ['heart', 'star'], colors: ['$main', '$sub'], count: 14, speed: [80, 200], size: [5, 9], life: 0.8, glow: true },
      { at: 'hit', id: 'callout', anchor: 'enemyHead', text: 'み、見てください……♡', color: '$main', size: 20, oy: -28 }
    ]
  },
  lookAtMe: choice({ intro: 'わたしを、見てください……♡', give: '目が離せない…', accepted: '見て、くれた……♡ ……先輩のせいですよ？', resistText: '目を逸らした',
    extraHit: [{ at: 'hit', id: 'heartProjectileFx', durSec: 0.4, arcPx: 20 }] }),
  heartfulEncore: {
    flashSec: 0.3,
    durationSec: 2.2,
    hits: { count: 3, startSec: 0.5, endSec: 1.7 },
    hitNumbers: false,
    se: [{ at: 'hit', id: '$skill' }],
    fx: [
      { at: 'hit', id: 'flow', from: 'enemyHead', to: 'heroHead', shapes: ['heart', 'star'], colors: ['$main', '$sub', '#ffffff'], count: 16, life: 0.4, spanSec: 0.3, arc: 0, size: [5, 10], glow: true },
      { at: 'hit', id: 'callout', texts: ['アンコール♡', 'もう一回♡', 'ラスト♡'], color: '$main', size: 24, ox: 60, oy: -30 },
      { at: 'end', id: 'flash', color: '$main', alpha: 0.3 }
    ]
  },
  centerStage: finisher({ intro: '今日は、わたしがセンターです……♡', outro: '私じゃないと、ドキドキできない体にしますね……♡', shapes: ['star', 'heart'], style: 'star' }),

  // ======================================================================
  // 堕落のお姉さん：甘い取引の金色と、紫の堕落
  // ======================================================================
  sisterTease: touch({ shapes: ['heart', 'petal'] }),
  ruinHipHold: bind({ text: 'いい子ね……このまま、堕ちていきましょ？', shapes: ['heart', 'petal'] }),
  sweetDealOffer: choice({ intro: 'ねえ、お姉さんと取引しない？ 今すぐ、楽にしてあげる♡', give: '楽になりたい…', accepted: '取引成立♡ ……その代わり、ずっとね',
    resistText: '取引を断った', extraHit: [{ at: 'hit', id: 'burst', anchor: 'heroHead', shapes: ['dot', 'heart'], colors: ['#ffd36b', '$main'], count: 8, speed: [30, 80], size: [4, 7], life: 1.0, gravity: -40 }] }),
  rewardHipAttack: {
    flashSec: 0.25,
    durationSec: 0.9,
    hits: { count: 1, startSec: 0.5 },
    se: [{ at: 'hit', id: '$skill' }],
    windup: [{ at: 'start', id: 'tileMark', anchor: 'heroFeet', color: '$sub', life: 0.9 }],
    fx: [
      { at: 'hit', id: 'impact', size: 44, color: '$main' },
      { at: 'hit', id: 'shake', power: 0.8 },
      { at: 'hit', id: 'callout', text: 'はい、ご褒美♡', color: '$main', size: 26 },
      { at: 'hit', id: 'callout', text: '堕ちた体に響く…', color: '$sub', size: 20, oy: 30, when: 'bonus' }
    ]
  },
  justOnceMore: {
    flashSec: 0.2,
    durationSec: 1.5,
    hits: { count: 1, startSec: 0.8 },
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: 'もう一度だけ、ね♡', color: '$main', size: 24, oy: -28 },
      { at: 'hit', id: 'cloud', from: 'enemyHead', to: 'hero', colors: ['$sub', '$main'], count: 10, r: [12, 30], life: 1.2, spread: 40, lift: 16 },
      { at: 'hit', id: 'callout', text: '……一度だけなら', color: '$glow', size: 22 }
    ]
  },
  ruinPamperPress: finisher({ intro: 'ぜんぶ、お姉さんに任せて', outro: 'このまま破滅しちゃいなさい♡ ……分かってても、抵抗できないでしょう？', shapes: ['petal', 'heart'] }),

  // ======================================================================
  // 桃髪サキュバス：紫の魔力が、渦を巻いて吸い込まれる
  // ======================================================================
  manaSeekTouch: touch({ shapes: ['dot', 'heart'] }),
  succubusHold: bind({ text: 'いただきます♡ ……たっぷり、吸わせて', shapes: ['dot', 'heart'],
    extraPulse: [{ id: 'swirl', anchor: 'hero', shapes: ['dot'], colors: ['$sub', '$main'], count: 8, r0: 60, r1: 8, turns: 1, life: 0.6, size: [3, 6] }] }),
  manaTaste: {
    flashSec: 0.2,
    durationSec: 1.5,
    hits: { count: 1, startSec: 0.8 },
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'hit', ...drainFlow({ shapes: ['dot', 'heart'], colors: ['$sub', '$main'], count: 10 }) },
      { at: 'hit', id: 'callout', anchor: 'enemyHead', text: 'ん……♡ 美味しい魔力', color: '$main', size: 22, oy: -28 }
    ]
  },
  giveMeMore: choice({ intro: 'もっとちょうだい♡ ……自分から、差し出して？', give: '差し出したい…', accepted: 'ふふ、自分から差し出すなんて……いい子♡', resistText: '拒否した',
    extraHit: [{ at: 'hit', ...drainFlow({ shapes: ['dot'], colors: ['$sub', '$main'], count: 8 }), when: 'accepted' }] }),
  manaPlunder: {
    flashSec: 0.3,
    durationSec: 2.0,
    hits: { count: 5, startSec: 0.4, endSec: 1.6 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'start', id: 'swirl', anchor: 'hero', shapes: ['dot', 'heart'], colors: ['$sub', '$main', '#ffffff'], count: 24, r0: 120, r1: 10, turns: 1.6, life: 1.6, size: [3, 7] },
      { at: 'hit', ...drainFlow({ shapes: ['dot', 'heart'], colors: ['$sub', '$main'] }) },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: 'ごっそり、いただきました♡', color: '$main', size: 24, oy: -30 }
    ]
  },
  supremeManaHold: finisher({ intro: '最後の一滴まで、ね♡', outro: 'ごちそうさま♡ ……また、吸わせてね', shapes: ['dot', 'heart'] }),

  // ======================================================================
  // むちむち小悪魔：振り返りのお尻と、視線ロック
  // ======================================================================
  curvyTouch: touch({ shapes: ['heart', 'heartLine'] }),
  curvyHipHold: bind({ text: 'むちむちで、つかまえた♡', shapes: ['heart', 'heartLine'] }),
  lookBackTempt: gazeSkill({ text: '……ねえ、見てたでしょ？', after: '視線が吸い寄せられる…' }),
  stillWatching: choice({ intro: 'まだ見てたいんでしょ？♡', give: '見ていたい…', accepted: 'ほら、やっぱり♡ ……もう目、逸らせないね', resistText: '目を逸らした' }),
  gazeHipAttack: {
    flashSec: 0.25,
    durationSec: 0.9,
    hits: { count: 1, startSec: 0.5 },
    se: [{ at: 'hit', id: '$skill' }],
    fx: [
      { at: 'hit', id: 'impact', size: 42, color: '$main' },
      { at: 'hit', id: 'shake', power: 0.8 },
      { at: 'hit', id: 'callout', text: '見とれてた隙に、ばーん♡', color: '$main', size: 24 }
    ]
  },
  gazeHipTrap: finisher({ intro: 'ずーっと、見てていいよ♡', outro: '見とれたまま、ぜんぶ出しちゃったね♡ ざぁこ', shapes: ['heart', 'heartLine'] }),

  // ======================================================================
  // 青髪プリンセス：静かな鈴と、青い光
  // ======================================================================
  princessFingertip: touch({ shapes: ['star', 'heart'] }),
  princessEmbrace: bind({ text: '……動かないで', shapes: ['star', 'heart'], style: 'star',
    extraPulse: [{ id: 'callout', texts: ['……', 'いい子', '……もっと', '献上なさい'], color: '$sub', size: 16, ox: -70, oy: -30, every: 2 }] }),
  quietOrder: {
    flashSec: 0.2,
    durationSec: 1.4,
    hits: { count: 1, startSec: 0.8 },
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'start', id: 'ring', anchor: 'enemy', r: 90, color: '$sub', width: 3, alpha: 0.6 },
      { at: 'hit', id: 'callout', anchor: 'enemyHead', text: '……跪いて', color: '$sub', size: 24, oy: -28 },
      { at: 'hit', id: 'glyph', anchor: 'heroFeet', style: 'star', color: '$sub', sub: '$main', r: 50, life: 1.2 }
    ]
  },
  giveMeMana: choice({ intro: '……魔力を、ちょうだい', give: '献上したい…', accepted: '……いい子。もっと、献上なさい', resistText: '拒否した',
    extraHit: [{ at: 'hit', ...drainFlow({ shapes: ['star', 'dot'], colors: ['$sub', '$main'] }), when: 'accepted' }] }),
  royalLevy: {
    flashSec: 0.3,
    durationSec: 1.8,
    hits: { count: 4, startSec: 0.4, endSec: 1.4 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }, { at: 'hit', id: 'royalBell', every: 2, gain: 0.5 }],
    fx: [
      { at: 'hit', ...drainFlow({ shapes: ['star', 'dot'], colors: ['$sub', '#c08bff'] }) },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: '……徴収、完了', color: '$sub', size: 24, oy: -30 }
    ]
  },
  princessPlunder: finisher({ intro: '……ぜんぶ、献上して', outro: '……よくできました', shapes: ['star', 'heart'], style: 'star' }),

  // ======================================================================
  // 黒衣のシスター：鐘の音と、のしかかる重圧
  // ======================================================================
  quietAdmonish: touch({ shapes: ['heartLine'] }),
  blackPressHold: bind({ text: 'お静かに。……重圧は、増していきますよ', shapes: ['heartLine', 'heart'],
    extraStart: [{ id: 'wash', color: '#2a0a30', alpha: 0.3, mode: 'edge', life: 1.8 }],
    extraPulse: [{ id: 'ring', anchor: 'heroFeet', r: 60, squash: 0.4, color: '$accent', width: 5, alpha: 0.6 }] }),
  pressureNotice: {
    flashSec: 0.25,
    durationSec: 1.6,
    hits: { count: 1, startSec: 0.9 },
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: '予告いたします。……逃げられません', color: '$main', size: 20, oy: -28 },
      { at: 'hit', id: 'wash', color: '#2a0a30', alpha: 0.35, mode: 'full', life: 1.2 },
      { at: 'hit', id: 'callout', text: '体が重い…', color: '$glow', size: 22 }
    ]
  },
  willYouResist: choice({ intro: '抵抗なさいますか？', give: '……もう、いいか', accepted: 'よろしい。……では、重圧に身を委ねなさい', resistText: '抵抗を続ける' }),
  silentPressure: {
    flashSec: 0.25,
    durationSec: 1.0,
    hits: { count: 1, startSec: 0.6 },
    se: [{ at: 'hit', id: '$skill' }],
    fx: [
      { at: 'hit', id: 'impact', size: 46, color: '$accent' },
      { at: 'hit', id: 'shake', power: 1.0 },
      { at: 'hit', id: 'callout', text: '……静寂を', color: '$main', size: 24 }
    ]
  },
  absolutePressure: finisher({ intro: 'ここは、私の聖域です', outro: '……抵抗、お疲れさまでした', shapes: ['heartLine', 'heart'] }),

  // ======================================================================
  // 白銀バニー：背後へふわりと回り込み、経験値まで盗む
  // ======================================================================
  bunnyManaTouch: touch({ shapes: ['star', 'heart'] }),
  silverCling: bind({ text: '後ろから、ぎゅー♡ ……経験値も、いただくね', shapes: ['star', 'heart'] }),
  limpHug: {
    flashSec: 0.25,
    durationSec: 1.4,
    hits: { count: 1, startSec: 0.7 },
    se: [{ at: 'hit', id: '$skill' }],
    fx: [
      { at: 'hit', id: 'swirl', anchor: 'hero', shapes: ['star', 'heart'], colors: ['$main', '$sub'], count: 12, r0: 60, r1: 20, turns: 1, life: 0.8, size: [5, 9] },
      { at: 'hit', id: 'callout', text: 'ふわぁ……力が抜ける', color: '$glow', size: 22 }
    ]
  },
  backOpen: {
    flashSec: 0.2,
    durationSec: 1.2,
    hits: { count: 1, startSec: 0.6 },
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'start', id: 'speedLines', anchor: 'hero', color: '$sub', count: 40, alpha: 0.45 },
      { at: 'hit', id: 'callout', anchor: 'enemyHead', text: '後ろ、空いてるよ♡', color: '$main', size: 24, oy: -28 },
      { at: 'hit', id: 'wash', color: '$sub', alpha: 0.2, mode: 'edge', life: 1.2 }
    ]
  },
  expPlease: {
    flashSec: 0.3,
    durationSec: 1.8,
    hits: { count: 4, startSec: 0.4, endSec: 1.4 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }, { at: 'hit', id: 'expDrained', every: 2, gain: 0.7 }],
    fx: [
      { at: 'start', id: 'glyph', anchor: 'hero', oy: -10, style: 'star', color: '$sub', sub: '$main', r: 40, life: 1.6, spin: 3 },
      { at: 'hit', ...drainFlow({ shapes: ['dot', 'star'], colors: ['#c08bff', '$sub'] }) },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: '経験値、いただくね♡', color: '$main', size: 24, oy: -30 },
      { at: 'end', id: 'callout', text: '背中から吸われた…', color: '$glow', size: 20, when: 'backstab' }
    ]
  },
  silverPlunder: finisher({ intro: '後ろ、ぜ～んぶもらうね', outro: '白銀の完全収奪♡ ……ごちそうさま', shapes: ['star', 'heart'], style: 'star' }),

  // ======================================================================
  // 強引な桃髪メイド：視線の矯正と、メイドの呼び鈴
  // ======================================================================
  maidGuide: touch({ shapes: ['ribbon', 'heart'] }),
  pinkGazeBind: bind({ text: 'こちらをご覧くださいね♡ ……逃げ道は、塞いでありますよ', shapes: ['ribbon', 'heart'], style: 'ribbon' }),
  faceThisWay: gazeSkill({ text: 'こちらを向いてください♡', after: '顔が、勝手に向く…' }),
  lookAwayQ: choice({ intro: '目を逸らしますか？ ……できるのでしたら、どうぞ', give: '逸らせない…', accepted: 'はい♡ 見つめたままで、いい子ですね', resistText: '視線を外した' }),
  noEscapeMaid: {
    flashSec: 0.25,
    durationSec: 1.2,
    hits: { count: 1, startSec: 0.7 },
    se: [{ at: 'start', id: 'maidBell' }, { at: 'hit', id: '$skill' }],
    windup: [{ at: 'start', id: 'telegraph', from: 'enemyFeet', to: 'heroFeet', color: '$main', width: 5, life: 0.9 }],
    fx: [
      { at: 'hit', id: 'impact', size: 36, color: '$main' },
      { at: 'hit', id: 'callout', anchor: 'enemyHead', text: '逃がしませんよ', color: '$main', size: 24, oy: -28 }
    ]
  },
  pinkEscort: finisher({ intro: 'では、最後までエスコートいたしますね', outro: '本日もありがとうございます♡ 経験値は大切にいただきますね', shapes: ['ribbon', 'heart'], style: 'ribbon' })
};
