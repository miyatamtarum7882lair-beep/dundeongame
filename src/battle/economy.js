// File: src/battle/economy.js
// お金・貢ぎ・装備・敵からの贈り物（呪いの装備）・アイテム・拠点の強化。
//   所持金        save.currentRun.gold（ランごと。敗北するとすべて貢がされる）
//   装備          save.persistent.equipment = { slots: { mouth, hand, bust, hip, foot }, bag: [] }（ランをまたぐ）
//   アイテム      save.persistent.consumables[id] = 個数
//   盗まれた物    save.persistent.stolenItems = [{ id, raceId }]（行商ちゃんの店で買い戻せる）
//   貢いだ額      save.persistent.tributes[raceId]
//   拠点          save.persistent.baseUpgrades[id] = 段階、雪辱ポイントは persistent.rp
import { ENEMIES_BY_ID, ATTRS } from '../data/enemies.js';
import { CONDITIONS } from '../data/conditioning.js';
import { ITEMS, GEAR, SLOTS, GIFT_LINES, GIFT_ACHE, giftName } from '../data/shopCatalog.js';
import { loseHeroExp } from './expDrain.js';
import { expNeeded } from './damage.js';
import { corruptionState } from '../data/corruption.js';

export function ensureEconomy(p) {
  p.equipment ??= {};
  p.equipment.slots ??= {};
  for (const s of SLOTS) p.equipment.slots[s] ??= null;
  p.equipment.bag ??= [];
  p.consumables ??= {};
  for (const id of Object.keys(ITEMS)) p.consumables[id] ??= 0;
  p.stolenItems ??= [];
  p.tributes ??= {};
  p.baseUpgrades ??= {};
  return p;
}

export function makeGear(id) {
  const g = GEAR[id];
  const item = { kind: 'gear', id, slot: g.slot, name: g.name, resist: g.resist, dur: g.dur, maxDur: g.dur };
  if (g.touchAlways) item.touchAlways = true;
  if (g.attackMul) item.attackMul = g.attackMul;
  return item;
}

export class Economy {
  /** @param {import('./combat.js').Combat} combat */
  constructor(combat) {
    this.combat = combat;
  }

  get B() { return this.combat.B; }
  get p() { return ensureEconomy(this.combat.p); }
  get run() { return this.combat.save.currentRun; }

  // ---- 耐性（基本値 + 装備 + 拠点）----
  resistanceOf(attr) {
    const p = this.p;
    let v = p.resistances[attr] ?? 0;
    const item = p.equipment.slots[attr];
    if (item?.kind === 'gear' && item.dur > 0) v += item.resist;
    if (item?.kind === 'gift') v -= this.B.gifts.resistDownPerLevel * item.level;
    v += 3 * (p.baseUpgrades.resistAll ?? 0);
    return v;
  }

  // 攻撃すると必ずチャームポイントに触れてしまう装備（触れたがりの手袋）
  touchGear() {
    for (const s of SLOTS) {
      const it = this.p.equipment.slots[s];
      if (it?.kind === 'gear' && it.dur > 0 && (it.touchAlways || GEAR[it.id]?.touchAlways)) return it;
    }
    return null;
  }

  attackMul() {
    let m = 1;
    for (const s of SLOTS) {
      const it = this.p.equipment.slots[s];
      if (it?.kind === 'gear' && it.dur > 0) m *= it.attackMul ?? GEAR[it.id]?.attackMul ?? 1;
    }
    return m;
  }

  giftsOf(raceId) {
    return SLOTS.map((s) => this.p.equipment.slots[s]).filter((it) => it?.kind === 'gift' && it.raceId === raceId);
  }

  giftLevel(raceId) {
    return this.giftsOf(raceId).reduce((sum, g) => sum + g.level, 0);
  }

  allGiftLevel() {
    return SLOTS.reduce((sum, s) => sum + (this.p.equipment.slots[s]?.kind === 'gift' ? this.p.equipment.slots[s].level : 0), 0);
  }

  // その種族から受ける吸収の倍率（贈り物の呪い・貢いだ額）
  drainMulFrom(raceId) {
    const T = this.B.tribute;
    const tribute = Math.min(T.drainCap, (this.p.tributes[raceId] ?? 0) * T.drainPerGold);
    return (1 + this.B.gifts.drainPerLevel * this.giftLevel(raceId)) * (1 + tribute);
  }

