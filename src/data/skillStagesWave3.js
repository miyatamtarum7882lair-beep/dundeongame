// File: src/data/skillStagesWave3.js
// 追加18体・前半8体の技の演出台本。書式は skillStages.js / skillStagesWave1.js の先頭を参照。

const gentleCue = { at: 'end', id: 'callout', text: 'ドキッ…♡', color: '$glow', size: 22, oy: 10, when: 'gentle' };

function touch({ shapes = ['heart'], extra = [], impact = 26 } = {}) {
  return {
    flashSec: 0,
    durationSec: 0.5,
    hits: { count: 1, startSec: 0.1 },
    se: [{ at: 'hit', id: '$skill' }],
    fx: [
      { at: 'hit', id: 'impact', size: impact, color: '$glow' },
      { at: 'hit', id: 'burst', anchor: 'heroHead', shapes, colors: ['$main', '$glow'], count: 6, speed: [70, 170], size: [5, 9], life: 0.6, gravity: -40 },
      { at: 'hit', id: 'burst', anchor: 'heroHead', shapes: ['heart', 'heartLine'], colors: ['$main', '$sub'], count: 4, speed: [40, 100], size: [4, 7], life: 0.5, when: 'evolved' },
      ...extra
    ]
  };
}

// 吸い取りの流れ（主人公 → 敵）。紫は経験値、ピンクは MP
const drainFlow = (extra = {}) => ({
  id: 'flow', from: 'heroHead', to: 'enemyHead', toOffset: { oy: 24 }, shapes: ['dot', 'heart'], colors: ['#c08bff', '$main'],
  count: 6, life: 0.45, spanSec: 0.2, arc: 26, size: [3, 6], glow: true, ...extra
});

// 拘束：始まりの決め台詞と、吸うたびの粒
function bind({ text, style = 'heart', shapes = ['heart'], extraStart = [], extraPulse = [] }) {
  return {
    bind: {
      start: [
        { id: 'glyph', anchor: 'heroFeet', style, mark: 'heart', color: '$main', sub: '$sub', r: 74, life: 1.6 },
        { id: 'swirl', anchor: 'hero', shapes, colors: ['$main', '$sub', '$glow'], count: 14, r0: 30, r1: 110, turns: 0.9, life: 0.9, size: [6, 10] },
        { id: 'callout', text, color: '$main', size: 28, oy: -20 },
        ...extraStart
      ],
      pulse: [
        { ...drainFlow({ shapes: ['dot', ...shapes] }) },
        { id: 'burst', anchor: 'hero', shapes, colors: ['$main', '$glow'], count: 4, speed: [30, 80], size: [4, 7], life: 0.7, gravity: -60 },
        ...extraPulse
      ]
    }
  };
}

// 上位技：長い吸い上げ
function finisher({ hits = 10, dur = 3.8, intro, outro, shapes = ['heart'], style = 'heart', extra = [], se = [] }) {
  return {
    flashSec: 0.4,
    durationSec: dur,
    hits: { count: hits, startSec: 0.6, endSec: dur - 0.5 },
    perHit: { mp: 1 / hits, exp: 1 / hits },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }, { at: 'hit', id: 'heartPop', every: 3, gain: 0.6 }, ...se],
    windup: [{ at: 'start', id: 'glyph', anchor: 'enemyFeet', style, color: '$main', sub: '$sub', r: 60, life: 1.2, spin: 2 }],
    fx: [
      { at: 'start', id: 'wash', color: '$main', alpha: 0.26, mode: 'full', life: dur, inSec: 0.4 },
      { at: 'start', id: 'glyph', anchor: 'heroFeet', style, mark: 'heart', color: '$main', sub: '$sub', r: 110, life: dur, spin: 1.5 },
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: intro, color: '$main', size: 28, oy: -30, life: 1.6 },
      { at: 'hit', ...drainFlow({ shapes: ['dot', ...shapes], count: 5 }) },
      { at: 'hit', id: 'burst', anchor: 'hero', shapes, colors: ['$main', '$glow', '$sub'], count: 5, speed: [60, 160], size: [5, 9], life: 0.7, gravity: -30 },
      { at: 'hit', id: 'ring', anchor: 'hero', r: 70, squash: 0.5, color: '$main', width: 4, alpha: 0.6, every: 2 },
      { at: 'end', id: 'flash', color: '$main', alpha: 0.35 },
      { at: 'end', id: 'callout', text: outro, color: '$main', size: 32, wobble: 0.08, life: 1.6 },
      ...extra
    ]
  };
}

