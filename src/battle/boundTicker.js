const MAX_TICKS_PER_UPDATE = 8;

/** 拘束中に「仲間・他の敵が1ターン動く」タイミングを刻む。間隔は呼び出しごとに渡す。 */
export class BoundTicker {
  constructor() {
    this.acc = 0;
  }

  reset() {
    this.acc = 0;
  }

  /** @returns {number} このフレームで発生した tick 数 */
  update(dt, intervalSec) {
    if (!(intervalSec > 0)) return 0;
    this.acc += dt;
    let n = 0;
    while (this.acc >= intervalSec - 1e-9 && n < MAX_TICKS_PER_UPDATE) {
      this.acc = Math.max(0, this.acc - intervalSec);
      n += 1;
    }
    if (n >= MAX_TICKS_PER_UPDATE) this.acc = 0; // 長時間停止後の暴走防止
    return n;
  }
}
