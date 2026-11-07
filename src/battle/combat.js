// File: src/battle/combat.js
// 戦闘の進行（TURN モード）。主人公の攻撃・防御、敵の行動の抽選、仲間の回復、敗北の記録を受け持つ。
// 画面には依存しない。演出は 'fx' / 'anim' / 'se' / 'log' / 'learning' / 'persist' のイベントで外へ渡す。
import { Emitter, clamp } from '../core/util.js';
import { ENEMIES_BY_ID, ATTRS } from '../data/enemies.js';
import { DEFEAT_SKILLS } from '../data/defeatSkills.js';
import { SKILL_DEFS } from '../data/skills.js';
import { joinEffectFor } from '../data/flashbackData.js';
import { RACE_ABILITIES_BY_ID, drainAbilityId } from '../data/raceAbilities.js';
import { chebyshev } from '../dungeon/gridMath.js';
import {
  applyLearning, pickWeighted, getMarkScore, getRememberedSkill, recordDefeat, recordMarkEvent
} from './learning.js';
import { addAbilityProgress, getAbilityLevel } from './raceGrowth.js';
import { getSoftness, softnessEffects, touchChanceAddFor, bindersSoftness } from './softness.js';
import { rollRate, calcDamage, expNeeded, expReward } from './damage.js';
import { calcRequiredClicks } from './escape.js';
import { ClimaxController } from './climaxController.js';
import { BuffManager, BUFFS, BUFF_IDS } from './buffs.js';
import { loseHeroExp } from './expDrain.js';
import { FlashbackController } from './flashback.js';
import { FLASHBACK_STRONG } from '../data/flashbackRules.js';

const WEAPON_NAMES = { sword: '剣', fist: '拳' };
const ALLY_NAMES = { priest: '僧侶', mage: '魔法使い' };

function attackTag(dx, dy) {
  if (Math.abs(dx) >= Math.abs(dy)) return 'attack_side';
  return dy > 0 ? 'attack_down' : 'attack_up';
}
function bindTag(dx, dy) {
  return Math.abs(dx) >= Math.abs(dy) ? 'bind_side' : 'bind_down';
}

export class Combat extends Emitter {
  constructor(B, save, exp) {
    super();
    this.B = B;
    this.save = save;
    this.exp = exp;
    this.defeated = null;        // { raceId, skillId, attr, name }
    this.stunTurns = 0;
    this.guarding = false;
    this.beat = 0;
    this.actedThisTurn = false;
    this.grown = new Set();      // 同じ階では、同じ能力は+1Lvまで
    this.bound = null;
    this.escapeInvulnTurns = 0;

    const run = () => this.save.currentRun;
    this.buffs = new BuffManager();
    this.buffs.restore(run().buffs ?? []);
    this.climax = new ClimaxController({
      getCount: () => run().climaxCount ?? 0,
      setCount: (n) => {
        run().climaxCount = n;
      },
      emit: (name, payload) => {
        this.onClimaxEvent(name, payload);
        this.emit(name, payload);
      },
      releaseBinders: () => this.escapeBound('climax'),
      restoreMp: () => {
        this.hs.mp = this.hs.maxMp;
      },
      onSecond: (info) => this.climaxSecond(info),
      getHp: () => this.hs.hp,
      getMaxHp: () => this.hs.maxHp,
      loseHp: (n) => {
        this.hs.hp = Math.max(0, this.hs.hp - n);
      },
      onDefeat: () => this.defeatByClimax(),
      getBinderCount: () => this.bound?.binders.length ?? 1
    });
    this.climax.restore({ afterglowTurns: run().afterglowTurns ?? 0 });
    this.flashback = new FlashbackController({
      cfg: this.B.flashbackFx,
      getMode: () => this.save.settings.flashback ?? 'full',
      getFloorKey: () => {
        const r = this.save.currentRun;
        return `${r.seed}:${r.dungeon}:${r.floor}`;
      },
      emit: (name, payload) => this.emit(name, payload),
      isBlocked: () => this.climax.isClimax() || this.climax.isAfterglow()
    });
  }

  get hs() {
    return this.save.currentRun.hero;
  }

  get p() {
    return this.save.persistent;
  }

  // ---- 位置（ワールド座標。ドット層と同じ座標）----
  body(u) {
    const T = this.B.tile.size;
    return { x: u.tx * T + T / 2, y: (u.ty + 1) * T - 48 };
  }

  head(u) {
    const T = this.B.tile.size;
    return { x: u.tx * T + T / 2, y: (u.ty + 1) * T - 104 };
  }

  fx(e) {
    this.emit('fx', e);
  }

  nextDelay() {
    const d = this.beat * this.B.battle.beatSec;
    this.beat += 1;
    return d;
  }

  attrOf(raceId, fallback = 'mouth') {
    const attr = ENEMIES_BY_ID[raceId]?.attr;
    return !attr || attr === 'all' ? fallback : attr;
  }

  resetFloor() {
    this.grown = new Set();
    this.beat = 0;
    this.stunTurns = 0;
    this.guarding = false;
    this.bound = null;
    this.escapeInvulnTurns = 0;
    this.buffs.restore(this.save.currentRun.buffs ?? []);
    this.climax.restore({ afterglowTurns: this.save.currentRun.afterglowTurns ?? 0 });
    this.flashback.cancel();
    this.flashback.syncFloor();
  }

  beginTurn() {
    this.beat = 0;
    this.actedThisTurn = false;
    this.guarding = false;
  }

  // ---- 主人公の行動 ----
  toggleWeapon() {
    const hs = this.hs;
    hs.weapon = hs.weapon === 'fist' ? 'sword' : 'fist';
    this.emit('log', 'weaponSwitch', { weapon: WEAPON_NAMES[hs.weapon] });
    this.emit('persist');
  }

  heroGuard() {
    const hero = this.exp.hero;
    this.guarding = true;
    const b = this.body(hero);
    this.emit('anim', { unit: hero, tag: 'guard' });
    this.fx({ type: 'ring', x: b.x, y: b.y, r: 52 });
    this.emit('se', { id: 'tick', tx: hero.tx, ty: hero.ty });
  }

