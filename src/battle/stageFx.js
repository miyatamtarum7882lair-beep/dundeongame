// File: src/battle/stageFx.js
// 技演出の部品。各関数は、BattleFx に渡す fx の配列を返す。
// c = {
//   hero: { body, head }, enemy: { body, head }   … ワールド座標 {x, y}
//   dir: { dx, dy }        主人公から見た敵の向き（-1〜1）
//   def, attr              skills.js の定義と、属性
//   index, count, progress ヒット番号・ヒット数・進み具合（0〜1）
//   hpLoss, mpLoss, expLost 直近のヒットの量（start は 0、end は合計）
//   opts                   台本のキュー（count / size / power / color / r など）
//   theme                  敵のテーマ色（enemyThemes.js）。色の '$main' などはこれで置き換える
// }
//
// 位置の指定（anchor / from / to）:
//   hero / heroHead / heroFeet / enemy / enemyHead / enemyFeet / mid（両者の間）
//   ox / oy で、さらにずらせる
import { resolveColor } from '../data/enemyThemes.js';

const parts = (c) => ({
  hb: c.hero.body,
  hh: c.hero.head,
  eb: c.enemy.body,
  eh: c.enemy.head
});

export const STAGE_FX = {
  // 台本が無い技の、従来の演出。useSkill の元の実装をそのまま移したもの
  legacy(c) {
    const { hb, hh, eb, eh } = parts(c);
    const { def, attr, dir } = c;
    const out = [];
    switch (def.fx) {
      case 'hit':
      case 'stomp':
        out.push({ type: 'impact', delay: 0.12, x: hb.x, y: hb.y, size: 30 });
        out.push({ type: 'sparks', delay: 0.12, x: hb.x, y: hb.y, color: '#ffb3d1', count: 8 });
        break;
      case 'kiss':
        out.push({
          type: 'stream', delay: 0.1,
          from: { x: eb.x, y: eh.y + 24 }, to: { x: hb.x, y: hb.y - 20 },
          count: 10, durSec: 0.45, arcPx: 50
        });
        out.push({ type: 'hearts', delay: 0.5, x: hb.x, y: hb.y - 30, count: 7, size: 0.9 });
        out.push({ type: 'tint', delay: 0.3 });
        break;
      case 'embrace':
        out.push({ type: 'hearts', delay: 0.15, x: hb.x, y: hb.y - 20, count: 9, size: 1 });
        out.push({ type: 'tint', delay: 0.2 });
        break;
      case 'blowKiss':
        out.push({
          type: 'heartProjectile', delay: 0.15,
          from: { x: eb.x, y: eh.y + 24 }, to: { x: hb.x, y: hh.y - 4 },
          durSec: 0.8, arcPx: 92, size: 1.15
        });
        out.push({
          type: 'stream', delay: 0.2,
          from: { x: eb.x, y: eh.y + 24 }, to: { x: hb.x, y: hb.y - 24 },
          count: 5, size: 0.38, durSec: 0.65, arcPx: 82
        });
        break;
      case 'breath':
        out.push({
          type: 'breath', delay: 0.15,
          from: { x: eb.x, y: eh.y + 28 }, to: { x: hb.x, y: hb.y - 20 }
        });
        out.push({ type: 'tint', delay: 0.35 });
        break;
      case 'pose':
        out.push({ type: 'ring', delay: 0.15, x: eb.x, y: eb.y, r: 50, color: '#ff9ccf' });
        out.push({ type: 'hearts', delay: 0.25, x: hb.x, y: hb.y - 24, count: 6, size: 1 });
        out.push({ type: 'tint', delay: 0.35 });
        break;
      default:
        break;
    }
    if (attr === 'mouth' && (c.hpLoss > 0 || c.mpLoss > 0 || def.category === 'bind' || def.fx === 'blowKiss')) {
      out.push({ type: 'kiss', delay: 0.28, x: hb.x, y: hh.y + 10, dx: dir.dx, dy: dir.dy });
    }
    return out;
  },

  // 主人公から敵へ、吸い取られていく流れ
  drainStream(c) {
    const { hb, eb, eh } = parts(c);
    return [{
      type: 'stream',
      from: { x: hb.x, y: hb.y - 22 },
      to: { x: eb.x, y: eh.y + 24 },
      count: c.opts.count ?? 6,
      size: c.opts.size ?? 0.5,
      durSec: c.opts.durSec ?? 0.45,
      arcPx: c.opts.arcPx ?? 40
    }];
  },

  // 敵から主人公へ飛んでくる流れ
  kissStream(c) {
    const { hb, eb, eh } = parts(c);
    return [{
      type: 'stream',
      from: { x: eb.x, y: eh.y + 24 },
      to: { x: hb.x, y: hb.y - 20 },
      count: c.opts.count ?? 8,
      size: c.opts.size ?? 0.55,
      durSec: c.opts.durSec ?? 0.45,
      arcPx: c.opts.arcPx ?? 50
    }];
  },

  hearts(c) {
    const pt = anchorPoint(c, c.opts.anchor ?? 'heroHead', { oy: -10, ...c.opts });
    return [{ type: 'hearts', ...pt, count: c.opts.count ?? 4, size: c.opts.size ?? 0.9, color: col(c, c.opts.color) }];
  },

  kissMark(c) {
    const { hb, hh } = parts(c);
    return [{ type: 'kiss', x: hb.x, y: hh.y + 10, dx: c.dir.dx, dy: c.dir.dy }];
  },

  impact(c) {
    const pt = anchorPoint(c, c.opts.anchor ?? 'hero', c.opts);
    return [{ type: 'impact', ...pt, size: c.opts.size ?? 30, color: col(c, c.opts.color) }];
  },

  sparks(c) {
    const pt = anchorPoint(c, c.opts.anchor ?? 'hero', c.opts);
    return [{ type: 'sparks', ...pt, color: col(c, c.opts.color ?? '#ffb3d1'), count: c.opts.count ?? 8 }];
  },

  ring(c) {
    const pt = anchorPoint(c, c.opts.anchor ?? 'hero', c.opts);
    return [{
      type: 'ring', ...pt, r: c.opts.r ?? 50, color: col(c, c.opts.color ?? '#ff9ccf'),
      width: c.opts.width, squash: c.opts.squash, alpha: c.opts.alpha, life: c.opts.life, glow: c.opts.glow, fill: c.opts.fill
    }];
  },

  enemyRing(c) {
    return STAGE_FX.ring({ ...c, opts: { ...c.opts, anchor: c.opts.anchor ?? 'enemy' } });
  },

  shake(c) {
    return [{ type: 'shake', power: c.opts.power ?? 0.5 }];
  },

  tint() {
    return [{ type: 'tint' }];
  },

  // ---- 汎用部品（キューの値をそのまま BattleFx へ渡す。色はテーマ参照を解決する）----
  burst(c) {
    return [{ ...fxOpts(c), type: 'burst', ...anchorPoint(c, c.opts.anchor ?? 'hero', c.opts) }];
  },
  swirl(c) {
    return [{ ...fxOpts(c), type: 'swirl', ...anchorPoint(c, c.opts.anchor ?? 'hero', c.opts) }];
  },
  glyph(c) {
    return [{ ...fxOpts(c), type: 'glyph', ...anchorPoint(c, c.opts.anchor ?? 'heroFeet', c.opts) }];
  },
  tileMark(c) {
    return [{ ...fxOpts(c), type: 'tileMark', ...anchorPoint(c, c.opts.anchor ?? 'heroFeet', c.opts) }];
  },
  callout(c) {
    const pt = anchorPoint(c, c.opts.anchor ?? 'heroHead', { oy: -18, ...c.opts });
    // texts: ヒットの番号ごとに文字を変える（カウントダウンなど）
    const text = c.opts.texts?.[Math.min(c.index, c.opts.texts.length - 1)] ?? c.opts.text;
    return [{ ...fxOpts(c), type: 'callout', ...pt, text }];
  },
  bubble(c) {
    const pt = anchorPoint(c, c.opts.anchor ?? 'enemyHead', { oy: -10, ...c.opts });
    return [{ ...fxOpts(c), type: 'bubble', ...pt }];
  },
  flow(c) {
    return [{
      ...fxOpts(c), type: 'flow',
      from: anchorPoint(c, c.opts.from ?? 'enemyHead', c.opts.fromOffset ?? { oy: 24 }),
      to: anchorPoint(c, c.opts.to ?? 'hero', c.opts.toOffset ?? { oy: -16 })
    }];
  },
  cloud(c) {
    return [{
      ...fxOpts(c), type: 'cloud',
      from: anchorPoint(c, c.opts.from ?? 'enemyHead', c.opts.fromOffset ?? { oy: 28 }),
      to: anchorPoint(c, c.opts.to ?? 'hero', c.opts.toOffset ?? { oy: -16 })
    }];
  },
  telegraph(c) {
    return [{
      ...fxOpts(c), type: 'telegraph',
      from: anchorPoint(c, c.opts.from ?? 'enemyFeet', c.opts.fromOffset),
      to: anchorPoint(c, c.opts.to ?? 'heroFeet', c.opts.toOffset)
    }];
  },
  wash(c) {
    return [{ ...fxOpts(c), type: 'wash' }];
  },
  speedLines(c) {
    const pt = anchorPoint(c, c.opts.anchor ?? 'hero', c.opts);
    return [{ ...fxOpts(c), type: 'speedLines', ...pt }];
  },
  flash(c) {
    return [{ ...fxOpts(c), type: 'flash' }];
  },
  // 敵から主人公の頭へ飛ぶ大きなハート（HeartFx）
  heartProjectileFx(c) {
    return [{
      type: 'heartProjectile',
      from: anchorPoint(c, c.opts.from ?? 'enemyHead', c.opts.fromOffset ?? { oy: 24 }),
      to: anchorPoint(c, c.opts.to ?? 'heroHead', c.opts.toOffset ?? { oy: -4 }),
      durSec: c.opts.durSec ?? 0.8, arcPx: c.opts.arcPx ?? 90, size: c.opts.size ?? 1.15
    }];
  },

  sparkle(c) {
    const pt = anchorPoint(c, c.opts.anchor ?? 'heroHead', c.opts);
    return [{ type: 'sparkle', ...pt, color: col(c, c.opts.color) }];
  },

  breath(c) {
    const { hb, eb, eh } = parts(c);
    return [{ type: 'breath', from: { x: eb.x, y: eh.y + 28 }, to: { x: hb.x, y: hb.y - 20 } }];
  },

  bindHeartWave(c) {
    const { hb, hh } = parts(c);
    return [{ type: 'bindHeartWave', x: hb.x, y: hh.y, color: col(c, c.opts.color) }];
  }
};

