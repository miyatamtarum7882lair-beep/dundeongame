// File: src/battle/climaxController.js
import { B } from '../data/balance.js';

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

/** countBefore = これまでの絶頂回数（今回を含まない）。 */
export function climaxDurationSec(countBefore) {
  const c = B.climax;
  return Math.min(c.maxSec, c.drainSec + c.extendPerClimaxSec * Math.max(0, countBefore));
}

export function afterglowTurnsFor(countBefore) {
  const c = B.climax;
  return Math.max(
    c.afterglowMinTurns,
    c.afterglowTurns - c.afterglowReducePerClimax * Math.max(0, countBefore)
  );
}

/** 絶頂中の毎秒ドレイン倍率。拘束者が増えるほど大きくなる。 */
export function climaxDrainMult(progress, binderCount = 1) {
  const c = B.climax;
  const base = c.drainMultStart + (c.drainMultEnd - c.drainMultStart) * clamp01(progress);
  return base * (1 + c.extraBinderDrainMult * Math.max(0, binderCount - 1));
}

export function climaxStartHpLoss(maxHp) {
  return Math.max(1, Math.round(maxHp * B.climax.startHpLossRate));
}

export class ClimaxController {
  /**
   * @param {object} deps
   * @param {() => number} deps.getCount
   * @param {(n: number) => void} deps.setCount
   * @param {(name: string, payload?: object) => void} deps.emit
   * @param {(reason: string) => void} deps.releaseBinders 全拘束者を解除する既存処理
   * @param {() => void} deps.restoreMp
   * @param {(info: object) => void} deps.onSecond 絶頂中の毎秒ドレイン処理
   * @param {() => number} deps.getHp
   * @param {() => number} deps.getMaxHp
   * @param {(n: number) => void} deps.loseHp HP を n 減らす（0 未満にしない）
   * @param {() => void} deps.onDefeat 敗北処理
   * @param {() => number} [deps.getBinderCount]
   */
  constructor({
    getCount,
    setCount,
    emit,
    releaseBinders,
    restoreMp,
    onSecond,
    getHp,
    getMaxHp,
    loseHp,
    onDefeat,
    getBinderCount = () => 1,
  }) {
    this.getCount = getCount;
    this.setCount = setCount;
    this.emit = emit;
    this.releaseBinders = releaseBinders;
    this.restoreMp = restoreMp;
    this.onSecond = onSecond;
    this.getHp = getHp;
    this.getMaxHp = getMaxHp;
    this.loseHp = loseHp;
    this.onDefeat = onDefeat;
    this.getBinderCount = getBinderCount;
    this.phase = 'none'; // 'none' | 'climax'
    this.elapsed = 0;
    this.duration = 0;
    this.extended = 0;
    this.secondsDone = 0;
    this.afterglowLeft = 0;
  }

  isClimax() {
    return this.phase === 'climax';
  }

  isAfterglow() {
    return this.afterglowLeft > 0;
  }

  /** 絶頂中は脱出入力を受け付けない。 */
  escapeLocked() {
    return this.phase === 'climax';
  }

  /** 余韻中は状態異常・フラッシュバックを受けない。 */
  isStatusImmune() {
    return this.afterglowLeft > 0;
  }

  /** 余韻中は拘束攻撃を自動防御する（拘束のハメ防止）。 */
  blocksBinding() {
    return this.afterglowLeft > 0;
  }

  /** 絶頂中・余韻中はHPの自然回復を止める。 */
  hpRegenScale() {
    return this.phase === 'climax' || this.afterglowLeft > 0 ? 0 : 1;
  }

  /** MP/EXPドレインの倍率。絶頂中は専用倍率を使うため1。 */
  drainScale() {
    if (this.phase === 'climax') return 1;
    return this.afterglowLeft > 0 ? B.climax.afterglowDrainRate : 1;
  }

  /** 拘束中の boundTick 間隔（秒）。 */
  boundTickSec() {
    return this.phase === 'climax' ? B.climax.tickSec : B.bound.tickSec;
  }