  heroAttack(enemy) {
    const { B, p } = this;
    const hs = this.hs;
    const hero = this.exp.hero;
    const weapon = hs.weapon === 'fist' ? 'fist' : 'sword';
    const W = B.weapons[weapon];

    // 負け癖が深いほど、その種族への攻撃が弱くなる
    const stage = p.debuffs.loseHabit.byRace[enemy.speciesId] ?? 0;
    const cut = Math.min(stage * B.habit.loseAttackPerStage, B.habit.loseAttackCap);
    const rate = rollRate(B.battle.rate[weapon] * (1 - cut), W.minRate, W.maxRate, hs.level - enemy.level, B);
    const dmg = calcDamage(enemy.maxHp, rate);
    enemy.hp = Math.max(0, enemy.hp - dmg);

    this.actedThisTurn = true;
    const d = this.nextDelay();
    const dx = enemy.tx - hero.tx;
    const dy = enemy.ty - hero.ty;
    const b = this.body(enemy);

    this.emit('anim', { unit: hero, tag: attackTag(dx, dy) });
    if (weapon === 'sword') this.fx({ type: 'slash', delay: d, x: b.x, y: b.y, dx, dy });
    else this.fx({ type: 'impact', delay: d + 0.04, x: b.x, y: b.y, size: 36 });
    this.fx({ type: 'sparks', delay: d + 0.05, x: b.x, y: b.y, color: '#fff0b8', count: weapon === 'fist' ? 10 : 6 });
    this.fx({ type: 'damage', delay: d + 0.06, x: b.x, y: this.head(enemy).y, text: String(dmg), style: 'enemy' });
    this.emit('se', { id: weapon === 'sword' ? 'slash' : 'thud', tx: enemy.tx, ty: enemy.ty, delay: d });

    if (enemy.hp > 0) {
      this.emit('anim', { unit: enemy, tag: 'hit', delay: d + 0.05 });
    }
    if (weapon === 'fist') this.touchCheck(enemy, d);
    if (enemy.hp <= 0) this.killEnemy(enemy, d + 0.1);
  }

  // 拳で非拘束の敵を殴ったときの接触ペナルティ（5.3）
  touchCheck(enemy, d) {
    if (this.climax.isStatusImmune()) return;
    const { B, p } = this;
    const hs = this.hs;
    const hero = this.exp.hero;
    const attr = this.attrOf(enemy.speciesId);
    const chance = B.weapons.fist.touchChance + touchChanceAddFor(enemy.speciesId, attr, B, p.softnessOverrides);
    if (Math.random() >= chance) return;

    const kind = Math.floor(Math.random() * 3);
    let effect;
    if (kind === 0) {
      this.stunTurns += 1;
      effect = '行動不能';
    } else if (kind === 1) {
      const lose = Math.min(hs.mp, Math.round(hs.maxMp * B.battle.touch.mpRate));
      hs.mp -= lose;
      effect = `MP -${lose}`;
    } else {
      const cur = p.resistances[attr] ?? 0;
      const next = Math.max(B.resist.floor, cur - B.battle.touch.resistDrop);
      p.resistances[attr] = next;
      effect = `${ATTRS[attr].label}耐性 ${cur} → ${next}`;
    }

    const th = p.debuffs.touchHabit;
    th.count += 1;
    const stage = Math.min(B.habit.touchMax, Math.floor(th.count / B.habit.touchPerStage));
    if (stage > th.stage) {
      th.stage = stage;
      this.emit('log', 'touchHabitUp', { stage });
    }

    this.abilityEvents(addAbilityProgress(p, enemy.speciesId, 'weaknessLearn', B, { pts: 1, grownThisBattle: this.grown }));
    const hb = this.body(hero);
    this.fx({ type: 'hearts', delay: d + 0.1, x: hb.x, y: hb.y - 20, count: 7, size: 0.9 });
    this.emit('log', 'touchPenalty', { name: enemy.name, effect });
    this.requestFlashback('touch', enemy, attr);
    this.emit('persist');
  }

  requestFlashback(kind, enemy, attr, skillId = null) {
    this.flashback.request({
      kind,
      enemyId: enemy.id ?? enemy.speciesId,
      speciesId: enemy.speciesId,
      attr,
      skillId,
      tx: enemy.tx,
      ty: enemy.ty
    });
  }

  killEnemy(enemy, d) {
    const { B } = this;
    const hs = this.hs;
    const hero = this.exp.hero;
    const exp = expReward(enemy.level, B);
    hs.exp += exp;

    this.emit('learning', recordMarkEvent(this.p, enemy.speciesId, 'kill', B));
    const b = this.body(enemy);
    this.fx({ type: 'poof', delay: d, x: b.x, y: b.y });
    this.emit('log', 'enemyDown', { name: enemy.name, exp });
    this.exp.removeUnit(enemy);

    while (hs.exp >= expNeeded(hs.level, B)) {
      hs.exp -= expNeeded(hs.level, B);
      hs.level += 1;
      hs.maxHp += B.battle.levelUp.hp;
      hs.maxMp += B.battle.levelUp.mp;
      hs.hp = Math.min(hs.maxHp, hs.hp + Math.round(hs.maxHp * B.battle.levelUp.healRate));
      this.emit('log', 'heroLevelUp', { level: hs.level });
      const hb = this.body(hero);
      this.fx({ type: 'sparkle', delay: d + 0.15, x: hb.x, y: hb.y });
    }
    this.emit('persist');
  }