// ---- 位置と色 ----
export function anchorPoint(c, name, { ox = 0, oy = 0 } = {}) {
  const hb = c.hero.body;
  const eb = c.enemy.body;
  let pt;
  switch (name) {
    case 'heroHead': pt = { x: hb.x, y: c.hero.head.y }; break;
    case 'heroFeet': pt = { x: hb.x, y: hb.y + 42 }; break;
    case 'enemy': pt = { x: eb.x, y: eb.y }; break;
    case 'enemyHead': pt = { x: eb.x, y: c.enemy.head.y }; break;
    case 'enemyFeet': pt = { x: eb.x, y: eb.y + 42 }; break;
    case 'mid': pt = { x: (hb.x + eb.x) / 2, y: (hb.y + eb.y) / 2 }; break;
    default: pt = { x: hb.x, y: hb.y };
  }
  return { x: pt.x + ox, y: pt.y + oy };
}

const col = (c, v) => (c.theme ? resolveColor(v, c.theme) : v);

// キューから、位置・発火に関わるキーを除いた残り（色は解決済み）
const SKIP = new Set(['at', 'id', 'every', 'first', 'last', 'texts', 'from', 'to', 'anchor', 'ox', 'oy', 'fromOffset', 'toOffset', 'when', 'delay']);
function fxOpts(c) {
  const out = {};
  for (const [k, v] of Object.entries(c.opts)) {
    if (SKIP.has(k)) continue;
    out[k] = k === 'color' || k === 'colors' || k === 'sub' ? col(c, v) : v;
  }
  return out;
}
