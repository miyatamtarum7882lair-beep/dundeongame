// File: src/proto/motionPlayground.js
// 動きの確認用プロトタイプ。主人公・僧侶・kitten を画面に出して、モーションを動かす。
// ステップ1（グリッド移動）に入ったら、このファイルは削除してよい。
import { B } from '../data/balance.js';
import { SpriteActor } from '../ui/spriteActor.js';
import { loadSpriteSheet } from '../ui/spriteSheet.js';

const T = B.tile.size;
const HELP = [
  '■ 動きの確認',
  '矢印／WASD：主人公を動かす',
  'T：対象を切り替え（主人公→僧侶→kitten）',
  'F：対象の向きを回す',
  'J：攻撃　K：ガード　H：被弾',
  'M／N：対象の次／前のモーションを再生',
  'R：通常に戻す　P：絵を再読み込み',
  'V：この説明を隠す'
];
const FACING_NAMES = { down: '下', up: '上', left: '左', right: '右' };

export class MotionPlayground {
  constructor() {
    this.actors = [
      new SpriteActor({ id: 'hero', name: '主人公', x: 6 * T + T / 2, y: 7 * T, speed: 180, color: '#4da3ff' }),
      new SpriteActor({ id: 'priest', name: '僧侶', x: 5 * T, y: 7 * T + 20, speed: 170, color: '#f4f0ff' }),
      new SpriteActor({ id: 'kitten', name: 'kitten', x: 13 * T, y: 6 * T, speed: 70, color: '#ff7bb5' })
    ];
    this.targetIndex = 0;
    this.showHelp = true;
    this.notice = null;   // { text, left }
    this.bounds = {
      left: 48,
      right: B.render.logicalWidth - 48,
      top: 140,
      bottom: B.render.logicalHeight - 24
    };
    // 読み込みが終わったら、読めていないキャラを画面の上に出す
    Promise.all(this.actors.map((a) => loadSpriteSheet(a.id))).then((results) => {
      const missing = this.actors.filter((_, i) => !results[i]).map((a) => a.name);
      if (missing.length) {
        this.say(`絵が読めていません: ${missing.join('、')}（F12 のコンソールに理由が出ます）`);
      }
    });
  }

  get target() {
    return this.actors[this.targetIndex];
  }

  say(text) {
    this.notice = { text, left: 3 };
  }

  // 押された瞬間のキーコードを渡す
  onKey(code) {
    const t = this.target;
    switch (code) {
      case 'KeyT':
        this.targetIndex = (this.targetIndex + 1) % this.actors.length;
        break;
      case 'KeyF':
        t.turn();
        break;
      case 'KeyJ':
        t.playAttack();
        break;
      case 'KeyK':
        t.play('guard');
        break;
      case 'KeyH':
        t.play('hit');
        break;
      case 'KeyM':
        this.cycle(1);
        break;
      case 'KeyN':
        this.cycle(-1);
        break;
      case 'KeyR':
        t.action = null;
        break;
      case 'KeyP':
        this.reload();
        break;
      case 'KeyV':
        this.showHelp = !this.showHelp;
        break;
      default:
        break;
    }
  }

  // シートに入っているモーションを、順番に再生する
  cycle(step) {
    const t = this.target;
    const sheet = t.sheet;
    if (!sheet) {
      this.say(`${t.name} のシートがありません（npm run sprite -- build ${t.id}）`);
      return;
    }
    const tags = Object.keys(sheet.meta.tags);
    let i = t.previewIndex;
    if (i < 0) i = step > 0 ? -1 : 0;
    i = (i + step + tags.length) % tags.length;
    t.previewIndex = i;
    t.play(tags[i]);
  }

  async reload() {
    this.say('絵を再読み込みしています…');
    const results = await Promise.all(this.actors.map((a) => loadSpriteSheet(a.id, { force: true })));
    const found = this.actors.filter((_, i) => results[i]).map((a) => a.name);
    this.say(found.length ? `読み込めた絵: ${found.join('、')}` : 'assets/sprites/ に絵がありません');
  }

  // dt は共通タイマーの値（ポーズ中は 0）
  update(dt, input) {
    const [hero, priest, kitten] = this.actors;

    const dx = Number(input.isDown('right')) - Number(input.isDown('left'));
    const dy = Number(input.isDown('down')) - Number(input.isDown('up'));
    if (hero.busy) {
      hero.moving = false;
    } else {
      hero.step(dx, dy, dt, this.bounds);
      if (hero.moving) hero.action = null;   // 繰り返し再生の確認中に動くと、通常に戻る
    }

    this.follow(priest, hero, dt);
    this.wander(kitten, dt);
    for (const a of this.actors) a.update(dt);

    if (this.notice) {
      this.notice.left -= dt;
      if (this.notice.left <= 0) this.notice = null;
    }
  }

  // 主人公についていく。96px より離れたら歩き出し、64px まで近づいたら止まる
  follow(actor, leader, dt) {
    if (actor.action) {
      actor.moving = false;
      return;
    }
    const dx = leader.x - actor.x;
    const dy = leader.y - actor.y;
    const dist = Math.hypot(dx, dy);
    actor.ai.following = actor.ai.following ? dist > 64 : dist > 96;
    if (actor.ai.following) actor.step(dx, dy, dt, this.bounds);
    else actor.moving = false;
  }

  // 右側の広場を、目的地を変えながらうろうろする
  wander(actor, dt) {
    const ai = actor.ai;
    if (actor.action) {
      actor.moving = false;
      return;
    }
    if (ai.goal) {
      const dx = ai.goal.x - actor.x;
      const dy = ai.goal.y - actor.y;
      if (Math.hypot(dx, dy) < 3) {
        ai.goal = null;
        ai.wait = 1 + Math.random() * 2;
        actor.moving = false;
      } else {
        actor.step(dx, dy, dt, this.bounds);
      }
      return;
    }
    ai.wait = (ai.wait ?? 0) - dt;
    actor.moving = false;
    if (ai.wait <= 0) {
      ai.goal = {
        x: 8 * T + Math.random() * 10 * T,
        y: 4 * T + Math.random() * 5 * T
      };
    }
  }

  draw(gPixel, gHires) {
    const order = [...this.actors].sort((a, b) => a.y - b.y);   // 奥から手前へ
    for (const a of order) a.draw(gPixel);
    for (const a of order) a.drawLabel(gHires, a === this.target);
    this.drawTexts(gHires);
  }

  drawTexts(g) {
    const lw = B.render.logicalWidth;
    g.save();
    g.font = `14px ${B.ui.fontFamily}`;
    g.textBaseline = 'top';
    g.lineJoin = 'round';
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(0, 0, 0, 0.85)';

    if (this.showHelp) {
      const t = this.target;
      const lines = [...HELP, '', `対象: ${t.name}（向き ${FACING_NAMES[t.facing]}）`];
      g.textAlign = 'right';
      g.fillStyle = '#cfe8ff';
      lines.forEach((text, i) => {
        g.strokeText(text, lw - 12, 12 + i * 20);
        g.fillText(text, lw - 12, 12 + i * 20);
      });
    }

    if (this.notice) {
      g.textAlign = 'center';
      g.fillStyle = '#ffe66b';
      g.strokeText(this.notice.text, lw / 2, 12);
      g.fillText(this.notice.text, lw / 2, 12);
    }
    g.restore();
  }
}