  escapeMulFrom(raceId) {
    return 1 + this.B.gifts.escapePerLevel * this.giftLevel(raceId);
  }

  // ---- お金 ----
  gainGold(amount, x, y) {
    const c = this.combat;
    const n = Math.max(0, Math.round(amount * (1 + this.B.gifts.goldBonusPerLevel * this.allGiftLevel())));
    if (!n) return 0;
    this.run.gold += n;
    if (x !== undefined) c.fx({ type: 'damage', delay: 0.3, x, y, text: `+${n}G`, style: 'heal' });
    c.emit('log', 'goldGain', { amount: n, total: this.run.gold });
    return n;
  }

  killReward(enemy) {
    const K = this.B.economy.killGold;
    const b = this.combat.body(enemy);
    this.gainGold(K.base + K.perLevel * enemy.level, b.x, this.combat.head(enemy).y - 20);
  }

  expRewardMul() {
    const perfume = (this.run.perfumeTurns ?? 0) > 0 ? this.B.economy.perfumeExpMul : 1;
    return perfume * (1 + this.B.gifts.expBonusPerLevel * this.allGiftLevel());
  }

  // 盗む技が当たった：お金と、ときどきアイテムを盗まれる
  steal(e, skillId) {
    const S = this.B.economy.steal[skillId];
    if (!S) return;
    const c = this.combat;
    const hb = c.body(c.exp.hero);
    const hy = c.head(c.exp.hero).y;
    const gold = Math.min(this.run.gold, Math.round(this.run.gold * (S.gold ?? 0)));
    if (gold > 0) {
      this.run.gold -= gold;
      this.p.tributes[e.speciesId] = (this.p.tributes[e.speciesId] ?? 0) + gold;
      c.emit('log', 'goldStolen', { name: e.name, amount: gold });
      c.fx({ type: 'flow', from: { x: hb.x, y: hb.y - 10 }, to: c.head(e), shapes: ['dot', 'heart'], colors: ['#ffd36b', '#fff2b0', c.theme(e).main], count: 12, size: [4, 7], life: 0.6, glow: true });
      c.fx({ type: 'damage', delay: 0.2, x: hb.x, y: hy - 70, text: `-${gold}G`, style: 'mp' });
      c.emit('se', { id: 'coinTribute', tx: e.tx, ty: e.ty, gain: 0.7 });
    }
    if (S.item && Math.random() < S.item) {
      const owned = Object.entries(this.p.consumables).filter(([, n]) => n > 0).map(([id]) => id);
      if (owned.length) {
        const id = owned[Math.floor(Math.random() * owned.length)];
        this.p.consumables[id] -= 1;
        this.p.stolenItems.push({ id, raceId: e.speciesId });
        c.emit('log', 'itemStolen', { name: e.name, item: ITEMS[id].name });
        c.fx({ type: 'callout', delay: 0.35, x: c.body(e).x, y: c.head(e).y - 30, text: `${ITEMS[id].name}、もーらい♡`, color: c.theme(e).main, size: 18 });
      }
    }
  }

  // ---- アイテムを奪われ、その場で使われる ----
  // 隣にいる敵（または拘束している敵）がポーチを漁り、奪ったアイテムを敵の都合のいいように使う
  canSnatch(e) {
    if (!e || e.kind !== 'enemy') return false;
    if ((e.snatchCooldown ?? -Infinity) > this.combat.exp.turnCount) return false;
    return Object.values(this.p.consumables).some((n) => n > 0);
  }

