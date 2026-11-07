// File: src/battle/conditioning.js
// 主人公の蓄積デバフ（ゲージ）と一時状態。画面には依存しない。
// 状態は save.currentRun.heroStatus（ラン中）と save.persistent.conditioning（永続段階）に置く。
// 各メソッドはイベントの配列を返す。表示・音は呼び出し側（combat.js）が受け持つ。
//   { kind: 'condGain' | 'condWarn' | 'condOnset' | 'condDanger' | 'condMax' | 'condPermanent' | 'condRecover', id, ... }
//   { kind: 'statusAdd' | 'statusEnd', id, turns }
import { CONDITIONS, STATUSES } from '../data/conditioning.js';

const emptyRun = () => ({ gauges: {}, statuses: [], grace: {}, quiet: {} });

export class HeroConditions {
  constructor(B, getSave) {
    this.B = B;
    this.getSave = getSave;
  }

  get cfg() {
    return this.B.conditioning;
  }

  get run() {
    const r = this.getSave().currentRun;
    if (!r.heroStatus) r.heroStatus = emptyRun();
    const hs = r.heroStatus;
    hs.gauges ??= {};
    hs.statuses ??= [];
    hs.grace ??= {};
    hs.quiet ??= {};
    return hs;
  }

  perm(id) {
    const p = this.getSave().persistent;
    p.conditioning ??= {};
    p.conditioning[id] ??= { stage: 0, onsetKeys: [], recovery: 0 };
    return p.conditioning[id];
  }

  value(id) {
    return this.run.gauges[id] ?? 0;
  }

  stage(id) {
    return this.getSave().persistent.conditioning?.[id]?.stage ?? 0;
  }

  // ゲージを増やす。voluntary: 自分から受け入れた。floorKey: 永続化の判定に使う「別の遭遇」の区切り
  gain(id, amount, { floorKey = '', voluntary = false } = {}) {
    const def = CONDITIONS[id];
    if (!def || !(amount > 0)) return [];
    const c = this.cfg;
    const run = this.run;
    const events = [];
    const before = run.gauges[id] ?? 0;
    const mul = 1 + c.stageGainMul * this.stage(id);
    const after = Math.min(c.max, before + amount * mul);
    run.gauges[id] = Math.round(after * 100) / 100;
    run.quiet[id] = 0;
    events.push({ kind: 'condGain', id, from: before, to: after });

    if (before < c.warnAt && after >= c.warnAt && after < c.onsetAt) events.push({ kind: 'condWarn', id, value: after });
    if (after >= c.onsetAt) {
      // 発症中の再命中は、効果時間の延長を優先する
      const crossed = before < c.onsetAt;
      events.push(...this.addStatus(def.onsetStatus, def.onsetTurns));
      if (crossed) {
        events.push({ kind: 'condOnset', id, value: after });
        events.push(...this.markOnset(id, floorKey));
      }
    }
    if (before < c.dangerAt && after >= c.dangerAt) events.push({ kind: 'condDanger', id, value: after });
    if (voluntary && after >= c.dangerAt) events.push(...this.markOnset(id, `${floorKey}:voluntary`));
    if (before < c.max && after >= c.max) events.push({ kind: 'condMax', id });
    return events;
  }

  // 異なる遭遇での発症を数え、規定回数で永続段階を1つ進める（同じ区切りは1回だけ数える）
  markOnset(id, key) {
    const c = this.cfg;
    const st = this.perm(id);
    if (st.stage >= c.maxStage || st.onsetKeys.includes(key)) return [];
    st.onsetKeys.push(key);
    if (st.onsetKeys.length < c.permanentOnsets) return [];
    st.stage += 1;
    st.onsetKeys = [];
    st.recovery = 0;
    return [{ kind: 'condPermanent', id, stage: st.stage }];
  }

  // 誘いを断った・押し返したなど、対抗行動の成功。永続段階の回復が進む
  recordResist(id) {
    const st = this.getSave().persistent.conditioning?.[id];
    if (!CONDITIONS[id] || !st || st.stage <= 0) return [];
    const need = this.cfg.recoveryNeed[st.stage - 1] ?? 99;
    st.recovery += 1;
    if (st.recovery < need) return [{ kind: 'condRecoverProgress', id, progress: st.recovery, need }];
    st.stage -= 1;
    st.recovery = 0;
    st.onsetKeys = [];
    return [{ kind: 'condRecover', id, stage: st.stage }];
  }

  addStatus(id, turns) {
    const def = STATUSES[id];
    if (!def || !(turns > 0)) return [];
    const run = this.run;
    if ((run.grace[id] ?? 0) > 0) return [];
    const cur = run.statuses.find((s) => s.id === id);
    if (cur) {
      cur.turns = Math.max(cur.turns, turns);
      return [];
    }
    run.statuses.push({ id, turns });
    return [{ kind: 'statusAdd', id, turns, stun: def.stun ?? 0 }];
  }

