// File: src/battle/pairBond.js
// 敵どうしの絆：隣り合った二人が、チャームポイントどうしをこすり合わせる（口ならキス、胸なら押し付け合う）。
// リアルタイムで進み（拘束中も進む）、時間が経つほど二人が強くなる。
//   段階1（stages[0] 秒）  能力上昇：レベルが上がり、技の威力が増す
//   段階2（stages[1] 秒）  負け癖の共有：主人公の負け癖が、二人のうち重いほうにそろう（永続）。こすり合わせた部位の技が強化
//   完遂（durationSec 秒）  特別な能力：二人でユナイト攻撃ができるようになる。絆は永続で記録され、次からは早く結ばれる
// こすり合わせている間、二人は動かない。主人公が攻撃すると中断する（それまでの強化は残る）。
import { ENEMIES_BY_ID, ATTRS } from '../data/enemies.js';
import { charmAttrsOf } from '../data/charmAttrs.js';
import { chebyshev } from '../dungeon/gridMath.js';
import { sharedGroup, ENEMY_GROUPS } from '../data/enemyGroups.js';
import { conditionOfRace } from './economy.js';

// 部位の組み合わせごとの見せ方
const RUB = {
  mouth: { verb: 'キス', texts: ['ちゅっ♡', 'ちゅぅ…♡', 'れろ…♡', 'ちゅ、ちゅっ♡'], shapes: ['lips', 'heart'], unite: 'ダブル・キッス' },
  bust: { verb: '胸の押し付け合い', texts: ['むにゅ♡', 'ぎゅむっ♡', 'ぽよん♡', 'むにゅぅ…♡'], shapes: ['heart', 'bubble'], unite: 'ダブル・ぱふぱふ' },
  hip: { verb: 'お尻のこすり合わせ', texts: ['すりすり♡', 'ぷにっ♡', 'むちっ♡', 'ぐりぐり♡'], shapes: ['heart', 'petal'], unite: 'ダブル・ヒッププレス' },
  foot: { verb: '脚の絡め合い', texts: ['すりっ♡', 'すりすり…♡', 'きゅっ♡'], shapes: ['heart', 'ribbon'], unite: 'ダブル・レッグロック' },
  hand: { verb: '恋人つなぎ', texts: ['ぎゅっ♡', 'なでなで♡', 'にぎにぎ♡'], shapes: ['heart', 'star'], unite: 'ダブル・ハンド' }
};

export const pairKey = (a, b) => [a, b].sort().join('|');

// こすり合わせ中の二人の声（進み具合で選ぶ。後ろほど甘い）
const PAIR_LINES = {
  mouth: ['ん……ちゅ♡', 'ちゅ、ちゅぅ……♡ 舌、からめて……', 'ぷは……♡ 見られてるよ、わたしたち', 'ん～っ♡ ……ねえ、あの人もキスしてほしそう'],
  bust: ['むにゅ……♡', 'おっぱい、押し付けあいっこ♡', 'ぎゅーっ♡ ……やわらかいね', 'ほら、見てる見てる……♡ 羨ましいんだ'],
  hip: ['すりすり♡', 'お尻、くっつけちゃお♡', 'むちっ……♡ ぐりぐり♡', 'ねえ、こっち見てるよ？ ……もっと見せてあげよっか'],
  foot: ['すりっ……♡', '脚、からめちゃお♡', 'あったかい……♡', 'ふふ、足でされるの想像してる顔だね'],
  hand: ['ぎゅっ……♡', '恋人つなぎ♡', 'にぎにぎ……♡', 'このおてて、あとであなたにも、ね？']
};

// 二人がこすり合わせる部位。共通の部位があればそれ、無ければ片方の部位を相手に（「胸にキス」など）
export function rubAttrsOf(raceA, raceB) {
  const a = charmAttrsOf(raceA);
  const b = charmAttrsOf(raceB);
  const common = a.find((x) => b.includes(x));
  return common ? [common, common] : [a[0], b[0]];
}