export const WAVE3_STAGES = {
  // ======================================================================
  // 金髪メイドさん：靴音が増えていく。仲間のメイドと声をそろえる
  // ======================================================================
  maidChaseStep: touch({ shapes: ['ribbon', 'heart'], extra: [{ at: 'hit', id: 'callout', anchor: 'enemyHead', text: '……逃がしません', color: '$sub', size: 18, oy: -26, when: 'evolved' }] }),
  blondeMaidHold: bind({ text: '捕まえました。……動かないでください', style: 'ribbon', shapes: ['ribbon', 'heart'] }),
  pathBlock: {
    flashSec: 0.2,
    durationSec: 1.4,
    hits: { count: 1, startSec: 0.8 },
    se: [{ at: 'start', id: 'heelStep' }, { at: 'start', id: 'heelStep', delay: 0.15 }, { at: 'start', id: 'heelStep', delay: 0.3 }, { at: 'hit', id: '$skill' }],
    windup: [{ at: 'start', id: 'telegraph', from: 'enemyFeet', to: 'heroFeet', color: '$sub', width: 5, life: 1.0 }],
    fx: [
      { at: 'start', id: 'speedLines', anchor: 'hero', color: '$sub', count: 40, alpha: 0.4 },
      { at: 'hit', id: 'tileMark', anchor: 'heroFeet', ox: 64, color: '$sub', life: 1.4 },
      { at: 'hit', id: 'tileMark', anchor: 'heroFeet', ox: -64, color: '$sub', life: 1.4 },
      { at: 'hit', id: 'ring', anchor: 'heroFeet', r: 70, squash: 0.45, color: '$main', width: 6, alpha: 0.8 },
      { at: 'hit', id: 'callout', anchor: 'enemyHead', text: 'そちらは、通行止めです', color: '$main', size: 22, oy: -28 },
      { at: 'hit', id: 'callout', text: '囲まれた…', color: '$glow', size: 22 }
    ]
  },
  maidPursuit: {
    flashSec: 0.2,
    durationSec: 1.6,
    hits: { count: 1, startSec: 1.0 },
    se: [{ at: 'start', id: '$skill' }, { at: 'hit', id: 'maidChorus', gain: 0.7 }],
    fx: [
      // 呼び鈴が鳴ると、遠くのメイドたちに光が飛んでいく
      { at: 'start', id: 'ring', anchor: 'enemy', r: 140, color: '$sub', width: 4, alpha: 0.7, life: 1.0 },
      { at: 'start', id: 'burst', anchor: 'enemyHead', shapes: ['note', 'ribbon'], colors: ['$sub', '$main'], count: 12, speed: [120, 260], size: [6, 10], life: 1.0 },
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: '――皆さん、こちらです', color: '$sub', size: 22, oy: -28 },
      { at: 'hit', id: 'wash', color: '$sub', alpha: 0.18, mode: 'edge', life: 1.4 },
      { at: 'hit', id: 'callout', text: '足音が増えていく…', color: '$glow', size: 22 }
    ]
  },
  silentUrge: {
    flashSec: 0.25,
    durationSec: 1.8,
    hits: { count: 2, startSec: 0.6, endSec: 1.2 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }, { at: 'end', id: 'temptAccept', when: 'accepted' }],
    fx: [
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: '…………', color: '$sub', size: 26, oy: -26 },
      { at: 'hit', id: 'swirl', anchor: 'hero', shapes: ['ribbon', 'heart'], colors: ['$main', '$sub'], count: 10, r0: 90, r1: 30, turns: 0.8, life: 0.8, size: [5, 9] },
      { at: 'end', id: 'callout', text: '足が…止まる…', color: '$glow', size: 24, when: '!resisted' },
      { at: 'end', id: 'ring', anchor: 'hero', r: 64, color: '#ffd1e8', width: 5, alpha: 0.8, when: 'resisted' },
      { at: 'end', id: 'callout', text: '身構えた', color: '#ffd1e8', size: 22, when: 'resisted' },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: 'はい。いい子です', color: '$main', size: 26, oy: -30, when: 'accepted' },
      gentleCue
    ]
  },
  inescapableMaidHold: finisher({
    intro: '皆さん、せー、の……', outro: '「「経験値、だして……♡」」', shapes: ['ribbon', 'heart'], style: 'ribbon',
    se: [{ at: 'end', id: 'maidChorus' }]
  }),

  // ======================================================================
  // 甘やかしバニー：ふわふわのハートで包み、負けた記憶ごと甘やかす
  // ======================================================================
  bunnyInvite: touch({ shapes: ['fluff', 'heart'] }),
  sweetBunnyHold: bind({ text: 'はい、ぎゅ～っ♡ よしよし', shapes: ['fluff', 'heart'] }),
  rewardWhisper: {
    flashSec: 0.2,
    durationSec: 1.6,
    hits: { count: 1, startSec: 0.9 },
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'start', id: 'flow', from: 'enemyHead', to: 'heroHead', toOffset: { ox: 30 }, shapes: ['note', 'heart'], colors: ['$main', '$glow'], count: 10, life: 0.8, spanSec: 0.6, arc: 30, wobble: 10, size: [5, 8] },
      { at: 'hit', id: 'callout', text: 'ごほうび、ほしいですよね……♡', color: '$main', size: 22, ox: 60, oy: -10 },
      { at: 'hit', id: 'burst', anchor: 'heroHead', shapes: ['heart'], colors: ['$main', '$glow'], count: 6, speed: [20, 60], size: [5, 8], life: 1.0, gravity: -40 }
    ]
  },
  pamperMagic: {
    flashSec: 0.2,
    durationSec: 1.8,
    hits: { count: 1, startSec: 1.0 },
    se: [{ at: 'start', id: '$skill' }, { at: 'hit', id: 'heartPop' }],
    fx: [
      { at: 'start', id: 'cloud', from: 'enemyHead', to: 'hero', colors: ['$glow', '$main', '#ffffff'], count: 14, r: [14, 40], life: 1.4, spread: 50, lift: 20 },
      { at: 'hit', id: 'hearts', anchor: 'heroHead', count: 8, size: 1.1, color: '$main' },
      { at: 'hit', id: 'callout', text: 'よしよし、がんばりましたね♡', color: '$main', size: 24 },
      { at: 'hit', id: 'callout', text: '……甘えたくなる', color: '$glow', size: 20, oy: 30 }
    ]
  },
  justALittleMore: {
    flashSec: 0.3,
    durationSec: 2.2,
    hits: { count: 3, startSec: 0.6, endSec: 1.6 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }, { at: 'end', id: 'temptAccept', when: 'accepted' }],
    fx: [
      { at: 'start', id: 'swirl', anchor: 'hero', shapes: ['fluff', 'heart'], colors: ['$main', '$glow', '$sub'], count: 16, r0: 120, r1: 30, turns: 1.0, life: 1.4, size: [6, 10] },
      { at: 'hit', id: 'burst', anchor: 'hero', oy: -20, shapes: ['heart'], colors: ['$main', '$glow'], count: 5, speed: [30, 80], size: [6, 10], life: 1.0, gravity: -30 },
      { at: 'end', id: 'callout', text: 'もう少しだけ……♡', color: '$main', size: 30, when: '!resisted' },
      { at: 'end', id: 'wash', color: '$main', alpha: 0.3, mode: 'full', life: 1.6, when: 'accepted' },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: '負けちゃったこと、ぜんぶ甘やかしてあげます♡', color: '$main', size: 22, oy: -34, when: 'accepted' },
      gentleCue
    ]
  },
  supremeRewardHold: finisher({ intro: '最後のごほうびです♡', outro: 'よしよし……ぜんぶ、出しちゃいましょうね♡', shapes: ['fluff', 'heart'] }),

  // ======================================================================
  // ヤンデレちゃん：暗い赤と錠前。逃げた記憶が、そのまま鎖になる
  // ======================================================================
  loveTouch: touch({ shapes: ['heart', 'heartLine'] }),
  yandereHipHold: bind({
    text: 'つかまえた。もう、どこにも行かせない', shapes: ['heart', 'heartLine'],
    extraStart: [{ id: 'wash', color: '$accent', alpha: 0.28, mode: 'edge', life: 1.8 }],
    extraPulse: [{ id: 'callout', texts: ['すき', 'すき♡', 'だいすき', 'ずっと一緒'], color: '$sub', size: 18, ox: 70, oy: -30, life: 0.9 }]
  }),
  foundYou: {
    flashSec: 0.3,
    durationSec: 1.6,
    hits: { count: 1, startSec: 0.8 },
    se: [{ at: 'start', id: '$skill' }, { at: 'hit', id: 'lockClick' }],
    windup: [{ at: 'start', id: 'callout', anchor: 'enemyHead', text: '……みーつけた', color: '$accent', size: 24, oy: -26 }],
    fx: [
      { at: 'start', id: 'wash', color: '$accent', alpha: 0.3, mode: 'edge', life: 1.6, inSec: 0.2 },
      { at: 'start', id: 'speedLines', anchor: 'hero', color: '$main', count: 50, alpha: 0.5 },
      { at: 'hit', id: 'glyph', anchor: 'heroFeet', style: 'heart', mark: 'heart', color: '$accent', sub: '$main', r: 56, life: 2.0 },
      { at: 'hit', id: 'callout', text: 'ずっと探してたよ♡', color: '$main', size: 28 },
      { at: 'hit', id: 'callout', text: '居場所を知られた…', color: '$glow', size: 20, oy: 30 }
    ]
  },
  whyRunAway: {
    flashSec: 0.3,
    durationSec: 2.0,
    hits: { count: 2, startSec: 0.7, endSec: 1.3 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }, { at: 'end', id: 'temptAccept', when: 'accepted' }],
    fx: [
      { at: 'start', id: 'wash', color: '#2a0010', alpha: 0.3, mode: 'full', life: 2.0, inSec: 0.4 },
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: 'どうして……逃げるの……？', color: '$main', size: 24, oy: -28, life: 1.6 },
      { at: 'hit', id: 'flow', from: 'enemyHead', to: 'heroHead', shapes: ['heartLine'], colors: ['$accent', '$main'], count: 8, life: 0.6, spanSec: 0.4, arc: 10, size: [5, 9] },
      { at: 'end', id: 'callout', text: '……戻らなきゃ', color: '$glow', size: 24, when: '!resisted' },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: 'ほかの子との思い出、ぜ～んぶ私で上書きしてあげる♡', color: '$main', size: 20, oy: -36, life: 2.0, when: 'accepted' },
      gentleCue
    ]
  },
  obsessiveRecapture: {
    flashSec: 0.25,
    durationSec: 0.9,
    hits: { count: 1, startSec: 0.5 },
    se: [{ at: 'hit', id: '$skill' }, { at: 'hit', id: 'thud' }],
    windup: [{ at: 'start', id: 'telegraph', from: 'enemyFeet', to: 'heroFeet', color: '$accent', width: 6, life: 1.0 }],
    fx: [
      { at: 'start', id: 'speedLines', anchor: 'hero', color: '$accent', count: 60, alpha: 0.55 },
      { at: 'hit', id: 'impact', size: 40, color: '$main' },
      { at: 'hit', id: 'callout', text: 'つかまえた♡ 二度と、離さない', color: '$main', size: 26 }
    ]
  },
  eternalPossession: finisher({
    intro: 'これからは、ずっと一緒', outro: 'あなたは、もう私だけのもの♡', shapes: ['heart', 'heartLine'],
    extra: [{ at: 'hit', id: 'callout', texts: ['すき', 'すき', 'すき♡', 'すきすき', 'だいすき', 'ずっと', 'ずっと', '一緒', '私だけ', 'すき♡'], color: '$accent', size: 20, ox: 80, oy: -40, life: 0.6 }]
  }),

  // ======================================================================
  // 小悪魔メイドさん：ティーカップの音と、ご褒美のリボン
  // ======================================================================
  maidMischief: touch({ shapes: ['ribbon', 'heart'] }),
  devilMaidHold: bind({ text: 'ご奉仕、させていただきますね♡', style: 'ribbon', shapes: ['lips', 'heart'],
    extraStart: [{ id: 'kissMark' }], extraPulse: [{ id: 'kissMark', every: 2 }] }),
  rewardOffer: {
    flashSec: 0.3,
    durationSec: 2.0,
    hits: { count: 2, startSec: 0.7, endSec: 1.3 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }, { at: 'end', id: 'temptAccept', when: 'accepted' }],
    fx: [
      { at: 'start', id: 'burst', anchor: 'enemyHead', shapes: ['ribbon', 'star', 'heart'], colors: ['$main', '$sub', '#ffd36b'], count: 14, speed: [40, 120], size: [6, 10], life: 1.2, gravity: -40 },
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: 'ご褒美、ほしくありませんか？♡', color: '$main', size: 22, oy: -28 },
      { at: 'hit', id: 'heartProjectileFx' },
      { at: 'end', id: 'callout', text: 'ご褒美……', color: '$glow', size: 24, when: '!resisted' },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: '……それ、『利用』されちゃいますよ？♡', color: '$main', size: 22, oy: -34, when: 'accepted' },
      gentleCue
    ]
  },
  serviceKiss: {
    flashSec: 0.25,
    durationSec: 1.8,
    hits: { count: 4, startSec: 0.4, endSec: 1.4 },
    hitNumbers: false,
    se: [{ at: 'hit', id: 'kissAir', every: 2 }, { at: 'end', id: '$skill' }],
    fx: [
      { at: 'hit', id: 'kissMark' },
      { at: 'hit', ...drainFlow({ shapes: ['lips', 'dot'] }) },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: 'ごちそうさまでした♡', color: '$main', size: 24, oy: -28 }
    ]
  },
  quietMaster: {
    flashSec: 0.2,
    durationSec: 1.5,
    hits: { count: 1, startSec: 0.8 },
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'start', id: 'flow', from: 'enemyHead', to: 'heroHead', toOffset: { ox: -30 }, shapes: ['note', 'heart'], colors: ['$main', '$sub'], count: 8, life: 0.7, spanSec: 0.5, arc: 20, size: [5, 8] },
      { at: 'hit', id: 'callout', text: 'しーっ……ご主人さま、お静かに♡', color: '$main', size: 22, ox: -50 },
      { at: 'hit', id: 'callout', text: '頭がぼーっとする…', color: '$glow', size: 20, oy: 30 }
    ]
  },
  supremeService: finisher({
    intro: '……くす♡ ご主人さま、ご命令くださいませ', outro: 'はい♡ お疲れさまでした、ご主人さま', shapes: ['lips', 'ribbon', 'heart'], style: 'ribbon',
    extra: [{ at: 'hit', id: 'kissMark', every: 2 }]
  }),

  // ======================================================================
  // キョンシーちゃん：お札と、ぴょんぴょん。腕でぎっちり
  // ======================================================================
  hopTouch: touch({ shapes: ['star', 'heart'] }),
  jiangshiHold: bind({ text: 'ぎゅ～っ♡ もう離れないよ', shapes: ['star', 'heart'],
    extraPulse: [{ id: 'callout', text: 'しつこいよ～♡', color: '$sub', size: 16, ox: -70, oy: -30, every: 3 }] }),
  jiangshiLeap: {
    flashSec: 0.25,
    durationSec: 1.0,
    hits: { count: 1, startSec: 0.6 },
    se: [{ at: 'start', id: 'jiangshiHop' }, { at: 'hit', id: '$skill' }],
    windup: [{ at: 'start', id: 'telegraph', from: 'enemyFeet', to: 'heroFeet', color: '$sub', width: 5, life: 1.0 }],
    fx: [
      { at: 'start', id: 'burst', anchor: 'enemyFeet', shapes: ['star'], colors: ['$sub', '$main'], count: 8, speed: [60, 140], size: [5, 8], life: 0.6 },
      { at: 'hit', id: 'impact', size: 36, color: '$main' },
      { at: 'hit', id: 'callout', text: 'ぴょ～ん、つかまえた♡', color: '$main', size: 26 }
    ]
  },
  jiangshiHug: {
    flashSec: 0.3,
    durationSec: 2.0,
    hits: { count: 2, startSec: 0.7, endSec: 1.3 },
    hitNumbers: false,
    se: [{ at: 'start', id: 'talismanSlap' }, { at: 'hit', id: '$skill' }, { at: 'end', id: 'contestWin', when: 'contestWin' }],
    fx: [
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: 'ぎゅーってしてあげる♡', color: '$main', size: 24, oy: -28 },
      { at: 'hit', id: 'swirl', anchor: 'hero', shapes: ['star', 'heart'], colors: ['$main', '$sub'], count: 12, r0: 80, r1: 20, turns: 1, life: 0.8, size: [5, 9] },
      { at: 'end', id: 'ring', anchor: 'hero', r: 70, color: '#ffd1e8', width: 6, alpha: 0.8, when: 'contestWin' },
      { at: 'end', id: 'callout', text: '振りほどいた！', color: '#ffd1e8', size: 26, when: 'contestWin' },
      { at: 'end', id: 'callout', text: 'あったかい……', color: '$glow', size: 24, when: ['!contestWin', '!gentle'] },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: '私のおてて、すごぉくしつこいんだよ……？♡', color: '$main', size: 20, oy: -34, when: 'accepted' },
      gentleCue
    ]
  },
  learnedEscape: {
    flashSec: 0.2,
    durationSec: 1.5,
    hits: { count: 1, startSec: 0.8 },
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'start', id: 'flow', from: 'enemyHead', to: 'hero', shapes: ['star'], colors: ['$sub', '#ffffff'], count: 6, life: 0.6, spanSec: 0.4, arc: 30, size: [6, 9] },
      { at: 'hit', id: 'glyph', anchor: 'hero', oy: -20, style: 'star', color: '$sub', sub: '$main', r: 30, life: 1.4 },
      { at: 'hit', id: 'callout', text: '逃げ方、おぼえちゃった♡', color: '$main', size: 24 },
      { at: 'hit', id: 'callout', text: 'もがく力が入らない…', color: '$glow', size: 20, oy: 30 }
    ]
  },
  perfectJiangshiHug: finisher({ intro: 'もう、どんな逃げ方もおぼえたよ♡', outro: 'ぎっちり……ぜ～んぶ、もらったよ♡', shapes: ['star', 'heart'], style: 'star' }),

  // ======================================================================
  // 白銀の小悪魔：甘えた声と、ちゃり～ん♡
  // ======================================================================
  begTouch: touch({ shapes: ['heart', 'star'] }),
  silverDevilHold: bind({ text: 'えへへ、つかまえた♡ ねえ、ちょうだい？', shapes: ['heart', 'star'],
    extraStart: [{ id: 'kissMark' }] }),
  pleaseListen: {
    flashSec: 0.3,
    durationSec: 2.0,
    hits: { count: 2, startSec: 0.7, endSec: 1.3 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }, { at: 'end', id: 'temptAccept', when: 'accepted' }],
    fx: [
      { at: 'start', id: 'burst', anchor: 'enemyHead', shapes: ['heart', 'star'], colors: ['$main', '$sub'], count: 10, speed: [30, 90], size: [5, 9], life: 1.0, gravity: -40 },
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: 'ねえ……お願い、聞いて？♡', color: '$main', size: 24, oy: -28 },
      { at: 'hit', id: 'heartProjectileFx' },
      { at: 'end', id: 'callout', text: '断れない…', color: '$glow', size: 24, when: '!resisted' },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: 'やったぁ♡ ……これで、カモ確定だね', color: '$main', size: 22, oy: -34, when: 'accepted' },
      gentleCue
    ]
  },
  sulkyTempt: {
    flashSec: 0.2,
    durationSec: 1.6,
    hits: { count: 1, startSec: 0.9 },
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'start', id: 'burst', anchor: 'enemyHead', shapes: ['bubble'], colors: ['#bfe6ff', '$glow'], count: 6, speed: [20, 50], size: [3, 6], life: 1.0, gravity: 40 },
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: 'しょんぼり……', color: '$sub', size: 22, oy: -26 },
      { at: 'hit', id: 'callout', text: 'かわいそう…', color: '$glow', size: 22 },
      { at: 'hit', id: 'hearts', anchor: 'heroHead', count: 4, size: 0.9, color: '$main' }
    ]
  },
  secondHelping: {
    flashSec: 0.25,
    durationSec: 1.8,
    hits: { count: 3, startSec: 0.5, endSec: 1.3 },
    hitNumbers: false,
    se: [{ at: 'hit', id: 'coinTribute', every: 2 }, { at: 'end', id: 'vacuumKiss' }],
    fx: [
      { at: 'hit', ...drainFlow({ shapes: ['dot', 'heart'], colors: ['#ffd36b', '$main'] }) },
      { at: 'hit', id: 'callout', texts: ['ちゃり～ん♡', 'もう一回♡', 'おかわり♡'], color: '#ffd36b', size: 22, ox: 50, oy: -20 },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: 'お貢ぎ、いつもありがとうございま～す♡', color: '$main', size: 20, oy: -30 }
    ]
  },
  absoluteBegging: finisher({
    intro: 'ねえ、ぜ～んぶちょうだい？♡', outro: '付けちゃいけないクセ、付いちゃったね♡', shapes: ['heart', 'star'],
    extra: [{ at: 'hit', id: 'callout', texts: ['ちょうだい♡', 'もっと♡', 'おかわり♡', 'ちゃり～ん♡'], color: '#ffd36b', size: 18, ox: -80, oy: -30, life: 0.6 }]
  }),

  // ======================================================================
  // 無表情サキュバス：冷たい時計の音。感情のない、カウントダウン
  // ======================================================================
  silentSweep: touch({ shapes: ['heartLine'], impact: 30 }),
  silentShackle: bind({ text: '……捕まえた', shapes: ['heartLine', 'heart'],
    extraStart: [{ id: 'wash', color: '#2a1040', alpha: 0.25, mode: 'edge', life: 1.6 }] }),
  noUse: {
    flashSec: 0.2,
    durationSec: 1.5,
    hits: { count: 1, startSec: 0.9 },
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: '……どうせ、無理でしょ', color: '$sub', size: 22, oy: -26 },
      { at: 'hit', id: 'wash', color: '#2a1040', alpha: 0.3, mode: 'full', life: 1.2 },
      { at: 'hit', id: 'callout', text: '力が抜ける…', color: '$glow', size: 22 }
    ]
  },
  giveUp: {
    flashSec: 0.3,
    durationSec: 2.0,
    hits: { count: 2, startSec: 0.7, endSec: 1.3 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }, { at: 'end', id: 'temptAccept', when: 'accepted' }],
    fx: [
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: '抵抗、やめる？', color: '$sub', size: 26, oy: -28 },
      { at: 'hit', id: 'ring', anchor: 'hero', r: 50, color: '$sub', width: 3, alpha: 0.6 },
      { at: 'end', id: 'callout', text: '……もう、いいか', color: '$glow', size: 24, when: '!resisted' },
      { at: 'end', id: 'ring', anchor: 'hero', r: 64, color: '#ffd1e8', width: 5, alpha: 0.8, when: 'resisted' },
      { at: 'end', id: 'callout', text: '抵抗を続ける', color: '#ffd1e8', size: 22, when: 'resisted' },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: '……そう。いい子', color: '$main', size: 24, oy: -32, when: 'accepted' },
      gentleCue
    ]
  },
  blindSpot: {
    flashSec: 0.2,
    durationSec: 0.9,
    hits: { count: 1, startSec: 0.5 },
    se: [{ at: 'hit', id: '$skill' }, { at: 'hit', id: 'thud' }],
    windup: [{ at: 'start', id: 'tileMark', anchor: 'heroFeet', color: '$sub', life: 0.9 }],
    fx: [
      { at: 'hit', id: 'impact', anchor: 'heroFeet', size: 36, color: '$sub' },
      { at: 'hit', id: 'callout', anchor: 'enemyHead', text: '足元、見えてないね', color: '$sub', size: 22, oy: -26 }
    ]
  },
  // 冷たく抑揚のない、速いカウントダウン → 甘い声に戻る
  totalSurrenderHold: {
    flashSec: 0.35,
    durationSec: 4.4,
    hits: { count: 8, startSec: 0.5, endSec: 3.9 },
    hitNumbers: false,
    se: [{ at: 'hit', id: 'coldTick', gain: 0.8 }, { at: 'hit', id: 'zeroDrop', first: 5 }, { at: 'end', id: 'climaxPulse' }],
    fx: [
      { at: 'start', id: 'wash', color: '#1a0a28', alpha: 0.4, mode: 'full', life: 4.4, inSec: 0.6 },
      { at: 'start', id: 'glyph', anchor: 'heroFeet', style: 'star', mark: 'heart', color: '$sub', sub: '$main', r: 110, life: 4.4, spin: 0.4 },
      { at: 'hit', id: 'callout', texts: ['ご', 'よん', 'さん', 'に', 'いち', 'ぜろ', 'ぜろ', 'ぜろ。'], color: '$sub', size: 64, oy: -30, rise: 6, wobble: 0, life: 0.45 },
      { at: 'hit', ...drainFlow({ count: 4 }) },
      { at: 'hit', id: 'flash', color: '$main', alpha: 0.35, first: 5 },
      { at: 'hit', id: 'shake', power: 1.0, first: 5 },
      { at: 'end', id: 'callout', text: '……はい。お疲れさま', color: '$main', size: 30, life: 1.6 }
    ]
  },

  // ======================================================================
  // あまあま猫耳メイド：ごろごろと、ふ～っ……♡
  // ======================================================================
  catHelp: touch({ shapes: ['heart', 'fluff'] }),
  catCareHold: bind({ text: 'お世話させてくださいませ♡ ごろごろ…', shapes: ['fluff', 'heart'] }),
  careRecommend: {
    flashSec: 0.2,
    durationSec: 1.6,
    hits: { count: 1, startSec: 0.9 },
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'start', id: 'breath' },
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: 'ふ～っ……♡', color: '$main', size: 24, oy: -26 },
      { at: 'hit', id: 'cloud', from: 'heroHead', to: 'heroHead', colors: ['$glow', '$main'], count: 8, r: [10, 26], life: 1.2, spread: 30, lift: 10 },
      { at: 'hit', id: 'callout', text: 'ご自分で頑張らなくても、いいのですよ♡', color: '$main', size: 18, oy: -10 },
      { at: 'hit', id: 'callout', text: '気が緩む…', color: '$glow', size: 20, oy: 30 }
    ]
  },
  leaveItToMe: {
    flashSec: 0.3,
    durationSec: 2.0,
    hits: { count: 2, startSec: 0.7, endSec: 1.3 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }, { at: 'end', id: 'temptAccept', when: 'accepted' }],
    fx: [
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: 'お任せくださいませ♡', color: '$main', size: 26, oy: -28 },
      { at: 'hit', id: 'swirl', anchor: 'hero', shapes: ['fluff', 'heart'], colors: ['$main', '$glow'], count: 12, r0: 90, r1: 20, turns: 1, life: 0.9, size: [5, 9] },
      { at: 'end', id: 'callout', text: '任せちゃおうかな…', color: '$glow', size: 24, when: '!resisted' },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: '私、猫舌なんですよ？♡ ……ふ～っ。もっとあつ～く、なっちゃいましたね', color: '$main', size: 18, oy: -34, life: 2.0, when: 'accepted' },
      gentleCue
    ]
  },
  masterBreak: {
    flashSec: 0.2,
    durationSec: 1.8,
    hits: { count: 2, startSec: 0.7, endSec: 1.3 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }, { at: 'hit', id: 'catPurr', gain: 0.6 }],
    fx: [
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: 'ご主人さま、休憩のお時間です♡', color: '$main', size: 22, oy: -28 },
      { at: 'hit', id: 'cloud', from: 'enemyHead', to: 'hero', colors: ['$glow', '$main', '#ffffff'], count: 10, r: [14, 36], life: 1.2, spread: 40, lift: 16 },
      { at: 'hit', ...drainFlow({ shapes: ['fluff', 'heart'], count: 4 }), when: 'bonus' },
      { at: 'end', id: 'callout', text: '体がとろける…', color: '$glow', size: 22 },
      { at: 'end', id: 'callout', text: 'お世話に慣れた体が吸われる…', color: '$main', size: 18, oy: 30, when: 'bonus' }
    ]
  },
  supremeCatService: finisher({ intro: 'ご主人さま、ぜんぶお任せくださいね♡', outro: 'はい♡ お疲れさまでした、ご主人さま', shapes: ['fluff', 'heart'],
    se: [{ at: 'hit', id: 'catPurr', every: 4, gain: 0.6 }] })
};

// 後半10体（skillStagesWave4.js）でも使う
export { gentleCue, touch, drainFlow, bind, finisher };
