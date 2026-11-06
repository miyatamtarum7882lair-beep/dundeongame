// File: src/core/timer.js
// 共通タイマー。ゲーム内の時間は、すべてここの時間（ポーズ中は進まない）で管理する。
export class GameClock {
  constructor({ maxDtSec = 0.1 } = {}) {
    this.maxDtSec = maxDtSec;   // タブ切り替え後などの時間の飛びを抑える
    this.lastMs = null;
    this.time = 0;              // ゲーム内の経過秒（ポーズ中は進まない）
    this.realDtSec = 0;         // 実時間の経過（デバッグ表示用）
    this.reasons = new Set();   // ポーズの理由。1つでもあれば停止
    this.timers = new Map();
    this.nextId = 1;
  }

  get paused() {
    return this.reasons.size > 0;
  }

  pause(reason = 'manual') {
    this.reasons.add(reason);
  }

  resume(reason = 'manual') {
    this.reasons.delete(reason);
  }

  togglePause(reason = 'esc') {
    if (this.reasons.has(reason)) this.resume(reason);
    else this.pause(reason);
  }

  // requestAnimationFrame の時刻（ミリ秒）を渡す。戻り値はゲーム内の経過秒（ポーズ中は 0）
  tick(nowMs) {
    const real = this.lastMs === null ? 0 : (nowMs - this.lastMs) / 1000;
    this.lastMs = nowMs;
    this.realDtSec = real;
    if (this.paused) return 0;

    const dt = Math.min(real, this.maxDtSec);
    this.time += dt;
    this.runTimers();
    return dt;
  }

  // sec 秒後に1回だけ実行
  after(sec, fn) {
    const id = this.nextId++;
    this.timers.set(id, { at: this.time + sec, fn, every: null });
    return id;
  }

  // sec 秒ごとに実行（遅れを取り戻す連続実行はしない）
  every(sec, fn) {
    const id = this.nextId++;
    this.timers.set(id, { at: this.time + sec, fn, every: sec });
    return id;
  }

  cancel(id) {
    this.timers.delete(id);
  }

  runTimers() {
    for (const [id, timer] of [...this.timers]) {
      if (this.time < timer.at) continue;
      if (timer.every) timer.at = this.time + timer.every;
      else this.timers.delete(id);
      try {
        timer.fn();
      } catch (error) {
        console.error('タイマーの処理でエラーが起きました', error);
      }
    }
  }
}