  // ---- 敵の行動 ----
  // 戻り値: 'move'（呼び出し側で近づく）または null（行動した・何もしない）
  enemyDecide(e, { dist, sees, bindImmediately = false }) {
    const { B, p } = this;
    const def = ENEMIES_BY_ID[e.speciesId];
    const W = B.battle.baseWeights;
    const actions = [];

    if (e.pendingSkill) {
      const pending = e.pendingSkill;
      e.pendingSkill = null;
      const range = B.skills[pending.skillId]?.range ?? 1;
      if (dist > range || (pending.category === 'bind' && dist > 1)) return 'move';
      if (pending.category === 'bind') this.startBound(e, pending.skillId);
      else this.useSkill(e, pending.skillId, pending.ctx);
      return null;
    }

    if (dist <= 1) {
      const normalSkill = def.normalSkill ?? 'normalAttack';
      actions.push({ id: normalSkill, category: 'attack', skillId: normalSkill, weight: W.attack });
      const binds = e.bindImmune || this.escapeInvulnTurns > 0
        ? []
        : def.bindSkills.filter((id) => SKILL_DEFS[id]);
      for (const id of binds) {
        actions.push({ id, category: 'bind', skillId: id, weight: W.bind / binds.length });
      }
    } else {
      actions.push({ id: 'move', category: 'move', weight: W.move });
    }

    const skillIds = [...def.skills];
    if (e.advancedSkillUnlocked && e.advancedSkill) skillIds.push(e.advancedSkill);
    const specials = skillIds.filter((id) => {
      const s = SKILL_DEFS[id];
      const range = B.skills[id]?.range ?? 1;
      return s?.category === 'special' && dist <= range && (dist <= 1 || sees);
    });
    for (const id of specials) {
      actions.push({ id, category: 'special', skillId: id, weight: W.special / specials.length });
    }

    const ctx = {
      markScore: getMarkScore(p, e.speciesId),
      teasingPlayLv: getAbilityLevel(p, e.speciesId, 'teasingPlay'),
      rememberedSkillId: getRememberedSkill(p, e.speciesId)?.skillId ?? null
    };
    const picked = pickWeighted(applyLearning(actions, ctx, B));
    if (!picked) return null;
    if (picked.category === 'move') return 'move';
    if (picked.category === 'bind' && bindImmediately) {
      this.startBound(e, picked.skillId);
      return null;
    }
    if (picked.category === 'bind' || B.skills[picked.skillId]?.windup) {
      this.prepareSkill(e, picked.skillId, ctx);
      return null;
    }
    this.useSkill(e, picked.skillId, ctx);
    return null;
  }

  prepareSkill(e, skillId, ctx) {
    const def = SKILL_DEFS[skillId];
    const motion = def.category === 'bind' ? bindTag(this.exp.hero.tx - e.tx, this.exp.hero.ty - e.ty) : def.motion ?? 'skill_sexyPose';
    const target = this.body(this.exp.hero);
    e.pendingSkill = { skillId, category: def.category, ctx };
    e.setDir(this.exp.hero.tx - e.tx, this.exp.hero.ty - e.ty);
    this.actedThisTurn = true;
    this.emit('anim', { unit: e, tag: motion });
    this.emit('se', { id: def.windupSe ?? 'warning', tx: e.tx, ty: e.ty });
    this.fx({ type: 'ring', x: target.x, y: target.y, r: 44, color: '#ff9ccf' });
    this.fx({ type: 'sparks', x: target.x, y: target.y - 36, color: '#ff9ccf', count: 5 });
    this.emit('log', 'enemyWindup', { name: e.name, skill: DEFEAT_SKILLS[skillId]?.name ?? skillId });
  }

  startBound(e, skillId) {
    if (this.climax.blocksBinding()) {
      this.autoGuardBind(e);
      return;
    }
    if (this.bound) return this.addBoundBinder(e, skillId);
    const dx = e.tx - this.exp.hero.tx;
    const dy = e.ty - this.exp.hero.ty;
    const heroDir = this.exp.hero.dir;
    const isBackBind = dx * heroDir.dx + dy * heroDir.dy < 0;
    this.bound = {
      binders: [],
      isBackBind,
      elapsed: 0,
      sincePulse: 0,
      pulseTimer: Math.max(0, this.B.bound.pulseSec - this.B.bound.firstPulseDelaySec),
      idleSec: 0,
      surrenderRate: isBackBind ? this.B.bound.backSurrenderGain : 0,
      escapeProgress: 0,
      requiredClicks: 0
    };
    this.addBoundBinder(e, skillId, false);
    this.bound.requiredClicks = this.getRequiredClicks();
    this.actedThisTurn = true;
    this.emit('anim', { unit: this.exp.hero, tag: 'bound' });
    this.emit('boundStart', { binder: e, skillId, isBackBind });
    this.requestFlashback('bind', e, SKILL_DEFS[skillId]?.attr ?? this.attrOf(e.speciesId), skillId);
    this.emit('se', { id: SKILL_DEFS[skillId]?.se ?? 'bind', tx: e.tx, ty: e.ty });
    this.bindEffect(e, skillId, false);
    this.fx({ type: 'tint', delay: 0.15 });
    this.emit('persist');
  }

  addBoundBinder(e, skillId, pushBack = true) {
    const bound = this.bound;
    if (!bound || bound.binders.length >= this.B.bound.maxBinders) return false;
    if (bound.binders.some((b) => b.unit === e)) return false;
    const skill = SKILL_DEFS[skillId];
    const ratio = bound.requiredClicks ? bound.escapeProgress / bound.requiredClicks : 0;
    const attr = skill.attr ?? this.attrOf(e.speciesId);
    bound.binders.push({ unit: e, skillId, attr });
    e.setDir(this.exp.hero.tx - e.tx, this.exp.hero.ty - e.ty);
    this.emit('anim', { unit: e, tag: bindTag(this.exp.hero.tx - e.tx, this.exp.hero.ty - e.ty) });
    if (pushBack) {
      this.abilityEvents(addAbilityProgress(this.p, e.speciesId, 'uniteAttack', this.B, {
        pts: 1, grownThisBattle: this.grown
      }));
    }
    bound.requiredClicks = this.getRequiredClicks();
    if (pushBack) {
      bound.escapeProgress = Math.max(
        0,
        Math.min(bound.requiredClicks, ratio * bound.requiredClicks - this.B.bound.unitePushback * bound.requiredClicks)
      );
      this.emit('log', 'uniteJoin', { name: e.name });
      const effect = joinEffectFor(attr);
      this.emit('se', {
        id: effect?.se ?? 'unite',
        tx: e.tx,
        ty: e.ty,
        gain: effect?.gain ?? 1
      });
      this.bindEffect(e, skillId, false);
      this.emit('boundChanged', { binders: bound.binders.map((b) => b.unit) });
      this.climax.extend();
    }
    return true;
  }

