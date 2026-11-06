// File: src/core/eventState.js
// 大イベントの排他管理（9.2）。時間モード（TURN / BOUND / DECISION）とは別の変数。
import { Emitter } from './util.js';

// 数字が大きいほど優先。DEFEAT > HERO_CLIMAX > BEGGING > ALLY_SEDUCTION > CHARM_EVENT > NONE
const PRIORITY = {
  NONE: 0,
  CHARM_EVENT: 1,
  ALLY_SEDUCTION: 2,
  BEGGING: 3,
  HERO_CLIMAX: 4,
  DEFEAT: 5
};
const BIG_EVENTS = new Set(['CHARM_EVENT', 'ALLY_SEDUCTION', 'BEGGING']);

export class EventState extends Emitter {
  constructor(B) {
    super();
    this.watchdogSec = B.watchdog.eventLockSec;
    this.state = 'NONE';
    this.ownerId = null;
    this.acquiredAt = 0;
    this.pendingClimax = false;   // 大イベント中にMPが0になった。終了後に HERO_CLIMAX へ移る
    this.history = [];            // デバッグ用。直近20件
  }

  // DEFEAT は、ほかのすべてを凍結する
  get isFrozen() {
    return this.state === 'DEFEAT';
  }

  // 軽量手口（取引・香・人質交渉など）は、NONE のときだけ発動できる。ロックは取らない
  canStartLight() {
    return this.state === 'NONE';
  }

  // 大イベント中や、その終了待ちのときは、主人公のMPの下限を1にする
  mpFloor() {
    return BIG_EVENTS.has(this.state) || this.pendingClimax ? 1 : 0;
  }

  // 戻り値: 状態に入れたら true
  request(next, ownerId, nowSec) {
    if (!(next in PRIORITY) || next === 'NONE') {
      throw new Error(`request に渡せない状態です: ${next}`);
    }

    if (next === 'DEFEAT') {
      this.pendingClimax = false;
      this.enter('DEFEAT', ownerId, nowSec);
      return true;
    }
    if (this.state === 'DEFEAT') return false;

    if (next === 'HERO_CLIMAX') {
      if (this.state === 'HERO_CLIMAX') return true;
      if (this.state === 'NONE') {
        this.enter('HERO_CLIMAX', ownerId, nowSec);
        return true;
      }
      this.pendingClimax = true;   // 大イベントの終了後に移る
      return false;
    }

    // 大イベントどうしは排他
    if (this.state !== 'NONE') return false;
    this.enter(next, ownerId, nowSec);
    return true;
  }

  // ownerId が違うと解除できない（force で強制）
  release(ownerId, nowSec, force = false) {
    if (this.state === 'NONE') return false;
    if (!force && ownerId !== this.ownerId) return false;

    const prev = this.state;
    this.enter('NONE', null, nowSec);
    this.emit('release', prev);

    if (this.pendingClimax && prev !== 'DEFEAT') {
      this.pendingClimax = false;
      this.enter('HERO_CLIMAX', 'climax', nowSec);
    }
    return true;
  }

  // 毎フレーム呼ぶ。ロックが長すぎるときは強制解除する（ウォッチドッグ）
  update(nowSec) {
    if (this.state === 'NONE') return;
    if (nowSec - this.acquiredAt <= this.watchdogSec) return;
    const staleOwner = this.ownerId;
    console.warn(`イベントのロックが ${this.watchdogSec} 秒を超えたため強制解除します`, this.state, staleOwner);
    this.release(staleOwner, nowSec, true);
    this.emit('watchdog', staleOwner);
  }

  enter(state, ownerId, nowSec) {
    this.state = state;
    this.ownerId = ownerId;
    this.acquiredAt = nowSec;
    this.history.push({ state, ownerId, at: Math.round(nowSec * 10) / 10 });
    if (this.history.length > 20) this.history.shift();
    this.emit('change', state, ownerId);
  }
}