  has(id) {
    return this.run.statuses.some((s) => s.id === id);
  }

  consume(id) {
    const run = this.run;
    const before = run.statuses.length;
    run.statuses = run.statuses.filter((s) => s.id !== id);
    return run.statuses.length < before;
  }

  // 一時状態の倍率（複数は積）
  mult(key) {
    let m = 1;
    for (const s of this.run.statuses) m *= STATUSES[s.id]?.mult?.[key] ?? 1;
    return m;
  }

  // 発症域の蓄積デバフが、その敵の技を強める倍率
  boost(speciesId, kind) {
    const c = this.cfg;
    let m = 1;
    for (const [id, def] of Object.entries(CONDITIONS)) {
      if (def.source !== speciesId) continue;
      const v = this.value(id);
      if (v < c.onsetAt) continue;
      m *= 1 + (def.boost?.[kind] ?? 0) * (v - c.warnAt + 1);
    }
    return m;
  }

  backBind(attr) {
    return this.run.statuses.some((s) => {
      const def = STATUSES[s.id];
      return def?.backBind && (!def.attrs || def.attrs.includes(attr));
    });
  }

  // 主人公の1ターンの終わり。nearSpecies: 近くにいる敵の種族（その敵の蓄積は減らない）
  tickTurn(nearSpecies = new Set()) {
    const c = this.cfg;
    const run = this.run;
    const events = [];
    // ターンごとに MP が漏れる状態（偽りの祝福など）
    for (const s of run.statuses) {
      const leak = STATUSES[s.id]?.mpLeak;
      if (leak) events.push({ kind: 'statusLeak', id: s.id, rate: leak });
      // 付いている間、蓄積デバフが増えていく状態（花印など）
      const tick = STATUSES[s.id]?.condTick;
      if (tick) events.push(...this.gain(tick.id, tick.gain));
    }
    for (const s of run.statuses) s.turns -= 1;
    run.statuses = run.statuses.filter((s) => {
      if (s.turns > 0) return true;
      const def = STATUSES[s.id];
      if (def?.graceTurns) run.grace[s.id] = def.graceTurns;
      events.push({ kind: 'statusEnd', id: s.id });
      return false;
    });
    for (const id of Object.keys(run.grace)) {
      run.grace[id] -= 1;
      if (run.grace[id] <= 0) delete run.grace[id];
    }
    for (const [id, def] of Object.entries(CONDITIONS)) {
      const v = run.gauges[id] ?? 0;
      if (v <= 0 || nearSpecies.has(def.source)) continue;
      run.quiet[id] = (run.quiet[id] ?? 0) + 1;
      if (run.quiet[id] < c.decayEveryTurns) continue;
      run.quiet[id] = 0;
      run.gauges[id] = Math.max(this.stage(id) * c.stageFloor, v - 1);
    }
    return events;
  }

  // 階の始まり。一時状態は消え、ゲージは一部だけ持ち越す（永続段階があれば下限が上がる）
  onFloorStart() {
    const c = this.cfg;
    const run = this.run;
    run.statuses = [];
    run.grace = {};
    run.quiet = {};
    for (const id of Object.keys(CONDITIONS)) {
      const carried = Math.floor((run.gauges[id] ?? 0) * c.floorCarry);
      const floor = this.stage(id) * c.stageFloor;
      if (carried > 0 || floor > 0) run.gauges[id] = Math.max(carried, floor);
      else delete run.gauges[id];
    }
  }

  reset() {
    this.getSave().currentRun.heroStatus = emptyRun();
  }

  // HUD 用の一覧
  entries() {
    const c = this.cfg;
    const rows = [];
    for (const s of this.run.statuses) {
      const def = STATUSES[s.id];
      if (!def) continue;
      rows.push({ id: s.id, kind: 'state', label: def.name, detail: `${s.turns}ターン`, ratio: null, color: def.color });
    }
    for (const [id, def] of Object.entries(CONDITIONS)) {
      const v = this.value(id);
      const stage = this.stage(id);
      if (v <= 0 && stage <= 0) continue;
      const stageText = stage > 0 ? ` ${['', 'I', 'II', 'III', 'IV'][stage]}` : '';
      rows.push({
        id: `cond:${id}`,
        kind: 'state',
        label: `${def.name}${stageText}`,
        detail: v >= c.dangerAt ? '危険' : v >= c.onsetAt ? '発症' : v >= c.warnAt ? '前兆' : `${Math.floor(v)}/${c.max}`,
        ratio: Math.min(1, v / c.max),
        color: def.color
      });
    }
    return rows;
  }
}
