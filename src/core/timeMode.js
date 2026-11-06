// File: src/core/timeMode.js
// 時間モード（3.3）。同時に動くリアルタイム状態は常に1つ。
import { Emitter, clamp } from './util.js';

export class TimeMode extends Emitter {
  // getSettings() → セーブの settings。decisionTimerScale を読む
  constructor(B, getSettings) {
    super();
    this.B = B;
    this.getSettings = getSettings;
    this.mode = 'TURN';
    this.bound = null;      // { elapsed, secAcc, tickAcc, ticks }
    this.decision = null;   // { total, remaining, unlimited, onTimeout }
    this.tickSecProvider = null;   // () => 秒。拘束 tick の間隔を外から差し替える
  }

  canEnter() {
    return this.mode === 'TURN';
  }

  // BOUND（拘束）。マップとログは見えたまま、5秒＝1ターンで周囲が動く
  enterBound() {
    if (!this.canEnter()) {
      console.warn(`${this.mode} 中は BOUND に入れません`);
      return false;
    }
    this.mode = 'BOUND';
    this.bound = { elapsed: 0, secAcc: 0, tickAcc: 0, ticks: 0 };
    this.emit('change', 'BOUND');
    return true;
  }

  // DECISION（選択肢）。noLimit: true は命乞い用（制限時間なし）
  // 制限時間の減る速さは settings.decisionTimerScale（0 でタイマー停止）
  enterDecision({ durationSec = this.B.decision.baseSec, onTimeout = null, noLimit = false } = {}) {
    if (!this.canEnter()) {
      console.warn(`${this.mode} 中は DECISION に入れません`);
      return false;
    }
    this.mode = 'DECISION';
    this.decision = { total: durationSec, remaining: durationSec, unlimited: noLimit, onTimeout };
    this.emit('change', 'DECISION');
    return true;
  }

  leave() {
    if (this.mode === 'TURN') return;
    this.mode = 'TURN';
    this.bound = null;
    this.decision = null;
    this.emit('change', 'TURN');
  }

  // DECISION の残り時間の割合（1 → 0）。制限なしは 1
  get decisionRatio() {
    const d = this.decision;
    if (!d || d.unlimited) return 1;
    return clamp(d.remaining / d.total, 0, 1);
  }

  // BOUND の次のターンまでの進み具合（0 → 1）
  get boundTickProgress() {
    return this.bound ? clamp(this.bound.tickAcc / this.boundTickSec(), 0, 1) : 0;
  }

  // 拘束 tick の間隔（秒）。provider が無効な値を返したら balance.js の値に戻す
  boundTickSec() {
    const sec = this.tickSecProvider?.();
    return Number.isFinite(sec) && sec > 0 ? sec : this.B.bound.tickSec;
  }

  // dtSec は共通タイマーの値（ポーズ中は 0）
  update(dtSec) {
    if (this.mode === 'BOUND') this.updateBound(dtSec);
    else if (this.mode === 'DECISION') this.updateDecision(dtSec);
  }

  updateBound(dtSec) {
    const b = this.bound;
    b.elapsed += dtSec;

    b.secAcc += dtSec;
    while (this.mode === 'BOUND' && b.secAcc >= 1) {
      b.secAcc -= 1;
      this.emit('boundSecond');   // MP吸収と脱出ゲージの処理（毎秒）
    }

    b.tickAcc += dtSec;
    while (this.mode === 'BOUND' && b.tickAcc >= this.boundTickSec()) {
      b.tickAcc -= this.boundTickSec();
      b.ticks += 1;
      this.emit('boundTick', b.ticks);   // 主人公以外が1ターン動く（5秒ごと）
    }
  }

  updateDecision(dtSec) {
    const d = this.decision;
    if (d.unlimited) return;
    const speed = clamp(
      this.getSettings().decisionTimerScale ?? 1,
      0,
      this.B.decision.speedMax
    );
    if (speed === 0) return;   // タイマー停止
    d.remaining -= dtSec * Math.max(speed, this.B.decision.speedMin);
    if (d.remaining > 0) return;

    const onTimeout = d.onTimeout;
    this.leave();                       // 先に TURN へ戻す（次の拘束などを始められるように）
    onTimeout?.();                      // 最も不利な選択肢の自動実行
    this.emit('decisionTimeout');
  }
}