// 連携攻撃（ユナイト攻撃）の種類。同じまとまりの二人は、そのまとまりの専用技。それ以外は、こすり合わせた部位の技
// effect ごとの効果は combat.js の uniteEffect
const ATTR_UNITE = {
  mouth: { effect: 'kiss', line: 'ちゅ、ちゅっ♡ 二人で、ね♡', status: 'charmed' },
  bust: { effect: 'pafu', line: 'むにゅ～っ♡ 挟んじゃう♡', status: 'limp' },
  hip: { effect: 'hipPress', line: 'せーのっ、どーん♡', status: 'cornered' },
  foot: { effect: 'legLock', line: '脚で、からめとっちゃう♡', status: 'pinned' },
  hand: { effect: 'hand', line: 'なでなで……経験値、ちょうだい♡', status: 'weakExposed' }
};

export function uniteTypeFor(a, b, groupOf) {
  const group = groupOf?.(a.speciesId, b.speciesId);
  if (group) return { ...group.unite, group: group.name };
  const attrs = a.bondAttrs ?? rubAttrsOf(a.speciesId, b.speciesId);
  const base = attrs[0] === attrs[1] ? ATTR_UNITE[attrs[0]] : { effect: 'sandwich', line: '前と後ろから、挟んじゃお♡', status: 'dependent' };
  return { name: uniteNameOf(attrs), ...base };
}

export function uniteNameOf(attrs) {
  const [x, y] = attrs;
  if (x === y) return RUB[x]?.unite ?? 'ダブル・テンプテーション';
  return `${ATTRS[x]?.label ?? x}と${ATTRS[y]?.label ?? y}のサンドイッチ`;
}

export function rubLabelOf(attrs) {
  const [x, y] = attrs;
  if (x === y) return RUB[x]?.verb ?? 'こすり合わせ';
  if (x === 'mouth' || y === 'mouth') return `${ATTRS[x === 'mouth' ? y : x]?.label ?? ''}へのキス`;
  return `${ATTRS[x]?.label}と${ATTRS[y]?.label}のこすり合わせ`;
}

export class PairBonds {
  /** @param {import('./combat.js').Combat} combat */
  constructor(combat) {
    this.combat = combat;
    this.active = [];   // { a, b, attrs, elapsed, stage, pulse, speed }
  }

  get B() {
    return this.combat.B.pairBond;
  }

  reset() {
    for (const pair of this.active) {
      pair.a.bonding = null;
      pair.b.bonding = null;
    }
    this.active = [];
  }

  eligible(u) {
    const c = this.combat;
    if (u.kind !== 'enemy' || u.hp <= 0 || u.bonding || u.stunTurns > 0 || u.pendingSkill) return false;
    if (c.bound?.binders.some((b) => b.unit === u)) return false;
    const hero = c.exp.hero;
    const d = chebyshev(u.tx, u.ty, hero.tx, hero.ty);
    // 主人公のすぐ隣にいる敵は、こすり合わせより主人公を狙う。見えている敵だけ（見せつけるため）
    return d >= 2 && d <= this.B.range && c.exp.map.isVisible(u.tx, u.ty);
  }

  /**
   * 隣り合った敵の二人組が、こすり合わせを始めるか判定する。
   * @param {number} chanceScale 判定の頻度に合わせた確率の倍率（拘束中は細かく呼ぶので小さくする）
   */
  tryStart(chanceScale = 1) {
    const c = this.combat;
    if (c.defeated || this.active.length >= this.B.maxActive) return null;
    const units = c.exp.units.filter((u) => this.eligible(u));
    for (const a of units) {
      for (const b of units) {
        if (a === b || a.id > b.id) continue;
        if (chebyshev(a.tx, a.ty, b.tx, b.ty) !== 1) continue;
        if ((a.bondDoneWith ?? []).includes(b.id)) continue;
        const related = sharedGroup(a.speciesId, b.speciesId) ? this.B.relatedMul : 1;
        const [x, y] = rubAttrsOf(a.speciesId, b.speciesId);
        const same = x === y ? this.B.sameAttrMul : 1;
        const chance = (c.bound ? this.B.bindStartChance : this.B.startChance) * chanceScale * related * same;
        if (Math.random() >= chance) continue;
        return this.start(a, b);
      }
    }
    return null;
  }