  snatchAndUse(e) {
    if (!this.canSnatch(e)) return null;
    const c = this.combat;
    const S = this.B.itemSnatch;
    const owned = Object.entries(this.p.consumables).filter(([, n]) => n > 0).map(([id]) => id);
    const id = owned[Math.floor(Math.random() * owned.length)];
    this.p.consumables[id] -= 1;
    e.snatchCooldown = c.exp.turnCount + S.cooldownTurns;
    c.actedThisTurn = true;
    const hero = c.exp.hero;
    const hb = c.body(hero);
    const eb = c.body(e);
    const eh = c.head(e);
    const th = c.theme(e);
    const name = ITEMS[id].name;
    e.setDir?.(hero.tx - e.tx, hero.ty - e.ty);
    c.emit('anim', { unit: e, tag: 'skill_blowKiss' });
    // 1) ポーチを漁られる → アイテムが敵の手へ
    c.fx({ type: 'ring', x: hb.x, y: hb.y + 6, r: 30, squash: 0.6, color: th.main, width: 3, alpha: 0.7, life: 0.4 });
    c.fx({ type: 'flow', delay: 0.25, from: { x: hb.x, y: hb.y + 4 }, to: { x: eb.x, y: eh.y }, shapes: ['star', 'heart', 'dot'], colors: ['#ffffff', '#9fe3ff', th.main], count: 14, size: [4, 8], life: 0.6, glow: true });
    c.fx({ type: 'callout', delay: 0.3, x: eb.x, y: eh.y - 34, text: `${name}、もーらい♡`, color: th.main, size: 20, life: 1.3 });
    c.emit('se', { id: 'pouchRummage', tx: e.tx, ty: e.ty });
    c.emit('log', 'itemSnatched', { name: e.name, item: name });
    // 2) 敵が、自分の都合のいいように使う
    const effect = this.snatchEffect(e, id);
    c.later(0.9, () => {
      c.fx({ type: 'wash', color: th.main, alpha: 0.2, mode: 'full', life: 1.0 });
      c.fx({ type: 'burst', x: eb.x, y: eh.y, shapes: ['heart', 'star'], colors: [th.main, th.glow, '#ffffff'], count: 16, speed: [50, 150], size: [4, 8], life: 0.9, gravity: -40, glow: true });
      c.fx({ type: 'callout', x: hb.x, y: c.head(hero).y - 70, text: effect.callout, color: th.main, size: 20, life: 1.6 });
      c.emit('se', { id: 'snatchUse', tx: e.tx, ty: e.ty });
      if (c.exp.units.includes(e)) c.speak(e, effect.line);
      c.emit('log', 'itemSnatchUsed', { name: e.name, item: name, text: effect.text });
    });
    c.emit('persist');
    return { id, ...effect };
  }

  snatchEffect(e, id) {
    const c = this.combat;
    const S = this.B.itemSnatch;
    const hs = c.hs;
    const hero = c.exp.hero;
    const hb = c.body(hero);
    const th = c.theme(e);
    const condId = conditionOfRace(e.speciesId);
    const gainCond = (cid, n, unit) => {
      if (cid) c.handleEvents(c.conditions.gain(cid, n, { floorKey: c.floorKey() }), unit, null);
    };
    if (id === 'manaVial') {
      const heal = Math.round(e.maxHp * S.healRate);
      e.hp = Math.min(e.maxHp, e.hp + heal);
      const lose = Math.min(hs.mp, Math.round(hs.maxMp * S.mpStealRate));
      hs.mp -= lose;
      c.fx({ type: 'flow', delay: 1.1, from: { x: hb.x, y: c.head(hero).y + 4 }, to: c.head(e), shapes: ['heart', 'dot'], colors: [th.main, '#9fe3ff'], count: 14, size: [4, 7], life: 0.7, glow: true });
      c.fx({ type: 'damage', delay: 1.2, x: hb.x, y: c.head(hero).y - 20, text: `MP -${lose}`, style: 'mp' });
      if (lose > 0) c.later(1.2, () => c.gainDrainExperience(e, lose));
      return { text: `魔力の小瓶を飲まれ、口移しで MP を ${lose} 吸われた`, callout: '（口移しで、魔力ごと吸われる……♡）', line: 'んく……ぷは♡ 半分、口移しで返してあげる……ちゅ♡ ……あ、ごめん、ぜんぶ吸っちゃった♡' };
    }
    if (id === 'soothingIncense') {
      gainCond(condId, S.incenseGain, e);
      c.fx({ type: 'cloud', delay: 0.9, from: c.body(e), to: hb, colors: [th.main, th.glow, '#ffd6ec'], count: 16, r: [20, 70], life: 1.6, spread: 70, lift: 16 });
      return { text: '安らぎの香を、その子の匂いに変えて焚かれた', callout: '（甘い匂いが、肺の奥まで……♡）', line: 'このお香、わたしの匂いに変えちゃった♡ ほら、深呼吸して？ もっと、わたしで満たしてあげる' };
    }
    if (id === 'purifyingDrop') {
      c.handleEvents(c.conditions.addStatus('tempted', S.temptTurns), e, null);
      return { text: '浄めの雫を、その子のチャームポイントに垂らして見せつけられた', callout: '（きらきら濡れて……目が、離せない♡）', line: 'ほら、見て♡ 浄めの雫、ここに垂らすと……きらきらしてきれいでしょ？ 触りたい？' };
    }
    if (id === 'lurePerfume') {
      for (const u of c.exp.units) if (u.kind === 'enemy') u.lured = true;
      for (const u of c.exp.units) {
        if (u.kind !== 'enemy' || !c.exp.map.isVisible(u.tx, u.ty)) continue;
        gainCond(conditionOfRace(u.speciesId), S.perfumeGain, u);
      }
      c.handleEvents(c.conditions.addStatus('feinted', 3), e, null);
      c.fx({ type: 'cloud', delay: 0.9, from: c.body(e), to: hb, colors: ['#ff9fd0', '#ffd6ec', th.main], count: 20, r: [30, 90], life: 1.8, spread: 110, lift: 20 });
      return { text: '誘惑の香水を、その子自身に振りかけられた。この階の敵がみんな寄ってくる', callout: '（みんなの匂いが、混ざって……♡）', line: 'しゅっ♡ ふふ、これでみーんな、あなたのところに集まってくるよ？ 楽しみだね♡' };
    }
    // 身代わりのお守り：キスで穢されて、砕かれる
    c.later(1.1, () => c.gainDrainExperience(e, S.amuletExp));
    gainCond(condId, 1, e);
    return { text: '身代わりのお守りに口づけされ、砕かれた', callout: '（お守りが……あの子の色に……）', line: 'ちゅ♡ ……はい、もう守ってくれないね。これからは、わたしが守ってあげる♡' };
  }

