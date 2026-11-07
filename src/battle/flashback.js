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
    this.erectTurns = 0;
    this.once = new Set();
    this.wasActive = false;
    this.wasErect = false;
  }

  isActive() {
    return this.time < this.activeUntil;
  }

  isErect() {
    return this.erectTurns > 0;
  }

  erectTurnsLeft() {
    return this.erectTurns;
  }

  /** 1回の主人公行動ごとに残りターンを減らす。 */
  onHeroTurn() {
    if (this.erectTurns <= 0) return;
    this.erectTurns -= 1;
    if (this.erectTurns === 0) {
      this.wasErect = false;
      this.emit('statusChanged', {});
    } else {
      this.emit('statusChanged', {});
    }
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
      this.erectTurns = c.erectTurns;
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
    this.erectTurns = 0;
    this.wasErect = false;
  }
}
