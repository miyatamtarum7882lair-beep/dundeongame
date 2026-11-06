// File: src/ui/spriteActor.js
// スプライトシートで動くキャラ1体。向き・歩き・1回再生のモーションを管理する。
import { B } from '../data/balance.js';
import { clamp } from '../core/util.js';
import { getSpriteSheet, pickFrame, pickFrameOnce, drawFrame } from './spriteSheet.js';

const HOLD_SEC = 0.25;      // 1回再生のモーションが、最後のコマで止まっている時間
const MISSING_SEC = 0.45;   // 絵が未作成のモーションを、仮の動きで見せる時間
const ATTACK_MISSING_SEC = 0.28;
const SIDE_TAGS = /_side$|^flee$/;   // 右向きで描いてあり、左向きでは反転するモーション
const FACINGS = ['down', 'left', 'up', 'right'];
const SLASH_DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export class SpriteActor {
  constructor({ id, name, x, y, speed, color }) {
    this.id = id;
    this.name = name;
    this.x = x;                // 足元の中心（論理座標）
    this.y = y;
    this.speed = speed;        // 1秒あたりの移動量（px）
    this.color = color;        // シートが無いときの仮の色
    this.facing = 'down';      // 'down' | 'up' | 'left' | 'right'
    this.moving = false;
    this.time = 0;
    this.walkTime = 0;
    this.action = null;        // { tag, elapsed, loop, missing, duration }
    this.previewIndex = -1;    // M / N で再生しているモーションの位置
    this.ai = {};              // 僧侶・kitten の動き用
  }

  get sheet() {
    return getSpriteSheet(this.id);
  }

  // 1回再生のモーション中は、動けない
  get busy() {
    return Boolean(this.action && !this.action.loop);
  }

  turn() {
    this.facing = FACINGS[(FACINGS.indexOf(this.facing) + 1) % FACINGS.length];
  }

  face(dx, dy) {
    if (dx === 0 && dy === 0) return;
    if (Math.abs(dx) >= Math.abs(dy)) this.facing = dx < 0 ? 'left' : 'right';
    else this.facing = dy < 0 ? 'up' : 'down';
  }

  // (dirX, dirY) の向きへ1フレーム進む。0,0 なら止まる
  step(dirX, dirY, dt, bounds) {
    const len = Math.hypot(dirX, dirY);
    this.moving = len > 0;
    if (!this.moving) return;
    this.x = clamp(this.x + (dirX / len) * this.speed * dt, bounds.left, bounds.right);
    this.y = clamp(this.y + (dirY / len) * this.speed * dt, bounds.top, bounds.bottom);
    this.face(dirX, dirY);
  }

  // シートのタグ名でモーションを再生する。無いタグは仮の動きで見せる
  play(tag, { once = false } = {}) {
    const range = this.sheet?.meta.tags[tag];
    const count = range ? range.to - range.from + 1 : 0;
    this.action = {
      tag,
      elapsed: 0,
      loop: !once && Boolean(range?.loop),
      missing: !range,
      duration: range
        ? count / (range.fps ?? 8) + HOLD_SEC
        : tag.startsWith('attack') ? ATTACK_MISSING_SEC : MISSING_SEC
    };
  }

  playAttack() {
    const side = this.facing === 'left' || this.facing === 'right';
    this.play(side ? 'attack_side' : this.facing === 'down' ? 'attack_down' : 'attack_up');
  }

  update(dt) {
    this.time += dt;
    this.walkTime = this.moving ? this.walkTime + dt : 0;
    const a = this.action;
    if (!a) return;
    a.elapsed += dt;
    if (!a.loop && a.elapsed >= a.duration) this.action = null;
  }

  // 止まっているときのコマ。向きに応じて、歩きの立ち姿のコマを使う
  standingFrame(sheet) {
    const tags = sheet.meta.tags;
    if (this.facing === 'up' && tags.walk_up) return tags.walk_up.from;
    if ((this.facing === 'left' || this.facing === 'right') && tags.walk_side) return tags.walk_side.from;
    return pickFrame(sheet, 'idle', this.time);
  }

  currentTag() {
    if (!this.sheet) return 'シートなし';
    const a = this.action;
    if (a) return a.missing ? `${a.tag}（未作成）` : a.tag;
    if (!this.moving) return 'idle';
    if (this.facing === 'up') return 'walk_up';
    return this.facing === 'down' ? 'walk_down' : 'walk_side';
  }

  // ドット層（gPixel）に描く
  draw(g) {
    const fx = Math.round(this.x);
    const fy = Math.round(this.y);

    g.save();
    g.fillStyle = 'rgba(0, 0, 0, 0.3)';
    g.beginPath();
    g.ellipse(fx, fy - 2, 18, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();

    const sheet = this.sheet;
    if (!sheet) {
      g.fillStyle = this.color;
      g.fillRect(fx - B.tile.anchorX, fy - B.tile.anchorY, B.tile.spriteW, B.tile.spriteH);
      g.fillStyle = '#ffffff';
      g.fillRect(fx - 2, fy - 2, 4, 4);
      return;
    }

    const a = this.action;
    const faceFlip = this.facing === 'left';
    let frame;
    let flip = faceFlip;
    let offX = 0;
    let offY = 0;

    if (a && !a.missing) {
      frame = a.loop ? pickFrame(sheet, a.tag, a.elapsed) : pickFrameOnce(sheet, a.tag, a.elapsed);
      flip = SIDE_TAGS.test(a.tag) && faceFlip;
    } else if (a) {
      // 未作成のモーションの仮の動き。被弾は横に揺れ、攻撃・技・拘束は前へ踏み込む
      frame = this.standingFrame(sheet);
      const p = Math.min(1, a.elapsed / a.duration);
      if (a.tag === 'hit') {
        offX = Math.round(Math.sin(a.elapsed * 70) * 3 * (1 - p));
      } else if (/^(attack|skill|bind)/.test(a.tag)) {
        const [dx, dy] = SLASH_DIR[this.facing];
        const k = Math.sin(p * Math.PI) * 10;
        offX = Math.round(dx * k);
        offY = Math.round(dy * k);
      } else {
        offY = -Math.round(Math.sin(p * Math.PI) * 8);
      }
    } else if (this.moving) {
      const side = this.facing === 'left' || this.facing === 'right';
      const tag = side ? 'walk_side' : this.facing === 'up' ? 'walk_up' : 'walk_down';
      frame = pickFrame(sheet, tag, this.walkTime);
    } else {
      frame = this.standingFrame(sheet);
    }

    drawFrame(g, sheet, frame, fx + offX, fy + offY, { flip });
  }

  // 高解像度層（gHires）に描く。名前と、いま再生中のモーション名
  drawLabel(g, selected) {
    const x = Math.round(this.x);
    const top = Math.round(this.y) - B.tile.spriteH - 10;
    g.save();
    g.font = `13px ${B.ui.fontFamily}`;
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.lineJoin = 'round';
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    g.fillStyle = selected ? '#ffe66b' : '#ffffff';
    const text = `${this.name}｜${this.currentTag()}`;
    g.strokeText(text, x, top);
    g.fillText(text, x, top);
    if (selected) {
      g.strokeText('▼', x, top - 16);
      g.fillText('▼', x, top - 16);
    }
    g.restore();
  }
}