  // 拘束中のおねだりに、お金を差し出す（貢ぎ）。脱出が進む代わりに、その敵が強くなる
  tribute(unit) {
    const c = this.combat;
    const T = this.B.tribute;
    const bound = c.bound;
    if (!bound || this.run.gold < T.min) return 0;
    const amount = Math.max(T.min, Math.round(this.run.gold * T.rate));
    this.run.gold -= amount;
    this.p.tributes[unit.speciesId] = (this.p.tributes[unit.speciesId] ?? 0) + amount;
    bound.escapeProgress = Math.min(bound.requiredClicks, bound.escapeProgress + bound.requiredClicks * T.escapeGain);
    const hb = c.body(c.exp.hero);
    const th = c.theme(unit);
    c.fx({ type: 'flow', from: { x: hb.x, y: hb.y - 10 }, to: c.head(unit), shapes: ['dot', 'dot', 'heart'], colors: ['#ffd36b', '#fff2b0', th.main], count: 22, size: [4, 8], life: 0.7, glow: true });
    c.fx({ type: 'callout', delay: 0.2, x: c.body(unit).x, y: c.head(unit).y - 34, text: `${amount}G、ごちそうさま♡`, color: th.main, size: 22 });
    c.emit('se', { id: 'coinTribute', tx: unit.tx, ty: unit.ty });
    c.emit('log', 'tribute', { name: unit.name, amount, total: this.p.tributes[unit.speciesId] });
    c.later(0.6, () => c.gainDrainExperience(unit, amount * T.expPerGold));
    c.emit('persist');
    return amount;
  }

  // ---- 敵からの贈り物（呪いの装備）----
  rollGift(enemy, attr, kind) {
    const chance = this.B.gifts.chance[kind] ?? 0;
    if (!enemy || Math.random() >= chance) return null;
    return this.forceGift(enemy, attr);
  }

