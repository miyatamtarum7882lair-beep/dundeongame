// File: src/data/skillStagesWave2.js
// 後半9体の技の演出台本。書式は skillStages.js / skillStagesWave1.js の先頭を参照。

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

export const WAVE2_STAGES = {
  // ======================================================================
  // 小悪魔お嬢さん：上品なお辞儀と、気づけば隙だらけ
  // ======================================================================
  ladyTouch: touch({ shapes: ['ribbon', 'heart'] }),
  ladysHold: {
    bind: {
      start: [
        { id: 'glyph', anchor: 'heroFeet', style: 'ribbon', mark: 'heart', color: '$main', sub: '$sub', r: 70, life: 1.6 },
        { id: 'swirl', anchor: 'hero', shapes: ['ribbon', 'heart'], colors: ['$main', '$sub', '$glow'], count: 12, r0: 30, r1: 100, turns: 0.9, life: 0.9, size: [6, 10] },
        { id: 'callout', text: 'つかまえましたわ♡', color: '$main', size: 28, oy: -20 }
      ],
      pulse: [
        { ...drainFlow(), at: undefined },
        { id: 'burst', anchor: 'heroFeet', shapes: ['heart'], colors: ['$main', '$glow'], count: 4, speed: [30, 80], size: [4, 7], life: 0.7, gravity: -60 }
      ]
    }
  },
  ladyWarning: {
    flashSec: 0.2,
    durationSec: 1.6,
    hits: { count: 1, startSec: 0.8 },
    se: [{ at: 'start', id: '$skill' }, { at: 'hit', id: 'heartPop', when: '!resisted' }],
    fx: [
      { at: 'start', id: 'burst', anchor: 'enemy', shapes: ['ribbon', 'heart'], colors: ['$main', '$sub'], count: 10, speed: [30, 90], size: [6, 9], life: 0.9, gravity: -40 },
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: 'お気をつけあそばせ♡', color: '$main', size: 24, oy: -28, wobble: 0.06 },
      // 足元に、見えない段差のような印
      { at: 'hit', id: 'glyph', anchor: 'heroFeet', style: 'ribbon', color: '$sub', sub: '$main', r: 56, life: 1.0, when: '!resisted' },
      { at: 'hit', id: 'swirl', anchor: 'heroHead', shape: 'heartLine', colors: ['$main', '$glow'], count: 6, r0: 30, r1: 36, turns: 1, life: 0.8, size: [5, 8], when: '!resisted' },
      { at: 'hit', id: 'callout', text: '油断…', color: '$glow', size: 24, when: ['!resisted', '!gentle'] },
      { at: 'hit', id: 'ring', anchor: 'hero', r: 60, color: '#ffd1e8', width: 5, alpha: 0.8, when: 'resisted' },
      { at: 'hit', id: 'callout', text: '慎重に構えた', color: '#ffd1e8', size: 24, when: 'resisted' },
      gentleCue
    ]
  },
  ladyStep: {
    flashSec: 0.15,
    durationSec: 1.0,
    hits: { count: 1, startSec: 0.25 },
    se: [{ at: 'start', id: '$skill' }],
    windup: [{ at: 'start', id: 'telegraph', color: '$main', width: 6, life: 1.0 }],
    fx: [
      { at: 'hit', id: 'impact', size: 30, color: '$glow' },
      { at: 'hit', id: 'burst', anchor: 'hero', shapes: ['heart', 'ribbon'], colors: ['$main', '$sub'], count: 10, speed: [80, 180], size: [5, 9], life: 0.6 },
      { at: 'hit', id: 'callout', anchor: 'enemyHead', text: 'ほら、もうこんなに近く♡', color: '$main', size: 22, oy: -28 }
    ]
  },
  ladyGaze: {
    flashSec: 0.25,
    durationSec: 1.4,
    hits: { count: 1, startSec: 0.65 },
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'start', id: 'ring', anchor: 'enemyHead', r: 36, color: '$main', width: 4, alpha: 0.7 },
      { at: 'start', id: 'flow', from: 'enemyHead', to: 'heroHead', shape: 'heartLine', colors: ['$main', '$sub'], count: 5, life: 0.5, spanSec: 0.4, arc: 0, wobble: 0, size: [8, 12], glow: true, delay: 0.15 },
      { at: 'hit', id: 'swirl', anchor: 'heroHead', shape: 'heart', colors: ['$main', '$glow'], count: 8, r0: 40, r1: 34, turns: 1.4, life: 0.9, size: [4, 7] },
      { at: 'hit', id: 'callout', text: '目が離せない…♡', color: '$main', size: 24 },
      { at: 'hit', id: 'callout', text: '油断につけこまれた', color: '$glow', size: 20, oy: 30, when: 'bonus' }
    ]
  },
  royalTemptation: {
    flashSec: 0.35,
    durationSec: 3.4,
    hits: { count: 9, startSec: 0.5, endSec: 2.9 },
    hitNumbers: false,
    se: [{ at: 'start', id: 'ladyCurtsy' }, { at: 'hit', id: 'angelGaze', every: 3, gain: 0.7 }, { at: 'end', id: 'temptAccept' }],
    windup: [{ at: 'start', id: 'glyph', anchor: 'enemyFeet', style: 'ribbon', color: '$main', sub: '$sub', r: 50, life: 1.2 }],
    fx: [
      { at: 'start', id: 'wash', color: '$main', alpha: 0.22, mode: 'full', life: 3.4, inSec: 0.6 },
      { at: 'start', id: 'glyph', anchor: 'heroFeet', style: 'ribbon', mark: 'heart', color: '$main', sub: '$sub', r: 104, life: 3.4, spin: 1.4 },
      { at: 'hit', id: 'swirl', anchor: 'hero', shapes: ['ribbon', 'heart'], colors: ['$main', '$sub', '$glow'], count: 6, r0: 120, r1: 30, turns: 0.8, life: 0.6, size: [5, 9] },
      { at: 'hit', ...drainFlow() },
      { at: 'end', id: 'flash', color: '$main', alpha: 0.3 },
      { at: 'end', id: 'callout', text: '溺れてしまいなさい♡', color: '$main', size: 36, wobble: 0.08, life: 1.4 }
    ]
  },

  // ======================================================================
  // 甘やかしレディ：ゆっくり降るハートと、脚の足枷
  // ======================================================================
  pamperStep: touch(),
  pamperLegHold: {
    bind: {
      start: [
        { id: 'glyph', anchor: 'heroFeet', style: 'heart', color: '$main', sub: '$sub', r: 70, life: 1.6 },
        { id: 'ring', anchor: 'heroFeet', r: 50, squash: 0.4, color: '$main', width: 8, alpha: 0.8, life: 0.6 },
        { id: 'burst', anchor: 'heroHead', oy: -40, shape: 'heart', colors: ['$main', '$glow'], count: 10, speed: [10, 40], size: [5, 9], life: 1.4, gravity: 40, sway: 10 },
        { id: 'callout', text: '脚の間で、お休みなさい♡', color: '$main', size: 26, oy: -20 }
      ],
      pulse: [
        { id: 'ring', anchor: 'heroFeet', r: 40, squash: 0.4, color: '$main', width: 4, alpha: 0.5 },
        { id: 'burst', anchor: 'heroHead', oy: -30, shape: 'heart', colors: ['$main', '$glow'], count: 3, speed: [10, 30], size: [4, 7], life: 1.2, gravity: 40, sway: 8 }
      ]
    }
  },
  tiredDarling: {
    flashSec: 0.2,
    durationSec: 1.8,
    hits: { count: 1, startSec: 0.8 },
    se: [{ at: 'start', id: '$skill' }, { at: 'end', id: 'temptAccept', when: 'accepted' }],
    fx: [
      { at: 'start', id: 'burst', anchor: 'heroHead', oy: -50, shape: 'heart', colors: ['$main', '$glow', '$sub'], count: 12, speed: [5, 30], size: [5, 9], life: 1.6, gravity: 30, sway: 12 },
      { at: 'hit', id: 'cloud', from: 'hero', to: 'hero', colors: ['$glow', '$main'], count: 8, r: [14, 44], life: 1.2, spread: 36, when: '!resisted' },
      { at: 'hit', id: 'callout', text: '甘えたい…', color: '$glow', size: 22, when: ['!resisted', '!gentle'] },
      { at: 'end', id: 'callout', text: 'ぜんぶ、預けてしまう…♡', color: '$main', size: 26, when: 'accepted' },
      { at: 'hit', id: 'ring', anchor: 'hero', r: 60, color: '#ffd1e8', width: 5, alpha: 0.8, when: 'resisted' },
      { at: 'hit', id: 'callout', text: '踏みとどまった', color: '#ffd1e8', size: 24, when: 'resisted' },
      gentleCue
    ]
  },
  gentlePat: {
    flashSec: 0.15,
    durationSec: 1.3,
    hits: { count: 2, startSec: 0.3, endSec: 0.8 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'hit', id: 'burst', anchor: 'heroHead', oy: -30, shape: 'heart', colors: ['$main', '$glow'], count: 5, speed: [10, 40], size: [5, 8], life: 1.2, gravity: 50, sway: 10 },
      { at: 'hit', id: 'callout', texts: ['よしよし…♡', 'いい子、いい子♡'], color: '$main', size: 24, oy: -10 },
      { at: 'end', id: 'callout', text: '力が抜けていく…', color: '$glow', size: 20 }
    ]
  },
  sweetShackle: {
    flashSec: 0.2,
    durationSec: 1.3,
    hits: { count: 1, startSec: 0.4 },
    se: [{ at: 'hit', id: '$skill' }],
    windup: [{ at: 'start', id: 'tileMark', color: '$main', life: 1.0 }],
    fx: [
      { at: 'hit', id: 'glyph', anchor: 'heroFeet', style: 'heart', color: '$main', sub: '$sub', r: 46, life: 1.0, spin: 3 },
      { at: 'hit', id: 'ring', anchor: 'heroFeet', r: 32, squash: 0.4, color: '$main', width: 9, alpha: 0.9, life: 0.6 },
      { at: 'hit', id: 'burst', anchor: 'heroFeet', shape: 'heart', colors: ['$main', '$glow'], count: 8, speed: [30, 90], size: [5, 8], life: 0.8, gravity: -60 },
      { at: 'hit', id: 'callout', text: '動かなくて、いいのよ♡', color: '$main', size: 24 }
    ]
  },
  supremePamperLeg: {
    flashSec: 0.35,
    durationSec: 3.6,
    hits: { count: 9, startSec: 0.5, endSec: 3.1 },
    hitNumbers: false,
    se: [{ at: 'start', id: 'pamperHum' }, { at: 'hit', id: 'legWrap', every: 2, gain: 0.8 }, { at: 'end', id: 'temptAccept' }],
    windup: [{ at: 'start', id: 'tileMark', color: '$main', life: 1.2 }],
    fx: [
      { at: 'start', id: 'wash', color: '$main', alpha: 0.2, mode: 'full', life: 3.6, inSec: 0.8 },
      { at: 'start', id: 'glyph', anchor: 'heroFeet', style: 'heart', mark: 'heart', color: '$main', sub: '$sub', r: 100, life: 3.6, spin: 1 },
      { at: 'hit', id: 'burst', anchor: 'heroHead', oy: -40, shape: 'heart', colors: ['$main', '$glow', '$sub'], count: 4, speed: [5, 30], size: [5, 9], life: 1.4, gravity: 30, sway: 10 },
      { at: 'hit', id: 'ring', anchor: 'heroFeet', r: 40, squash: 0.4, color: '$main', width: 5, alpha: 0.6 },
      { at: 'hit', ...drainFlow({ shapes: ['heart'], colors: ['$main', '$glow'] }) },
      { at: 'end', id: 'callout', text: 'もう、ひとりじゃ歩けませんわね♡', color: '$main', size: 30, wobble: 0.08, life: 1.5 }
    ]
  },

  // ======================================================================
  // 怪力バニーさん：一直線の突進と、地響きのヒップ
  // ======================================================================
  powerPunch: touch({ impact: 40, extra: [{ at: 'hit', id: 'shake', power: 0.5 }] }),
  powerHold: {
    bind: {
      start: [
        { id: 'impact', size: 70, color: '$glow' },
        { id: 'bindHeartWave', color: '$main' },
        { id: 'shake', power: 0.8 },
        { id: 'callout', text: 'むぎゅーっ♡', color: '$main', size: 36, oy: -20 }
      ],
      pulse: [
        { id: 'impact', size: 40, color: '$glow' },
        { id: 'burst', anchor: 'hero', oy: -10, shape: 'heart', colors: ['$main', '$sub'], count: 6, speed: [60, 140], size: [5, 9], life: 0.6 },
        { id: 'callout', text: 'ぎゅっ♡', color: '$main', size: 20, oy: 10 }
      ]
    }
  },
  bunnyRocket: {
    flashSec: 0.2,
    durationSec: 1.2,
    hits: { count: 1, startSec: 0.15 },
    se: [{ at: 'hit', id: '$skill' }],
    windup: [
      { at: 'start', id: 'telegraph', color: '$sub', width: 18, life: 1.3 },
      { at: 'start', id: 'tileMark', color: '$sub', life: 1.3 },
      { at: 'start', id: 'swirl', anchor: 'enemy', shape: 'streak', colors: ['$sub', '$glow'], count: 12, r0: 70, r1: 10, turns: 1.4, life: 0.9, glow: true }
    ],
    fx: [
      { at: 'hit', id: 'impact', size: 80, color: '$glow', life: 0.35 },
      { at: 'hit', id: 'ring', anchor: 'heroFeet', r: 120, squash: 0.4, color: '$main', width: 10, alpha: 0.85, life: 0.5 },
      { at: 'hit', id: 'speedLines', color: '$sub', count: 56, alpha: 0.55 },
      { at: 'hit', id: 'shake', power: 1.4 },
      { at: 'hit', id: 'flash', color: '$glow', alpha: 0.3 },
      { at: 'hit', id: 'burst', anchor: 'hero', shapes: ['heart', 'streak'], colors: ['$main', '$sub', '$glow'], count: 20, speed: [160, 340], size: [6, 11], life: 0.7 },
      { at: 'hit', id: 'callout', text: 'バニーロケット！♡', color: '$main', size: 40, wobble: 0.06 }
    ]
  },
  dokkanHip: {
    flashSec: 0.2,
    durationSec: 1.4,
    hits: { count: 1, startSec: 0.35 },
    se: [{ at: 'hit', id: '$skill' }],
    windup: [{ at: 'start', id: 'tileMark', color: '$main', life: 1.1 }],
    fx: [
      { at: 'hit', id: 'impact', size: 80, color: '$glow', life: 0.35 },
      { at: 'hit', id: 'ring', anchor: 'heroFeet', r: 130, squash: 0.4, color: '$main', width: 10, alpha: 0.85, life: 0.55 },
      { at: 'hit', id: 'ring', anchor: 'heroFeet', r: 80, squash: 0.4, color: '$sub', width: 6, alpha: 0.7, life: 0.5, delay: 0.12 },
      { at: 'hit', id: 'shake', power: 1.4 },
      { at: 'hit', id: 'speedLines', color: '$main', count: 48, alpha: 0.5 },
      { at: 'hit', id: 'burst', anchor: 'heroFeet', shape: 'fluff', colors: ['#ffc2dc', '#ffe3f2'], count: 14, speed: [80, 200], size: [10, 18], life: 0.8, gravity: -20, angle: -Math.PI / 2, spread: Math.PI },
      { at: 'hit', id: 'callout', text: 'どっかーん♡', color: '$main', size: 44, wobble: 0.08 }
    ]
  },
  contestDare: {
    flashSec: 0.2,
    durationSec: 1.6,
    hits: { count: 1, startSec: 0.8 },
    se: [{ at: 'start', id: '$skill' }, { at: 'hit', id: 'contestLose', when: 'accepted' }],
    fx: [
      { at: 'start', id: 'glyph', anchor: 'mid', oy: 42, style: 'star', color: '$main', sub: '$sub', r: 70, life: 1.6, spin: 0.8 },
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: 'よーい……', color: '$sub', size: 26, oy: -26 },
      { at: 'hit', id: 'impact', size: 60, color: '$glow' },
      { at: 'hit', id: 'speedLines', color: '$main', count: 40, alpha: 0.45 },
      { at: 'hit', id: 'burst', anchor: 'hero', shape: 'heart', colors: ['$main', '$sub'], count: 12, speed: [100, 220], size: [6, 10], life: 0.7 },
      { at: 'hit', id: 'callout', text: 'えいっ♡ あたしの勝ち！', color: '$main', size: 32, wobble: 0.1 }
    ]
  },
  superBunnyRocket: {
    flashSec: 0.3,
    durationSec: 1.6,
    hits: { count: 1, startSec: 0.2 },
    se: [{ at: 'hit', id: 'rocketImpact' }, { at: 'hit', id: 'dokkan', delay: 0.1 }],
    windup: [
      { at: 'start', id: 'telegraph', color: '$main', width: 26, life: 1.4 },
      { at: 'start', id: 'glyph', anchor: 'enemyFeet', style: 'star', color: '$sub', sub: '$main', r: 56, life: 1.3, spin: 3 }
    ],
    fx: [
      { at: 'hit', id: 'impact', size: 110, color: '$glow', life: 0.4 },
      { at: 'hit', id: 'ring', anchor: 'heroFeet', r: 160, squash: 0.4, color: '$main', width: 12, alpha: 0.9, life: 0.6 },
      { at: 'hit', id: 'speedLines', color: '$main', count: 70, alpha: 0.6 },
      { at: 'hit', id: 'shake', power: 1.8 },
      { at: 'hit', id: 'flash', color: '$main', alpha: 0.4 },
      { at: 'hit', id: 'burst', anchor: 'hero', shapes: ['heart', 'streak'], colors: ['$main', '$sub', '$glow'], count: 34, speed: [200, 420], size: [7, 13], life: 0.8, glow: true },
      { at: 'hit', id: 'callout', text: 'スーパー・バニーロケット！♡', color: '$main', size: 38, wobble: 0.06, life: 1.4 }
    ]
  },

  // ======================================================================
  // 銀狐メイドさん：したたる魔力と、まとめての回収
  // ======================================================================
  maidStep: touch({ extra: [{ at: 'hit', id: 'ring', anchor: 'heroFeet', r: 40, squash: 0.4, color: '$main', width: 4, alpha: 0.5 }] }),
  manaStomp: {
    bind: {
      start: [
        { id: 'ring', anchor: 'heroFeet', r: 70, squash: 0.4, color: '$main', width: 8, alpha: 0.8, life: 0.5 },
        { id: 'impact', size: 50, anchor: 'heroFeet', color: '$glow' },
        { id: 'glyph', anchor: 'heroFeet', style: 'star', color: '$sub', sub: '$main', r: 70, life: 1.6 },
        { id: 'callout', text: '回収を開始いたします', color: '$main', size: 24, oy: -20 }
      ],
      pulse: [
        { id: 'ring', anchor: 'heroFeet', r: 44, squash: 0.4, color: '$main', width: 5, alpha: 0.6 },
        { ...drainFlow({ colors: ['#c9a6ff', '$main', '#ffffff'] }) }
      ]
    }
  },
  manaLeakProc: {
    flashSec: 0.25,
    durationSec: 1.6,
    hits: { count: 1, startSec: 0.7 },
    se: [{ at: 'start', id: 'maidBell' }, { at: 'hit', id: '$skill' }],
    fx: [
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: '処理いたします', color: '$main', size: 22, oy: -26 },
      { at: 'hit', id: 'swirl', anchor: 'hero', shapes: ['dot', 'heart'], colors: ['#c9a6ff', '$main'], count: 12, r0: 30, r1: 70, turns: 0.8, life: 1.0, size: [3, 6] },
      { at: 'hit', id: 'burst', anchor: 'hero', oy: -10, shapes: ['dot', 'heart'], colors: ['#c9a6ff', '$glow'], count: 10, speed: [20, 60], size: [3, 6], life: 1.2, gravity: 160 },
      { at: 'hit', id: 'callout', text: '魔力がこぼれていく…', color: '#c9a6ff', size: 22, when: '!gentle' },
      gentleCue
    ]
  },
  badManners: {
    flashSec: 0.15,
    durationSec: 1.1,
    hits: { count: 1, startSec: 0.35 },
    se: [{ at: 'start', id: '$skill' }, { at: 'hit', id: 'punishSlap' }],
    fx: [
      { at: 'hit', id: 'impact', size: 30, color: '$glow' },
      { at: 'hit', id: 'ring', anchor: 'heroHead', r: 40, color: '$main', width: 4, alpha: 0.7 },
      { at: 'hit', id: 'callout', anchor: 'enemyHead', text: 'お行儀が悪いですね', color: '$main', size: 22, oy: -26 },
      { at: 'hit', id: 'callout', text: '萎縮…', color: '$glow', size: 20, delay: 0.2 }
    ]
  },
  periodicCollect: {
    flashSec: 0.25,
    durationSec: 1.5,
    hits: { count: 1, startSec: 0.4 },
    se: [{ at: 'start', id: 'maidBell' }, { at: 'hit', id: '$skill' }],
    windup: [{ at: 'start', id: 'ring', anchor: 'enemyFeet', r: 50, squash: 0.4, color: '$main', width: 4, alpha: 0.7 }],
    fx: [
      { at: 'hit', id: 'ring', anchor: 'heroFeet', r: 60, squash: 0.4, color: '$main', width: 6, alpha: 0.7 },
      { at: 'hit', id: 'impact', anchor: 'heroFeet', size: 40, color: '$glow' }
    ]
  },
  totalManaCollect: {
    flashSec: 0.35,
    durationSec: 2.6,
    hits: { count: 6, startSec: 0.4, endSec: 2.0 },
    hitNumbers: false,
    se: [{ at: 'start', id: 'maidBell' }, { at: 'hit', id: 'collectStomp', gain: 0.8 }, { at: 'end', id: 'maidBell' }],
    windup: [{ at: 'start', id: 'glyph', anchor: 'enemyFeet', style: 'star', color: '$sub', sub: '$main', r: 50, life: 1.2 }],
    fx: [
      { at: 'start', id: 'wash', color: '#c9a6ff', alpha: 0.2, mode: 'full', life: 2.6, inSec: 0.5 },
      { at: 'hit', id: 'ring', anchor: 'heroFeet', r: 60, squash: 0.4, color: '$main', width: 6, alpha: 0.7 },
      { at: 'hit', ...drainFlow({ colors: ['#c9a6ff', '$main', '#ffffff'], count: 8 }) },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: '一滴残らず、頂戴いたしました', color: '$main', size: 22, oy: -30, life: 1.4 }
    ]
  },

  // ======================================================================
  // ベルベットバニー：大きなハートの刻印と、逃げ場をふさぐ尻圧の壁
  // ======================================================================
  hipPush: touch({ impact: 36 }),
  velvetPress: {
    bind: {
      start: [
        { id: 'impact', size: 70, color: '$glow' },
        { id: 'ring', anchor: 'heroFeet', r: 110, squash: 0.4, color: '$main', width: 9, alpha: 0.8, life: 0.5 },
        { id: 'swirl', anchor: 'hero', shape: 'heart', colors: ['$main', '$sub'], count: 16, r0: 120, r1: 50, turns: 0.3, life: 1.0, size: [8, 12] },
        { id: 'callout', text: 'もう逃げ道なんてないわよ♡', color: '$main', size: 26, oy: -20 }
      ],
      pulse: [
        { id: 'impact', size: 46, color: '$glow' },
        { id: 'ring', anchor: 'heroFeet', r: 70, squash: 0.4, color: '$main', width: 6, alpha: 0.6 },
        { id: 'shake', power: 0.4 }
      ]
    }
  },
  heartStamp: {
    flashSec: 0.2,
    durationSec: 1.3,
    hits: { count: 1, startSec: 0.3 },
    se: [{ at: 'hit', id: '$skill' }],
    fx: [
      { at: 'hit', id: 'burst', anchor: 'hero', oy: -10, shapes: ['heart'], colors: ['$sub'], count: 1, speed: [0, 0], size: [26, 26], life: 0.8, grow: 0.3 },
      { at: 'hit', id: 'burst', anchor: 'hero', oy: -10, shapes: ['heart'], colors: ['$main'], count: 1, speed: [0, 0], size: [20, 20], life: 0.8, grow: 0.3, glow: true },
      { at: 'hit', id: 'impact', size: 56, color: '$glow' },
      { at: 'hit', id: 'shake', power: 0.8 },
      { at: 'hit', id: 'callout', text: 'ハートの刻印♡', color: '$main', size: 30 },
      { at: 'hit', id: 'callout', text: '逃げ場がない…', color: '$glow', size: 20, oy: 30, when: 'bonus' }
    ]
  },
  provokeGaze: {
    flashSec: 0.2,
    durationSec: 1.6,
    hits: { count: 1, startSec: 0.8 },
    se: [{ at: 'start', id: '$skill' }, { at: 'end', id: 'wallPress', gain: 0.7, when: 'accepted' }],
    fx: [
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: 'ふふ……♡', color: '$main', size: 24, oy: -26 },
      { at: 'start', id: 'flow', from: 'enemyHead', to: 'heroHead', shape: 'heartLine', colors: ['$main', '$sub'], count: 5, life: 0.6, spanSec: 0.5, arc: 0, wobble: 0, size: [8, 12], glow: true },
      { at: 'hit', id: 'ring', anchor: 'hero', r: 90, color: '$main', width: 5, alpha: 0.7 },
      { at: 'hit', id: 'callout', text: '足がすくむ…', color: '$glow', size: 22, when: '!gentle' },
      // 受け入れると、まわりを大きなハートの壁がふさぐ
      { at: 'end', id: 'swirl', anchor: 'hero', shape: 'heart', colors: ['$main', '$sub'], count: 14, r0: 110, r1: 60, turns: 0.15, life: 1.2, size: [9, 13], when: 'accepted' },
      gentleCue
    ]
  },
  hipWall: {
    flashSec: 0.2,
    durationSec: 1.4,
    hits: { count: 1, startSec: 0.35 },
    se: [{ at: 'hit', id: '$skill' }],
    windup: [{ at: 'start', id: 'telegraph', color: '$main', width: 10, life: 1.1 }],
    fx: [
      { at: 'hit', id: 'impact', size: 60, color: '$glow' },
      { at: 'hit', id: 'swirl', anchor: 'hero', shape: 'heart', colors: ['$main', '$sub', '$glow'], count: 18, r0: 130, r1: 70, turns: 0.1, life: 1.2, size: [10, 14] },
      { at: 'hit', id: 'shake', power: 0.8 },
      { at: 'hit', id: 'callout', text: 'もう逃げ場はないわよ♡', color: '$main', size: 28 }
    ]
  },
  queensPressure: {
    flashSec: 0.35,
    durationSec: 3.4,
    hits: { count: 8, startSec: 0.4, endSec: 2.9 },
    hitNumbers: false,
    se: [{ at: 'start', id: 'heartStampSe' }, { at: 'hit', id: 'wallPress', every: 2, gain: 0.9 }, { at: 'end', id: 'dokkan' }],
    windup: [{ at: 'start', id: 'telegraph', color: '$main', width: 14, life: 1.2 }],
    fx: [
      { at: 'start', id: 'wash', color: '$sub', alpha: 0.24, mode: 'full', life: 3.4, inSec: 0.5 },
      { at: 'start', id: 'swirl', anchor: 'hero', shape: 'heart', colors: ['$main', '$sub'], count: 20, r0: 160, r1: 60, turns: 0.2, life: 3.0, size: [10, 14] },
      { at: 'hit', id: 'impact', size: 56, color: '$glow' },
      { at: 'hit', id: 'ring', anchor: 'heroFeet', r: 90, squash: 0.4, color: '$main', width: 7, alpha: 0.7 },
      { at: 'hit', id: 'shake', every: 2, power: 0.7 },
      { at: 'end', id: 'flash', color: '$main', alpha: 0.35 },
      { at: 'end', id: 'callout', text: 'つぶれちゃいなさい♡', color: '$main', size: 40, wobble: 0.08, life: 1.4 }
    ]
  },

  // ======================================================================
  // ぽしょぽしょ悪魔ちゃん：耳元の左右から、小さな囁きの文字が流れ込む
  // ======================================================================
  sneakyTouch: touch({ extra: [{ at: 'hit', id: 'callout', text: 'くすっ♡', color: '$main', size: 18, ox: 30 }] }),
  whisperHug: {
    bind: {
      start: [
        { id: 'swirl', anchor: 'heroHead', shapes: ['heartLine', 'heart'], colors: ['$main', '$sub'], count: 12, r0: 80, r1: 20, turns: 1, life: 1.0, size: [5, 8] },
        { id: 'callout', text: 'ぽしょ…', color: '$main', size: 20, ox: -95, oy: 10 },
        { id: 'callout', text: 'ぽしょ…♡', color: '$main', size: 20, ox: 95, oy: 0, delay: 0.25 },
        { id: 'callout', text: 'つかまえた……♡', color: '$main', size: 26, oy: -30 }
      ],
      pulse: [
        { id: 'callout', text: 'ぽしょぽしょ…', color: '$sub', size: 18, ox: -95, oy: 10 },
        { id: 'callout', text: '…ぽしょ♡', color: '$main', size: 18, ox: 95, oy: 0, delay: 0.3 },
        { ...drainFlow({ count: 4 }) }
      ]
    }
  },
  poshoWhisper: {
    flashSec: 0.15,
    durationSec: 2.0,
    hits: { count: 4, startSec: 0.3, endSec: 1.4 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      // 左右の耳元から、交互に
      { at: 'hit', id: 'callout', texts: ['ぽしょ…', '…ぽしょ', 'ぽしょぽしょ…', '……♡'], color: '$main', size: 20, ox: -95, oy: 12, rise: 14, when: '!resisted' },
      { at: 'hit', id: 'callout', texts: ['…ねえ', 'きいて…', '…ないしょ', 'すき…♡'], color: '$sub', size: 20, ox: 95, oy: 2, rise: 14, delay: 0.12, when: '!resisted' },
      { at: 'hit', id: 'ring', anchor: 'heroHead', r: 26, color: '$main', width: 3, alpha: 0.6, when: '!resisted' },
      { at: 'end', id: 'swirl', anchor: 'heroHead', shape: 'heartLine', colors: ['$main', '$sub'], count: 8, r0: 40, r1: 30, turns: 1.2, life: 1.0, size: [5, 8], when: '!resisted' },
      { at: 'end', id: 'callout', text: '集中できない…', color: '$glow', size: 22, when: ['!resisted', '!gentle'] },
      { at: 'hit', id: 'ring', anchor: 'heroHead', r: 34, color: '#ffd1e8', width: 4, alpha: 0.7, first: 0, last: 0, when: 'resisted' },
      { at: 'end', id: 'callout', text: '耳をふさいだ', color: '#ffd1e8', size: 24, when: 'resisted' },
      gentleCue
    ]
  },
  secretInsult: {
    flashSec: 0.15,
    durationSec: 1.5,
    hits: { count: 3, startSec: 0.3, endSec: 0.9 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'hit', id: 'callout', texts: ['ざぁこ…♡', 'よわよわ…♡', 'ダメダメ…♡'], color: '$main', size: 22, ox: -40, oy: -10, rise: 20 },
      { at: 'hit', id: 'burst', anchor: 'heroHead', shape: 'heartLine', colors: ['$main', '$sub'], count: 3, speed: [30, 70], size: [4, 7], life: 0.7 },
      { at: 'end', id: 'callout', text: '萎縮…', color: '$glow', size: 20 }
    ]
  },
  secretLevelDrain: {
    flashSec: 0.2,
    durationSec: 1.6,
    hits: { count: 4, startSec: 0.25, endSec: 1.1 },
    hitNumbers: false,
    se: [{ at: 'hit', id: '$skill', every: 2 }],
    fx: [
      { at: 'hit', ...drainFlow({ count: 7 }) },
      { at: 'hit', id: 'callout', text: 'ないしょ…♡', color: '$main', size: 18, ox: 50, first: 0, last: 0 },
      { at: 'end', id: 'callout', text: '集中できない間に…', color: '$glow', size: 20, when: 'bonus' }
    ]
  },
  absoluteWhisper: {
    flashSec: 0.35,
    durationSec: 3.8,
    hits: { count: 10, startSec: 0.4, endSec: 3.3 },
    hitNumbers: false,
    se: [{ at: 'start', id: 'whisperPosho' }, { at: 'hit', id: 'whisperPosho', every: 3, gain: 0.7 }, { at: 'end', id: 'insultGiggle' }],
    windup: [{ at: 'start', id: 'swirl', anchor: 'enemyHead', shape: 'heartLine', colors: ['$main', '$sub'], count: 8, r0: 50, r1: 10, turns: 1, life: 0.7 }],
    fx: [
      { at: 'start', id: 'wash', color: '$sub', alpha: 0.22, mode: 'full', life: 3.8, inSec: 0.8 },
      { at: 'hit', id: 'callout', texts: ['ぽしょ…', 'すき…', 'ないしょ…', 'ぽしょぽしょ…', 'だめ…♡', 'しゅうちゅう…', 'しちゃだめ…♡', 'ぽしょ…', 'すきすき…', 'びゅ〜……w'], color: '$main', size: 20, ox: -95, oy: 12, rise: 14 },
      { at: 'hit', id: 'callout', texts: ['…ねえ', '…きこえる？', '…♡', '…おにいさん', '…ふふ', '…もっと', '…きいて', '…ね？', '…♡', '…♡'], color: '$sub', size: 20, ox: 95, oy: 0, rise: 14, delay: 0.12 },
      { at: 'hit', ...drainFlow({ count: 4 }) },
      { at: 'end', id: 'callout', text: '絶対、内緒だよ……♡', color: '$main', size: 30, wobble: 0.06, life: 1.5 }
    ]
  },

  // ======================================================================
  // 魔性のチャイナ娘：弱点の刻印と、手のひらで吸い上げる経験値（紫と金）
  // ======================================================================
  devilHand: touch({ extra: [{ at: 'hit', ...drainFlow({ count: 3 }) }] }),
  demonicHug: {
    bind: {
      start: [
        { id: 'glyph', anchor: 'heroFeet', style: 'star', mark: 'heart', color: '$main', sub: '$sub', r: 76, life: 1.8 },
        { id: 'swirl', anchor: 'hero', shapes: ['heart', 'dot'], colors: ['$main', '$sub', '#c08bff'], count: 16, r0: 30, r1: 110, turns: 1, life: 1.0, size: [5, 9] },
        { id: 'callout', text: '手、離してあげない♡', color: '$main', size: 28, oy: -20 }
      ],
      pulse: [
        { ...drainFlow({ count: 9, colors: ['#c08bff', '$sub', '$main'] }) },
        { id: 'sparkle', anchor: 'enemyHead', color: '$sub' }
      ]
    }
  },
  weakSpotFound: {
    flashSec: 0.25,
    durationSec: 1.8,
    hits: { count: 1, startSec: 0.9 },
    se: [{ at: 'start', id: '$skill' }, { at: 'hit', id: 'heartPop', when: '!gentle' }],
    fx: [
      // 照準のように絞られ、胸に弱点のハートが灯る
      { at: 'start', id: 'ring', anchor: 'hero', oy: -10, r: 110, color: '$sub', width: 3, alpha: 0.8, life: 0.9 },
      { at: 'start', id: 'swirl', anchor: 'hero', oy: -10, shape: 'streak', colors: ['$sub', '$main'], count: 8, r0: 100, r1: 16, turns: 0.6, life: 0.8, size: [6, 9], glow: true },
      { at: 'hit', id: 'burst', anchor: 'hero', oy: -16, shapes: ['heart'], colors: ['$main'], count: 1, speed: [0, 0], size: [14, 14], life: 1.4, grow: 0.5, glow: true },
      { at: 'hit', id: 'ring', anchor: 'hero', oy: -16, r: 40, color: '$sub', width: 5, alpha: 0.8 },
      { at: 'hit', id: 'callout', text: '弱点、み〜つけた♡', color: '$main', size: 32, wobble: 0.08 },
      gentleCue
    ]
  },
  mysticHandDrain: {
    flashSec: 0.25,
    durationSec: 2.0,
    hits: { count: 6, startSec: 0.3, endSec: 1.5 },
    hitNumbers: false,
    se: [{ at: 'hit', id: '$skill', every: 2 }],
    windup: [{ at: 'start', id: 'swirl', anchor: 'enemy', shapes: ['heart', 'dot'], colors: ['$sub', '#c08bff'], count: 10, r0: 60, r1: 10, turns: 1.2, life: 0.8, glow: true }],
    fx: [
      { at: 'start', id: 'glyph', anchor: 'heroFeet', style: 'star', color: '$sub', sub: '$main', r: 60, life: 2.0, spin: 2 },
      { at: 'hit', ...drainFlow({ count: 8, colors: ['#c08bff', '$sub', '$main'] }) },
      { at: 'hit', id: 'sparkle', anchor: 'enemyHead', color: '$sub' },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: 'どんどん抜けてく♡', color: '$main', size: 26, oy: -30 },
      { at: 'end', id: 'callout', text: '弱点を突かれた…', color: '$glow', size: 20, when: 'bonus' }
    ]
  },
  zakoPunish: {
    flashSec: 0.2,
    durationSec: 1.5,
    hits: { count: 3, startSec: 0.3, endSec: 0.9 },
    hitNumbers: false,
    se: [{ at: 'hit', id: '$skill' }],
    fx: [
      { at: 'hit', id: 'impact', size: 40, color: '$glow' },
      { at: 'hit', id: 'callout', texts: ['ざぁこ♡', 'ざぁこ♡', 'ざぁ〜こ♡'], color: '$main', size: 30, wobble: 0.12 },
      { at: 'hit', id: 'burst', anchor: 'hero', shape: 'heart', colors: ['$main', '$sub'], count: 6, speed: [80, 180], size: [5, 8], life: 0.6 },
      { at: 'hit', id: 'shake', power: 0.4 }
    ]
  },
  demonicExpHarvest: {
    flashSec: 0.35,
    durationSec: 3.8,
    hits: { count: 12, startSec: 0.4, endSec: 3.3 },
    perHit: { mp: 1 / 12, exp: 1 / 12 },
    hitNumbers: false,
    se: [{ at: 'start', id: 'chinaGong' }, { at: 'hit', id: 'handDrain', every: 2, gain: 0.7, gainEnd: 1.1 }, { at: 'end', id: 'chinaGong' }],
    windup: [{ at: 'start', id: 'glyph', anchor: 'enemyFeet', style: 'star', color: '$sub', sub: '$main', r: 54, life: 1.2 }],
    fx: [
      { at: 'start', id: 'wash', color: '#3a0a50', alpha: 0.3, mode: 'full', life: 3.8, inSec: 0.6 },
      { at: 'start', id: 'glyph', anchor: 'heroFeet', style: 'star', mark: 'heart', color: '$main', sub: '$sub', r: 110, life: 3.8, spin: 2 },
      { at: 'hit', ...drainFlow({ count: 10, colors: ['#c08bff', '$sub', '$main', '#ffffff'] }) },
      { at: 'hit', id: 'shake', every: 3, power: 0.4 },
      { at: 'hit', id: 'callout', every: 4, text: 'ざぁこ♡', color: '$main', size: 26, oy: -30 },
      { at: 'end', id: 'flash', color: '#c08bff', alpha: 0.4 },
      { at: 'end', id: 'callout', text: '経験値、ぜーんぶ搾り取っちゃった♡', color: '$main', size: 32, wobble: 0.08, life: 1.5 }
    ]
  },

  // ======================================================================
  // 桜の妖女：画面いっぱいの花吹雪と、咲くたびに堕ちる花印
  // ======================================================================
  sakuraPush: touch({ shapes: ['petal', 'heart'] }),
  sakuraHipHold: {
    bind: {
      start: [
        { id: 'swirl', anchor: 'hero', shape: 'petal', colors: ['$main', '#ffd6ec', '$sub'], count: 24, r0: 160, r1: 40, turns: 1.2, life: 1.2, size: [6, 10] },
        { id: 'glyph', anchor: 'heroFeet', style: 'heart', mark: 'heart', color: '$main', sub: '$sub', r: 76, life: 1.8 },
        { id: 'callout', text: '桜の下で、ゆっくり♡', color: '$main', size: 28, oy: -20 },
        { id: 'wash', color: '$main', alpha: 0.2, life: 1.2 }
      ],
      pulse: [
        { id: 'burst', anchor: 'heroHead', oy: -50, shape: 'petal', colors: ['$main', '#ffd6ec', '$sub'], count: 8, speed: [20, 70], size: [5, 9], life: 1.6, gravity: 50, sway: 14 },
        { ...drainFlow({ shapes: ['petal', 'heart'], colors: ['$main', '#c08bff'] }) }
      ]
    }
  },
  sakuraStorm: {
    flashSec: 0.3,
    durationSec: 2.2,
    hits: { count: 3, startSec: 0.6, endSec: 1.6 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }, { at: 'end', id: 'temptAccept', when: 'accepted' }],
    windup: [{ at: 'start', id: 'swirl', anchor: 'enemy', shape: 'petal', colors: ['$main', '#ffd6ec'], count: 14, r0: 30, r1: 90, turns: 0.6, rise: 20, life: 1.0, size: [5, 9] }],
    fx: [
      // 敵から主人公へ、画面を横切る花吹雪
      { at: 'start', id: 'flow', from: 'enemy', to: 'hero', fromOffset: { oy: -40 }, toOffset: { ox: -200, oy: 40 }, shape: 'petal', colors: ['$main', '#ffd6ec', '$sub', '#ffffff'], count: 40, life: 1.2, spanSec: 1.0, arc: 60, wobble: 60, spread: 70, size: [5, 10] },
      { at: 'start', id: 'wash', color: '$main', alpha: 0.18, life: 2.0, inSec: 0.5 },
      { at: 'hit', id: 'burst', anchor: 'heroHead', shape: 'petal', colors: ['$main', '#ffd6ec', '$sub'], count: 10, speed: [40, 120], size: [5, 9], life: 1.4, gravity: 50, sway: 14 },
      { at: 'end', id: 'callout', text: '……きれい', color: '$glow', size: 24, when: '!resisted' },
      { at: 'end', id: 'wash', color: '$sub', alpha: 0.3, mode: 'full', life: 1.6, when: 'accepted' },
      { at: 'end', id: 'callout', text: 'ゆっくり、堕ちていきなさい♡', color: '$main', size: 28, oy: -40, when: 'accepted' },
      gentleCue
    ]
  },
  corruptionMark: {
    flashSec: 0.3,
    durationSec: 1.8,
    hits: { count: 1, startSec: 0.9 },
    se: [{ at: 'start', id: '$skill' }, { at: 'hit', id: 'conditionWarn', gain: 0.7 }],
    windup: [{ at: 'start', id: 'burst', anchor: 'enemyHead', shape: 'petal', colors: ['$main', '$sub'], count: 6, speed: [20, 50], size: [6, 9], life: 1, gravity: 40 }],
    fx: [
      { at: 'start', id: 'flow', from: 'enemyHead', to: 'hero', toOffset: { oy: -16 }, shape: 'petal', colors: ['$main', '$sub'], count: 10, life: 0.8, spanSec: 0.6, arc: 40, wobble: 14, size: [6, 9] },
      // 胸に咲く花印（花びらが輪になって、中心にハート）
      { at: 'hit', id: 'swirl', anchor: 'hero', oy: -16, shape: 'petal', colors: ['$main', '$sub'], count: 8, r0: 20, r1: 22, turns: 0.3, life: 1.6, size: [7, 9] },
      { at: 'hit', id: 'burst', anchor: 'hero', oy: -16, shapes: ['heart'], colors: ['$sub'], count: 1, speed: [0, 0], size: [10, 10], life: 1.6, grow: 0.3, glow: true },
      { at: 'hit', id: 'callout', text: '花印が咲いた…', color: '$main', size: 24 }
    ]
  },
  sakuraExpHunt: {
    flashSec: 0.25,
    durationSec: 1.8,
    hits: { count: 5, startSec: 0.3, endSec: 1.3 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }, { at: 'hit', id: 'sakuraWind', every: 2, gain: 0.6 }],
    fx: [
      { at: 'hit', id: 'burst', anchor: 'hero', shape: 'petal', colors: ['$main', '#ffd6ec', '$sub'], count: 8, speed: [120, 260], size: [5, 9], life: 0.8 },
      { at: 'hit', ...drainFlow({ shapes: ['petal', 'dot'], colors: ['#c08bff', '$main'] }) },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: '散りなさい♡', color: '$main', size: 26, oy: -30 },
      { at: 'end', id: 'callout', text: '花印が吸われていく…', color: '$glow', size: 20, when: 'bonus' }
    ]
  },
  thousandSakura: {
    flashSec: 0.4,
    durationSec: 4.2,
    hits: { count: 12, startSec: 0.6, endSec: 3.6 },
    perHit: { mp: 1 / 12, exp: 1 / 12 },
    hitNumbers: false,
    se: [{ at: 'start', id: 'petalStorm' }, { at: 'hit', id: 'sakuraWind', every: 3, gain: 0.8 }, { at: 'end', id: 'petalStorm' }],
    windup: [{ at: 'start', id: 'swirl', anchor: 'enemy', shape: 'petal', colors: ['$main', '#ffd6ec'], count: 20, r0: 20, r1: 120, turns: 0.8, life: 1.2, size: [5, 9] }],
    fx: [
      { at: 'start', id: 'wash', color: '#3a0a40', alpha: 0.32, mode: 'full', life: 4.2, inSec: 1.0 },
      { at: 'start', id: 'glyph', anchor: 'heroFeet', style: 'heart', mark: 'heart', color: '$main', sub: '$sub', r: 120, life: 4.2, spin: 1 },
      { at: 'hit', id: 'flow', from: 'enemy', to: 'hero', fromOffset: { ox: 200, oy: -120 }, toOffset: { ox: -200, oy: 60 }, shape: 'petal', colors: ['$main', '#ffd6ec', '$sub', '#ffffff'], count: 16, life: 1.0, spanSec: 0.4, arc: 40, wobble: 60, spread: 90, size: [5, 10] },
      { at: 'hit', ...drainFlow({ shapes: ['petal', 'dot'], colors: ['#c08bff', '$main'] }) },
      { at: 'hit', id: 'shake', every: 4, power: 0.4 },
      { at: 'end', id: 'flash', color: '$main', alpha: 0.4 },
      { at: 'end', id: 'callout', text: '破滅の千本桜……♡', color: '$main', size: 40, wobble: 0.06, life: 1.6 }
    ]
  },

  // ======================================================================
  // ずるっこ悪魔ちゃん：足元の罠と、うそ泣き →「なーんちゃって♡」
  // ======================================================================
  sneakyKick: touch({ extra: [{ at: 'hit', id: 'callout', text: 'ずるっ♡', color: '$main', size: 20 }] }),
  devilLegHold: {
    bind: {
      start: [
        { id: 'glyph', anchor: 'heroFeet', style: 'heart', mark: 'heart', color: '$main', sub: '$sub', r: 70, life: 1.6, spin: 3 },
        { id: 'ring', anchor: 'heroFeet', r: 40, squash: 0.4, color: '$main', width: 8, alpha: 0.8, life: 0.5 },
        { id: 'callout', text: 'ひっかかった♡', color: '$main', size: 30, oy: -20 }
      ],
      pulse: [
        { id: 'ring', anchor: 'heroFeet', r: 40, squash: 0.4, color: '$main', width: 5, alpha: 0.6 },
        { ...drainFlow({ count: 5 }) }
      ]
    }
  },
  footTrap: {
    flashSec: 0.15,
    durationSec: 1.4,
    hits: { count: 1, startSec: 0.5 },
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: 'あしもと注意報♡', color: '$main', size: 24, oy: -28, wobble: 0.1 },
      { at: 'start', id: 'flow', from: 'enemyHead', to: 'heroFeet', shapes: ['heart', 'dot'], colors: ['$main', '$sub'], count: 10, life: 0.5, spanSec: 0.3, arc: 60, wobble: 30, spread: 40, size: [4, 7] }
    ]
  },
  legDrain: {
    flashSec: 0.2,
    durationSec: 1.6,
    hits: { count: 4, startSec: 0.3, endSec: 1.1 },
    hitNumbers: false,
    se: [{ at: 'start', id: 'legWrap' }, { at: 'hit', id: '$skill', every: 2 }],
    fx: [
      { at: 'start', id: 'ring', anchor: 'heroFeet', r: 40, squash: 0.4, color: '$main', width: 6, alpha: 0.8 },
      { at: 'hit', ...drainFlow({ from: 'heroFeet', count: 6 }) },
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: '足からちゅーって♡', color: '$main', size: 24, oy: -30 },
      { at: 'end', id: 'callout', text: '転んだところを…', color: '$glow', size: 20, when: 'bonus' }
    ]
  },
  fakeCry: {
    flashSec: 0.15,
    durationSec: 1.8,
    hits: { count: 1, startSec: 0.9 },
    se: [{ at: 'start', id: '$skill' }, { at: 'end', id: 'trapSpring', when: 'accepted' }],
    fx: [
      { at: 'start', id: 'burst', anchor: 'enemyHead', oy: 6, shapes: ['bubble', 'dot'], colors: ['#bfe6ff', '$glow'], count: 10, speed: [20, 60], size: [3, 6], life: 1.0, gravity: 50, spread: Math.PI * 0.8 },
      { at: 'start', id: 'callout', anchor: 'enemyHead', text: 'えーん……', color: '$glow', size: 22, oy: -26 },
      gentleCue,
      // 近寄ったら罠
      { at: 'end', id: 'callout', anchor: 'enemyHead', text: 'なーんちゃって♡', color: '$main', size: 32, oy: -32, wobble: 0.12, when: 'accepted' },
      { at: 'end', id: 'glyph', anchor: 'heroFeet', style: 'heart', color: '$main', sub: '$sub', r: 50, life: 0.8, spin: 4, when: 'accepted' },
      { at: 'end', id: 'burst', anchor: 'heroFeet', shapes: ['heart', 'heartLine'], colors: ['$main', '$glow'], count: 14, speed: [100, 220], size: [5, 9], life: 0.7, angle: -Math.PI / 2, spread: Math.PI, when: 'accepted' }
    ]
  },
  devilsLegTrap: {
    flashSec: 0.35,
    durationSec: 3.2,
    hits: { count: 8, startSec: 0.5, endSec: 2.8 },
    hitNumbers: false,
    se: [{ at: 'start', id: 'trapSet' }, { at: 'hit', id: 'legWrap', every: 2, gain: 0.8 }, { at: 'end', id: 'trapSpring' }],
    windup: [{ at: 'start', id: 'glyph', anchor: 'heroFeet', style: 'heart', color: '$main', sub: '$sub', r: 60, life: 1.2, spin: 3 }],
    fx: [
      { at: 'start', id: 'wash', color: '$sub', alpha: 0.22, mode: 'full', life: 3.2, inSec: 0.5 },
      { at: 'start', id: 'glyph', anchor: 'heroFeet', style: 'heart', mark: 'heart', color: '$main', sub: '$sub', r: 104, life: 3.2, spin: 2.5 },
      { at: 'hit', id: 'ring', anchor: 'heroFeet', r: 50, squash: 0.4, color: '$main', width: 6, alpha: 0.7 },
      { at: 'hit', ...drainFlow({ count: 5 }) },
      { at: 'end', id: 'flash', color: '$main', alpha: 0.3 },
      { at: 'end', id: 'callout', text: 'ぜーんぶ罠でした♡ ざぁこ♡', color: '$main', size: 34, wobble: 0.1, life: 1.4 }
    ]
  }
};