  bindEffect(e, skillId, pulse = false) {
    const hero = this.exp.hero;
    const body = this.body(hero);
    const head = this.head(hero);
    const dx = Math.sign(e.tx - hero.tx);
    const dy = Math.sign(e.ty - hero.ty);
    const attr = SKILL_DEFS[skillId]?.attr ?? this.attrOf(e.speciesId);
    const scale = pulse ? 0.72 : 1;
    if (attr === 'mouth') {
      this.fx({ type: 'kiss', x: body.x + dx * 16, y: head.y + 8 + dy * 8, dx, dy });
    } else if (attr === 'bust') {
      this.fx({ type: pulse ? 'hearts' : 'bindHeartWave', x: body.x, y: body.y - 22, count: 5, size: scale, color: '#ff9dcc' });
      if (!pulse) this.fx({ type: 'impact', x: body.x, y: body.y - 20, size: 38 });
    } else if (attr === 'hip') {
      this.fx({ type: 'slash', x: body.x, y: body.y + 8, dx: dx || 1, dy: dy || 0 });
      if (!pulse) this.fx({ type: 'ring', x: body.x, y: body.y + 8, r: 42 });
    } else if (skillId === 'footStomp') {
      this.fx({ type: 'impact', x: body.x, y: body.y + 34, size: 42 });
      this.fx({ type: 'shake', power: pulse ? 0.35 : 0.7 });
    } else {
      this.fx({ type: 'sparkle', x: body.x, y: body.y + 34, color: '#ffe38a' });
    }
  }

  refreshBoundRequirement() {
    const bound = this.bound;
    if (!bound) return;
    const ratio = bound.requiredClicks ? bound.escapeProgress / bound.requiredClicks : 0;
    bound.requiredClicks = this.getRequiredClicks();
    bound.escapeProgress = Math.min(bound.requiredClicks, ratio * bound.requiredClicks);
  }

  tryUnite(e) {
    if (!this.bound || this.bound.binders.length >= this.B.bound.maxBinders) return false;
    const def = ENEMIES_BY_ID[e.speciesId];
    const skillId = def.bindSkills.find((id) => SKILL_DEFS[id]);
    if (!skillId || Math.random() >= this.B.bound.uniteChance) return false;
    return this.addBoundBinder(e, skillId);
  }

  getRequiredClicks() {
    const bound = this.bound;
    const binders = bound.binders;
    const first = binders[0];
    const res = this.p.resistances[first.attr] ?? 0;
    const softness = bindersSoftness(
      binders.map(({ unit, attr }) => ({ raceId: unit.speciesId, attr })),
      this.B
    );
    const abilityLevel = binders.reduce(
      (sum, b) => sum + getAbilityLevel(this.p, b.unit.speciesId, drainAbilityId(b.attr)),
      0
    ) / binders.length;
    const unite = this.B.escape.uniteCoef[Math.min(binders.length, this.B.escape.uniteCoef.length) - 1];
    const base = calcRequiredClicks({
      unite,
      resCoef: 1 + Math.max(0, -Math.max(res, this.B.resist.floor)) / 100 * 0.5,
      yieldCoef: 1 / (1 - 0.35 * bound.surrenderRate),
      raceCoef: 1 + 0.02 * abilityLevel,
      softEscapeMul: softness.escapeMul,
      isBackBind: bound.isBackBind
    }, this.B);
    return Math.max(1, Math.round(base * this.buffs.mult('escapeNeed')));
  }

  struggle() {
    const bound = this.bound;
    if (!bound) return false;
    if (this.climax.escapeLocked()) return true;
    bound.idleSec = 0;
    bound.surrenderRate = Math.max(0, bound.surrenderRate - 0.01);
    this.refreshBoundRequirement();
    bound.escapeProgress = Math.min(bound.requiredClicks, bound.escapeProgress + 1);
    this.emit('se', { id: 'tick', tx: this.exp.hero.tx, ty: this.exp.hero.ty });
    this.fx({ type: 'ring', x: this.body(this.exp.hero).x, y: this.body(this.exp.hero).y, r: 36 });
    if (bound.escapeProgress >= bound.requiredClicks) this.escapeBound();
    return true;
  }

  // 主人公のEXPを失う。足りなければレベルが下がる
  drainHeroExp(rate) {
    const { B, hs } = this;
    const amount = Math.max(1, Math.round(expNeeded(hs.level, B) * rate));
    const res = loseHeroExp(hs, amount, {
      needFn: (lv) => expNeeded(lv, B),
      levelUp: B.battle.levelUp,
      minLevel: B.bound.expDrainMinLevel
    });
    if (res.levelsLost > 0) {
      const hb = this.body(this.exp.hero);
      this.fx({
        type: 'damage',
        x: hb.x,
        y: this.head(this.exp.hero).y - 52,
        text: `Lv -${res.levelsLost}`,
        style: 'mp',
        big: true
      });
      this.emit('log', 'levelDown', { level: hs.level });
    }
    return res;
  }

  checkClimaxStart() {
    if (!this.bound || this.climax.isClimax()) return;
    this.climax.tryStart({ bound: true, mp: this.hs.mp });
  }

  // 絶頂中の毎秒処理（ClimaxController.onSecond から）。MPは0なので、EXPが削られ続ける
  climaxSecond({ drainMult, progress }) {
    const { B } = this;
    const bound = this.bound;
    if (!bound) return;
    const res = this.drainHeroExp(B.bound.expDrainPerSec * drainMult * this.buffs.mult('drainTaken'));
    for (const { unit } of bound.binders) {
      this.gainDrainExperience(unit, res.lost * B.bound.expShareRate);
    }
    const n = bound.binders.length;
    for (const { unit } of bound.binders) {
      this.emit('se', {
        id: 'climaxPulse',
        tx: unit.tx,
        ty: unit.ty,
        behind: bound.isBackBind,
        gain: 1 / Math.sqrt(n),
        params: { progress }
      });
    }
    for (const { unit, skillId } of bound.binders) this.bindEffect(unit, skillId, true);
    this.fx({ type: 'shake', power: 0.6 + 0.8 * progress });
    this.emit('drainPulse', { strength: 0.6 });
    this.emit('persist');
  }

