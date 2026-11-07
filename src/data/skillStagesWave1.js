// File: src/data/skillStagesWave1.js
// 前半9体の技の演出台本。書式は skillStages.js の先頭を参照。
// when: 'gentle' は「まだ無害な技（蓄積だけ進む）」、'interrupted' はカウントを中断したとき、
//       'backstab' は背後から当てたとき、'bonus' は主人公の状態で吸収が増えたとき。
// callout の texts は、ヒットの番号ごとに文字を変える（カウントダウン）。

// 無害な間の小さな「ドキッ♡」
const gentleCue = { at: 'end', id: 'callout', text: 'ドキッ…♡', color: '$glow', size: 22, oy: 10, when: 'gentle' };

// 通常攻撃の共通形（ヒット時の衝撃と、テーマ色の粒）
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

export const WAVE1_STAGES = {
  // ======================================================================
  // シーフちゃん：ハートを抜き取る怪盗。主人公からハートが彼女の手へ吸い寄せられる
  // ======================================================================
  thiefSlip: touch({
    extra: [{ at: 'hit', id: 'flow', from: 'heroHead', to: 'enemyHead', shape: 'heart', colors: ['$main', '#c08bff'], count: 4, life: 0.35, spanSec: 0.15, arc: 20, size: [4, 6] }]
  }),
  thiefHold: {
    bind: {
      start: [
        { id: 'burst', anchor: 'hero', shape: 'streak', colors: ['$glow', '$main'], count: 10, speed: [200, 320], size: [6, 9], life: 0.3, angle: 0, spread: Math.PI * 2 },
        { id: 'glyph', anchor: 'heroFeet', style: 'heart', color: '$main', sub: '$sub', r: 70, life: 1.6 },
        { id: 'callout', text: 'つーかまえた♡', color: '$main', size: 30, oy: -20 },
        { id: 'wash', color: '$main', alpha: 0.16, life: 0.9 }
      ],
      pulse: [
        { id: 'flow', from: 'heroHead', to: 'enemyHead', fromOffset: { oy: 20 }, toOffset: { oy: 30 }, shapes: ['heart', 'heart', 'dot'], colors: ['$main', '#c08bff', '$glow'], count: 8, life: 0.5, spanSec: 0.35, arc: 30, size: [4, 7], glow: true },
        { id: 'sparkle', anchor: 'enemyHead', color: '#c08bff' }
      ]
    }
  },
  thiefPeek: {
    flashSec: 0.15,
    durationSec: 1.2,
    hits: { count: 1, startSec: 0.5 },
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'start', id: 'swirl', anchor: 'enemy', oy: 10, shapes: ['heart', 'heartLine'], colors: ['$main', '$glow'], count: 10, r0: 20, r1: 55, turns: 0.7, life: 0.7, size: [5, 8] },
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: 'チラッ♡', color: '$main', size: 28, oy: -24, wobble: 0.12 },
      { at: 'hit', id: 'flow', from: 'enemy', to: 'heroHead', shapes: ['heart', 'heartLine'], colors: ['$main', '$glow'], count: 8, life: 0.4, spanSec: 0.2, arc: 24, size: [5, 8] },
      { at: 'hit', id: 'swirl', anchor: 'heroHead', shape: 'heart', colors: ['$main', '$glow'], count: 6, r0: 30, r1: 34, turns: 1.2, life: 0.8, size: [4, 6] },
      { at: 'hit', id: 'callout', text: '目移り…', color: '$glow', size: 22, delay: 0.2, when: '!gentle' },
      gentleCue
    ]
  },
  heartThief: {
    flashSec: 0.25,
    durationSec: 1.8,
    hits: { count: 1, startSec: 0.9 },
    se: [{ at: 'start', id: '$skill' }, { at: 'hit', id: 'heartPop' }, { at: 'end', id: 'temptAccept', when: 'accepted' }],
    windup: [
      { at: 'start', id: 'swirl', anchor: 'enemyHead', oy: 20, shape: 'heart', colors: ['$main', '$glow'], count: 8, r0: 50, r1: 10, turns: 1, life: 0.6, glow: true }
    ],
    fx: [
      // 主人公の胸から、大きなハートが抜き取られて彼女の手へ
      { at: 'start', id: 'burst', anchor: 'hero', oy: -10, shapes: ['heart'], colors: ['$main'], count: 1, speed: [0, 0], size: [16, 16], life: 0.9, grow: 0.6, glow: true },
      { at: 'start', id: 'ring', anchor: 'hero', oy: -10, r: 60, color: '$main', width: 5, alpha: 0.6, delay: 0.3 },
      { at: 'hit', id: 'flow', from: 'hero', to: 'enemyHead', fromOffset: { oy: -10 }, toOffset: { oy: 30 }, shapes: ['heart'], colors: ['$main'], count: 1, life: 0.5, spanSec: 0, arc: 50, size: [16, 16], glow: true },
      { at: 'hit', id: 'flow', from: 'hero', to: 'enemyHead', fromOffset: { oy: -10 }, toOffset: { oy: 30 }, shapes: ['dot', 'heart'], colors: ['#c08bff', '$glow'], count: 14, life: 0.55, spanSec: 0.25, arc: 40, wobble: 14, size: [3, 6], glow: true },
      { at: 'hit', id: 'burst', anchor: 'enemyHead', oy: 30, shapes: ['heart', 'heartLine'], colors: ['$main', '$glow', '#c08bff'], count: 14, speed: [80, 200], size: [5, 9], life: 0.7, delay: 0.45, glow: true },
      { at: 'hit', id: 'callout', anchor: 'enemyHead', text: 'いただきっ♡', color: '$main', size: 30, oy: -30, delay: 0.45 },
      { at: 'hit', id: 'wash', color: '#c08bff', alpha: 0.14, life: 0.7 },
      { at: 'end', id: 'callout', text: '隙だらけ…', color: '$glow', size: 22, when: 'accepted' }
    ]
  },
  backstabSteal: {
    flashSec: 0.1,
    durationSec: 1.0,
    hits: { count: 1, startSec: 0.3 },
    se: [{ at: 'start', id: 'missWhoosh' }, { at: 'hit', id: '$skill' }],
    fx: [
      // 残像のように主人公の周りを回り込む
      { at: 'start', id: 'swirl', anchor: 'hero', shape: 'streak', colors: ['$glow', '$main'], count: 12, r0: 70, r1: 40, turns: 1.4, life: 0.35, size: [6, 10], glow: true },
      { at: 'hit', id: 'impact', size: 40, color: '$glow' },
      { at: 'hit', id: 'flow', from: 'hero', to: 'enemyHead', fromOffset: { oy: -10 }, toOffset: { oy: 30 }, shapes: ['dot', 'heart'], colors: ['#c08bff', '$main'], count: 10, life: 0.4, spanSec: 0.15, arc: 20, size: [3, 6] },
      { at: 'hit', id: 'callout', text: '背中、がら空き♡', color: '$main', size: 28, wobble: 0.08, when: 'backstab' },
      { at: 'hit', id: 'speedLines', color: '$main', count: 34, alpha: 0.4, when: 'backstab' }
    ]
  },
  heartjackMaster: {
    flashSec: 0.35,
    durationSec: 3.4,
    hits: { count: 10, startSec: 0.4, endSec: 2.9 },
    hitNumbers: false,
    se: [{ at: 'start', id: 'peekWink' }, { at: 'hit', id: 'heartSteal', every: 2, gain: 0.6, gainEnd: 1 }, { at: 'end', id: 'heartPop' }],
    windup: [
      { at: 'start', id: 'glyph', anchor: 'enemyFeet', style: 'heart', color: '$main', sub: '$sub', r: 50, life: 1.2 }
    ],
    fx: [
      { at: 'start', id: 'wash', color: '#c08bff', alpha: 0.2, mode: 'full', life: 3.4, inSec: 0.5 },
      { at: 'start', id: 'glyph', anchor: 'heroFeet', style: 'heart', mark: 'heart', color: '$main', sub: '#c08bff', r: 100, life: 3.4, spin: 2 },
      { at: 'hit', id: 'swirl', anchor: 'hero', shape: 'heart', colors: ['$main', '#c08bff', '$glow'], count: 6, r0: 30, r1: 120, turns: 0.8, life: 0.6, size: [5, 9] },
      { at: 'hit', id: 'flow', from: 'heroHead', to: 'enemyHead', toOffset: { oy: 30 }, shapes: ['heart', 'dot'], colors: ['$main', '#c08bff'], count: 6, life: 0.45, spanSec: 0.2, arc: 40, size: [4, 8], glow: true },
      { at: 'hit', id: 'shake', every: 3, power: 0.3 },
      { at: 'end', id: 'burst', anchor: 'enemyHead', oy: 30, shapes: ['heart', 'heartLine'], colors: ['$main', '#c08bff', '$glow'], count: 30, speed: [120, 300], size: [6, 12], life: 1.0, glow: true },
      { at: 'end', id: 'callout', text: 'ハートジャック♡', color: '$main', size: 40, wobble: 0.1, life: 1.3 }
    ]
  },

  // ======================================================================
  // ミクちゃん：おねだりのハートと、最初は無害な投げキッス
  // ======================================================================
  mikuPechi: touch({ extra: [{ at: 'hit', id: 'callout', text: 'ぺちっ♡', color: '$main', size: 22 }] }),
  mikuBegKiss: {
    bind: {
      start: [
        { id: 'burst', anchor: 'heroHead', shape: 'lips', colors: ['$main'], count: 3, speed: [60, 140], size: [9, 13], life: 0.7 },
        { id: 'swirl', anchor: 'hero', shapes: ['heart', 'heartLine'], colors: ['$main', '$sub', '$glow'], count: 14, r0: 30, r1: 100, turns: 0.9, life: 0.9, size: [6, 10] },
        { id: 'callout', text: 'つかまえた♡', color: '$main', size: 30, oy: -20 },
        { id: 'wash', color: '$main', alpha: 0.16, life: 0.9 }
      ],
      pulse: [
        { id: 'flow', from: 'heroHead', to: 'enemyHead', toOffset: { oy: 24 }, shapes: ['heart'], colors: ['$main', '$sub'], count: 6, life: 0.5, spanSec: 0.3, arc: 26, size: [4, 7] },
        { id: 'kissMark' }
      ]
    }
  },
  mikuPlease: {
    flashSec: 0.15,
    durationSec: 1.3,
    hits: { count: 1, startSec: 0.55 },
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'start', id: 'burst', anchor: 'enemyHead', shapes: ['heart', 'bubble'], colors: ['$main', '$sub', '$glow'], count: 10, speed: [30, 90], size: [5, 9], life: 1.0, gravity: -60, sway: 10 },
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: 'おねがい♡', color: '$main', size: 26, oy: -24, wobble: 0.15 },
      { at: 'hit', id: 'flow', from: 'enemyHead', to: 'heroHead', shapes: ['heart', 'heartLine'], colors: ['$main', '$sub'], count: 9, life: 0.45, spanSec: 0.25, arc: 30, size: [5, 8] },
      { at: 'hit', id: 'callout', text: 'おねがい♡', color: '$main', size: 30, oy: -10, delay: 0.15, wobble: 0.15 },
      { at: 'hit', id: 'swirl', anchor: 'heroHead', shape: 'heart', colors: ['$main', '$glow'], count: 6, r0: 30, r1: 34, turns: 1.4, life: 0.9, size: [4, 7] }
    ]
  },
  mikuBlowKiss: {
    flashSec: 0.25,
    durationSec: 1.5,
    hits: { count: 1, startSec: 0.8 },
    se: [{ at: 'start', id: '$skill' }, { at: 'hit', id: 'heartPop' }],
    windup: [
      { at: 'start', id: 'swirl', anchor: 'enemyHead', shape: 'heart', colors: ['$sub', '$glow'], count: 8, r0: 60, r1: 10, turns: 1, life: 0.7, glow: true }
    ],
    fx: [
      { at: 'start', id: 'heartProjectileFx', size: 1.25, durSec: 0.8, arcPx: 100, delay: 0.05 },
      { at: 'start', id: 'flow', from: 'enemyHead', to: 'heroHead', shapes: ['heart', 'heartLine'], colors: ['$sub', '$glow', '$main'], count: 12, life: 0.7, spanSec: 0.55, arc: 90, wobble: 14, size: [3, 6], glow: true, delay: 0.1 },
      { at: 'hit', id: 'burst', anchor: 'heroHead', shape: 'heart', colors: ['$main', '$glow', '$sub'], count: 14, speed: [120, 260], size: [5, 10], life: 0.7, glow: true },
      { at: 'hit', id: 'ring', anchor: 'heroHead', r: 70, color: '$main', width: 5, alpha: 0.6 },
      { at: 'hit', id: 'kissMark', when: '!gentle' },
      { at: 'hit', id: 'wash', color: '$main', alpha: 0.16, life: 0.7, when: '!gentle' },
      gentleCue
    ]
  },
  mikuSpecialKiss: {
    flashSec: 0.35,
    durationSec: 3.4,
    hits: { count: 10, startSec: 0.4, endSec: 3.0 },
    perHit: { mp: 0.1, exp: 0.1 },
    hitNumbers: false,
    se: [{ at: 'start', id: 'mikuPlease' }, { at: 'hit', id: 'temptSuck', gain: 0.6, gainEnd: 1 }, { at: 'end', id: 'heartPop' }],
    windup: [{ at: 'start', id: 'glyph', anchor: 'enemyFeet', style: 'heart', color: '$main', sub: '$sub', r: 50, life: 1.2 }],
    fx: [
      { at: 'start', id: 'wash', color: '$main', alpha: 0.22, mode: 'full', life: 3.4, inSec: 0.5 },
      { at: 'start', id: 'glyph', anchor: 'heroFeet', style: 'heart', mark: 'heart', color: '$main', sub: '$sub', r: 100, life: 3.4, spin: 2 },
      { at: 'hit', id: 'drainStream', count: 4 },
      { at: 'hit', id: 'hearts', every: 2, count: 3, size: 0.5 },
      { at: 'hit', id: 'kissMark', every: 3 },
      { at: 'hit', id: 'shake', every: 3, power: 0.3 },
      { at: 'end', id: 'burst', anchor: 'hero', shape: 'heart', colors: ['$main', '$sub', '$glow'], count: 30, speed: [160, 340], size: [7, 13], life: 1.0, glow: true },
      { at: 'end', id: 'callout', text: 'お兄さん、だいすき♡', color: '$main', size: 38, wobble: 0.1, life: 1.3 }
    ]
  },

  // ======================================================================
  // おねだりバニー：涙目のお願い（泡）→ 本性の「くすっ♡」と、経験値の味見
  // ======================================================================
  bunnyPunch: touch({ shapes: ['heart', 'heartLine'] }),
  pleadStealKiss: {
    bind: {
      start: [
        { id: 'burst', anchor: 'heroHead', shape: 'lips', colors: ['$main'], count: 3, speed: [60, 140], size: [9, 12], life: 0.7 },
        { id: 'callout', text: 'つかまえちゃいました…♡', color: '$main', size: 26, oy: -20 },
        { id: 'glyph', anchor: 'heroFeet', style: 'heart', color: '$main', sub: '$sub', r: 64, life: 1.5 }
      ],
      pulse: [
        { id: 'flow', from: 'heroHead', to: 'enemyHead', toOffset: { oy: 24 }, shapes: ['dot', 'heart'], colors: ['#c08bff', '$main'], count: 8, life: 0.5, spanSec: 0.3, arc: 26, size: [3, 6], glow: true },
        { id: 'burst', anchor: 'enemyHead', oy: 24, shape: 'heart', colors: ['$main', '$glow'], count: 3, speed: [20, 60], size: [4, 6], life: 0.7, gravity: -40 }
      ]
    }
  },
  pleadPlease: {
    flashSec: 0.15,
    durationSec: 1.6,
    hits: { count: 1, startSec: 0.8 },
    se: [{ at: 'start', id: '$skill' }, { at: 'end', id: 'kittenTease', gain: 0.6, when: 'accepted' }],
    fx: [
      { at: 'start', id: 'burst', anchor: 'enemyHead', oy: 6, shapes: ['bubble', 'dot'], colors: ['$glow', '#bfe6ff'], count: 8, speed: [20, 60], size: [3, 6], life: 1.0, gravity: 40, spread: Math.PI * 0.8 },
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: 'おねがい…', color: '$glow', size: 22, oy: -24 },
      { at: 'hit', id: 'flow', from: 'enemyHead', to: 'heroHead', shapes: ['heartLine', 'heart'], colors: ['$main', '$glow'], count: 7, life: 0.5, spanSec: 0.3, arc: 24, size: [4, 7] },
      { at: 'hit', id: 'swirl', anchor: 'heroHead', shape: 'heartLine', colors: ['$main', '$glow'], count: 6, r0: 40, r1: 30, turns: 1, life: 0.8, size: [5, 8] },
      gentleCue,
      // 受け入れると、本性が出る
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: '……くすっ♡', color: '$main', size: 30, oy: -30, when: 'accepted' },
      { at: 'end', id: 'burst', anchor: 'enemyHead', shapes: ['heart'], colors: ['$main', '$accent'], count: 10, speed: [80, 180], size: [5, 9], life: 0.7, when: 'accepted' }
    ]
  },
  sneakyTaste: {
    flashSec: 0.1,
    durationSec: 1.0,
    hits: { count: 1, startSec: 0.3 },
    se: [{ at: 'hit', id: '$skill' }],
    fx: [
      { at: 'hit', id: 'burst', anchor: 'heroHead', shape: 'lips', colors: ['$main'], count: 2, speed: [20, 50], size: [8, 10], life: 0.5 },
      { at: 'hit', id: 'flow', from: 'heroHead', to: 'enemyHead', toOffset: { oy: 24 }, shapes: ['dot', 'heart'], colors: ['#c08bff', '$main'], count: 8, life: 0.4, spanSec: 0.2, arc: 20, size: [3, 6], glow: true },
      { at: 'hit', id: 'callout', anchor: 'enemyHead', text: 'ちょっとだけ♡', color: '$main', size: 22, oy: -24, delay: 0.2 },
      { at: 'hit', id: 'callout', text: 'ためらって…', color: '$glow', size: 20, when: 'bonus' }
    ]
  },
  secretRewardKiss: {
    flashSec: 0.35,
    durationSec: 3.2,
    hits: { count: 9, startSec: 0.5, endSec: 2.8 },
    hitNumbers: false,
    se: [{ at: 'start', id: 'shyPlea' }, { at: 'hit', id: 'tasteLick', gain: 0.6, gainEnd: 1 }, { at: 'end', id: 'kittenTease', gain: 0.7 }],
    windup: [{ at: 'start', id: 'burst', anchor: 'enemyHead', shapes: ['bubble'], colors: ['$glow'], count: 6, speed: [20, 50], size: [3, 6], life: 1, gravity: 40 }],
    fx: [
      { at: 'start', id: 'wash', color: '#c08bff', alpha: 0.18, mode: 'full', life: 3.2, inSec: 0.6 },
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: '目を閉じて…♡', color: '$main', size: 24, oy: -24 },
      { at: 'hit', id: 'flow', from: 'heroHead', to: 'enemyHead', toOffset: { oy: 24 }, shapes: ['dot', 'heart'], colors: ['#c08bff', '$main'], count: 6, life: 0.45, spanSec: 0.2, arc: 26, size: [3, 6], glow: true },
      { at: 'hit', id: 'kissMark', every: 3 },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: '……ごちそうさま♡', color: '$main', size: 32, oy: -30, life: 1.4 },
      { at: 'end', id: 'burst', anchor: 'enemyHead', shapes: ['heart', 'heartLine'], colors: ['$main', '#c08bff'], count: 24, speed: [100, 260], size: [5, 10], life: 0.9, glow: true }
    ]
  },

  // ======================================================================
  // 天使ちゃん：羽と光輪。祝福は回復に見えて、紫のしずくが漏れていく
  // ======================================================================
  angelTouch: touch({ shapes: ['petal', 'heart'] }),
  angelHug: {
    bind: {
      start: [
        { id: 'swirl', anchor: 'hero', shape: 'petal', colors: ['#ffffff', '$glow', '$sub'], count: 16, r0: 120, r1: 40, turns: 1, life: 1.0, size: [6, 10] },
        { id: 'glyph', anchor: 'heroFeet', style: 'star', mark: 'heart', color: '$sub', sub: '$main', r: 72, life: 1.6 },
        { id: 'callout', text: 'お休みくださいませ♡', color: '$main', size: 26, oy: -20 },
        { id: 'wash', color: '$sub', alpha: 0.14, life: 1.0 }
      ],
      pulse: [
        { id: 'burst', anchor: 'heroHead', shapes: ['petal', 'heart'], colors: ['#ffffff', '$main'], count: 5, speed: [30, 80], size: [5, 8], life: 1.0, gravity: 30, sway: 10 },
        { id: 'flow', from: 'hero', to: 'enemyHead', toOffset: { oy: 30 }, shape: 'heart', colors: ['$main', '$glow'], count: 5, life: 0.5, spanSec: 0.3, arc: 20, size: [4, 6] }
      ]
    }
  },
  holyLullaby: {
    flashSec: 0.3,
    durationSec: 1.8,
    hits: { count: 1, startSec: 0.9 },
    se: [{ at: 'start', id: '$skill' }],
    windup: [{ at: 'start', id: 'ring', anchor: 'enemyFeet', r: 50, squash: 0.4, color: '$sub', width: 4, alpha: 0.7 }],
    fx: [
      { at: 'start', id: 'flow', from: 'enemyHead', to: 'heroHead', shapes: ['note', 'petal'], colors: ['$sub', '#ffffff', '$main'], count: 12, life: 0.9, spanSec: 0.6, arc: 50, wobble: 16, size: [6, 9] },
      { at: 'hit', id: 'ring', anchor: 'heroHead', r: 50, color: '$sub', width: 4, alpha: 0.6 },
      { at: 'hit', id: 'burst', anchor: 'heroHead', oy: -40, shapes: ['petal'], colors: ['#ffffff', '$sub'], count: 10, speed: [10, 40], size: [5, 8], life: 1.4, gravity: 40, sway: 14 },
      { at: 'hit', id: 'wash', color: '$sub', alpha: 0.18, life: 1.0 },
      { at: 'hit', id: 'callout', text: '体が重い…', color: '$glow', size: 22, delay: 0.2 }
    ]
  },
  sweetBlessing: {
    flashSec: 0.25,
    durationSec: 2.0,
    hits: { count: 1, startSec: 0.7 },
    se: [{ at: 'start', id: '$skill' }, { at: 'end', id: 'expDrained', when: '!resisted' }],
    fx: [
      // 頭上に光輪 → 回復の光（に見える）→ 紫のしずくが漏れる
      { at: 'start', id: 'glyph', anchor: 'heroHead', oy: -40, style: 'star', mark: 'heart', color: '$sub', sub: '#ffffff', r: 40, squash: 0.35, life: 1.8, spin: 1.5 },
      { at: 'hit', id: 'burst', anchor: 'hero', oy: 20, shapes: ['petal', 'dot'], colors: ['#ffffff', '$sub', '$glow'], count: 16, speed: [30, 80], size: [3, 6], life: 1.0, gravity: -90, when: '!resisted' },
      { at: 'hit', id: 'callout', text: '祝福♡', color: '$sub', size: 28, when: '!resisted' },
      { at: 'end', id: 'burst', anchor: 'hero', oy: -10, shapes: ['heart', 'dot'], colors: ['#c08bff', '#ffc6e2'], count: 12, speed: [20, 60], size: [3, 6], life: 1.2, gravity: 160, when: '!resisted' },
      { at: 'end', id: 'callout', text: '…こぼれていく', color: '#c08bff', size: 22, when: '!resisted' },
      { at: 'hit', id: 'ring', anchor: 'hero', r: 60, color: '#ffd1e8', width: 6, alpha: 0.8, when: 'resisted' },
      { at: 'hit', id: 'callout', text: '祝福を断った', color: '#ffd1e8', size: 24, when: 'resisted' }
    ]
  },
  mercyEye: {
    flashSec: 0.3,
    durationSec: 1.5,
    hits: { count: 1, startSec: 0.7 },
    se: [{ at: 'start', id: '$skill' }],
    windup: [{ at: 'start', id: 'ring', anchor: 'enemyHead', r: 40, color: '$main', width: 4, alpha: 0.7 }],
    fx: [
      // 目から主人公へ、輪がいくつも重なって届く
      { at: 'start', id: 'ring', anchor: 'enemyHead', r: 30, color: '$main', width: 4, alpha: 0.7 },
      { at: 'start', id: 'ring', anchor: 'enemyHead', r: 50, color: '$sub', width: 3, alpha: 0.6, delay: 0.15 },
      { at: 'start', id: 'flow', from: 'enemyHead', to: 'heroHead', shape: 'heartLine', colors: ['$main', '$sub'], count: 6, life: 0.6, spanSec: 0.5, arc: 0, wobble: 0, size: [8, 12], glow: true, delay: 0.2 },
      { at: 'hit', id: 'ring', anchor: 'heroHead', r: 60, color: '$main', width: 5, alpha: 0.7 },
      { at: 'hit', id: 'ring', anchor: 'heroHead', r: 40, color: '$sub', width: 4, alpha: 0.6, delay: 0.12 },
      { at: 'hit', id: 'swirl', anchor: 'heroHead', shape: 'heart', colors: ['$main', '$glow'], count: 8, r0: 40, r1: 34, turns: 1.4, life: 0.9, size: [4, 7] },
      { at: 'hit', id: 'callout', text: '見つめないで…♡', color: '$main', size: 26 }
    ]
  },
  fallenBlessing: {
    flashSec: 0.35,
    durationSec: 3.6,
    hits: { count: 10, startSec: 0.6, endSec: 3.1 },
    hitNumbers: false,
    se: [{ at: 'start', id: 'harpLullaby' }, { at: 'hit', id: 'featherHug', every: 2, gain: 0.7 }, { at: 'end', id: 'holyChime' }],
    windup: [{ at: 'start', id: 'glyph', anchor: 'enemyHead', oy: -30, style: 'star', color: '$sub', sub: '$main', r: 34, squash: 0.35, life: 1.2 }],
    fx: [
      { at: 'start', id: 'wash', color: '$main', alpha: 0.22, mode: 'full', life: 3.6, inSec: 0.7 },
      // 反転した光輪（堕天）と、ピンクに染まった羽
      { at: 'start', id: 'glyph', anchor: 'heroFeet', style: 'star', mark: 'heart', color: '$main', sub: '#c08bff', r: 104, life: 3.6, spin: -1.6 },
      { at: 'hit', id: 'burst', anchor: 'heroHead', oy: -50, shapes: ['petal', 'heart'], colors: ['$main', '#c08bff', '#ffffff'], count: 6, speed: [20, 60], size: [5, 9], life: 1.4, gravity: 60, sway: 12 },
      { at: 'hit', id: 'flow', from: 'hero', to: 'enemyHead', toOffset: { oy: 30 }, shapes: ['heart', 'dot'], colors: ['$main', '#c08bff'], count: 5, life: 0.5, spanSec: 0.2, arc: 30, size: [4, 7], glow: true },
      { at: 'end', id: 'callout', text: 'ゆーしゃさま、だ〜いすき♡', color: '$main', size: 34, wobble: 0.1, life: 1.5 },
      { at: 'end', id: 'flash', color: '$main', alpha: 0.3 }
    ]
  },

  // ======================================================================
  // グラマーバニーさん：ぱふっ、ぱふっ。大きく柔らかい衝撃と「むぎゅ♡」
  // ======================================================================
  bunnyPress: touch({ impact: 34, extra: [{ at: 'hit', id: 'callout', text: 'むぎゅ♡', color: '$main', size: 22 }] }),
  pafuHold: {
    bind: {
      start: [
        { id: 'bindHeartWave', color: '$main' },
        { id: 'impact', size: 60, color: '$glow' },
        { id: 'ring', anchor: 'hero', r: 90, color: '$main', width: 7, alpha: 0.7, life: 0.5 },
        { id: 'callout', text: 'むぎゅ〜っ♡', color: '$main', size: 34, oy: -20 },
        { id: 'wash', color: '$main', alpha: 0.2, life: 1.0 }
      ],
      pulse: [
        { id: 'impact', size: 40, color: '$glow' },
        { id: 'burst', anchor: 'hero', oy: -16, shape: 'heart', colors: ['$main', '$sub', '$glow'], count: 6, speed: [60, 140], size: [5, 9], life: 0.7 },
        { id: 'callout', text: 'ぱふっ♡', color: '$main', size: 22, oy: 10 }
      ]
    }
  },
  pafupafu: {
    flashSec: 0.2,
    durationSec: 1.6,
    hits: { count: 2, startSec: 0.25, endSec: 0.85 },
    hitNumbers: false,
    se: [{ at: 'hit', id: '$skill' }],
    fx: [
      { at: 'hit', id: 'impact', size: 56, color: '$glow' },
      { at: 'hit', id: 'ring', anchor: 'hero', r: 70, color: '$main', width: 6, alpha: 0.7 },
      { at: 'hit', id: 'burst', anchor: 'hero', oy: -10, shape: 'heart', colors: ['$main', '$glow', '$sub'], count: 10, speed: [80, 200], size: [6, 10], life: 0.7 },
      { at: 'hit', id: 'callout', texts: ['ぱふっ♡', 'ぱふっ♡'], color: '$main', size: 32, wobble: 0.1, ox: -20 },
      { at: 'hit', id: 'shake', power: 0.4 },
      { at: 'end', id: 'callout', text: '骨抜き…', color: '$glow', size: 22 }
    ]
  },
  sweetSqueeze: {
    flashSec: 0.15,
    durationSec: 1.3,
    hits: { count: 1, startSec: 0.6 },
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'start', id: 'swirl', anchor: 'hero', shape: 'heart', colors: ['$main', '$glow'], count: 14, r0: 100, r1: 22, turns: 0.6, life: 0.7, size: [6, 10] },
      { at: 'hit', id: 'ring', anchor: 'hero', r: 30, color: '$main', width: 8, alpha: 0.8, life: 0.4 },
      { at: 'hit', id: 'callout', text: 'ぎゅ〜っ♡', color: '$main', size: 30, wobble: 0.1 },
      gentleCue
    ]
  },
  gazeLock: {
    flashSec: 0.2,
    durationSec: 1.3,
    hits: { count: 1, startSec: 0.5 },
    se: [{ at: 'start', id: '$skill' }],
    windup: [{ at: 'start', id: 'telegraph', color: '$main', width: 8, life: 1.1 }],
    fx: [
      { at: 'start', id: 'ring', anchor: 'enemyHead', r: 40, color: '$main', width: 4, alpha: 0.7 },
      { at: 'hit', id: 'swirl', anchor: 'heroHead', shape: 'heartLine', colors: ['$main', '$sub'], count: 8, r0: 70, r1: 20, turns: 1, life: 0.6, size: [6, 9] },
      { at: 'hit', id: 'callout', anchor: 'enemyHead', text: '逃がさないわよ♡', color: '$main', size: 26, oy: -30 }
    ]
  },
  queensPafu: {
    flashSec: 0.35,
    durationSec: 3.6,
    hits: { count: 8, startSec: 0.4, endSec: 3.0 },
    hitNumbers: false,
    se: [{ at: 'start', id: 'squeezeHug' }, { at: 'hit', id: 'pafuBounce', gain: 0.8, gainEnd: 1.1 }, { at: 'end', id: 'temptAccept' }],
    windup: [{ at: 'start', id: 'glyph', anchor: 'enemyFeet', style: 'star', color: '$sub', sub: '$main', r: 54, life: 1.2 }],
    fx: [
      { at: 'start', id: 'wash', color: '$main', alpha: 0.2, mode: 'full', life: 3.6, inSec: 0.5 },
      { at: 'start', id: 'glyph', anchor: 'heroFeet', style: 'star', mark: 'heart', color: '$sub', sub: '$main', r: 104, life: 3.6, spin: 1.6 },
      { at: 'hit', id: 'impact', size: 54, color: '$glow' },
      { at: 'hit', id: 'bindHeartWave', color: '$main' },
      { at: 'hit', id: 'callout', texts: ['ぱふっ♡', 'ぱふっ♡', 'ぱふぱふ♡', 'ぱふっ♡', 'ぱふっ♡', 'ぱふぱふ♡', 'むぎゅ〜♡', 'むぎゅ〜♡'], color: '$main', size: 28, wobble: 0.1 },
      { at: 'hit', id: 'shake', every: 2, power: 0.4 },
      { at: 'end', id: 'flash', color: '$main', alpha: 0.3 },
      { at: 'end', id: 'callout', text: '女王様のぱふぱふ♡', color: '$sub', size: 36, wobble: 0.1, life: 1.4 }
    ]
  },

  // ======================================================================
  // 青髪ギャル：むちむちの重み。押しつぶす衝撃波と、ふかふかの雲
  // ======================================================================
  muchiTackle: touch({ impact: 40 }),
  muchiHold: {
    bind: {
      start: [
        { id: 'impact', size: 56, color: '$glow' },
        { id: 'ring', anchor: 'heroFeet', r: 90, squash: 0.4, color: '$main', width: 7, alpha: 0.7, life: 0.5 },
        { id: 'cloud', from: 'hero', to: 'hero', colors: ['$glow', '$main'], count: 10, r: [16, 50], life: 1.2, spread: 40 },
        { id: 'callout', text: 'つかまえた〜♡', color: '$main', size: 30, oy: -20 }
      ],
      pulse: [
        { id: 'ring', anchor: 'hero', r: 50, color: '$main', width: 5, alpha: 0.5 },
        { id: 'burst', anchor: 'hero', oy: -10, shape: 'heart', colors: ['$main', '$sub'], count: 5, speed: [40, 100], size: [5, 8], life: 0.7 }
      ]
    }
  },
  galPamper: {
    flashSec: 0.15,
    durationSec: 1.3,
    hits: { count: 2, startSec: 0.3, endSec: 0.8 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'hit', id: 'burst', anchor: 'heroHead', oy: -30, shape: 'heart', colors: ['$main', '$glow'], count: 5, speed: [10, 40], size: [5, 8], life: 1.2, gravity: 50, sway: 10 },
      { at: 'hit', id: 'callout', texts: ['よしよし♡', 'よしよし♡'], color: '$main', size: 24, oy: -10 },
      { at: 'end', id: 'callout', text: '力が抜けていく…', color: '$glow', size: 20, when: '!gentle' },
      gentleCue
    ]
  },
  muchiPress: {
    flashSec: 0.2,
    durationSec: 1.3,
    hits: { count: 1, startSec: 0.35 },
    se: [{ at: 'hit', id: '$skill' }],
    windup: [{ at: 'start', id: 'tileMark', color: '$main', life: 1.1 }],
    fx: [
      { at: 'hit', id: 'impact', size: 70, color: '$glow', life: 0.3 },
      { at: 'hit', id: 'ring', anchor: 'heroFeet', r: 110, squash: 0.4, color: '$main', width: 9, alpha: 0.8, life: 0.5 },
      { at: 'hit', id: 'speedLines', color: '$main', count: 40, alpha: 0.45 },
      { at: 'hit', id: 'shake', power: 1.0 },
      { at: 'hit', id: 'burst', anchor: 'hero', shape: 'heart', colors: ['$main', '$sub', '$glow'], count: 14, speed: [120, 260], size: [5, 10], life: 0.7 },
      { at: 'hit', id: 'callout', text: 'むぎゅっ♡', color: '$main', size: 40, wobble: 0.08 },
      { at: 'hit', id: 'callout', text: '動けない…', color: '$glow', size: 20, oy: 30, delay: 0.3 }
    ]
  },
  thighCushion: {
    flashSec: 0.2,
    durationSec: 1.5,
    hits: { count: 3, startSec: 0.3, endSec: 1.0 },
    hitNumbers: false,
    se: [{ at: 'hit', id: '$skill', gain: 0.8 }],
    fx: [
      { at: 'start', id: 'cloud', from: 'hero', to: 'hero', colors: ['$glow', '$main', '$sub'], count: 12, r: [18, 56], life: 1.4, spread: 50, lift: 6 },
      { at: 'hit', id: 'ring', anchor: 'hero', r: 46, squash: 0.6, color: '$main', width: 5, alpha: 0.6 },
      { at: 'hit', id: 'burst', anchor: 'hero', shape: 'heart', colors: ['$main', '$glow'], count: 4, speed: [40, 90], size: [5, 8], life: 0.7 },
      { at: 'end', id: 'callout', text: 'ふかふか…♡', color: '$main', size: 28, wobble: 0.1 }
    ]
  },
  muchiParadise: {
    flashSec: 0.35,
    durationSec: 3.8,
    hits: { count: 9, startSec: 0.5, endSec: 3.2 },
    hitNumbers: false,
    se: [{ at: 'start', id: 'muchiPress' }, { at: 'hit', id: 'thighSquish', gain: 0.8, gainEnd: 1.1 }, { at: 'end', id: 'muchiPress' }],
    windup: [{ at: 'start', id: 'tileMark', color: '$main', life: 1.2 }],
    fx: [
      { at: 'start', id: 'wash', color: '$main', alpha: 0.2, mode: 'full', life: 3.8, inSec: 0.5 },
      { at: 'start', id: 'cloud', from: 'hero', to: 'hero', colors: ['$glow', '$main', '$sub'], count: 24, r: [20, 70], life: 3.0, spanSec: 1.5, spread: 70 },
      { at: 'hit', id: 'ring', anchor: 'heroFeet', r: 80, squash: 0.4, color: '$main', width: 6, alpha: 0.6 },
      { at: 'hit', id: 'burst', anchor: 'hero', shape: 'heart', colors: ['$main', '$sub'], count: 5, speed: [60, 160], size: [5, 9], life: 0.7 },
      { at: 'hit', id: 'shake', every: 2, power: 0.5 },
      { at: 'end', id: 'flash', color: '$main', alpha: 0.3 },
      { at: 'end', id: 'callout', text: 'むちむちパラダイス♡', color: '$main', size: 38, wobble: 0.1, life: 1.4 }
    ]
  },

  // ======================================================================
  // シスターさん：鐘と黒い羽。カウントダウンは大きな数字が「ぜろ。」まで落ちていく
  // ======================================================================
  holyStep: touch({ shapes: ['petal', 'heart'], extra: [{ at: 'hit', id: 'ring', anchor: 'heroFeet', r: 50, squash: 0.4, color: '$main', width: 4, alpha: 0.5 }] }),
  sinShackle: {
    bind: {
      start: [
        { id: 'glyph', anchor: 'heroFeet', style: 'star', mark: 'heart', color: '$main', sub: '$sub', r: 76, life: 1.8, spin: 0.8 },
        { id: 'ring', anchor: 'heroFeet', r: 60, squash: 0.4, color: '$sub', width: 6, alpha: 0.7, life: 0.5 },
        { id: 'burst', anchor: 'hero', shapes: ['petal'], colors: ['#2a1630', '$sub', '$main'], count: 12, speed: [60, 160], size: [6, 10], life: 1.0, gravity: 60 },
        { id: 'callout', text: '贖罪の時間です', color: '$main', size: 26, oy: -20 }
      ],
      pulse: [
        { id: 'ring', anchor: 'heroFeet', r: 50, squash: 0.4, color: '$main', width: 4, alpha: 0.6 },
        { id: 'flow', from: 'hero', to: 'enemyHead', toOffset: { oy: 30 }, shapes: ['dot', 'heart'], colors: ['#c08bff', '$main'], count: 6, life: 0.5, spanSec: 0.3, arc: 20, size: [3, 6] }
      ]
    }
  },
  countdown: {
    flashSec: 0.3,
    durationSec: 4.0,
    hits: { count: 6, startSec: 0.5, endSec: 3.4 },
    hitNumbers: false,
    se: [
      { at: 'hit', id: 'countBell', when: '!interrupted' },
      { at: 'hit', id: 'countBell', last: 1, when: 'interrupted' },
      { at: 'end', id: 'climaxPulse', gain: 0.8, when: '!interrupted' },
      { at: 'end', id: 'contestWin', when: 'interrupted' }
    ],
    fx: [
      { at: 'start', id: 'glyph', anchor: 'heroFeet', style: 'star', mark: 'heart', color: '$main', sub: '$sub', r: 90, life: 4.0, spin: 0.6 },
      { at: 'start', id: 'wash', color: '#2a0a30', alpha: 0.28, mode: 'full', life: 4.0, inSec: 0.6, when: '!interrupted' },
      // 大きな数字。中断したら途中で止まる
      { at: 'hit', id: 'callout', texts: ['5', '4', '3', '2', '1', 'ぜろ。'], color: '$main', size: 64, oy: -30, rise: 10, wobble: 0, life: 0.6, when: '!interrupted' },
      { at: 'hit', id: 'ring', anchor: 'hero', r: 70, color: '$main', width: 5, alpha: 0.7, when: '!interrupted' },
      { at: 'hit', id: 'burst', anchor: 'hero', shapes: ['petal'], colors: ['#2a1630', '$sub'], count: 5, speed: [40, 100], size: [5, 8], life: 0.9, gravity: 60, when: '!interrupted' },
      { at: 'hit', id: 'callout', texts: ['5', '4', '……っ!?'], color: '$main', size: 56, oy: -30, rise: 10, wobble: 0, life: 0.6, last: 2, when: 'interrupted' },
      // ゼロ：まとめて吸い上げる
      { at: 'hit', id: 'flash', color: '$main', alpha: 0.35, first: 5, when: '!interrupted' },
      { at: 'hit', id: 'speedLines', color: '$main', count: 50, alpha: 0.5, first: 5, when: '!interrupted' },
      { at: 'hit', id: 'shake', power: 1.0, first: 5, when: '!interrupted' },
      { at: 'hit', id: 'flow', from: 'hero', to: 'enemyHead', toOffset: { oy: 30 }, shapes: ['dot', 'heart'], colors: ['#c08bff', '$main', '$glow'], count: 20, life: 0.6, spanSec: 0.3, arc: 40, size: [4, 8], glow: true, first: 5, when: '!interrupted' },
      { at: 'end', id: 'callout', text: '中断！', color: '#ffd1e8', size: 40, when: 'interrupted' },
      { at: 'end', id: 'burst', anchor: 'hero', shapes: ['heartLine'], colors: ['#ffd1e8', '#ffffff'], count: 14, speed: [120, 260], size: [6, 9], life: 0.6, when: 'interrupted' }
    ]
  },
  repent: {
    flashSec: 0.25,
    durationSec: 1.6,
    hits: { count: 1, startSec: 0.8 },
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'start', id: 'glyph', anchor: 'heroFeet', style: 'star', color: '$sub', sub: '$main', r: 70, life: 1.6, spin: -0.8 },
      { at: 'hit', id: 'ring', anchor: 'heroFeet', r: 40, squash: 0.4, color: '$main', width: 8, alpha: 0.8, life: 0.5 },
      { at: 'hit', id: 'burst', anchor: 'heroHead', oy: -40, shapes: ['petal'], colors: ['#2a1630', '$sub'], count: 8, speed: [10, 40], size: [6, 9], life: 1.3, gravity: 60, sway: 12 },
      { at: 'hit', id: 'callout', text: '懺悔を。', color: '$main', size: 30 },
      gentleCue
    ]
  },
  featherConfess: {
    flashSec: 0.25,
    durationSec: 1.6,
    hits: { count: 1, startSec: 0.85 },
    se: [{ at: 'start', id: '$skill' }],
    windup: [{ at: 'start', id: 'burst', anchor: 'enemyHead', shapes: ['petal'], colors: ['#2a1630', '$sub'], count: 6, speed: [20, 60], size: [6, 9], life: 1.0, gravity: 40 }],
    fx: [
      { at: 'start', id: 'flow', from: 'enemyHead', to: 'heroHead', shapes: ['petal', 'petal', 'heart'], colors: ['#2a1630', '$sub', '$main'], count: 16, life: 0.8, spanSec: 0.6, arc: 40, wobble: 18, size: [6, 10] },
      { at: 'hit', id: 'burst', anchor: 'heroHead', shapes: ['petal', 'heartLine'], colors: ['#2a1630', '$main'], count: 12, speed: [60, 160], size: [6, 9], life: 0.9, gravity: 80 },
      { at: 'hit', id: 'wash', color: '#2a0a30', alpha: 0.2, life: 0.9 }
    ]
  },
  judgmentCount: {
    flashSec: 0.35,
    durationSec: 6.0,
    hits: { count: 11, startSec: 0.5, endSec: 5.4 },
    hitNumbers: false,
    se: [{ at: 'hit', id: 'countBell' }, { at: 'end', id: 'climaxPulse' }],
    fx: [
      { at: 'start', id: 'glyph', anchor: 'heroFeet', style: 'star', mark: 'heart', color: '$main', sub: '$sub', r: 120, life: 6.0, spin: 0.5 },
      { at: 'start', id: 'wash', color: '#2a0a30', alpha: 0.32, mode: 'full', life: 6.0, inSec: 1.0 },
      { at: 'hit', id: 'callout', texts: ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1', 'ぜろ。'], color: '$main', size: 70, oy: -30, rise: 10, wobble: 0, life: 0.5 },
      { at: 'hit', id: 'ring', anchor: 'hero', r: 80, color: '$main', width: 5, alpha: 0.6 },
      { at: 'hit', id: 'flow', from: 'hero', to: 'enemyHead', toOffset: { oy: 30 }, shapes: ['dot', 'heart'], colors: ['#c08bff', '$main'], count: 4, life: 0.4, spanSec: 0.2, arc: 30, size: [3, 6] },
      { at: 'hit', id: 'flash', color: '$main', alpha: 0.4, first: 10 },
      { at: 'hit', id: 'speedLines', color: '$main', count: 56, alpha: 0.55, first: 10 },
      { at: 'hit', id: 'shake', power: 1.2, first: 10 },
      { at: 'end', id: 'callout', text: '審判、完了です', color: '$main', size: 32, life: 1.4 }
    ]
  },

  // ======================================================================
  // 夢見のお姉さん：音符と星の子守唄。画面がまどろむように暗くなる
  // ======================================================================
  sleepyTouch: touch({ shapes: ['bubble', 'heart'] }),
  lapPillow: {
    bind: {
      start: [
        { id: 'cloud', from: 'hero', to: 'hero', colors: ['$main', '$glow', '$sub'], count: 14, r: [18, 60], life: 1.6, spread: 50, lift: 16 },
        { id: 'burst', anchor: 'heroHead', shapes: ['note', 'heart'], colors: ['$main', '$sub'], count: 8, speed: [20, 60], size: [6, 9], life: 1.4, gravity: -30, sway: 10 },
        { id: 'callout', text: 'はい、膝枕♡', color: '$main', size: 30, oy: -20 },
        { id: 'wash', color: '#1a0a2a', alpha: 0.2, life: 1.4 }
      ],
      pulse: [
        { id: 'burst', anchor: 'heroHead', shapes: ['note', 'bubble'], colors: ['$main', '$sub', '$glow'], count: 4, speed: [20, 50], size: [5, 8], life: 1.2, gravity: -30, sway: 10 },
        { id: 'callout', text: 'Zzz…', color: '$sub', size: 20, ox: 30, oy: -10 }
      ]
    }
  },
  lullaby: {
    flashSec: 0.3,
    durationSec: 2.4,
    hits: { count: 3, startSec: 0.6, endSec: 1.6 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }, { at: 'end', id: 'dreamFloat', when: 'accepted' }],
    windup: [{ at: 'start', id: 'burst', anchor: 'enemyHead', shapes: ['note'], colors: ['$main', '$sub'], count: 5, speed: [20, 50], size: [6, 9], life: 1.0, gravity: -30 }],
    fx: [
      { at: 'start', id: 'flow', from: 'enemyHead', to: 'heroHead', shapes: ['note', 'note', 'heart'], colors: ['$main', '$sub', '$glow'], count: 14, life: 1.0, spanSec: 0.9, arc: 40, wobble: 18, size: [6, 10] },
      { at: 'hit', id: 'swirl', anchor: 'heroHead', shape: 'note', colors: ['$main', '$sub'], count: 5, r0: 40, r1: 30, turns: 0.8, rise: 20, life: 1.0, size: [6, 8] },
      // 画面がまどろむ
      { at: 'hit', id: 'wash', color: '#1a0a2a', alpha: 0.18, life: 1.2, when: '!resisted' },
      { at: 'end', id: 'callout', text: 'ねんね……♡', color: '$main', size: 30, wobble: 0.1, when: '!resisted' },
      { at: 'end', id: 'wash', color: '#1a0a2a', alpha: 0.35, mode: 'full', life: 1.6, when: 'accepted' },
      { at: 'hit', id: 'ring', anchor: 'heroHead', r: 30, color: '#ffd1e8', width: 4, alpha: 0.7, when: 'resisted' },
      { at: 'end', id: 'callout', text: '耳をふさいだ', color: '#ffd1e8', size: 24, when: 'resisted' },
      gentleCue
    ]
  },
  dreamPamper: {
    flashSec: 0.15,
    durationSec: 1.3,
    hits: { count: 2, startSec: 0.3, endSec: 0.8 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'hit', id: 'burst', anchor: 'heroHead', oy: -30, shapes: ['heart', 'bubble'], colors: ['$main', '$glow'], count: 5, speed: [10, 40], size: [5, 8], life: 1.2, gravity: 40, sway: 10 },
      { at: 'hit', id: 'callout', texts: ['いいこいいこ♡', 'いいこいいこ♡'], color: '$main', size: 24, oy: -10 }
    ]
  },
  fluffyDream: {
    flashSec: 0.3,
    durationSec: 1.9,
    hits: { count: 1, startSec: 1.0 },
    se: [{ at: 'start', id: '$skill' }, { at: 'hit', id: 'bubblePop' }],
    windup: [{ at: 'start', id: 'cloud', from: 'enemy', to: 'enemy', colors: ['$main', '$glow'], count: 6, r: [10, 30], life: 1.0, spread: 20 }],
    fx: [
      { at: 'start', id: 'cloud', colors: ['$main', '$glow', '$sub'], count: 16, r: [12, 46], life: 1.6, spanSec: 0.9, spread: 34, lift: 20 },
      { at: 'start', id: 'flow', from: 'enemyHead', to: 'heroHead', shapes: ['bubble', 'heart'], colors: ['$glow', '$main'], count: 10, life: 1.0, spanSec: 0.8, arc: 50, wobble: 20, size: [4, 8] },
      { at: 'hit', id: 'burst', anchor: 'heroHead', shapes: ['bubble', 'heart'], colors: ['$glow', '$main', '$sub'], count: 10, speed: [30, 90], size: [4, 8], life: 1.1, gravity: -50, sway: 10 },
      { at: 'hit', id: 'callout', text: '眠っている間に…♡', color: '$main', size: 22, when: 'bonus' }
    ]
  },
  eternalLap: {
    flashSec: 0.35,
    durationSec: 4.0,
    hits: { count: 9, startSec: 0.6, endSec: 3.4 },
    hitNumbers: false,
    se: [{ at: 'start', id: 'musicBox' }, { at: 'hit', id: 'dreamFloat', every: 3, gain: 0.7 }, { at: 'end', id: 'musicBox' }],
    windup: [{ at: 'start', id: 'cloud', from: 'enemy', to: 'enemy', colors: ['$main', '$sub'], count: 8, r: [10, 36], life: 1.0, spread: 24 }],
    fx: [
      { at: 'start', id: 'wash', color: '#1a0a2a', alpha: 0.4, mode: 'full', life: 4.0, inSec: 1.0 },
      { at: 'start', id: 'cloud', from: 'hero', to: 'hero', colors: ['$main', '$glow', '$sub'], count: 24, r: [20, 70], life: 3.2, spanSec: 1.6, spread: 70, lift: 20 },
      { at: 'hit', id: 'burst', anchor: 'heroHead', shapes: ['note', 'heart', 'bubble'], colors: ['$main', '$sub', '$glow'], count: 5, speed: [20, 60], size: [5, 9], life: 1.4, gravity: -40, sway: 12 },
      { at: 'hit', id: 'flow', from: 'hero', to: 'enemyHead', toOffset: { oy: 30 }, shape: 'heart', colors: ['$main', '#c08bff'], count: 4, life: 0.6, spanSec: 0.3, arc: 30, size: [4, 7] },
      { at: 'end', id: 'callout', text: '永遠に、おやすみ……♡', color: '$main', size: 34, wobble: 0.08, life: 1.6 }
    ]
  },

  // ======================================================================
  // キスハンター：照準とハートの刻印。マーク中は、どこにいても狙われる
  // ======================================================================
  hunterTouch: touch({ extra: [{ at: 'hit', id: 'kissMark' }] }),
  huntersKiss: {
    bind: {
      start: [
        { id: 'tileMark', anchor: 'heroFeet', color: '$main', life: 1.2 },
        { id: 'ring', anchor: 'hero', r: 80, color: '$main', width: 4, alpha: 0.8, life: 0.5 },
        { id: 'burst', anchor: 'heroHead', shape: 'lips', colors: ['$main'], count: 3, speed: [60, 140], size: [9, 12], life: 0.7 },
        { id: 'callout', text: '捕獲完了♡', color: '$main', size: 30, oy: -20 }
      ],
      pulse: [
        { id: 'flow', from: 'heroHead', to: 'enemyHead', toOffset: { oy: 24 }, shapes: ['heart', 'dot'], colors: ['$main', '#c08bff'], count: 6, life: 0.4, spanSec: 0.25, arc: 20, size: [4, 6] },
        { id: 'kissMark' }
      ]
    }
  },
  heartMarking: {
    flashSec: 0.25,
    durationSec: 1.7,
    hits: { count: 1, startSec: 0.9 },
    se: [{ at: 'start', id: '$skill' }, { at: 'hit', id: 'heartPop' }],
    windup: [{ at: 'start', id: 'telegraph', color: '$main', width: 6, life: 1.1 }],
    fx: [
      // 照準が絞られていく
      { at: 'start', id: 'tileMark', anchor: 'heroFeet', color: '$main', life: 1.0 },
      { at: 'start', id: 'ring', anchor: 'hero', r: 110, color: '$main', width: 3, alpha: 0.8, life: 0.9 },
      { at: 'start', id: 'swirl', anchor: 'hero', shape: 'streak', colors: ['$main', '$sub'], count: 8, r0: 110, r1: 20, turns: 0.5, life: 0.8, size: [6, 9], glow: true },
      { at: 'hit', id: 'burst', anchor: 'hero', oy: -10, shapes: ['heart'], colors: ['$main'], count: 1, speed: [0, 0], size: [18, 18], life: 1.2, grow: 0.3, glow: true },
      { at: 'hit', id: 'burst', anchor: 'hero', shapes: ['heartLine', 'heart'], colors: ['$main', '$sub'], count: 12, speed: [120, 240], size: [5, 8], life: 0.6 },
      { at: 'hit', id: 'callout', text: 'ロックオン♡', color: '$main', size: 34, wobble: 0.08 },
      gentleCue
    ]
  },
  hunterDrainKiss: {
    flashSec: 0.2,
    durationSec: 1.6,
    hits: { count: 4, startSec: 0.25, endSec: 1.1 },
    hitNumbers: false,
    se: [{ at: 'hit', id: '$skill', every: 2 }],
    fx: [
      { at: 'hit', id: 'flow', from: 'heroHead', to: 'enemyHead', toOffset: { oy: 24 }, shapes: ['dot', 'heart'], colors: ['#c08bff', '$main', '$glow'], count: 7, life: 0.4, spanSec: 0.2, arc: 24, size: [3, 6], glow: true },
      { at: 'hit', id: 'kissMark', every: 2 },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: 'ごちそうさま♡', color: '$main', size: 26, oy: -30 },
      { at: 'end', id: 'callout', text: '狙われてる…', color: '$glow', size: 20, when: 'bonus' }
    ]
  },
  cantEscape: {
    flashSec: 0.15,
    durationSec: 1.4,
    hits: { count: 3, startSec: 0.35, endSec: 0.85 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'start', id: 'flow', from: 'enemyHead', to: 'heroHead', shapes: ['heart'], colors: ['$main', '$sub'], count: 6, life: 0.5, spanSec: 0.3, arc: 80, wobble: 30, size: [6, 9], glow: true },
      { at: 'hit', id: 'burst', anchor: 'heroHead', shapes: ['heart', 'heartLine'], colors: ['$main', '$glow'], count: 5, speed: [60, 140], size: [5, 8], life: 0.5 },
      { at: 'end', id: 'callout', text: '逃がさないよ♡', color: '$main', size: 28, wobble: 0.1 }
    ]
  },
  perfectHuntKiss: {
    flashSec: 0.35,
    durationSec: 3.4,
    hits: { count: 10, startSec: 0.5, endSec: 3.0 },
    hitNumbers: false,
    se: [{ at: 'start', id: 'markLock' }, { at: 'hit', id: 'hunterKiss', every: 2, gain: 0.7, gainEnd: 1 }, { at: 'end', id: 'heartPop' }],
    windup: [{ at: 'start', id: 'telegraph', color: '$main', width: 10, life: 1.2 }],
    fx: [
      { at: 'start', id: 'wash', color: '$main', alpha: 0.2, mode: 'full', life: 3.4, inSec: 0.5 },
      { at: 'start', id: 'tileMark', anchor: 'heroFeet', color: '$main', life: 3.4 },
      { at: 'start', id: 'ring', anchor: 'hero', r: 120, color: '$main', width: 3, alpha: 0.8, life: 1.0 },
      { at: 'hit', id: 'flow', from: 'heroHead', to: 'enemyHead', toOffset: { oy: 24 }, shapes: ['dot', 'heart'], colors: ['#c08bff', '$main'], count: 6, life: 0.4, spanSec: 0.2, arc: 26, size: [3, 6], glow: true },
      { at: 'hit', id: 'kissMark', every: 3 },
      { at: 'hit', id: 'shake', every: 3, power: 0.35 },
      { at: 'end', id: 'flash', color: '$main', alpha: 0.3 },
      { at: 'end', id: 'callout', text: 'パーフェクト♡', color: '$main', size: 40, wobble: 0.1, life: 1.3 }
    ]
  }
};
