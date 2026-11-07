// File: src/battle/enemyPhase.js
/**
 * 敵のフェーズを、1体ずつ順番に進める。
 * 技の演出中（isBusy）は次の敵に進まず、終わったら続きから再開する。
 * 演出の無い行動は、pump() の1回の呼び出しで連続して進む。
 */
export class EnemyPhase {
  /**
   * @param {object} o
   * @param {Array} o.units 行動する敵（開始時点の一覧）
   * @param {(u) => boolean} [o.isPresent] 一覧の途中でいなくなった敵を飛ばす
   * @param {(u) => void} o.act 1体分の行動
   * @param {() => boolean} [o.shouldStop] true なら、残りの敵は動かず終了する
   * @param {() => boolean} [o.isBusy] true の間は待つ
   * @param {() => void} [o.onDone]
   */
  constructor({ units, isPresent = () => true, act, shouldStop = () => false, isBusy = () => false, onDone = () => {} }) {
    this.units = units;
    this.isPresent = isPresent;
    this.act = act;
    this.shouldStop = shouldStop;
    this.isBusy = isBusy;
    this.onDone = onDone;
    this.index = 0;
    this.finished = false;
  }

  pump() {
    while (!this.finished) {
      if (this.isBusy()) return;
      if (this.index >= this.units.length || this.shouldStop()) {
        this.finish();
        return;
      }
      const unit = this.units[this.index];
      this.index += 1;
      if (!this.isPresent(unit)) continue;
      this.act(unit);
    }
  }

  finish() {
    this.finished = true;
    this.onDone();
  }
}