import { durationFor } from '../core/flashbackMath.js';

/** Contact penalties are once per enemy; skill flashbacks are once per skill per floor. */
export function flashbackKey(kind, enemyId, skillId) {
  if (kind === 'touch') return `touch:${enemyId}`;
  return `skill:${skillId ?? enemyId}`;
}

export class FlashbackController {
  constructor({ cfg, getMode, getFloorKey, emit, isBlocked = () => false }) {
    this.cfg = cfg;
    this.getMode = getMode;
    this.getFloorKey = getFloorKey;
    this.emit = emit;
    this.isBlocked = isBlocked;
    this.used = new Set();
    this.floorKey = null;
    this.sinceLast = Infinity;
    this.erectTurns = 0;
    this.maxErectTurns = 0;
  }

  request({ kind, enemyId, speciesId = enemyId, attr, skillId = null, tx, ty }) {
    if (this.isBlocked()) return false;
    this.syncFloor();
    const key = flashbackKey(kind, enemyId, skillId);
    if (this.used.has(key) || this.sinceLast < this.cfg.minGapSec) return false;

    this.used.add(key);
    this.sinceLast = 0;
    const mode = this.getMode() ?? 'full';
    const erectTurns = kind === 'bind' ? 0 : this.cfg.erectTurns;
    if (erectTurns > 0) {
      this.erectTurns = Math.max(this.erectTurns, erectTurns);
      this.maxErectTurns = erectTurns;
    }
    this.emit('flashbackStart', {
      kind,
      enemyId,
      speciesId,
      attr,
      skillId,
      tx,
      ty,
      mode,
      durationSec: durationFor(kind, mode, this.cfg),
      erectTurns
    });
    return true;
  }

  syncFloor() {
    const key = this.getFloorKey();
    if (key === this.floorKey) return;
    this.floorKey = key;
    this.used.clear();
  }

  update(dtSec) {
    const dt = Math.max(0, dtSec);
    if (this.sinceLast < Infinity) this.sinceLast += dt;
  }

  onHeroTurn() {
    if (this.erectTurns > 0) this.erectTurns -= 1;
  }

  isErect() {
    return this.erectTurns > 0;
  }

  erectTurnsLeft() {
    return this.erectTurns;
  }

  erectTotalTurns() {
    return this.maxErectTurns;
  }

  /** Stop the current visual and erection without clearing this floor's usage. */
  cancel() {
    this.erectTurns = 0;
    this.emit('flashbackCancel', {});
  }

  /** Reset after defeat/run reset. */
  reset() {
    this.used.clear();
    this.floorKey = null;
    this.sinceLast = Infinity;
    this.cancel();
  }
}