  start(a, b) {
    const c = this.combat;
    const attrs = rubAttrsOf(a.speciesId, b.speciesId);
    const known = c.p.pairBonds?.[pairKey(a.speciesId, b.speciesId)]?.completed ?? 0;
    const pair = {
      a, b, attrs, elapsed: 0, stage: 0, pulse: 0,
      // 前に絆を結んだことのある二人は、慣れていて早い
      speed: 1 + Math.min(this.B.familiarSpeedCap, known * this.B.familiarSpeedPerBond)
    };
    a.bonding = pair;
    b.bonding = pair;
    a.setDir(b.tx - a.tx, b.ty - a.ty);
    b.setDir(a.tx - b.tx, a.ty - b.ty);
    this.active.push(pair);
    c.emit('anim', { unit: a, tag: 'skill_sexyPose' });
    c.emit('anim', { unit: b, tag: 'skill_sexyPose' });
    c.emit('se', { id: 'pairStart', tx: a.tx, ty: a.ty });
    c.emit('log', 'pairStart', { a: a.name, b: b.name, act: rubLabelOf(attrs) });
    const mid = this.mid(pair);
    const ta = c.theme(a);
    const tb = c.theme(b);
    c.fx({ type: 'glyph', x: mid.x, y: mid.y + 46, style: 'heart', color: ta.main, sub: tb.main, r: 56, life: 1.6, spin: 1 });
    c.fx({ type: 'callout', x: mid.x, y: mid.y - 96, text: known ? 'また、しよ……？♡' : 'ねぇ……しよ？♡', color: ta.main, size: 22, life: 1.4 });
    c.later(0.8, () => {
      if (!this.active.includes(pair)) return;
      c.fx({ type: 'callout', x: mid.x, y: mid.y - 96, text: 'いいよ……♡', color: tb.main, size: 22, life: 1.4 });
    });
    return pair;
  }

