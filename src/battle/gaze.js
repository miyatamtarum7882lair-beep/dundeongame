// File: src/battle/gaze.js
// 見つめてしまう：マウスで敵の上にカーソルを乗せ続けると、目が離せなくなる。
//   startSec 見つめると「目が離せない」（一時状態）になり、その後 tickSec ごとに、その子の蓄積デバフが少しずつ進む。
//   カーソルを外すと止まる。見つめた時間は、その子ごとに数える（離すとゆっくり冷める）。
// 時間はゲーム内時計（一時停止中は進まない）。
import { conditionOfRace } from './economy.js';

const GAZE_LINES = [
  'ん？ ……ずっと見てるね♡',
  'そんなに見つめられたら、照れちゃう……♡ うそ、もっと見て？',
  'ふふ、目、そらせないんだ？',
  'ほら、もっと近くで見ていいんだよ……♡',
  'その目、もうわたしのことしか見てない♡'
];

export class Gaze {
  /** @param {import('./combat.js').Combat} combat */
  constructor(combat) {
    this.combat = combat;
    this.target = null;   // いま見つめている敵
    this.sec = 0;         // 見つめ続けている秒数
    this.tick = 0;
    this.lineIndex = 0;
    this.locked = false;  // 「目が離せない」になったか（この見つめ方で）
  }

  get G() { return this.combat.B.gaze; }

  /** 見つめた度合い（0〜1）。カーソルやハートの演出用 */
  intensity() {
    if (!this.target) return 0;
    return Math.min(1, this.sec / (this.G.startSec + this.G.tickSec * 3));
  }

  /**
   * 毎フレーム呼ぶ。unit: カーソルの下の敵（いなければ null）。dt はゲーム内の秒
   */
  update(dt, unit) {
    const c = this.combat;
    const G = this.G;
    if (!unit || unit.kind !== 'enemy' || c.defeated || !c.exp.units.includes(unit)) {
      if (this.target) this.release();
      return;
    }
    if (unit !== this.target) {
      this.release();
      this.target = unit;
    }
    if (dt <= 0) return;
    this.sec += dt;
    const th = c.theme(unit);
    if (!this.locked && this.sec >= G.startSec) {
      this.locked = true;
      this.tick = 0;
      c.handleEvents(c.conditions.addStatus('gazeLocked', G.statusTurns), unit, null);
      const hb = c.body(c.exp.hero);
      c.fx({ type: 'callout', x: hb.x, y: c.head(c.exp.hero).y - 60, text: '（目が、離せない……♡）', color: th.main, size: 22, life: 1.6 });
      c.fx({ type: 'ring', x: c.body(unit).x, y: c.head(unit).y, r: 40, color: th.main, width: 4, alpha: 0.8, life: 0.6 });
      c.emit('se', { id: 'heartPop', tx: unit.tx, ty: unit.ty, gain: 0.7 });
      c.emit('log', 'gazeLocked', { name: unit.name });
      c.speak(unit, GAZE_LINES[this.lineIndex++ % GAZE_LINES.length]);
    }
    if (!this.locked) return;
    this.tick += dt;
    if (this.tick < G.tickSec) return;
    this.tick -= G.tickSec;
    // 見つめるほど、その子の蓄積デバフが進む（長く見つめるほど少しずつ強く）
    const condId = conditionOfRace(unit.speciesId);
    const amount = G.gainPerTick * (1 + Math.min(G.rampMax, (this.sec - G.startSec) * G.rampPerSec));
    if (condId) c.handleEvents(c.conditions.gain(condId, amount, { floorKey: c.floorKey() }), unit, null);
    c.conditions.addStatus('gazeLocked', G.statusTurns);   // 見つめている間は切れない
    unit.gazedSec = (unit.gazedSec ?? 0) + G.tickSec;
    const hb = c.body(c.exp.hero);
    c.fx({ type: 'flow', from: c.head(unit), to: { x: hb.x, y: c.head(c.exp.hero).y + 4 }, shapes: ['heart', 'heartLine'], colors: [th.main, th.glow, '#ffd6ec'], count: 6, size: [4, 7], life: 0.8, glow: true });
    c.emit('se', { id: 'heartPop', tx: unit.tx, ty: unit.ty, gain: 0.35 });
    if (Math.random() < G.lineChance) c.speak(unit, GAZE_LINES[this.lineIndex++ % GAZE_LINES.length]);
  }

  release() {
    this.target = null;
    this.sec = 0;
    this.tick = 0;
    this.locked = false;
  }
}
