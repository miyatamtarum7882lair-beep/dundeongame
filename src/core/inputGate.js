// File: src/core/inputGate.js
/** 勃起状態の「行動が遅くなる」を、行動確定後の入力ロックで表現する。 */
export class InputGate {
  constructor({ now = () => performance.now() / 1000 } = {}) {
    this.now = now;
    this.readyAt = 0;
  }

  ready() {
    return this.now() >= this.readyAt;
  }

  /** 行動が確定するたびに呼ぶ。delaySec が 0 なら何もしない。 */
  consume(delaySec) {
    if (delaySec > 0) this.readyAt = this.now() + delaySec;
  }
}