  // ClimaxController のイベントに対する、戦闘側の演出
  onClimaxEvent(name, payload = {}) {
    if (name === 'climaxEnd') {
      this.save.currentRun.afterglowTurns = payload.afterglowTurns ?? 0;
    } else if (name === 'afterglowTurn') {
      this.save.currentRun.afterglowTurns = payload.left ?? 0;
    } else if (name === 'afterglowEnd') {
      this.save.currentRun.afterglowTurns = 0;
    }
    const hero = this.exp.hero;
    const hb = this.body(hero);
    if (name === 'climaxStart') {
      const first = this.bound?.binders[0]?.unit;
      this.flashback?.cancel();
      this.emit('se', {
        id: 'climaxStart',
        tx: first?.tx ?? hero.tx,
        ty: first?.ty ?? hero.ty,
        behind: this.bound?.isBackBind ?? false
      });
      this.fx({ type: 'shake', power: 1.4 });
      this.fx({ type: 'tint' });
      this.fx({ type: 'ring', x: hb.x, y: hb.y, r: 112, color: '#ff4fa3' });
      this.fx({ type: 'ring', delay: 0.2, x: hb.x, y: hb.y, r: 74, color: '#ff9dcc' });
      this.emit('drainPulse', { strength: 1 });
      if (payload.hpLoss) {
        this.fx({
          type: 'damage',
          delay: 0.2,
          x: hb.x,
          y: this.head(hero).y,
          text: String(payload.hpLoss),
          style: 'hero',
          big: true
        });
      }
      this.emit('log', 'climaxStart', { hpLoss: payload.hpLoss ?? 0 });
    } else if (name === 'climaxRelease') {
      const first = this.bound?.binders[0];
      this.emit('se', { id: 'climaxPulse', tx: first?.unit.tx ?? hero.tx, ty: first?.unit.ty ?? hero.ty, gain: 1.15 });
      this.fx({ type: 'ring', x: hb.x, y: hb.y, r: 86, color: '#ff4fa3' });
      this.fx({ type: 'hearts', x: hb.x, y: this.head(hero).y, count: 12, size: 1.25 });
      for (const { unit } of this.bound?.binders ?? []) {
        const point = this.body(unit);
        this.fx({ type: 'impact', x: point.x, y: point.y, size: 48 });
      }
    } else if (name === 'climaxExtend') {
      this.emit('se', { id: 'climaxExtend' });
      this.fx({ type: 'ring', x: hb.x, y: hb.y, r: 90, color: '#ff4fa3' });
      this.fx({ type: 'hearts', x: hb.x, y: this.head(hero).y, count: 10, size: 1.2 });
      this.emit('log', 'climaxExtend', { addSec: payload.addSec ?? 0 });
    } else if (name === 'climaxEnd') {
      this.fx({ type: 'sparkle', x: hb.x, y: this.head(hero).y });
      this.emit('log', 'climaxEnd', { turns: payload.afterglowTurns ?? 0 });
    } else if (name === 'afterglowEnd') {
      this.emit('log', 'afterglowEnd', {});
    }
  }

  // 絶頂開始時のHPドレインで倒れたとき
  defeatByClimax() {
    const first = this.bound?.binders[0];
    if (first && !this.defeated) {
      this.defeated = {
        raceId: first.unit.speciesId,
        skillId: first.skillId,
        attr: first.attr,
        name: first.unit.name
      };
      const skillName = DEFEAT_SKILLS[first.skillId]?.name ?? first.skillId;
      this.emit('log', 'heroDefeated', { name: first.unit.name, skill: skillName });
    }
    this.emit('anim', { unit: this.exp.hero, tag: 'down' });
    this.bound = null;
    this.emit('boundEnd', { escaped: false, defeated: true });
    this.emit('se', { id: 'bindRelease', tx: this.exp.hero.tx, ty: this.exp.hero.ty });
    this.emit('persist');
  }

  // 余韻中の拘束攻撃は自動防御する（敵のターンだけ消費する）
  autoGuardBind(e) {
    this.actedThisTurn = true;
    const hb = this.body(this.exp.hero);
    this.fx({ type: 'ring', x: hb.x, y: hb.y, r: 60, color: '#96dcff' });
    this.fx({ type: 'sparks', x: hb.x, y: hb.y - 20, color: '#96dcff', count: 8 });
    this.emit('se', { id: 'autoGuard', tx: e.tx, ty: e.ty });
    this.emit('log', 'autoGuard', { name: e.name });
  }

  boundSecond() {
    const bound = this.bound;
    if (!bound) return;
    const wasClimax = this.climax.isClimax();
    this.checkClimaxStart();
    if (!this.bound) return;
    if (wasClimax) return;
    if (this.climax.isClimax()) return;
    bound.elapsed += 1;
    bound.sincePulse += 1;
    bound.pulseTimer += 1;
    bound.idleSec += 1;
    if (bound.idleSec >= this.B.bound.idleSurrenderSec) {
      bound.surrenderRate = Math.min(1, bound.surrenderRate + this.B.bound.surrenderPerIdleSec);
      this.refreshBoundRequirement();
    }
    if (bound.surrenderRate >= 0.8) {
      bound.escapeProgress = Math.max(0, bound.escapeProgress - 0.5);
    }
    if (bound.pulseTimer < this.B.bound.pulseSec) return;
    bound.pulseTimer -= this.B.bound.pulseSec;
    this.boundPulse(bound.sincePulse);
    bound.sincePulse = 0;
    this.checkClimaxStart();
  }

