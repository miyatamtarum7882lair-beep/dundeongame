// File: src/battle/skillStage.js
const MAX_HITS = 40;
const MAX_FLASH_SEC = 1;
const MAX_DURATION_SEC = 8;   // これより長い台本は切り詰める（ゲームが固まるのを防ぐ）
const EPS = 1e-9;
const AT = ['start', 'hit', 'end'];

const num = (v, d) => (Number.isFinite(v) ? v : d);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const asList = (v) => (Array.isArray(v)
  ? v.filter((c) => c && typeof c.id === 'string' && AT.includes(c.at))
  : []);

/**
 * 台本を、安全な値に整える。raw が無ければ、従来の演出（legacy）を1回当てる台本になる。
 * @param {object|undefined} raw SKILL_STAGES[技ID]
 * @param {string} category attack | special | bind
 * @param {{defaults: Record<string, {flashSec:number, durationSec:number, hitAt:number}>}} cfg B.stage
 */
export function normalizeStage(raw, category, cfg) {
  const base = cfg.defaults[category] ?? cfg.defaults.special;
  const r = raw ?? {};
  const maxT = MAX_DURATION_SEC - 0.05;
  const count = Math.floor(clamp(num(r.hits?.count, 1), 1, MAX_HITS));
  const startSec = clamp(num(r.hits?.startSec, num(base.hitAt, 0)), 0, maxT);
  const endSec = clamp(num(r.hits?.endSec, startSec), startSec, maxT);
  const flashSec = clamp(num(r.flashSec, num(base.flashSec, 0)), 0, MAX_FLASH_SEC);
  const durationSec = clamp(
    Math.max(num(r.durationSec, num(base.durationSec, 0.5)), endSec + 0.05),
    0.05,
    MAX_DURATION_SEC
  );
  const share = 1 / count;
  const per = r.perHit ?? {};
  const rate = (v) => Math.max(0, num(v, share));
  return {
    name: r.name ?? null,
    banner: r.banner ?? null,
    flashSec,
    durationSec,
    hits: { count, startSec, endSec },
    perHit: { hp: rate(per.hp), mp: rate(per.mp), exp: rate(per.exp) },
    hitNumbers: r.hitNumbers ?? count === 1,
    fx: raw ? asList(r.fx) : [{ at: 'hit', id: 'legacy' }],
    se: raw ? asList(r.se) : [{ at: 'hit', id: '$skill', delay: 0.1 }]
  };
}

/** 各ヒットの時刻（演出開始からの秒数。発光の長さを含む） */
export function hitTimes(stage) {
  const { count, startSec, endSec } = stage.hits;
  return Array.from({ length: count }, (_, i) =>
    stage.flashSec + startSec + (count > 1 ? (i * (endSec - startSec)) / (count - 1) : 0)
  );
}

/** 演出全体の長さ（秒） */
export function totalSec(stage) {
  return stage.flashSec + stage.durationSec;
}

/** その時点で発火するキューを返す */
export function cuesFor(list, at, index = 0, count = 1) {
  return (list ?? []).filter((c) => {
    if (c.at !== at) return false;
    if (at !== 'hit') return true;
    const from = c.from ?? 0;
    const to = c.to ?? count - 1;
    const every = Math.max(1, Math.floor(c.every ?? 1));
    return index >= from && index <= to && (index - from) % every === 0;
  });
}

/**
 * 技演出の進行役。1度に1つだけ再生し、重なった分は順番待ちにする。
 * コールバックの中から cancel() を呼んでもよい。
 */
export class SkillDirector {
  constructor({ maxDt = 0.25, onStart = () => {}, onHit = () => {}, onEnd = () => {} } = {}) {
    this.maxDt = maxDt;
    this.onStart = onStart;
    this.onHit = onHit;
    this.onEnd = onEnd;
    this.current = null;
    this.queue = [];
  }

  busy() {
    return this.current !== null || this.queue.length > 0;
  }

  start({ stage, payload = null }) {
    const perf = {
      stage,
      payload,
      age: 0,
      hitTimes: hitTimes(stage),
      nextHit: 0,
      endAt: totalSec(stage)
    };
    if (this.current) {
      this.queue.push(perf);
      return perf;
    }
    this.begin(perf);
    return perf;
  }

  begin(perf) {
    this.current = perf;
    this.onStart(perf);
  }

  update(dtSec) {
    const perf = this.current;
    if (!perf) return;
    perf.age += Math.min(this.maxDt, Math.max(0, dtSec));
    while (
      this.current === perf
      && perf.nextHit < perf.hitTimes.length
      && perf.age + EPS >= perf.hitTimes[perf.nextHit]
    ) {
      const index = perf.nextHit;
      perf.nextHit += 1;
      this.onHit(perf, index);
    }
    if (this.current === perf && perf.age + EPS >= perf.endAt) this.finish(perf, false);
  }

  finish(perf, cancelled) {
    if (this.current !== perf) return;
    this.current = null;
    this.onEnd(perf, cancelled);
    if (!this.current && this.queue.length > 0) this.begin(this.queue.shift());
  }

  /** 敗北などで打ち切る。順番待ちの技は、始めずに捨てる */
  cancel() {
    const perf = this.current;
    this.queue.length = 0;
    if (perf) this.finish(perf, true);
  }

  /** 何も呼ばずに全部捨てる（フロア切り替え・ランのやり直し用） */
  clear() {
    this.current = null;
    this.queue.length = 0;
  }
}