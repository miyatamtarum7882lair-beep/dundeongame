// File: src/battle/flashback.js
import { B } from '../data/balance.js';

/**
 * kind: 'touch'（拳の接触ペナルティ）| 'strong'（強力な技）| 'rematch'（敗北技の再遭遇）| 'bind'（拘束開始）
 * - 余韻中・絶頂中は発生しない。
 * - 勃起状態（行動が遅くなる）は 'bind' 以外で付与する。
 * - 'strong' / 'rematch' は同じ技・同じ敵で1フロアに1回まで。
 * - 表示の full / reduced / off は mode としてイベントに載せる。off でも勃起状態は付与する。
 */
export class FlashbackController {
  /**
   * @param {object} deps
   * @param {() => ('full'|'reduced'|'off')} deps.getMode
   * @param {(name: string, payload?: object) => void} deps.emit
   * @param {() => boolean} [deps.isBlocked] 余韻中・絶頂中など
   */
  constructor({ getMode, emit, isBlocked = () => false }) {
    this.getMode = getMode;
    this.emit = emit;
    this.isBlocked = isBlocked;
    this.time = 0;
    this.activeUntil = -Infinity;
    this.lastFiredAt = -Infinity;
    this.erectUntil = -Infinity;
    this.once = new Set();
    this.wasActive = false;
    this.wasErect = false;
  }

  isActive() {
    return this.time < this.activeUntil;
  }

  isErect() {
    return this.time < this.erectUntil;
  }

  erectLeftSec() {
    return Math.max(0, this.erectUntil - this.time);
  }

  /** 勃起状態中の、行動確定後の入力ロック秒数。 */
  actionDelaySec() {
    return this.isErect() ? B.flashback.erectActionDelaySec : 0;
  }

  /** @param {{kind: string, enemyId: string, attr?: string, skillId?: string|null, tx?: number, ty?: number}} req */
  request(req) {
    const c = B.flashback;
    if (this.isBlocked()) return { fired: false, reason: 'blocked' };
    if (this.isActive()) return { fired: false, reason: 'active' };
    if (this.time - this.lastFiredAt < c.minIntervalSec) {
      return { fired: false, reason: 'cooldown' };
    }
    if (req.kind === 'strong' || req.kind === 'rematch') {
      const key = `${req.kind}:${req.enemyId}:${req.skillId ?? ''}`;
      if (this.once.has(key)) return { fired: false, reason: 'once' };
      this.once.add(key);
    }

    const mode = this.getMode();
    const erect = req.kind !== 'bind';
    this.lastFiredAt = this.time;
    this.activeUntil = this.time + c.durSec;
    this.wasActive = true;
    if (erect) {
      this.erectUntil = this.time + c.erectSec;
      this.wasErect = true;
    }
    this.emit('flashbackStart', { ...req, mode, durSec: c.durSec, erect });
    if (erect) this.emit('statusChanged', {});
    return { fired: true, erect, mode };
  }

  update(dt) {
    this.time += dt;
    if (this.wasActive && !this.isActive()) {
      this.wasActive = false;
      this.emit('flashbackEnd', {});
    }
    if (this.wasErect && !this.isErect()) {
      this.wasErect = false;
      this.emit('statusChanged', {});
    }
  }

  /** 絶頂開始などで映像を打ち切る。勃起状態は残す。 */
  cancel() {
    if (this.wasActive) {
      this.activeUntil = -Infinity;
      this.wasActive = false;
      this.emit('flashbackEnd', {});
    }
  }

  resetFloor() {
    this.once.clear();
    this.cancel();
    this.erectUntil = -Infinity;
    this.wasErect = false;
  }
}