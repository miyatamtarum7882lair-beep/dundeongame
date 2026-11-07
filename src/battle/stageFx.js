// File: src/battle/stageFx.js
// 技演出の部品。各関数は、BattleFx に渡す fx の配列を返す。
// c = {
//   hero: { body, head }, enemy: { body, head }   … ワールド座標 {x, y}
//   dir: { dx, dy }        主人公から見た敵の向き（-1〜1）
//   def, attr              skills.js の定義と、属性
//   index, count, progress ヒット番号・ヒット数・進み具合（0〜1）
//   hpLoss, mpLoss, expLost 直近のヒットの量（start は 0、end は合計）
//   opts                   台本のキュー（count / size / power / color / r など）
// }
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
    const { hb, hh } = parts(c);
    return [{ type: 'hearts', x: hb.x, y: hh.y - 10, count: c.opts.count ?? 4, size: c.opts.size ?? 0.9 }];
  },

  kissMark(c) {
    const { hb, hh } = parts(c);
    return [{ type: 'kiss', x: hb.x, y: hh.y + 10, dx: c.dir.dx, dy: c.dir.dy }];
  },

  impact(c) {
    const { hb } = parts(c);
    return [{ type: 'impact', x: hb.x, y: hb.y, size: c.opts.size ?? 30 }];
  },

  sparks(c) {
    const { hb } = parts(c);
    return [{ type: 'sparks', x: hb.x, y: hb.y, color: c.opts.color ?? '#ffb3d1', count: c.opts.count ?? 8 }];
  },

  // 注意: BattleFx の ring は color を読まない（既知の不具合）。直すまでは色が反映されない
  ring(c) {
    const { hb } = parts(c);
    return [{ type: 'ring', x: hb.x, y: hb.y, r: c.opts.r ?? 50, color: c.opts.color ?? '#ff9ccf' }];
  },

  enemyRing(c) {
    const { eb } = parts(c);
    return [{ type: 'ring', x: eb.x, y: eb.y, r: c.opts.r ?? 50, color: c.opts.color ?? '#ff9ccf' }];
  },

  shake(c) {
    return [{ type: 'shake', power: c.opts.power ?? 0.5 }];
  },

  tint() {
    return [{ type: 'tint' }];
  },

  sparkle(c) {
    const { hb, hh } = parts(c);
    return [{ type: 'sparkle', x: hb.x, y: hh.y, color: c.opts.color }];
  },

  breath(c) {
    const { hb, eb, eh } = parts(c);
    return [{ type: 'breath', from: { x: eb.x, y: eh.y + 28 }, to: { x: hb.x, y: hb.y - 20 } }];
  },

  bindHeartWave(c) {
    const { hb, hh } = parts(c);
    return [{ type: 'bindHeartWave', x: hb.x, y: hh.y, color: c.opts.color }];
  }
};