  boundPulse(durationSec) {
    const bound = this.bound;
    if (!bound || this.hs.mp <= 0) return;
    const { B, hs } = this;
    const softness = bindersSoftness(
      bound.binders.map(({ unit, attr }) => ({ raceId: unit.speciesId, attr })),
      B
    );
    const avg = (fn) => bound.binders.reduce((sum, b) => sum + fn(b), 0) / bound.binders.length;
    const drainMul = avg((b) => {
      const ability = getAbilityLevel(this.p, b.unit.speciesId, drainAbilityId(b.attr));
      const lose = this.p.debuffs.loseHabit.byRace[b.unit.speciesId] ?? 0;
      return (1 + B.battle.drainPerLevel * ability) * (1 + lose * B.habit.loseMpPerStage);
    });
    const resistance = Math.min(...bound.binders.map((b) => this.p.resistances[b.attr] ?? 0));
    const resMul = 1 + Math.max(0, -resistance) / 100;
    const uniteMul = B.escape.uniteCoef[Math.min(bound.binders.length, B.escape.uniteCoef.length) - 1];
    const backMul = bound.isBackBind ? B.bound.backAbsorb : 1;
    const surrenderMul = 1 + bound.surrenderRate * 0.8;
    const mul = Math.min(B.bound.absorbCap, drainMul * softness.drainMul * resMul * uniteMul * backMul * surrenderMul);
    const scale = this.climax.drainScale() * this.buffs.mult('drainTaken');
    const amount = Math.min(hs.mp, Math.max(1, Math.round(B.bound.mpPerSec * durationSec * mul * scale)));
    hs.mp -= amount;
    this.drainHeroExp(B.bound.expDrainPerSec * durationSec * mul * scale);
    for (const binder of bound.binders) {
      const { unit, attr, skillId } = binder;
      this.gainDrainExperience(unit, amount * B.bound.expShareRate);
      const abilityId = drainAbilityId(attr);
      if (abilityId) this.abilityEvents(addAbilityProgress(this.p, unit.speciesId, abilityId, B, {
        pts: 1, grownThisBattle: this.grown
      }));
      this.emit('se', { id: SKILL_DEFS[skillId].se, tx: unit.tx, ty: unit.ty, behind: bound.isBackBind });
    }
    const binder = bound.binders[0];
    const skillName = DEFEAT_SKILLS[binder.skillId]?.name ?? binder.skillId;
    this.emit('log', 'heroDrained', { name: binder.unit.name, skill: skillName, amount });
    if (hs.mp === 0) this.emit('log', 'mpEmpty', {});
    for (const { unit, skillId } of bound.binders) this.bindEffect(unit, skillId, true);
    this.emit('drainPulse', { strength: 1 });
    this.emit('persist');
  }

  gainDrainExperience(enemy, amount) {
    if (!(amount > 0)) return;
    enemy.exp += amount;
    this.emit('enemyExperience', { enemy, amount });
    if (!enemy.advancedSkill || enemy.advancedSkillUnlocked) return;
    enemy.drainExp += amount;
    if (enemy.drainExp < this.B.enemy.specialUnlockDrain) return;
    enemy.drainExp = this.B.enemy.specialUnlockDrain;
    enemy.advancedSkillUnlocked = true;
    const skillName = DEFEAT_SKILLS[enemy.advancedSkill]?.name ?? enemy.advancedSkill;
    this.emit('log', 'enemySkillLearn', { name: enemy.name, skill: skillName });
    this.emit('anim', { unit: enemy, tag: 'skill_sexyPose' });
    this.fx({ type: 'sparkle', x: this.body(enemy).x, y: this.head(enemy).y });
  }

  escapeBound(reason = 'escape') {
    const bound = this.bound;
    if (!bound) return;
    const byClimax = reason === 'climax';
    if (!byClimax && this.climax.escapeLocked()) return;
    const hero = this.exp.hero;
    for (const { unit } of bound.binders) {
      const dx = Math.sign(unit.tx - hero.tx);
      const dy = Math.sign(unit.ty - hero.ty);
      const x = unit.tx + dx;
      const y = unit.ty + dy;
      if (this.exp.map.isWalkable(x, y) && !this.exp.unitAt(x, y)) unit.moveTo(x, y);
      unit.bindImmune = true;
    }
    if (!byClimax) {
      this.hs.mp = Math.min(this.hs.maxMp, this.hs.mp + this.B.bound.escapeRecoverMp);
    }
    this.escapeInvulnTurns = 1;
    this.bound = null;
    this.emit('anim', { unit: hero, tag: 'idle' });
    this.emit('boundEnd', { escaped: true, reason: byClimax ? 'climax' : 'escape' });
    this.emit('se', { id: 'bindRelease', tx: hero.tx, ty: hero.ty });
    this.emit('persist');
  }

  boundTurnElapsed() {
    this.exp.refresh();
    this.exp.turnCount += 1;
  }

