// File: src/core/heartbeat.js
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/**
 * 心音の速さ（拍/分）。鳴らさないときは 0。
 * @param {number} mpRatio 0〜1
 * @param {{startRatio:number, bpmMin:number, bpmMax:number, climaxBpm:number}} cfg
 */
export function heartbeatBpm(mpRatio, cfg, climax = false) {
  if (climax) return cfg.climaxBpm;
  if (mpRatio >= cfg.startRatio) return 0;
  const k = clamp01((cfg.startRatio - mpRatio) / cfg.startRatio);
  return cfg.bpmMin + (cfg.bpmMax - cfg.bpmMin) * k;
}

export class Heartbeat {
  /**
   * @param {{cfg: object, onBeat: (info:{bpm:number, k:number}) => void}} o
   *   k は 0〜1。MPが低いほど大きい（絶頂中は 1）
   */
  constructor({ cfg, onBeat }) {
    this.cfg = cfg;
    this.onBeat = onBeat;
    this.acc = 0;
  }

  update(dtSec, { mpRatio, climax = false, enabled = true }) {
    const bpm = enabled ? heartbeatBpm(mpRatio, this.cfg, climax) : 0;
    if (bpm <= 0) {
      this.acc = 0;
      return;
    }
    this.acc += Math.min(dtSec, 0.25);
    const interval = 60 / bpm;
    if (this.acc < interval) return;
    this.acc -= interval;
    if (this.acc > interval) this.acc = 0;
    const k = climax ? 1 : clamp01((this.cfg.startRatio - mpRatio) / this.cfg.startRatio);
    this.onBeat({ bpm, k });
  }
}