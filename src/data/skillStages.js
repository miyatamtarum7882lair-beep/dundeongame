// File: src/data/skillStages.js
// 技ごとの演出台本。ここに無い技は、従来の演出（legacy）で1回だけ当たる。
//
// name        HUD に出す技名（defeatSkills.js に名前があればそちらが優先）
// banner      true / false で、技名 HUD を強制する。省略時は B.stage.bannerCategories に従う
// flashSec    技前の発光の長さ（この間、ヒットは始まらない）
// durationSec 発光のあとに続く演出の長さ。この間は、他の敵が動かない
// hits        { count, startSec, endSec }  発光後 startSec から endSec まで、等間隔にヒットする
// perHit      1ヒットごとの倍率 { hp, mp, exp }。基準は B.skills[技] の hpRate / mpRate / expRate。
//             省略した項目は 1 / count（全ヒットの合計で基準値ちょうど）
// hitNumbers  ヒットごとにダメージ数字を出すか。省略時は、1ヒットなら true、複数なら false（終了時に合計を出す）
// fx / se     演出キュー。fx の id は src/battle/stageFx.js の STAGE_FX、se の id は seTable.js の ID
//             se の id に '$skill' を書くと、skills.js の se を使う
//
// キューの共通項目
//   at        'start' | 'hit' | 'end'
//   every     hit のとき、何ヒットごとに出すか / first, last … hit の番号の範囲（数値）
//   delay     秒
//   when      条件。文字列か配列（すべて満たすとき）。先頭に ! で否定
//             evolved（進化済み） accepted（受け入れた・時間切れ） timeout resisted（断った）
//             contestWin / contestLose（力比べ） careless（主人公が油断中）
//   色        '$main' '$sub' '$glow' '$accent' で敵のテーマ色（enemyThemes.js）
//   位置      anchor / from / to: hero heroHead heroFeet enemy enemyHead enemyFeet mid、ox / oy でずらす
//
// 拘束技は bind: { start, pulse } に fx キューを書く（start は拘束成立時、pulse は毎回の吸収）。
// windup: 予備動作（構え）の追加キュー。prepareSkill のときに start として流す。
import { WAVE1_STAGES } from './skillStagesWave1.js';
import { WAVE2_STAGES } from './skillStagesWave2.js';
import { WAVE3_STAGES } from './skillStagesWave3.js';
import { WAVE4_STAGES } from './skillStagesWave4.js';