  useSkill(e, skillId, ctx) {
    const { B, p } = this;
    const def = SKILL_DEFS[skillId];
    const nums = B.skills[skillId];
    const hs = this.hs;
    const hero = this.exp.hero;
    const skillName = DEFEAT_SKILLS[skillId]?.name ?? skillId;
    const attr = def.attr ?? this.attrOf(e.speciesId);
    if (FLASHBACK_STRONG.has(skillId)) this.requestFlashback('strong', e, attr, skillId);
    else if (skillId === ctx.rememberedSkillId) this.requestFlashback('rematch', e, attr, skillId);

    this.actedThisTurn = true;
    const d = this.nextDelay();
    const dx = hero.tx - e.tx;
    const dy = hero.ty - e.ty;
    e.setDir(dx, dy);

    const motion = def.category === 'attack'
      ? attackTag(dx, dy)
      : def.category === 'bind'
        ? bindTag(dx, dy)
        : def.motion ?? 'skill_sexyPose';
    this.emit('anim', { unit: e, tag: motion, delay: d });
    if (skillId === ctx.rememberedSkillId) {
      this.emit('log', 'rememberUse', { name: e.name, skill: skillName });
    }

    // ダメージとMP吸収
    const guard = this.guarding ? B.battle.guardMul : 1;
    let hpLoss = 0;
    if (nums.hpRate) {
      const [lo, hi] = def.category === 'attack' ? [B.damage.minRate, B.damage.maxRate] : [0, 1];
      const rate = rollRate(nums.hpRate, lo, hi, e.level - hs.level, B);
      hpLoss = Math.min(hs.hp, Math.max(1, Math.round(hs.maxHp * rate * guard)));
    }
    let mpLoss = 0;
    if (nums.mpRate) {
      const drainLv = getAbilityLevel(p, e.speciesId, drainAbilityId(attr));
      const loseMp = (p.debuffs.loseHabit.byRace[e.speciesId] ?? 0) * B.habit.loseMpPerStage;
      const soft = softnessEffects(getSoftness(e.speciesId, attr, B, p.softnessOverrides), B).drainMul;
      const mul = Math.min(B.bound.absorbCap, (1 + B.battle.drainPerLevel * drainLv) * (1 + loseMp) * soft);
      const scale = this.climax.drainScale() * this.buffs.mult('drainTaken');
      mpLoss = Math.min(hs.mp, Math.round(hs.maxMp * nums.mpRate * mul * guard * scale));
    }
    hs.hp -= hpLoss;
    hs.mp -= mpLoss;

    // 演出
    const hb = this.body(hero);
    const eb = this.body(e);
    const eh = this.head(e);
    const attacker = { dx: Math.sign(e.tx - hero.tx), dy: Math.sign(e.ty - hero.ty) };
    this.emit('se', { id: def.se, tx: e.tx, ty: e.ty, delay: d + 0.1 });

    switch (def.fx) {
      case 'hit':
      case 'stomp':
        this.fx({ type: 'impact', delay: d + 0.12, x: hb.x, y: hb.y, size: 30 });
        this.fx({ type: 'sparks', delay: d + 0.12, x: hb.x, y: hb.y, color: '#ffb3d1', count: 8 });
        break;
      case 'kiss':
        this.fx({ type: 'stream', delay: d + 0.1, from: { x: eb.x, y: eh.y + 24 }, to: { x: hb.x, y: hb.y - 20 }, count: 10, durSec: 0.45, arcPx: 50 });
        this.fx({ type: 'hearts', delay: d + 0.5, x: hb.x, y: hb.y - 30, count: 7, size: 0.9 });
        this.fx({ type: 'tint', delay: d + 0.3 });
        break;
      case 'embrace':
        this.fx({ type: 'hearts', delay: d + 0.15, x: hb.x, y: hb.y - 20, count: 9, size: 1 });
        this.fx({ type: 'tint', delay: d + 0.2 });
        break;
      case 'blowKiss':
        this.fx({
          type: 'heartProjectile',
          delay: d + 0.15,
          from: { x: eb.x, y: eh.y + 24 },
          to: { x: hb.x, y: this.head(hero).y - 4 },
          durSec: 0.8,
          arcPx: 92,
          size: 1.15
        });
        this.fx({
          type: 'stream',
          delay: d + 0.2,
          from: { x: eb.x, y: eh.y + 24 },
          to: { x: hb.x, y: hb.y - 24 },
          count: 5,
          size: 0.38,
          durSec: 0.65,
          arcPx: 82
        });
        break;
      case 'breath':
        this.fx({ type: 'breath', delay: d + 0.15, from: { x: eb.x, y: eh.y + 28 }, to: { x: hb.x, y: hb.y - 20 } });
        this.fx({ type: 'tint', delay: d + 0.35 });
        break;
      case 'pose':
        this.fx({ type: 'ring', delay: d + 0.15, x: eb.x, y: eb.y, r: 50, color: '#ff9ccf' });
        this.fx({ type: 'hearts', delay: d + 0.25, x: hb.x, y: hb.y - 24, count: 6, size: 1 });
        this.fx({ type: 'tint', delay: d + 0.35 });
        break;
      default:
        break;
    }

    if (attr === 'mouth' && (hpLoss > 0 || mpLoss > 0 || def.category === 'bind' || def.fx === 'blowKiss')) {
      this.fx({
        type: 'kiss',
        delay: d + 0.28,
        x: this.body(hero).x,
        y: this.head(hero).y + 10,
        dx: attacker.dx,
        dy: attacker.dy
      });
    }

    if (hpLoss > 0) {
      this.fx({ type: 'damage', delay: d + 0.14, x: hb.x, y: this.head(hero).y, text: String(hpLoss), style: 'hero', big: true });
      this.fx({ type: 'shake', delay: d + 0.12, power: clamp((hpLoss / hs.maxHp) * 6, 0.5, 1.4) });
      this.emit('log', 'heroDamaged', { name: e.name, skill: skillName, amount: hpLoss });
    }
    if (mpLoss > 0) {
      this.gainDrainExperience(e, mpLoss);
      this.fx({ type: 'damage', delay: d + 0.26, x: hb.x, y: this.head(hero).y - 26, text: `MP -${mpLoss}`, style: 'mp' });
      this.emit('drainPulse', { strength: 0.6, delay: d + 0.26 });
      this.emit('log', 'heroDrained', { name: e.name, skill: skillName, amount: mpLoss });
      if (hs.mp === 0) this.emit('log', 'mpEmpty', {});
      this.abilityEvents(addAbilityProgress(p, e.speciesId, drainAbilityId(attr), B, { pts: 1, grownThisBattle: this.grown }));
    }
    this.witness(nums.allyCharm ?? (def.category === 'attack' ? B.ally.charmOnHit : B.ally.charmOnDrain));

    if (hs.hp <= 0) {
      this.emit('anim', { unit: hero, tag: 'down', delay: d + 0.2 });
      if (!this.defeated) {
        this.defeated = { raceId: e.speciesId, skillId, attr, name: e.name };
        this.emit('log', 'heroDefeated', { name: e.name, skill: skillName });
      }
    } else if (hpLoss > 0) {
      this.emit('anim', { unit: hero, tag: 'hit', delay: d + 0.12 });
    }
    this.emit('persist');
  }

  // 主人公の被弾を近くで見た仲間の、魅了ゲージを上げる
  witness(gain) {
    const { B } = this;
    const hero = this.exp.hero;
    for (const u of this.exp.units) {
      if (u.kind !== 'ally') continue;
      const st = this.save.currentRun.allies[u.speciesId];
      if (!st || st.status !== 'ACTIVE') continue;
      if (chebyshev(u.tx, u.ty, hero.tx, hero.ty) > B.ally.witnessRange) continue;
      const rate = B.ally.charmRate[u.speciesId] ?? 1;
      st.charmGauge = Math.min(100, Math.round((st.charmGauge + gain * rate) * 10) / 10);
    }
  }