  forceGift(enemy, attr) {
    const c = this.combat;
    const p = this.p;
    const slot = SLOTS.includes(attr) ? attr : (ENEMIES_BY_ID[enemy.speciesId]?.attr ?? 'mouth');
    const slotKey = SLOTS.includes(slot) ? slot : 'mouth';
    const cur = p.equipment.slots[slotKey];
    const G = this.B.gifts;
    let item;
    if (cur?.kind === 'gift' && cur.raceId === enemy.speciesId) {
      if (cur.level >= G.maxLevel) return null;
      cur.level += 1;
      item = cur;
      c.emit('log', 'giftDeepen', { name: enemy.name, item: item.name, level: item.level });
    } else {
      if (cur) p.equipment.bag.push(cur);   // 着けていた物は脱がされる
      item = { kind: 'gift', id: `gift:${enemy.speciesId}:${slotKey}`, slot: slotKey, raceId: enemy.speciesId, name: giftName(enemy.speciesId, slotKey), level: 1 };
      p.equipment.slots[slotKey] = item;
      c.emit('log', 'giftEquip', { name: enemy.name, item: item.name, removed: cur?.name ?? '' });
    }
    // 演出：その子の色で包まれ、名前が刻まれる
    const hero = c.exp.hero;
    const hb = c.body(hero);
    const hy = c.head(hero).y;
    const th = c.theme(enemy);
    const y = { mouth: hy + 6, hand: hb.y + 6, bust: hb.y - 18, hip: hb.y + 14, foot: hb.y + 38 }[slotKey];
    c.later(0.6, () => {
      c.fx({ type: 'wash', color: th.main, alpha: 0.26, mode: 'full', life: 1.3 });
      c.fx({ type: 'swirl', x: hb.x, y, shapes: ['heart', 'ribbon', 'heartLine'], colors: [th.main, th.glow, '#ffd6ec'], count: 18, r0: 90, r1: 8, turns: 1.4, life: 0.9, size: [5, 9], glow: true });
      c.fx({ type: 'burst', delay: 0.85, x: hb.x, y, shapes: ['heart', 'heart'], colors: [th.main, '#ff2d86'], count: 14, speed: [60, 160], size: [5, 9], life: 0.9, glow: true });
      c.fx({ type: 'callout', delay: 0.5, x: hb.x, y: hy - 130, text: item.level > 1 ? `${item.name}が食い込む…（${item.level}段）` : `${item.name}を着けられた…`, color: th.main, size: 24, life: 2.0, rise: 14 });
      c.emit('se', { id: 'giftEquip', tx: enemy.tx, ty: enemy.ty });
      const lines = GIFT_LINES[slotKey];
      c.speak(enemy, lines[Math.min(lines.length - 1, item.level - 1)]);
    });
    c.emit('persist');
    return item;
  }

  // 階の始まり：着けている贈り物が疼いて、その子への負け癖が進むことがある
  onFloorStart() {
    const c = this.combat;
    const p = this.p;
    const G = this.B.gifts;
    for (const s of SLOTS) {
      const g = p.equipment.slots[s];
      if (g?.kind !== 'gift' || Math.random() >= G.acheChancePerLevel * g.level) continue;
      const byRace = p.debuffs.loseHabit.byRace;
      const before = byRace[g.raceId] ?? 0;
      if (before >= this.B.habit.loseMax) continue;
      byRace[g.raceId] = before + 1;
      c.emit('log', 'giftAche', { text: GIFT_ACHE[s], name: ENEMIES_BY_ID[g.raceId]?.name ?? g.raceId, stage: before + 1 });
    }
  }

  // 贈り物を着けた種族は、匂いをたどって追ってくる
  luresRace(raceId) {
    return this.giftLevel(raceId) > 0;
  }

  // 拘束の吸収1回ごとに、その部位の装備が溶かされる
  wearGear(binders) {
    const c = this.combat;
    for (const { attr, unit } of binders) {
      const item = this.p.equipment.slots[attr];
      if (item?.kind !== 'gear' || item.dur <= 0) continue;
      item.dur = Math.max(0, item.dur - this.B.economy.gearWearPerPulse);
      if (item.dur > 0) continue;
      this.p.equipment.slots[attr] = null;
      const hb = c.body(c.exp.hero);
      c.emit('log', 'gearMelted', { name: unit.name, item: item.name });
      c.emit('se', { id: 'gearMelt', tx: unit.tx, ty: unit.ty });
      c.fx({ type: 'burst', x: hb.x, y: hb.y - 10, shapes: ['bubble', 'heart'], colors: ['#ff9fd0', '#ffd6ec', '#c2006b'], count: 18, speed: [40, 140], size: [4, 9], life: 1.1, gravity: 120 });
      c.fx({ type: 'callout', x: hb.x, y: c.head(c.exp.hero).y - 60, text: `${item.name}が溶かされた…`, color: '#ff4fa3', size: 22, life: 1.6 });
    }
  }