  /**
   * 拘束中かつMP0のときだけ開始する。MPが減った直後に毎回呼ぶ。
   * 開始時に最大HPの固定割合を失い、HPが足りなければ敗北する。
   */
  tryStart({ bound, mp }) {
    if (this.phase !== 'none') return false;
    if (!bound || mp > 0) return false;
    const before = this.getCount();
    this.duration = climaxDurationSec(before);
    this.elapsed = 0;
    this.secondsDone = 0;
    this.extended = 0;
    this.phase = 'climax';

    const hpLoss = climaxStartHpLoss(this.getMaxHp());
    const dead = this.getHp() <= hpLoss;
    this.emit('climaxStart', { durationSec: this.duration, count: before + 1, hpLoss });
    this.loseHp(hpLoss);
    if (dead) {
      this.abort();
      this.onDefeat();
    }
    return true;
  }

  /**
   * 絶頂中に拘束者が増えたときの延長。
   * 絶頂中でなければ 0 を返して何もしない（finish() 通過後の拘束は通常の新規拘束）。
   * @returns {number} 実際に延長した秒数
   */
  extend(sec = B.climax.extendPerBinderSec) {
    if (this.phase !== 'climax') return 0;
    const room = Math.max(0, B.climax.extendMaxPerClimaxSec - this.extended);
    const add = Math.min(sec, room);
    if (add <= 0) return 0;
    this.duration += add;
    this.extended += add;
    this.emit('climaxExtend', {
      addSec: add,
      durationSec: this.duration,
      remainingSec: this.duration - this.elapsed,
    });
    return add;
  }

  /** 拘束中のリアルタイム更新。dt は秒。敵の拘束判定（tick）を先に処理してから呼ぶこと。 */
  update(dt) {
    if (this.phase !== 'climax') return;
    this.elapsed = Math.min(this.duration, this.elapsed + dt);
    const target = Math.floor(this.elapsed + 1e-9);
    while (this.secondsDone < target) {
      this.secondsDone += 1;
      const progress = clamp01(this.secondsDone / this.duration);
      const binderCount = this.getBinderCount();
      this.onSecond({
        second: this.secondsDone,
        progress,
        binderCount,
        drainMult: climaxDrainMult(progress, binderCount),
        remainingSec: this.duration - this.secondsDone,
      });
      if (this.phase !== 'climax') return; // onSecond 内で abort された
    }
    // onSecond 内で extend() された場合は duration が伸びているため、ここで再判定される
    if (this.elapsed >= this.duration) this.finish();
  }

  finish() {
    const before = this.getCount();
    const turns = afterglowTurnsFor(before);
    this.phase = 'none';
    this.setCount(before + 1);
    this.afterglowLeft = turns;
    this.releaseBinders('climax');
    this.restoreMp();
    this.emit('climaxEnd', {
      count: before + 1,
      durationSec: this.duration,
      afterglowTurns: turns,
    });
    this.emit('afterglowStart', { turns });
    this.emit('persist');
  }

  /** 敗北など、通常終了以外で絶頂を打ち切る。解除・MP回復・余韻は発生しない。 */
  abort() {
    this.phase = 'none';
    this.elapsed = 0;
    this.secondsDone = 0;
    this.extended = 0;
  }

  /** 主人公の行動1回（TURNモード）ごとに呼ぶ。boundTick では呼ばない。 */
  onHeroTurnEnd() {
    if (this.afterglowLeft <= 0) return;
    this.afterglowLeft -= 1;
    if (this.afterglowLeft > 0) {
      this.emit('afterglowTurn', { left: this.afterglowLeft });
    } else {
      this.emit('afterglowEnd', {});
    }
    this.emit('persist');
  }

  serialize() {
    return { afterglowTurns: this.afterglowLeft };
  }

  restore({ afterglowTurns = 0 } = {}) {
    this.afterglowLeft = Math.max(0, Math.floor(afterglowTurns));
  }

  /** resetRun() 時。絶頂回数は currentRun 側のリセットに任せる。 */
  reset() {
    this.abort();
    this.afterglowLeft = 0;
  }
}