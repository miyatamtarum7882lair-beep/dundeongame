import { B } from '../data/balance.js';

export const BUFFS = {
  atkUp: { label: '攻撃強化', desc: 'ダメージ+30%', mult: { damage: 1.3 } },
  drainGuard: { label: '吸精軽減', desc: 'ドレイン-30%', mult: { drainTaken: 0.7 } },
  escapeAid: { label: '脱出補助', desc: '脱出必要数-30%', mult: { escapeNeed: 0.7 } },
};

export const BUFF_IDS = Object.keys(BUFFS);

export class BuffManager {
  constructor() {
    this.items = [];
  }

  /** 重ねがけは持続ターンの更新。 */
  add(id) {
    if (!BUFFS[id]) return null;
    const turns = B.buffs.durationTurns;
    const cur = this.items.find((b) => b.id === id);
    if (cur) {
      cur.turnsLeft = turns;
      return { id, refreshed: true };
    }
    this.items.push({ id, turnsLeft: turns });
    return { id, refreshed: false };
  }

  /** 1ターン経過。失効したバフのIDを返す。 */
  tick() {
    const expired = [];
    for (const b of this.items) b.turnsLeft -= 1;
    this.items = this.items.filter((b) => {
      if (b.turnsLeft > 0) return true;
      expired.push(b.id);
      return false;
    });
    return expired;
  }

  /** 指定ステータスの倍率（複数バフは積）。 */
  mult(stat) {
    let m = 1;
    for (const b of this.items) m *= BUFFS[b.id].mult[stat] ?? 1;
    return m;
  }

  entries() {
    return this.items.map((b) => ({
      id: b.id,
      label: BUFFS[b.id].label,
      desc: BUFFS[b.id].desc,
      turnsLeft: b.turnsLeft,
    }));
  }

  serialize() {
    return this.items.map((b) => ({ ...b }));
  }

  restore(list = []) {
    this.items = list
      .filter((b) => BUFFS[b.id] && b.turnsLeft > 0)
      .map((b) => ({ id: b.id, turnsLeft: Math.floor(b.turnsLeft) }));
  }

  clear() {
    this.items = [];
  }
}