  // ---- 装備の付け外し（贈り物は自分では外せない）----
  equipFromBag(index) {
    const p = this.p;
    const item = p.equipment.bag[index];
    if (!item || item.kind !== 'gear') return { ok: false, message: 'それは着けられない' };
    const cur = p.equipment.slots[item.slot];
    if (cur?.kind === 'gift') return { ok: false, message: `${cur.name}が外れない……（行商ちゃんに頼むしかない）` };
    p.equipment.bag.splice(index, 1);
    if (cur) p.equipment.bag.push(cur);
    p.equipment.slots[item.slot] = item;
    return { ok: true, message: `${item.name}を装備した` };
  }

  unequip(slot) {
    const p = this.p;
    const cur = p.equipment.slots[slot];
    if (!cur) return { ok: false, message: '何も着けていない' };
    if (cur.kind === 'gift') return { ok: false, message: `${cur.name}が外れない……（行商ちゃんに頼むしかない）` };
    p.equipment.slots[slot] = null;
    p.equipment.bag.push(cur);
    return { ok: true, message: `${cur.name}を外した` };
  }

  // ---- アイテム ----
  canUseItem(id) {
    if (!ITEMS[id] || ITEMS[id].passive) return false;
    return (this.p.consumables[id] ?? 0) > 0 && !this.combat.bound && !this.combat.defeated;
  }

  useItem(id) {
    const c = this.combat;
    const E = this.B.economy;
    if (!this.canUseItem(id)) return { ok: false, message: c.bound ? '拘束されていて使えない' : '使えない' };
    this.p.consumables[id] -= 1;
    const hs = c.hs;
    const hb = c.body(c.exp.hero);
    const hy = c.head(c.exp.hero).y;
    let message = '';
    if (id === 'soothingIncense') {
      const gauges = this.run.heroStatus?.gauges ?? {};
      for (const k of Object.keys(gauges)) gauges[k] = Math.max(0, gauges[k] - E.incenseDrop);
      message = '甘い残り香が、少し薄れた';
    } else if (id === 'purifyingDrop') {
      if (this.run.heroStatus) this.run.heroStatus.statuses = [];
      message = '体にまとわりつく誘惑が、すっと消えた';
    } else if (id === 'manaVial') {
      const n = Math.min(hs.maxMp - hs.mp, Math.round(hs.maxMp * E.manaVialRate));
      hs.mp += n;
      c.fx({ type: 'damage', x: hb.x, y: hy - 20, text: `MP +${n}`, style: 'heal' });
      message = `MP が ${n} 回復した`;
    } else if (id === 'lurePerfume') {
      this.run.perfumeTurns = E.perfumeTurns;
      for (const u of c.exp.units) if (u.kind === 'enemy') u.lured = true;
      c.fx({ type: 'cloud', from: hb, to: hb, colors: ['#ff9fd0', '#ffd6ec', '#ff4fa3'], count: 16, r: [20, 70], life: 1.6, spread: 80, lift: 20 });
      message = '甘い香りが広がる……この階の敵が、みんな寄ってくる';
    }
    c.fx({ type: 'burst', x: hb.x, y: hy, shapes: ['star', 'heart'], colors: ['#ffffff', '#9fe3ff', '#ffd6ec'], count: 12, speed: [40, 120], size: [4, 7], life: 0.8 });
    c.emit('se', { id: 'itemUse' });
    c.emit('log', 'itemUsed', { item: ITEMS[id].name, text: message });
    c.emit('persist');
    return { ok: true, message: `${ITEMS[id].name}：${message}` };
  }

  // 絶頂の瞬間の吸い上げを、身代わりのお守りが1回だけ防ぐ
  consumeAmulet() {
    if ((this.p.consumables.charmAmulet ?? 0) <= 0) return false;
    this.p.consumables.charmAmulet -= 1;
    const c = this.combat;
    const hb = c.body(c.exp.hero);
    c.fx({ type: 'ring', x: hb.x, y: hb.y - 10, r: 80, color: '#9fe3ff', width: 6, alpha: 0.9, life: 0.7 });
    c.fx({ type: 'callout', x: hb.x, y: c.head(c.exp.hero).y - 90, text: '身代わりのお守りが砕けた！', color: '#9fe3ff', size: 24, life: 1.6 });
    c.emit('se', { id: 'autoGuard' });
    c.emit('log', 'amuletBlock', {});
    return true;
  }

  endTurn() {
    if ((this.run.perfumeTurns ?? 0) > 0) this.run.perfumeTurns -= 1;
  }