export const SKILL_STAGES = {
  ...WAVE1_STAGES,
  ...WAVE2_STAGES,
  ...WAVE3_STAGES,
  ...WAVE4_STAGES,
  drainBerochu: {
    name: 'どれいんべろちゅー',
    flashSec: 0.25,
    durationSec: 3.1,
    hits: { count: 10, startSec: 0.1, endSec: 2.9 },
    perHit: { exp: 0.5 },
    hitNumbers: false,
    se: [
      { at: 'hit', id: 'vacuumKiss', gain: 0.7, gainEnd: 1.0 }
    ],
    fx: [
      { at: 'start', id: 'ring', r: 60, color: '#ff9ccf' },
      { at: 'hit', id: 'drainStream', count: 5 },
      { at: 'hit', id: 'hearts', every: 2, count: 3 },
      { at: 'hit', id: 'kissMark', every: 3 },
      { at: 'hit', id: 'shake', every: 2, power: 0.25 },
      { at: 'end', id: 'sparkle' }
    ]
  },

  // ======================================================================
  // 小悪魔キトゥン：ピンクと紫。からかう笑い、ハートと星、「ざぁこ♡」の文字
  // ======================================================================
  kittenTouch: {
    flashSec: 0,
    durationSec: 0.5,
    hits: { count: 1, startSec: 0.08 },
    se: [{ at: 'hit', id: '$skill' }],
    fx: [
      { at: 'hit', id: 'impact', size: 26, color: '$glow' },
      { at: 'hit', id: 'burst', anchor: 'heroHead', shape: 'heart', colors: ['$main', '$glow'], count: 6, speed: [70, 170], size: [5, 9], life: 0.6, gravity: -40 },
      { at: 'hit', id: 'burst', anchor: 'heroHead', shapes: ['heart', 'heartLine'], colors: ['$main', '$glow'], count: 3, speed: [40, 90], size: [4, 7], life: 0.5, when: 'evolved' }
    ]
  },

  kittenTease: {
    flashSec: 0.2,
    durationSec: 1.35,
    hits: { count: 1, startSec: 0.5 },
    se: [{ at: 'start', id: '$skill' }, { at: 'hit', id: 'heartPop', gain: 0.8 }],
    fx: [
      { at: 'start', id: 'swirl', anchor: 'enemy', shapes: ['heart', 'heart', 'heartLine'], colors: ['$main', '$sub', '$glow'], count: 10, r0: 26, r1: 62, turns: 0.8, rise: 30, life: 0.8, size: [5, 8] },
      { at: 'hit', id: 'flow', from: 'enemyHead', to: 'heroHead', shapes: ['heart', 'heart', 'heartLine'], colors: ['$main', '$sub'], count: 10, life: 0.45, spanSec: 0.25, arc: 34, size: [6, 10], glow: true },
      { at: 'hit', id: 'swirl', anchor: 'hero', shape: 'heart', colors: ['$main', '$glow'], count: 12, r0: 92, r1: 18, turns: 1.1, life: 0.75, size: [6, 10], delay: 0.3 },
      { at: 'hit', id: 'callout', text: 'ざぁこ♡', color: '$main', size: 38, wobble: 0.12, delay: 0.35, life: 1.0 },
      { at: 'hit', id: 'wash', color: '$main', alpha: 0.16, life: 0.9, delay: 0.3 },
      { at: 'hit', id: 'callout', text: '油断…', color: '$glow', size: 22, oy: 24, delay: 0.7, when: 'careless' }
    ]
  },

  kittenBlowKiss: {
    flashSec: 0.25,
    durationSec: 1.5,
    hits: { count: 1, startSec: 0.8 },
    se: [{ at: 'start', id: '$skill' }, { at: 'hit', id: 'heartPop' }],
    windup: [
      { at: 'start', id: 'swirl', anchor: 'enemyHead', shapes: ['heart', 'heartLine'], colors: ['$main', '$glow'], count: 8, r0: 60, r1: 10, turns: 1, life: 0.7, glow: true }
    ],
    fx: [
      { at: 'start', id: 'burst', anchor: 'enemyHead', oy: 22, shape: 'lips', colors: ['$main'], count: 2, speed: [20, 50], size: [9, 12], life: 0.5 },
      { at: 'start', id: 'heartProjectileFx', size: 1.2, durSec: 0.8, arcPx: 96, delay: 0.05 },
      { at: 'start', id: 'flow', from: 'enemyHead', to: 'heroHead', shapes: ['heart', 'heartLine'], colors: ['$glow', '$sub'], count: 14, life: 0.7, spanSec: 0.55, arc: 90, wobble: 14, size: [3, 6], glow: true, delay: 0.1 },
      { at: 'hit', id: 'burst', anchor: 'heroHead', shape: 'heart', colors: ['$main', '$glow', '$sub'], count: 16, speed: [120, 280], size: [5, 11], life: 0.75, glow: true },
      { at: 'hit', id: 'ring', anchor: 'heroHead', r: 72, color: '$main', width: 5, alpha: 0.6 },
      { at: 'hit', id: 'kissMark' },
      { at: 'hit', id: 'wash', color: '$main', alpha: 0.14, life: 0.7 },
      { at: 'hit', id: 'callout', text: '追撃♡', color: '$accent', size: 30, when: 'careless' },
      { at: 'hit', id: 'speedLines', color: '$glow', count: 30, alpha: 0.4, when: 'careless' }
    ]
  },

  // 選択肢付き：ねえ、負けちゃう？♡
  kittenDare: {
    flashSec: 0.3,
    durationSec: 1.9,
    hits: { count: 1, startSec: 1.0 },
    se: [
      { at: 'start', id: '$skill' },
      { at: 'hit', id: 'heartPop', when: '!resisted' },
      { at: 'hit', id: 'temptAccept', when: 'accepted' },
      { at: 'hit', id: 'autoGuard', gain: 0.7, when: 'resisted' }
    ],
    windup: [
      { at: 'start', id: 'glyph', anchor: 'enemyFeet', style: 'heart', color: '$main', sub: '$glow', r: 44, life: 1.1 }
    ],
    fx: [
      { at: 'start', id: 'glyph', anchor: 'heroFeet', style: 'heart', mark: 'heart', color: '$main', sub: '$sub', r: 74, life: 2.0, spin: 1.4 },
      { at: 'start', id: 'swirl', anchor: 'hero', shape: 'heart', colors: ['$main', '$sub', '$glow'], count: 18, r0: 120, r1: 26, turns: 1.4, life: 1.15, size: [6, 11], delay: 0.1 },
      { at: 'start', id: 'wash', color: '$main', alpha: 0.18, life: 1.6, inSec: 0.5 },
      // 受け入れた・押し切られた
      { at: 'hit', id: 'burst', anchor: 'hero', shape: 'heart', colors: ['$main', '$glow'], count: 22, speed: [140, 320], size: [7, 13], life: 0.9, glow: true, when: '!resisted' },
      { at: 'hit', id: 'speedLines', color: '$main', count: 50, alpha: 0.5, when: '!resisted' },
      { at: 'hit', id: 'callout', text: '負けちゃえ♡', color: '$main', size: 40, wobble: 0.1, when: ['!resisted', '!accepted'] },
      { at: 'hit', id: 'callout', text: 'まけちゃった♡', color: '$main', size: 40, wobble: 0.14, when: 'accepted' },
      { at: 'hit', id: 'flash', color: '$main', alpha: 0.3, when: 'accepted' },
      { at: 'hit', id: 'hearts', count: 6, size: 0.55, when: 'accepted' },
      // 身構えて拒んだ
      { at: 'hit', id: 'ring', anchor: 'hero', r: 64, color: '#ffd1e8', width: 6, alpha: 0.8, when: 'resisted' },
      { at: 'hit', id: 'burst', anchor: 'hero', shapes: ['heart', 'heartLine'], colors: ['#ffd1e8', '#ffffff'], count: 10, speed: [100, 220], size: [4, 7], life: 0.5, when: 'resisted' },
      { at: 'hit', id: 'callout', text: '身構えた！', color: '#ffd1e8', size: 30, when: 'resisted' }
    ]
  },

  kittenKissHold: {
    bind: {
      start: [
        { id: 'burst', anchor: 'heroHead', shape: 'lips', colors: ['$main'], count: 4, speed: [60, 140], size: [9, 14], life: 0.7 },
        { id: 'swirl', anchor: 'hero', shapes: ['heart', 'heart', 'heartLine'], colors: ['$main', '$sub', '$glow'], count: 16, r0: 30, r1: 110, turns: 0.9, life: 0.9, size: [6, 10] },
        { id: 'glyph', anchor: 'heroFeet', style: 'heart', color: '$main', sub: '$sub', r: 70, life: 1.6 },
        { id: 'callout', text: 'つっかまえたぁ♡', color: '$main', size: 32, oy: -20 },
        { id: 'wash', color: '$main', alpha: 0.18, life: 1.0 }
      ],
      pulse: [
        { id: 'flow', from: 'heroHead', to: 'enemyHead', fromOffset: { oy: 10 }, toOffset: { oy: 24 }, shapes: ['heart', 'heart', 'heartLine'], colors: ['$main', '$sub'], count: 8, life: 0.55, spanSec: 0.4, arc: 26, size: [4, 7], glow: true },
        { id: 'burst', anchor: 'heroHead', shape: 'heart', colors: ['$glow', '$main'], count: 4, speed: [30, 80], size: [4, 7], life: 0.7, gravity: -50 }
      ]
    }
  },

  // 上位技：小悪魔の完全誘惑
  kittenFullTemptation: {
    flashSec: 0.35,
    durationSec: 4.0,
    hits: { count: 12, startSec: 0.4, endSec: 3.5 },
    perHit: { mp: 1 / 12, exp: 1 / 12 },
    hitNumbers: false,
    se: [
      { at: 'start', id: 'kittenDare' },
      { at: 'hit', id: 'temptSuck', gain: 0.6, gainEnd: 1.0 },
      { at: 'end', id: 'kittenTease' }
    ],
    windup: [
      { at: 'start', id: 'glyph', anchor: 'enemyFeet', style: 'heart', color: '$main', sub: '$sub', r: 56, life: 1.2 },
      { at: 'start', id: 'swirl', anchor: 'enemy', shapes: ['heart', 'heartLine'], colors: ['$main', '$glow'], count: 14, r0: 90, r1: 12, turns: 1.4, life: 0.9, glow: true }
    ],
    fx: [
      { at: 'start', id: 'wash', color: '$main', alpha: 0.24, mode: 'full', life: 4.0, inSec: 0.6 },
      { at: 'start', id: 'glyph', anchor: 'heroFeet', style: 'heart', mark: 'heart', color: '$main', sub: '$glow', r: 110, life: 4.1, spin: 2 },
      { at: 'start', id: 'speedLines', color: '$main', count: 56, alpha: 0.5, life: 0.6 },
      { at: 'hit', id: 'drainStream', count: 4 },
      { at: 'hit', id: 'flow', from: 'heroHead', to: 'enemyHead', shapes: ['heart', 'heart', 'heartLine'], colors: ['$main', '$sub', '$glow'], count: 6, life: 0.5, spanSec: 0.25, arc: 30, size: [4, 8], glow: true },
      { at: 'hit', id: 'hearts', every: 2, count: 3, size: 0.5 },
      { at: 'hit', id: 'kissMark', every: 4 },
      { at: 'hit', id: 'shake', every: 3, power: 0.35 },
      { at: 'hit', id: 'callout', every: 4, text: 'ざぁこ♡', color: '$main', size: 30, oy: -30 },
      { at: 'end', id: 'burst', anchor: 'hero', shape: 'heart', colors: ['$main', '$sub', '$glow'], count: 30, speed: [160, 360], size: [7, 14], life: 1.0, glow: true },
      { at: 'end', id: 'flash', color: '$main', alpha: 0.35 },
      { at: 'end', id: 'callout', text: 'ざぁこ♡ざぁこ♡', color: '$main', size: 42, wobble: 0.1, life: 1.3 }
    ]
  },

  // ======================================================================
  // 黒髪リボンちゃん：桃色の霧、泡、リボン、音符。ゆっくり甘く
  // ======================================================================
  ribbonTouch: {
    flashSec: 0,
    durationSec: 0.55,
    hits: { count: 1, startSec: 0.1 },
    se: [{ at: 'hit', id: '$skill' }],
    fx: [
      { at: 'hit', id: 'impact', size: 22, color: '$glow' },
      { at: 'hit', id: 'burst', anchor: 'hero', oy: -16, shapes: ['ribbon', 'heart'], colors: ['$main', '$accent'], count: 4, speed: [70, 150], size: [7, 10], life: 0.6, spin: 5 },
      { at: 'hit', id: 'burst', anchor: 'heroHead', shapes: ['bubble', 'heart'], colors: ['$glow'], count: 3, speed: [20, 50], size: [4, 7], life: 0.8, gravity: -60 }
    ]
  },

  // 選択肢付き：桃色の吐息
  peachBreath: {
    flashSec: 0.3,
    durationSec: 2.1,
    hits: { count: 3, startSec: 0.55, endSec: 1.45 },
    hitNumbers: false,
    se: [
      { at: 'start', id: '$skill' },
      { at: 'hit', id: 'bubblePop', gain: 0.7 },
      { at: 'end', id: 'temptAccept', when: 'accepted' }
    ],
    windup: [
      { at: 'start', id: 'cloud', from: 'enemyHead', to: 'enemyHead', fromOffset: { oy: 26 }, toOffset: { oy: 10 }, colors: ['$main', '$glow'], count: 6, r: [6, 22], life: 0.8, spread: 10 }
    ],
    fx: [
      { at: 'start', id: 'cloud', colors: ['$main', '$glow', '$sub'], count: 16, r: [10, 48], life: 1.4, spanSec: 0.7, spread: 30, lift: 18 },
      { at: 'start', id: 'flow', from: 'enemyHead', to: 'heroHead', shape: 'heart', colors: ['$main', '$glow'], count: 8, life: 0.9, spanSec: 0.7, arc: 20, wobble: 18, size: [4, 7], delay: 0.15 },
      { at: 'hit', id: 'burst', anchor: 'heroHead', shapes: ['bubble', 'heart', 'heart'], colors: ['$glow', '$main'], count: 6, speed: [20, 70], size: [4, 9], life: 1.0, gravity: -70, sway: 8 },
      { at: 'hit', id: 'wash', color: '$main', alpha: 0.1, life: 0.8 },
      { at: 'end', id: 'swirl', anchor: 'heroHead', oy: 6, shape: 'heart', colors: ['$main', '$glow'], count: 7, r0: 34, r1: 40, turns: 0.6, rise: 22, life: 1.3, size: [5, 8] },
      { at: 'end', id: 'callout', text: 'ふわぁ…♡', color: '$main', size: 30, wobble: 0.15, life: 1.3, when: 'accepted' },
      { at: 'end', id: 'wash', color: '$main', alpha: 0.22, mode: 'full', life: 1.2, when: 'accepted' },
      { at: 'end', id: 'callout', text: '吸いこまずに済んだ', color: '#ffd1e8', size: 24, when: 'resisted' }
    ]
  },

  sweetWhisper: {
    flashSec: 0.15,
    durationSec: 1.45,
    hits: { count: 1, startSec: 0.7 },
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'start', id: 'flow', from: 'enemyHead', to: 'heroHead', fromOffset: { oy: 20 }, toOffset: { ox: 10, oy: 8 }, shapes: ['note', 'heart'], colors: ['$main', '$glow', '$sub'], count: 9, life: 0.8, spanSec: 0.5, arc: 28, wobble: 16, size: [7, 10] },
      { at: 'hit', id: 'ring', anchor: 'heroHead', ox: 10, oy: 8, r: 30, color: '$main', width: 3, alpha: 0.7 },
      { at: 'hit', id: 'ring', anchor: 'heroHead', ox: 10, oy: 8, r: 30, color: '$main', width: 3, alpha: 0.6, delay: 0.15 },
      { at: 'hit', id: 'ring', anchor: 'heroHead', ox: 10, oy: 8, r: 30, color: '$main', width: 3, alpha: 0.5, delay: 0.3 },
      { at: 'hit', id: 'burst', anchor: 'heroHead', shape: 'heart', colors: ['$main', '$glow'], count: 5, speed: [30, 80], size: [4, 7], life: 0.8, gravity: -40 },
      { at: 'hit', id: 'wash', color: '$main', alpha: 0.14, life: 0.8 },
      { at: 'hit', id: 'callout', text: 'ぽわ…♡', color: '$main', size: 24, delay: 0.15 }
    ]
  },

  closeBreath: {
    flashSec: 0.25,
    durationSec: 1.6,
    hits: { count: 4, startSec: 0.25, endSec: 1.2 },
    hitNumbers: false,
    se: [{ at: 'start', id: '$skill' }, { at: 'hit', id: 'closeBreath', every: 2, gain: 0.6 }],
    fx: [
      { at: 'start', id: 'cloud', colors: ['$main', '$glow'], count: 12, r: [14, 54], life: 1.1, spanSec: 0.5, spread: 18, lift: 8 },
      { at: 'hit', id: 'cloud', from: 'heroHead', to: 'heroHead', colors: ['$main', '$glow'], count: 3, r: [10, 36], life: 0.8, spread: 24 },
      { at: 'hit', id: 'burst', anchor: 'heroHead', shape: 'heart', colors: ['$main', '$glow'], count: 3, speed: [30, 80], size: [5, 8], life: 0.8, gravity: -50 },
      { at: 'hit', id: 'kissMark', every: 4, first: 3 },
      { at: 'end', id: 'wash', color: '$main', alpha: 0.18, life: 0.9 }
    ]
  },

  peachBreathHold: {
    bind: {
      start: [
        { id: 'cloud', from: 'hero', to: 'hero', colors: ['$main', '$glow', '$sub'], count: 14, r: [16, 60], life: 1.4, spread: 46, lift: 20 },
        { id: 'burst', anchor: 'hero', oy: -10, shapes: ['ribbon', 'heart'], colors: ['$main', '$accent'], count: 6, speed: [90, 180], size: [8, 12], life: 0.8, spin: 5 },
        { id: 'glyph', anchor: 'heroFeet', style: 'ribbon', color: '$main', sub: '$sub', r: 70, life: 1.6 },
        { id: 'callout', text: 'はい、つかまえた♡', color: '$main', size: 30, oy: -20 },
        { id: 'wash', color: '$main', alpha: 0.2, life: 1.2 }
      ],
      pulse: [
        { id: 'cloud', from: 'heroHead', to: 'heroHead', colors: ['$main', '$glow'], count: 4, r: [10, 34], life: 1.0, spread: 30, lift: 18 },
        { id: 'burst', anchor: 'heroHead', shapes: ['bubble', 'heart'], colors: ['$glow', '$main'], count: 3, speed: [20, 60], size: [4, 8], life: 1.0, gravity: -60 }
      ]
    }
  },

  // 上位技：極上の桃色吐息
  supremePeachBreath: {
    flashSec: 0.35,
    durationSec: 3.3,
    hits: { count: 6, startSec: 0.7, endSec: 2.7 },
    hitNumbers: false,
    se: [
      { at: 'start', id: '$skill' },
      { at: 'hit', id: 'bubblePop', gain: 0.6 },
      { at: 'end', id: 'temptAccept' }
    ],
    windup: [
      { at: 'start', id: 'cloud', from: 'enemy', to: 'enemy', colors: ['$main', '$sub'], count: 10, r: [10, 40], life: 1.0, spread: 30 }
    ],
    fx: [
      { at: 'start', id: 'wash', color: '$main', alpha: 0.26, mode: 'full', life: 3.4, inSec: 0.9 },
      { at: 'start', id: 'cloud', colors: ['$main', '$glow', '$sub'], count: 26, r: [16, 70], life: 2.0, spanSec: 1.2, spread: 60, lift: 30 },
      { at: 'start', id: 'glyph', anchor: 'heroFeet', style: 'ribbon', mark: 'heart', color: '$main', sub: '$sub', r: 100, life: 3.3 },
      { at: 'hit', id: 'cloud', from: 'hero', to: 'hero', colors: ['$main', '$glow'], count: 5, r: [14, 50], life: 1.2, spread: 60, lift: 24 },
      { at: 'hit', id: 'burst', anchor: 'heroHead', shapes: ['bubble', 'heart'], colors: ['$glow', '$main', '$sub'], count: 6, speed: [30, 90], size: [5, 10], life: 1.2, gravity: -60, sway: 10 },
      { at: 'hit', id: 'shake', every: 2, power: 0.25 },
      { at: 'end', id: 'speedLines', color: '$main', count: 48, alpha: 0.45 },
      { at: 'end', id: 'callout', text: '極上…♡', color: '$main', size: 42, wobble: 0.12, life: 1.3 }
    ]
  },

  // ======================================================================
  // ピンク髪きつねちゃん：ピンクと金。重いお尻の衝撃、土煙、毛並み、狐の魔法陣
  // ======================================================================
  foxStep: {
    flashSec: 0,
    durationSec: 0.5,
    hits: { count: 1, startSec: 0.1 },
    se: [{ at: 'hit', id: '$skill' }],
    fx: [
      { at: 'hit', id: 'impact', size: 30, color: '$glow' },
      { at: 'hit', id: 'burst', anchor: 'heroFeet', shape: 'fluff', colors: ['#ffc2dc', '#ffe3f2'], count: 5, speed: [40, 110], size: [8, 14], life: 0.5, gravity: -20, angle: -Math.PI / 2, spread: Math.PI },
      { at: 'hit', id: 'burst', anchor: 'hero', shape: 'heart', colors: ['$main'], count: 3, speed: [60, 120], size: [5, 8], life: 0.5 }
    ]
  },

  foxHipAttack: {
    flashSec: 0.2,
    durationSec: 1.25,
    hits: { count: 1, startSec: 0.3 },
    se: [{ at: 'start', id: '$skill' }],
    windup: [
      { at: 'start', id: 'telegraph', color: '$main', width: 12, life: 1.2 },
      { at: 'start', id: 'tileMark', color: '$main', life: 1.2 }
    ],
    fx: [
      { at: 'start', id: 'burst', anchor: 'enemy', shape: 'streak', colors: ['$glow', '$main'], count: 8, speed: [220, 360], size: [6, 10], life: 0.3, angle: 0, spread: Math.PI * 2 },
      { at: 'hit', id: 'impact', size: 64, color: '$glow', life: 0.3 },
      { at: 'hit', id: 'ring', anchor: 'heroFeet', r: 96, squash: 0.4, color: '$main', width: 8, alpha: 0.75, life: 0.45 },
      { at: 'hit', id: 'speedLines', color: '$main', count: 44, alpha: 0.5 },
      { at: 'hit', id: 'shake', power: 1.0 },
      { at: 'hit', id: 'burst', anchor: 'hero', shapes: ['heart', 'heart', 'heartLine'], colors: ['$main', '$sub', '$glow'], count: 16, speed: [140, 300], size: [5, 10], life: 0.7 },
      { at: 'hit', id: 'burst', anchor: 'heroFeet', shape: 'fluff', colors: ['#ffc2dc', '#ffe3f2'], count: 10, speed: [60, 160], size: [10, 18], life: 0.7, gravity: -30, angle: -Math.PI / 2, spread: Math.PI * 1.2 },
      { at: 'hit', id: 'callout', text: 'ドーン♡', color: '$main', size: 42, wobble: 0.08 },
      { at: 'hit', id: 'callout', text: 'よろめいた！', color: '$main', size: 22, oy: 30, delay: 0.3, when: 'careless' }
    ]
  },

  // 選択肢付き：ほら、押し返してみなよ♡（力比べ）
  foxPushContest: {
    flashSec: 0.2,
    durationSec: 1.7,
    hits: { count: 1, startSec: 0.85 },
    se: [
      { at: 'start', id: '$skill' },
      { at: 'hit', id: 'contestWin', when: 'contestWin' },
      { at: 'hit', id: 'contestLose', when: '!contestWin' },
      { at: 'hit', id: 'temptAccept', when: 'accepted' }
    ],
    fx: [
      { at: 'start', id: 'glyph', anchor: 'mid', oy: 42, style: 'fox', color: '$main', sub: '$sub', r: 70, life: 1.6, spin: 0.8 },
      { at: 'start', id: 'ring', anchor: 'mid', r: 48, color: '$main', width: 5, alpha: 0.6, life: 0.6 },
      { at: 'start', id: 'burst', anchor: 'mid', shape: 'streak', colors: ['$glow', '$main'], count: 10, speed: [120, 220], size: [5, 8], life: 0.4, stagger: 0.6 },
      { at: 'start', id: 'shake', power: 0.3 },
      // 押し返した
      { at: 'hit', id: 'impact', anchor: 'enemy', size: 56, color: '#ffd1e8', when: 'contestWin' },
      { at: 'hit', id: 'burst', anchor: 'enemy', shapes: ['heart', 'heartLine'], colors: ['#ffd1e8', '#ffffff', '$glow'], count: 14, speed: [120, 260], size: [5, 9], life: 0.6, when: 'contestWin' },
      { at: 'hit', id: 'callout', text: '押し返した！', color: '#ffd1e8', size: 36, when: 'contestWin' },
      { at: 'hit', id: 'callout', anchor: 'enemyHead', text: 'うそっ!?', color: '$main', size: 24, oy: -20, delay: 0.25, when: 'contestWin' },
      // 押し負けた・受け入れた
      { at: 'hit', id: 'impact', size: 58, color: '$glow', when: '!contestWin' },
      { at: 'hit', id: 'ring', anchor: 'heroFeet', r: 90, squash: 0.4, color: '$main', width: 7, alpha: 0.7, when: '!contestWin' },
      { at: 'hit', id: 'speedLines', color: '$main', count: 42, alpha: 0.5, when: '!contestWin' },
      { at: 'hit', id: 'shake', power: 0.8, when: '!contestWin' },
      { at: 'hit', id: 'burst', anchor: 'hero', shape: 'heart', colors: ['$main', '$sub'], count: 14, speed: [100, 240], size: [6, 10], life: 0.8, when: '!contestWin' },
      { at: 'hit', id: 'callout', text: 'よわよわ♡', color: '$main', size: 38, wobble: 0.12, when: ['!contestWin', '!accepted'] },
      { at: 'hit', id: 'callout', text: '背中、もらった♡', color: '$main', size: 34, wobble: 0.12, when: 'accepted' }
    ]
  },

  tailFeint: {
    flashSec: 0.15,
    durationSec: 1.1,
    hits: { count: 1, startSec: 0.45 },
    se: [{ at: 'start', id: '$skill' }],
    fx: [
      { at: 'start', id: 'swirl', anchor: 'hero', shape: 'fluff', colors: ['$glow', '#ffc2dc'], count: 10, r0: 70, r1: 50, turns: 1.4, life: 0.6, size: [10, 16] },
      { at: 'start', id: 'swirl', anchor: 'hero', shape: 'streak', colors: ['$main', '$glow'], count: 8, r0: 64, r1: 46, turns: 1.6, life: 0.55, size: [5, 8], clockwise: false, glow: true },
      { at: 'hit', id: 'impact', size: 22, color: '$glow' },
      { at: 'hit', id: 'burst', anchor: 'heroHead', shapes: ['heart', 'heartLine'], colors: ['$main', '$glow'], count: 6, speed: [50, 120], size: [4, 7], life: 0.7, gravity: -30 },
      { at: 'hit', id: 'callout', text: 'こっち♡', color: '$main', size: 30, wobble: 0.1 }
    ]
  },

  foxBackRub: {
    bind: {
      start: [
        { id: 'impact', size: 52, color: '$glow' },
        { id: 'ring', anchor: 'heroFeet', r: 90, squash: 0.4, color: '$main', width: 7, alpha: 0.7, life: 0.45 },
        { id: 'glyph', anchor: 'heroFeet', style: 'fox', color: '$main', sub: '$sub', r: 72, life: 1.6 },
        { id: 'swirl', anchor: 'hero', shape: 'fluff', colors: ['$glow', '#ffc2dc'], count: 10, r0: 40, r1: 90, turns: 0.7, life: 0.8, size: [10, 16] },
        { id: 'callout', text: 'つっかまえたぁ♡', color: '$main', size: 32, oy: -20 }
      ],
      pulse: [
        { id: 'burst', anchor: 'hero', oy: 14, shape: 'fluff', colors: ['$glow', '#ffc2dc'], count: 4, speed: [30, 80], size: [8, 13], life: 0.6, gravity: -20 },
        { id: 'burst', anchor: 'heroHead', shape: 'heart', colors: ['$main', '$sub'], count: 3, speed: [30, 80], size: [5, 8], life: 0.8, gravity: -50 },
        { id: 'ring', anchor: 'heroFeet', r: 54, squash: 0.4, color: '$main', width: 4, alpha: 0.5 }
      ]
    }
  },

  // 上位技：きつねの極上ヒッププレス
  foxHipPress: {
    flashSec: 0.35,
    durationSec: 3.4,
    hits: { count: 8, startSec: 0.45, endSec: 2.9 },
    hitNumbers: false,
    se: [
      { at: 'start', id: 'foxPushStrain' },
      { at: 'hit', id: 'hipBounce', gain: 0.75, gainEnd: 1.0 },
      { at: 'end', id: 'contestLose' }
    ],
    windup: [
      { at: 'start', id: 'telegraph', color: '$main', width: 14, life: 1.2 },
      { at: 'start', id: 'glyph', anchor: 'heroFeet', style: 'fox', color: '$main', sub: '$sub', r: 64, life: 1.2 }
    ],
    fx: [
      { at: 'start', id: 'glyph', anchor: 'heroFeet', style: 'fox', mark: 'heart', color: '$main', sub: '$sub', r: 104, life: 3.4, spin: 1.6 },
      { at: 'start', id: 'wash', color: '$main', alpha: 0.16, mode: 'full', life: 3.4, inSec: 0.5 },
      { at: 'hit', id: 'impact', size: 50, color: '$glow' },
      { at: 'hit', id: 'ring', anchor: 'heroFeet', r: 84, squash: 0.4, color: '$main', width: 6, alpha: 0.65, life: 0.4 },
      { at: 'hit', id: 'burst', anchor: 'hero', shape: 'heart', colors: ['$main', '$sub'], count: 5, speed: [80, 200], size: [5, 9], life: 0.6 },
      { at: 'hit', id: 'burst', anchor: 'heroFeet', shape: 'fluff', colors: ['#ffc2dc', '#ffe3f2'], count: 4, speed: [50, 130], size: [10, 16], life: 0.6, gravity: -20, angle: -Math.PI / 2, spread: Math.PI },
      { at: 'hit', id: 'shake', every: 2, power: 0.7 },
      { at: 'hit', id: 'speedLines', every: 4, color: '$main', count: 36, alpha: 0.4 },
      { at: 'end', id: 'flash', color: '$main', alpha: 0.3 },
      { at: 'end', id: 'callout', text: '極上プレス♡', color: '$main', size: 42, wobble: 0.1, life: 1.3 }
    ]
  }
};
