// File: src/dungeon/unit.js （全体を置き換え）
// マスの上にいるキャラ（主人公・仲間・敵）。見た目のアニメは ui/dungeonView.js が受け持つ。
import { lerp } from '../core/util.js';

export class Unit {
  constructor({ id, kind, speciesId, name, spriteId, color, tx, ty, level = 1, maxHp = 0, advancedSkill = null }) {
    this.id = id;
    this.kind = kind;            // 'hero' | 'ally' | 'enemy'
    this.speciesId = speciesId;
    this.name = name;
    this.spriteId = spriteId;
    this.color = color;          // シートが無いときの仮の色
    this.tx = tx;                // いるマス
    this.ty = ty;
    this.fromX = tx;             // 今のターンの開始位置（移動の見た目に使う）
    this.fromY = ty;
    this.dir = { dx: 0, dy: 1 };
    this.walkLinger = 0;         // 歩きのアニメを続ける残り時間
    this.level = level;
    this.maxHp = maxHp;          // 敵のHP。主人公・仲間は save 側の値を使う
    this.hp = maxHp;
    this.advancedSkill = advancedSkill;
    this.advancedSkillUnlocked = false;
    this.drainExp = 0;
    this.exp = 0;
    this.pendingSkill = null;
    this.bindImmune = false;
    this.cooldown = 0;           // 仲間の技の再使用までのターン数
    this.choiceCooldown = 0;     // 敵: 次に選択肢を出せるまでのターン数
    this.stunTurns = 0;          // 敵: ひるんで動けないターン数（力比べで押し返されたなど）
    this.comboNext = null;       // 敵: 次の行動で優先する連携技
    this.encountered = false;    // 敵: 図鑑に登録済みか
  }

  setDir(dx, dy) {
    if (dx || dy) this.dir = { dx: Math.sign(dx), dy: Math.sign(dy) };
  }

  beginTurn() {
    this.fromX = this.tx;
    this.fromY = this.ty;
  }

  moveTo(x, y) {
    this.setDir(x - this.tx, y - this.ty);
    this.tx = x;
    this.ty = y;
    this.walkLinger = 0.1;
  }

  // p: 0〜1。移動の途中の位置（マス座標、小数）
  renderTile(p) {
    return { x: lerp(this.fromX, this.tx, p), y: lerp(this.fromY, this.ty, p) };
  }
}