  // ---- 行商ちゃん ----
  priceMul() {
    const level = corruptionState(this.combat.p).level;
    const disc = 1 - 0.05 * (this.p.baseUpgrades.merchantDiscount ?? 0);
    return (1 + this.B.merchant.corruptionPriceMul * level) * disc * (this.run.merchantDeal ? this.B.merchant.dealDiscount : 1);
  }

  price(base) {
    return Math.max(1, Math.round(base * this.priceMul()));
  }

  // 支払い。お金か、経験値で（経験値で払うと、レベルが吸われる）
  pay(gold, method) {
    const c = this.combat;
    if (method === 'exp') {
      const need = Math.round(gold * this.B.merchant.expPerGold);
      const hs = c.hs;
      const res = loseHeroExp(hs, need, { needFn: (lv) => expNeeded(lv, this.B), levelUp: this.B.battle.levelUp, minLevel: 1, keepHp: true });
      if (res.lost <= 0) return { ok: false, message: 'もう吸える経験値が無いみたい♡' };
      c.emit('heroExpDrained', { amount: res.lost, levelsLost: res.levelsLost, level: hs.level });
      this.run.merchantDeal = false;
      return { ok: true, paidExp: res.lost, levelsLost: res.levelsLost };
    }
    if (this.run.gold < gold) return { ok: false, message: 'お金が足りない' };
    this.run.gold -= gold;
    this.run.merchantDeal = false;
    return { ok: true, paidGold: gold };
  }

  buyItem(id, method) {
    const res = this.pay(this.price(ITEMS[id].price), method);
    if (res.ok) this.p.consumables[id] = (this.p.consumables[id] ?? 0) + 1;
    return res;
  }

  buyGear(id, method) {
    const res = this.pay(this.price(GEAR[id].price), method);
    if (!res.ok) return res;
    const item = makeGear(id);
    const cur = this.p.equipment.slots[item.slot];
    if (!cur) this.p.equipment.slots[item.slot] = item;
    else this.p.equipment.bag.push(item);
    return { ...res, equipped: !cur };
  }

  giftRemovePrice(item) {
    const R = this.B.merchant.removeGift;
    return this.price(R.base + R.perLevel * (item.level - 1));
  }

  removeGift(slot, method) {
    const item = this.p.equipment.slots[slot];
    if (item?.kind !== 'gift') return { ok: false, message: '外す物が無い' };
    const res = this.pay(this.giftRemovePrice(item), method);
    if (res.ok) this.p.equipment.slots[slot] = null;
    return res;
  }

  buyBack(index, method) {
    const st = this.p.stolenItems[index];
    if (!st) return { ok: false, message: 'もう無い' };
    const res = this.pay(this.price(ITEMS[st.id].price * this.B.merchant.buyBackMul), method);
    if (!res.ok) return res;
    this.p.stolenItems.splice(index, 1);
    this.p.consumables[st.id] = (this.p.consumables[st.id] ?? 0) + 1;
    return res;
  }

  // 負け癖を差し出して、次の買い物を値引きしてもらう
  dealLoseHabit(raceId) {
    const byRace = this.p.debuffs.loseHabit.byRace;
    const before = byRace[raceId] ?? 0;
    if (before >= this.B.habit.loseMax) return { ok: false, message: 'もうこれ以上は深まらない' };
    byRace[raceId] = before + 1;
    this.run.merchantDeal = true;
    this.combat.emit('log', 'loseHabitUp', { name: ENEMIES_BY_ID[raceId]?.name ?? raceId, stage: before + 1 });
    return { ok: true };
  }

  // ---- 拠点 ----
  applyNewRun() {
    const p = this.p;
    const u = p.baseUpgrades;
    this.run.gold = 50 * (u.startGold ?? 0);
    const amulets = u.amulet ?? 0;
    if ((p.consumables.charmAmulet ?? 0) < amulets) p.consumables.charmAmulet = amulets;
  }

  rpForDefeat(floor, climaxes) {
    const R = this.B.baseCamp.rpOnDefeat;
    return R.base + R.perFloor * Math.max(0, floor - 1) + R.perClimax * climaxes;
  }
}

export function conditionOfRace(raceId) {
  return Object.keys(CONDITIONS).find((id) => CONDITIONS[id].source === raceId) ?? null;
}

export { ATTRS };