  abilityEvents(events) {
    for (const ev of events) {
      if (ev.kind !== 'raceAbilityGrow') continue;
      this.emit('log', 'raceAbilityGrow', {
        name: ENEMIES_BY_ID[ev.raceId].name,
        ability: RACE_ABILITIES_BY_ID[ev.abilityId].name,
        level: ev.level
      });
    }
  }

  // ---- 仲間 ----
  // 戻り値: 行動したら true（その場合、移動はしない）
  allyAct(u) {
    const { B } = this;
    if (u.speciesId !== 'priest') return false;
    const st = this.save.currentRun.allies[u.speciesId];
    if (!st || st.status !== 'ACTIVE') return false;
    const hs = this.hs;
    const hero = this.exp.hero;
    if (hs.hp <= 0) return false;

    st.turnCounter = Math.min(B.priest.actEveryTurns, (st.turnCounter ?? 0) + 1);
    if (st.turnCounter < B.priest.actEveryTurns) return false;
    if (chebyshev(u.tx, u.ty, hero.tx, hero.ty) > B.ally.healRange) return false;
    st.turnCounter = 0;

    const heal = Math.min(hs.maxHp - hs.hp, Math.max(1, Math.round(hs.maxHp * B.priest.healRate)));
    hs.hp += heal;
    const buffId = BUFF_IDS[Math.floor(Math.random() * BUFF_IDS.length)];
    this.buffs.add(buffId);
    this.actedThisTurn = true;

    const d = this.nextDelay();
    const hb = this.body(hero);
    this.emit('anim', { unit: u, tag: 'cast', delay: d });
    this.fx({ type: 'sparkle', delay: d + 0.3, x: hb.x, y: hb.y });
    this.fx({ type: 'ring', delay: d + 0.3, x: hb.x, y: hb.y - 10, r: 48 });
    if (heal > 0) {
      this.fx({ type: 'damage', delay: d + 0.35, x: hb.x, y: this.head(hero).y, text: `+${heal}`, style: 'heal' });
    }
    this.fx({ type: 'damage', delay: d + 0.5, x: hb.x, y: this.head(hero).y - 26, text: BUFFS[buffId].label, style: 'heal' });
    this.emit('se', { id: 'priestCast', tx: u.tx, ty: u.ty, delay: d + 0.3, ally: true });
    this.emit('se', { id: 'buffGain', delay: d + 0.6 });
    this.emit('log', 'allyHeal', { ally: ALLY_NAMES[u.speciesId] ?? u.name, amount: heal });
    this.emit('log', 'priestBuff', {
      ally: ALLY_NAMES[u.speciesId] ?? u.name,
      buff: BUFFS[buffId].label,
      turns: B.buffs.durationTurns
    });
    this.emit('persist');
    return true;
  }

  // ---- ターンの終わり ----
  endTurn() {
    const { B } = this;
    const hs = this.hs;
    const hero = this.exp.hero;
    const threat = this.exp.units.some(
      (u) => u.kind === 'enemy' && chebyshev(u.tx, u.ty, hero.tx, hero.ty) <= 2
    );

    if (!this.bound) this.climax.onHeroTurnEnd();
    const hadBuffs = this.buffs.items.length > 0;
    this.buffs.tick();

    for (const u of this.exp.units) {
      if (u.cooldown > 0) u.cooldown -= 1;
      if (u.kind !== 'ally') continue;
      const st = this.save.currentRun.allies[u.speciesId];
      if (!st) continue;
      st.mp = Math.min(B.ally.mp, st.mp + B.ally.mpRegenPerTurn);
      if (!threat) st.charmGauge = Math.max(0, st.charmGauge - B.ally.charmDecay);
    }
    if (!threat && hs.hp > 0) {
      if (this.climax.hpRegenScale() > 0) {
        hs.hp = Math.min(hs.maxHp, hs.hp + Math.max(1, Math.round(hs.maxHp * B.battle.regenRate)));
      }
      hs.mp = Math.min(hs.maxMp, hs.mp + Math.max(1, Math.round(hs.maxMp * B.battle.regenRate)));
    }
    if (this.escapeInvulnTurns > 0) {
      this.escapeInvulnTurns -= 1;
      for (const u of this.exp.units) u.bindImmune = false;
    }
    this.save.currentRun.buffs = this.buffs.serialize();
    if (hadBuffs) this.emit('persist');
  }

  // ---- 敗北 ----
  // 学習（カモ度・最後に負けた技）と、癖・耐性の悪化を記録する。ランのリセットは呼び出し側
  finalizeDefeat() {
    const d = this.defeated;
    if (!d) return;
    const { B, p } = this;
    const run = this.save.currentRun;

    const present = this.exp.units
      .filter((u) => u.kind === 'enemy' && this.exp.map.isVisible(u.tx, u.ty))
      .map((u) => u.speciesId);
    this.emit('learning', recordDefeat(p, {
      causeRaceId: d.raceId,
      skillId: d.skillId,
      defeatType: 'beatenDown',
      presentRaceIds: present,
      run: p.runCount,
      floor: run.floor
    }, B));

    const byRace = p.debuffs.loseHabit.byRace;
    byRace[d.raceId] = Math.min(B.habit.loseMax, (byRace[d.raceId] ?? 0) + 1);
    this.emit('log', 'loseHabitUp', { name: d.name, stage: byRace[d.raceId] });

    const attr = d.attr === 'all' ? 'mouth' : d.attr;
    const cur = p.resistances[attr] ?? 0;
    const next = Math.max(B.resist.floor, cur - B.battle.defeatResistDrop);
    if (next !== cur) {
      p.resistances[attr] = next;
      this.emit('log', 'resistDown', { attr: ATTRS[attr].label, from: cur, to: next });
    }

    p.stats.defeatCount += 1;
    p.runCount += 1;
    this.defeated = null;
    this.stunTurns = 0;
    this.climax.reset();
    this.buffs.clear();
    this.flashback.reset();
    this.emit('persist');
  }
}