  mid(pair) {
    const c = this.combat;
    const pa = c.body(pair.a);
    const pb = c.body(pair.b);
    return { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
  }

  // 毎フレーム（ポーズ中は dt = 0）
  update(dt) {
    if (!(dt > 0) || !this.active.length) return;
    const c = this.combat;
    for (const pair of [...this.active]) {
      if (!c.exp.units.includes(pair.a) || !c.exp.units.includes(pair.b)) {
        this.stop(pair, 'gone');
        continue;
      }
      // 片方が拘束に加わったら、そこで終わる
      if (c.bound?.binders.some((b) => b.unit === pair.a || b.unit === pair.b)) {
        this.stop(pair, 'joined');
        continue;
      }
      const seen = c.exp.map.isVisible(pair.a.tx, pair.a.ty) || c.exp.map.isVisible(pair.b.tx, pair.b.ty);
      if (!seen) {
        pair.hidden = (pair.hidden ?? 0) + dt;
        if (pair.hidden >= this.B.hiddenStopSec) this.stop(pair, 'hidden');
        continue;
      }
      pair.hidden = 0;
      pair.elapsed += dt * pair.speed;
      pair.pulse += dt;
      if (pair.pulse >= this.B.pulseSec) {
        pair.pulse -= this.B.pulseSec;
        this.rubPulse(pair);
      }
      const stages = this.B.stages;
      while (pair.stage < stages.length && pair.elapsed >= stages[pair.stage]) {
        pair.stage += 1;
        this.applyStage(pair, pair.stage);
      }
      if (pair.elapsed >= this.B.durationSec) this.complete(pair);
    }
  }

  progress(pair) {
    return Math.min(1, pair.elapsed / this.B.durationSec);
  }

  remainingSec(pair) {
    return Math.max(0, (this.B.durationSec - pair.elapsed) / pair.speed);
  }

  // こすり合わせの1回。進むほど派手になる
  rubPulse(pair) {
    const c = this.combat;
    const k = this.progress(pair);
    const mid = this.mid(pair);
    const ta = c.theme(pair.a);
    const tb = c.theme(pair.b);
    const look = RUB[pair.attrs[0]] ?? RUB.bust;
    const attrY = { mouth: -56, bust: -26, hand: -10, hip: 0, foot: 30 }[pair.attrs[0]] ?? -20;
    c.fx({ type: 'burst', x: mid.x, y: mid.y + attrY, shapes: look.shapes, colors: [ta.main, tb.main, ta.glow, '#ffd6ec'],
      count: 5 + Math.round(9 * k), speed: [30, 80 + 80 * k], size: [4, 7 + 3 * k], life: 0.9, gravity: -60, glow: k > 0.5 });
    c.fx({ type: 'ring', x: mid.x, y: mid.y + attrY, r: 18 + 16 * k, squash: pair.attrs[0] === 'bust' ? 0.7 : 1, color: ta.main, width: 3, alpha: 0.5 + 0.3 * k, life: 0.4 });
    if (Math.random() < 0.55 + 0.3 * k) {
      const text = look.texts[Math.floor(Math.random() * look.texts.length)];
      c.fx({ type: 'callout', x: mid.x + (Math.random() - 0.5) * 50, y: mid.y + attrY - 40, text, color: Math.random() < 0.5 ? ta.main : tb.main, size: 16 + 8 * k, life: 1.0, wobble: 0.08 });
    }
    c.emit('se', { id: 'pairRub', tx: pair.a.tx, ty: pair.a.ty, gain: 0.6 + 0.5 * k, params: { attr: pair.attrs[0], progress: k } });
    // ときどき、二人の声。進むほど甘くなる
    if (Math.random() < 0.35 + 0.3 * k) {
      const lines = PAIR_LINES[pair.attrs[0]] ?? PAIR_LINES.bust;
      const who = Math.random() < 0.5 ? pair.a : pair.b;
      c.speak(who, lines[Math.min(lines.length - 1, Math.floor(k * lines.length))]);
    }
    // 見せつけられて、目が離せない
    if (!c.bound) {
      for (const u of [pair.a, pair.b]) {
        const condId = conditionOfRace(u.speciesId);
        if (condId) c.handleEvents(c.conditions.gain(condId, this.B.watchCondGain * (1 + k), { floorKey: c.floorKey() }), u, null);
      }
      if (pair.stage >= 1 && !pair.watched && Math.random() < this.B.watchStatusChance) {
        pair.watched = true;
        c.handleEvents(c.conditions.addStatus('feinted', 2), pair.a, null);
        c.emit('log', 'pairWatched', { a: pair.a.name, b: pair.b.name });
        const hb = c.body(c.exp.hero);
        c.fx({ type: 'callout', x: hb.x, y: c.head(c.exp.hero).y - 60, text: '（目が、離せない……♡）', color: c.theme(pair.a).main, size: 22, life: 1.6 });
      }
    }
  }

  applyStage(pair, stage) {
    const c = this.combat;
    const B = this.B;
    const { a, b } = pair;
    const mid = this.mid(pair);
    const ta = c.theme(a);
    if (stage === 1) {
      // 能力上昇：その場でレベルが上がり、技が強くなる
      for (const u of [a, b]) {
        u.level += B.levelGain;
        u.maxHp += c.B.enemy.hpPerLevel * B.levelGain;
        u.hp = Math.min(u.maxHp, u.hp + c.B.enemy.hpPerLevel * B.levelGain);
        u.bondPower = Math.max(u.bondPower ?? 1, B.powerMul);
      }
      c.emit('log', 'pairStage1', { a: a.name, b: b.name, gain: B.levelGain });
      c.fx({ type: 'callout', x: mid.x, y: mid.y - 110, text: `能力上昇 Lv+${B.levelGain}♡`, color: ta.main, size: 22, life: 1.5 });
    } else if (stage === 2) {
      // 負け癖の共有（永続）と、こすり合わせた部位の技の強化
      const byRace = c.p.debuffs.loseHabit.byRace;
      const shared = Math.max(byRace[a.speciesId] ?? 0, byRace[b.speciesId] ?? 0);
      const changed = [];
      if (shared > 0) {
        for (const u of [a, b]) {
          if ((byRace[u.speciesId] ?? 0) < shared) {
            byRace[u.speciesId] = shared;
            changed.push(u.name);
          }
        }
      }
      for (const u of [a, b]) {
        u.bondSkillAttrs = [...new Set([...(u.bondSkillAttrs ?? []), ...pair.attrs])];
        u.bondSkillMul = Math.max(u.bondSkillMul ?? 1, B.skillMul);
      }
      c.emit('log', changed.length ? 'pairShareHabit' : 'pairStage2', { a: a.name, b: b.name, stage: shared, names: changed.join('と') });
      if (changed.length) c.deepenDebuff(`lose:${(changed[0] === a.name ? a : b).speciesId}`, `負け癖の共有・${changed.join('と')}`);
      c.fx({ type: 'callout', x: mid.x, y: mid.y - 110, text: changed.length ? '負け癖、半分こ♡' : `${ATTRS[pair.attrs[0]]?.label ?? ''}の技が強化♡`, color: ta.main, size: 22, life: 1.5 });
    }
    c.emit('se', { id: 'pairStage', tx: a.tx, ty: a.ty });
    c.fx({ type: 'ring', x: mid.x, y: mid.y + 40, r: 70, squash: 0.45, color: ta.main, width: 5, alpha: 0.8, life: 0.6 });
    c.emit('persist');
  }

  complete(pair) {
    const c = this.combat;
    const { a, b } = pair;
    this.stop(pair, 'complete');
    for (const [u, partner] of [[a, b], [b, a]]) {
      u.bondPartner = partner;
      u.bondAttrs = pair.attrs;
      u.bondPower = Math.max(u.bondPower ?? 1, this.B.completePowerMul);
    }
    const key = pairKey(a.speciesId, b.speciesId);
    c.p.pairBonds ??= {};
    const rec = (c.p.pairBonds[key] ??= { count: 0, completed: 0, lastRun: 0 });
    rec.completed += 1;
    rec.lastRun = c.p.runCount;
    const mid = this.mid(pair);
    const ta = c.theme(a);
    const tb = c.theme(b);
    const name = uniteNameOf(pair.attrs);
    c.emit('log', 'pairComplete', { a: a.name, b: b.name, skill: name });
    c.emit('se', { id: 'pairComplete' });
    c.fx({ type: 'wash', color: ta.main, alpha: 0.22, mode: 'full', life: 1.4 });
    c.fx({ type: 'glyph', x: mid.x, y: mid.y + 46, style: 'heart', color: ta.main, sub: tb.main, r: 80, life: 2.2, spin: 2 });
    c.fx({ type: 'burst', x: mid.x, y: mid.y - 30, shapes: ['heart', 'heart', 'heartLine', 'star'], colors: [ta.main, tb.main, ta.glow, '#ffffff'],
      count: 34, speed: [80, 260], size: [6, 12], life: 1.3, gravity: -40, glow: true });
    c.fx({ type: 'callout', x: mid.x, y: mid.y - 120, text: `絆の契り：${name}`, color: ta.main, size: 26, life: 2.2, wobble: 0.06 });
    c.later(0.4, () => {
      if (c.exp.units.includes(a)) c.speak(a, 'す〜……きっ♡♡♡ すきすきすきすき……♡');
    });
    c.later(1.2, () => {
      if (c.exp.units.includes(b)) c.speak(b, 'これで、二人いっしょに……♡ ねえ、次はあなたの番だよ？');
    });
    const group = sharedGroup(a.speciesId, b.speciesId);
    c.fx({ type: 'callout', delay: 1.6, x: mid.x, y: mid.y - 150, text: group ? `${ENEMY_GROUPS[group].name}の連携を覚えた` : '二人の連携を覚えた', color: tb.main, size: 18, life: 1.8 });
    c.fx({ type: 'speedLines', x: mid.x, y: mid.y, color: ta.main, count: 60, alpha: 0.5 });
    c.fx({ type: 'flash', delay: 0.2, color: ta.main, alpha: 0.4 });
    c.emit('pairCompleteCutin', { a, b, attrs: pair.attrs });
    c.emit('persist');
  }

  stop(pair, reason) {
    const c = this.combat;
    this.active = this.active.filter((p) => p !== pair);
    for (const u of [pair.a, pair.b]) {
      if (u.bonding === pair) u.bonding = null;
    }
    pair.a.bondDoneWith = [...(pair.a.bondDoneWith ?? []), pair.b.id];
    pair.b.bondDoneWith = [...(pair.b.bondDoneWith ?? []), pair.a.id];
    if (reason === 'interrupted') {
      const mid = this.mid(pair);
      c.emit('log', 'pairInterrupted', { a: pair.a.name, b: pair.b.name });
      c.fx({ type: 'callout', x: mid.x, y: mid.y - 96, text: 'あんっ、じゃましないでよぉ…！', color: c.theme(pair.a).main, size: 18, life: 1.3 });
    }
  }

  // 主人公の攻撃で中断する
  interrupt(u) {
    if (u?.bonding) this.stop(u.bonding, 'interrupted');
  }
}

export function partnerReady(u, units) {
  const p = u.bondPartner;
  return p && units.includes(p) && p.hp > 0 ? p : null;
}

export function enemyName(raceId) {
  return ENEMIES_BY_ID[raceId]?.name ?? raceId;
}
