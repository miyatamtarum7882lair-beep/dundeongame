// File: src/battle/combat.js
// 戦闘の進行（TURN モード）。主人公の攻撃・防御、敵の行動の抽選、仲間の回復、敗北の記録を受け持つ。
// 画面には依存しない。演出は 'fx' / 'anim' / 'se' / 'log' / 'learning' / 'persist' のイベントで外へ渡す。
import { Emitter, clamp } from '../core/util.js';
import { ENEMIES_BY_ID, ATTRS } from '../data/enemies.js';
import { DEFEAT_SKILLS } from '../data/defeatSkills.js';
import { SKILL_DEFS } from '../data/skills.js';
import { joinEffectFor } from '../data/flashbackData.js';
import { RACE_ABILITIES_BY_ID, drainAbilityId } from '../data/raceAbilities.js';
import { canStep, chebyshev } from '../dungeon/gridMath.js';
import {
  applyLearning, pickWeighted, getMarkScore, getRememberedSkill, recordDefeat, recordMarkEvent, recordSkillSeen
} from './learning.js';
import { addAbilityProgress, getAbilityLevel } from './raceGrowth.js';
import { getSoftness, softnessEffects, touchChanceAddFor, bindersSoftness } from './softness.js';
import { rollRate, calcDamage, expNeeded, expReward } from './damage.js';
import { calcRequiredClicks } from './escape.js';
import { ClimaxController } from './climaxController.js';
import { BuffManager, BUFFS, BUFF_IDS } from './buffs.js';
import { loseHeroExp } from './expDrain.js';
import { enemyExpNeeded } from './enemyStats.js';
import { SkillDirector, normalizeStage, cuesFor } from './skillStage.js';
import { STAGE_FX } from './stageFx.js';
import { SKILL_STAGES } from '../data/skillStages.js';
import { choiceFor, speechFor, windupLineFor, sceneLineFor, familiarLineFor, climaxVoiceFor } from '../data/enemyDialogue.js';
import { ENEMY_HINTS, GENERAL_HINTS } from '../data/enemyHints.js';
import { FlashbackController } from './flashback.js';
import { FLASHBACK_STRONG } from '../data/flashbackRules.js';
import { HeroConditions } from './conditioning.js';
import { CONDITIONS, STATUSES, PERMANENT_STAGE_NAMES } from '../data/conditioning.js';
import { isEvolved, recordChoice, recordEvoProgress, learnAdvanced } from './skillEvolution.js';
import { themeOf, RESIST_COLORS } from '../data/enemyThemes.js';
import { formationFor } from '../data/bindFormations.js';
import { bindSideOf } from '../ui/boundCharmMath.js';
import { charmAttrsOf } from '../data/charmAttrs.js';
import { PairBonds, uniteNameOf, rubAttrsOf, partnerReady, uniteTypeFor } from './pairBond.js';
import { ENEMY_GROUPS, sharedGroup } from '../data/enemyGroups.js';
import { Economy, conditionOfRace } from './economy.js';
import { Gaze } from './gaze.js';
import { remember, escapeMulFor, drainMulFor, startSurrenderFor } from './enemyMemory.js';
import { powerMulFor, resistBonusMulFor, onResist, onLand, bindDrainMulFor, bindExpMulFor, tickPressure, escapeMulForBound } from './enemyTraits.js';

const WEAPON_NAMES = { sword: '剣', fist: '拳' };
// 触れたがりの手袋で、攻撃のたびにチャームポイントへ触れられた敵の声
const TOUCH_GEAR_LINES = {
  mouth: ['ん……♡ 唇、触りたかったの？', 'ふふ、攻撃するふりして、唇なぞってる♡', 'その指、舐めちゃおっか♡'],
  bust: ['きゃっ♡ ……むにゅって、したね？', '殴るんじゃなくて、揉みにきたんだ♡', 'ほら、もっと沈めていいよ？♡'],
  hand: ['ぎゅっ♡ ……手、つなぎたかったんだ', '攻撃なのに、指からめてくるんだ♡', 'にぎにぎ……♡ 離してあげない'],
  hip: ['ひゃん♡ お尻、撫でたでしょ', 'ふふ、またお尻に手が来た♡', 'そんなに触りたいなら、押し付けてあげる♡'],
  foot: ['くすぐった……♡ 脚、好きなんだ？', '攻撃しながら太もも撫でるの、えっち♡', 'その手、踏んじゃおっかな♡']
};
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
    this.choice = null;
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
    this.conditions = new HeroConditions(this.B, () => this.save);
    this.bonds = new PairBonds(this);
    this.eco = new Economy(this);
    this.gaze = new Gaze(this);
    this.director = new SkillDirector({
      maxDt: this.B.stage.maxDt,
      onStart: (perf) => this.onStageStart(perf),
      onHit: (perf, index) => this.onStageHit(perf, index),
      onEnd: (perf, cancelled) => this.onStageEnd(perf, cancelled)
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

  theme(unit) {
    return themeOf(unit?.speciesId);
  }

  // 永続化の判定で「別の遭遇」とみなす区切り（ラン・階ごと）
  floorKey() {
    const r = this.save.currentRun;
    return `${this.p.runCount}:${r.seed}:${r.floor}`;
  }

  offerChoice(enemy, skillId, continueSkill) {
    const choice = choiceFor(enemy.speciesId, skillId);
    if (!choice || this.choice) return false;
    // 同じ敵の選択肢は、数ターン空ける（v6 ルール9）
    if ((enemy.choiceCooldown ?? 0) > 0) return false;
    enemy.choiceCooldown = this.B.temptation.cooldownTurns;
    // 技名 → 敵の誘惑 → 選択肢の画面、の順に見せる。前置きの間も this.choice があるので、他の敵は待つ
    const active = {
      enemy, skillId, continueSkill, prelude: true,
      info: {
        enemyId: enemy.speciesId,
        name: enemy.name,
        skillName: this.skillLabel(skillId, enemy),
        choice,
        theme: this.theme(enemy)
      }
    };
    this.choice = active;
    this.actedThisTurn = true;
    const sec = this.B.temptation.preludeSec;
    this.director.start({
      stage: normalizeStage({ flashSec: 0, durationSec: sec, hits: { count: 1, startSec: sec - 0.05 }, fx: [], se: [] }, 'special', this.B.stage),
      payload: { prelude: true, e: enemy, skillId, active }
    });
    return true;
  }

  // 選択肢の前置き：技名を出し、敵が誘惑してくる
  startChoicePrelude({ e, skillId, active }) {
    const def = SKILL_DEFS[skillId];
    const hero = this.exp.hero;
    const theme = this.theme(e);
    const sec = this.B.temptation.preludeSec;
    const eb = this.body(e);
    const hb = this.body(hero);
    e.setDir(hero.tx - e.tx, hero.ty - e.ty);
    this.emit('anim', { unit: e, tag: def.motion ?? 'skill_sexyPose' });
    this.emit('skillName', { key: skillId, title: active.info.skillName, sub: e.name, attr: def.attr ?? this.attrOf(e.speciesId), color: theme.main, holdSec: sec + 0.3 });
    this.emit('skillFlash', { x: eb.x, y: eb.y, attr: def.attr, color: theme.main, sec: 0.35 });
    this.emit('se', { id: 'warning', tx: e.tx, ty: e.ty });
    this.emit('se', { id: 'temptPrelude', tx: e.tx, ty: e.ty, delay: 0.45 });
    this.fx({ type: 'glyph', x: eb.x, y: eb.y + 42, style: 'heart', color: theme.main, sub: theme.glow, r: 50, life: sec + 0.2 });
    this.fx({ type: 'swirl', x: eb.x, y: eb.y - 10, shapes: ['heart', 'heartLine'], colors: [theme.main, theme.glow], count: 12,
      r0: 20, r1: 70, turns: 0.8, rise: 20, life: 0.9, size: [5, 8] });
    this.fx({ type: 'flow', delay: 0.5, from: this.head(e), to: { x: hb.x, y: hb.y - 20 }, shapes: ['heart', 'heart', 'heartLine'],
      colors: [theme.main, theme.glow], count: 12, life: 0.7, spanSec: 0.6, arc: 40, wobble: 14, size: [5, 9], glow: true });
    this.fx({ type: 'swirl', delay: 0.9, x: hb.x, y: hb.y - 10, shape: 'heart', colors: [theme.main, theme.glow], count: 14,
      r0: 100, r1: 24, turns: 1.2, life: sec - 0.8, size: [5, 9] });
    this.fx({ type: 'wash', delay: 0.4, color: theme.main, alpha: 0.24, life: sec, inSec: 0.6 });
    const head = this.head(e);
    this.fx({ type: 'bubble', delay: 0.3, x: head.x, y: head.y - 30, text: active.info.choice.intro, color: theme.main, life: sec });
    this.emit('log', 'enemySpeak', { name: e.name, line: active.info.choice.intro });
  }

  // 前置きが終わったら、選択肢の画面を出す（その間に決着していなければ）
  endChoicePrelude({ active }) {
    if (this.choice !== active || !active.prelude) return;
    active.prelude = false;
    this.emit('enemyChoiceStart', active.info);
  }

  dodgeChoice(enemy) {
    const hero = this.exp.hero;
    const options = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }]
      .filter(({ dx, dy }) => canStep(this.exp.walk, hero.tx, hero.ty, dx, dy)
        && !this.exp.unitAt(hero.tx + dx, hero.ty + dy));
    if (options.length === 0) return false;
    options.sort((a, b) => chebyshev(hero.tx + b.dx, hero.ty + b.dy, enemy.tx, enemy.ty)
      - chebyshev(hero.tx + a.dx, hero.ty + a.dy, enemy.tx, enemy.ty));
    hero.moveTo(hero.tx + options[0].dx, hero.ty + options[0].dy);
    hero.fromX = hero.tx;
    hero.fromY = hero.ty;
    this.exp.refresh();
    this.emit('anim', { unit: hero, tag: 'flee' });
    this.emit('log', 'choiceAvoided', { name: enemy.name });
    return true;
  }

  // 選択肢の結果。自発的受容と時間切れは別々に数える（v6 ルール6・8）
  resolveChoice(answer) {
    const active = this.choice;
    if (!active) return false;
    this.choice = null;
    this.emit('enemyChoiceEnd');
    const { enemy, skillId } = active;
    const def = SKILL_DEFS[skillId];
    this.handleEvents(recordChoice(this.p, enemy.speciesId, skillId, answer, this.B), enemy, skillId);
    if (answer === 'accept') this.p.stats.acceptCount = (this.p.stats.acceptCount ?? 0) + 1;
    else if (answer === 'timeout') this.p.stats.timeoutCount = (this.p.stats.timeoutCount ?? 0) + 1;
    if (answer === 'resist') onResist(this, enemy);
    if (answer === 'resist' && def?.cond) {
      this.handleEvents(this.conditions.recordResist(def.cond.id), enemy, skillId);
    }
    // 固有の断り方を持たない技（拘束など）は、従来どおり横へ避ける
    if (answer === 'resist' && !def?.resist) {
      if (this.dodgeChoice(enemy)) return true;
      this.emit('log', 'choiceBlocked', { name: enemy.name });
    }
    const drainMul = answer === 'timeout' ? this.B.temptation.timeoutDrainMul
      : answer === 'accept' ? this.B.temptation.acceptDrainMul : 1;
    if (answer === 'timeout') this.emit('log', 'choiceTimeout', { name: enemy.name });
    else if (answer === 'accept') this.emit('log', 'choiceAccepted', { name: enemy.name });
    if (answer !== 'resist') this.emit('se', { id: 'temptAccept', tx: enemy.tx, ty: enemy.ty, gain: 0.7 });
    active.continueSkill({ answer, drainMul });
    // 誘惑に乗ると、その子の「贈り物」を無理やり着けさせられることがある
    if (answer !== 'resist') this.eco.rollGift(enemy, def?.attr ?? this.attrOf(enemy.speciesId), answer);
    return true;
  }

  clearChoice() {
    if (!this.choice) return;
    this.choice = null;
    this.emit('enemyChoiceEnd');
  }

  resetFloor() {
    this.clearChoice();
    this.director?.clear();
    this.grown = new Set();
    this.beat = 0;
    this.stunTurns = 0;
    this.guarding = false;
    this.bound = null;
    this.emit('bindFormation', { formation: null });
    this.escapeInvulnTurns = 0;
    this.buffs.restore(this.save.currentRun.buffs ?? []);
    this.climax.restore({ afterglowTurns: this.save.currentRun.afterglowTurns ?? 0 });
    this.flashback.cancel();
    this.flashback.syncFloor();
    this.conditions.onFloorStart();
    this.bonds.reset();
    this.save.currentRun.gazeLock = 0;
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
    const touchGear = this.eco.touchGear();
    const dmg = Math.max(1, Math.round(calcDamage(enemy.maxHp, rate) * this.eco.attackMul()));
    enemy.hp = Math.max(0, enemy.hp - dmg);
    this.bonds.interrupt(enemy);

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
    if (touchGear) this.touchCheck(enemy, d, touchGear);
    else if (weapon === 'fist') this.touchCheck(enemy, d);
    if (enemy.hp <= 0) this.killEnemy(enemy, d + 0.1);
  }

  // 拳で非拘束の敵を殴ったときの接触ペナルティ（5.3）
  // gear: 触れたがりの手袋など。着けていると必ず触れてしまう（剣でも）
  touchCheck(enemy, d, gear = null) {
    // 余韻中でも、癖は進む
    const { B, p } = this;
    const hs = this.hs;
    const hero = this.exp.hero;
    const attr = this.attrOf(enemy.speciesId);
    const chance = B.weapons.fist.touchChance + touchChanceAddFor(enemy.speciesId, attr, B, p.softnessOverrides);
    if (!gear && Math.random() >= chance) return;
    if (gear) this.gearTouchFx(enemy, attr, d, gear);

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
      this.deepenDebuff('touch', '接触の記憶');
    }

    this.abilityEvents(addAbilityProgress(p, enemy.speciesId, 'weaknessLearn', B, { pts: 1, grownThisBattle: this.grown }));
    const hb = this.body(hero);
    this.fx({ type: 'hearts', delay: d + 0.1, x: hb.x, y: hb.y - 20, count: 7, size: 0.9 });
    this.emit('log', 'touchPenalty', { name: enemy.name, effect });
    this.requestFlashback('touch', enemy, attr);
    this.emit('persist');
  }

  // 触れたがりの手袋：攻撃の手が、そのまま敵のチャームポイントへ吸い寄せられる
  gearTouchFx(enemy, attr, d, gear) {
    const th = this.theme(enemy);
    const b = this.body(enemy);
    const hy = this.head(enemy).y;
    const y = { mouth: hy + 6, hand: b.y + 4, bust: b.y - 16, hip: b.y + 14, foot: b.y + 36 }[attr] ?? b.y;
    const label = ATTRS[attr]?.label ?? '';
    this.fx({ type: 'swirl', delay: d + 0.08, x: b.x, y, shapes: ['heart', 'heartLine'], colors: [th.main, th.glow, '#ffd6ec'], count: 12, r0: 50, r1: 6, turns: 1.1, life: 0.6, size: [4, 7], glow: true });
    this.fx({ type: 'ring', delay: d + 0.12, x: b.x, y, r: 34, squash: 0.7, color: th.main, width: 4, alpha: 0.8, life: 0.45 });
    this.fx({ type: 'callout', delay: d + 0.15, x: b.x, y: hy - 46, text: `（${label}に、手が勝手に……♡）`, color: th.main, size: 18, life: 1.3 });
    this.emit('se', { id: 'heartPop', tx: enemy.tx, ty: enemy.ty, delay: d + 0.12 });
    const lines = TOUCH_GEAR_LINES[attr] ?? TOUCH_GEAR_LINES.bust;
    this.later(d + 0.35, () => {
      if (this.exp.units.includes(enemy)) this.speak(enemy, lines[Math.floor(Math.random() * lines.length)]);
    });
    this.emit('log', 'gearTouch', { name: enemy.name, item: gear.name, attr: label });
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
    const exp = Math.round(expReward(enemy.level, B) * this.eco.expRewardMul());
    hs.exp += exp;
    this.eco.killReward(enemy);

    this.emit('learning', recordMarkEvent(this.p, enemy.speciesId, 'kill', B));
    const b = this.body(enemy);
    this.fx({ type: 'poof', delay: d, x: b.x, y: b.y });
    this.emit('log', 'enemyDown', { name: enemy.name, exp });
    this.exp.removeUnit(enemy);

    while (hs.level < B.battle.heroLevelMax && hs.exp >= expNeeded(hs.level, B)) {
      hs.exp -= expNeeded(hs.level, B);
      hs.level += 1;
      this.runStats();
      // 最大HPは、そのランで初めて届いたレベルのときだけ増える（レベルダウンでは減らないため）
      hs.hpLevel = Math.max(hs.hpLevel ?? hs.level - 1, hs.level - 1);
      if (hs.level > hs.hpLevel) {
        hs.maxHp += B.battle.levelUp.hp;
        hs.hpLevel = hs.level;
      }
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
      if (pending.category === 'bind') this.startBound(e, pending.skillId, pending.ctx?.preFlashed);
      else this.useSkill(e, pending.skillId, pending.ctx);
      return null;
    }

    // 絆を結んだ相方が近くにいれば、二人でユナイト攻撃
    const unitePartner = this.unitePartnerFor(e, dist);
    if (unitePartner) {
      this.uniteAttack(e, unitePartner);
      return null;
    }
    // 隣にいると、ときどきポーチを漁られ、奪ったアイテムをその場で使われる
    if (dist <= 1 && !this.bound && !bindImmediately && Math.random() < B.itemSnatch.chance && this.eco.snatchAndUse(e)) return null;

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
    // 何もしない（様子見）。行動を1回むだにする代わりに、主人公をからかう
    if (dist <= 1 || sees) actions.push({ id: 'idle', category: 'idle', weight: W.idle ?? 0 });

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
    // 連携技（しっぽフェイント → ヒップアタックなど）は、次の行動で優先する
    const combo = e.comboNext ? actions.find((a) => a.skillId === e.comboNext) : null;
    e.comboNext = null;
    const picked = combo && Math.random() < B.battle.comboChance
      ? combo
      : pickWeighted(applyLearning(actions, ctx, B));
    if (!picked) return null;
    if (picked.category === 'move') return 'move';
    if (picked.category === 'idle') {
      this.enemyIdle(e);
      return null;
    }
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

  // 何もせずに様子を見る。ときどき、からかう台詞と小さなハートを出す
  enemyIdle(e) {
    const hero = this.exp.hero;
    e.setDir(hero.tx - e.tx, hero.ty - e.ty);
    this.actedThisTurn = true;
    const theme = this.theme(e);
    const h = this.head(e);
    this.fx({ type: 'burst', x: h.x, y: h.y - 4, shape: 'heart', colors: [theme.main, theme.glow], count: 3,
      speed: [20, 60], size: [4, 7], life: 0.9, gravity: -50 });
    if (Math.random() < this.B.battle.idleTalkChance) {
      const line = sceneLineFor(e.speciesId, 'idle');
      if (line) this.speak(e, line);
    }
    this.emit('log', 'enemyIdle', { name: e.name });
  }

  prepareSkill(e, skillId, ctx) {
    const def = SKILL_DEFS[skillId];
    const motion = def.category === 'bind' ? bindTag(this.exp.hero.tx - e.tx, this.exp.hero.ty - e.ty) : def.motion ?? 'skill_sexyPose';
    const target = this.body(this.exp.hero);
    e.pendingSkill = { skillId, category: def.category, ctx: { ...ctx, preFlashed: true } };
    e.setDir(this.exp.hero.tx - e.tx, this.exp.hero.ty - e.ty);
    this.actedThisTurn = true;
    this.emit('anim', { unit: e, tag: motion });
    this.emit('se', { id: def.windupSe ?? 'warning', tx: e.tx, ty: e.ty });
    // 構え：敵へ光が集まり、狙われたマスに予告が出る
    const theme = this.theme(e);
    const eb = this.body(e);
    this.fx({ type: 'ring', x: target.x, y: target.y, r: 44, color: theme.main, width: 5, alpha: 0.6 });
    this.fx({ type: 'sparks', x: target.x, y: target.y - 36, color: theme.main, count: 5 });
    this.fx({
      type: 'swirl', x: eb.x, y: eb.y - 10, shapes: ['heart', 'heart', 'heartLine'], colors: [theme.main, theme.glow, theme.accent],
      count: 12, r0: 80, r1: 8, turns: 1.2, life: 0.75, size: [4, 7], glow: true
    });
    this.fx({ type: 'tileMark', x: target.x, y: target.y + 42, color: theme.main, life: 1.0, alpha: 0.6 });
    this.runCueList(e, SKILL_STAGES[skillId]?.windup, 'start', {});
    const line = windupLineFor(e.speciesId, skillId);
    if (line) this.speak(e, line);
    this.emitSkillName(e, skillId, 0.9);
    this.emit('log', 'enemyWindup', { name: e.name, skill: this.skillLabel(skillId, e) });
    const stage = normalizeStage(SKILL_STAGES[skillId], def.category, this.B.stage);
    this.director.start({
      stage: {
        ...stage,
        durationSec: 0.05,
        hits: { count: 1, startSec: 0, endSec: 0 },
        hitNumbers: false,
        fx: [],
        se: []
      },
      payload: { e, skillId, def, attr: def.attr ?? this.attrOf(e.speciesId), ctx, skillName: this.skillLabel(skillId, e), windupOnly: true }
    });
  }

  // 敵の台詞を、吹き出しとログに出す
  speak(e, line, { bubble = true } = {}) {
    if (!line) return;
    const head = this.head(e);
    if (bubble) this.fx({ type: 'bubble', x: head.x, y: head.y - 30, text: line, color: this.theme(e).main });
    this.emit('log', 'enemySpeak', { name: e.name, line });
  }

  // 台本のキュー（at の指定は無視して全部）を、その場で流す
  runCueList(e, list, at = 'start', flags = {}) {
    if (!list?.length) return false;
    const hero = this.exp.hero;
    const context = {
      hero: { body: this.body(hero), head: this.head(hero) },
      enemy: { body: this.body(e), head: this.head(e) },
      dir: { dx: Math.sign(e.tx - hero.tx), dy: Math.sign(e.ty - hero.ty) },
      def: SKILL_DEFS[e.pendingSkill?.skillId] ?? {},
      attr: null, index: 0, count: 1, progress: at === 'end' ? 1 : 0,
      hpLoss: 0, mpLoss: 0, expLost: 0,
      theme: this.theme(e)
    };
    for (const cue of list) {
      if (!this.cueAllowed(cue, flags)) continue;
      const build = STAGE_FX[cue.id];
      if (!build) {
        console.warn(`Unknown skill stage effect: ${cue.id}`);
        continue;
      }
      for (const fx of build({ ...context, opts: cue })) {
        this.fx({ ...fx, delay: (fx.delay ?? 0) + (cue.delay ?? 0) });
      }
    }
    return true;
  }

  // when: 'accepted' / ['!resisted', 'evolved'] のような条件
  cueAllowed(cue, flags) {
    if (!cue.when) return true;
    const list = Array.isArray(cue.when) ? cue.when : [cue.when];
    return list.every((w) => (w.startsWith('!') ? !flags[w.slice(1)] : Boolean(flags[w])));
  }

  startBound(e, skillId, preFlashed = false, choiceResult = null) {
    if (this.climax.blocksBinding()) {
      this.autoGuardBind(e);
      return;
    }
    if (this.bound) return this.addBoundBinder(e, skillId);
    if (!choiceResult && this.offerChoice(e, skillId, (result) => this.startBound(e, skillId, preFlashed, result))) return;
    // 拘束の台詞は、拘束の演出（大きな文字）と重なるので吹き出しは出さない
    if (!choiceResult) this.speak(e, sceneLineFor(e.speciesId, 'bind') ?? speechFor(e.speciesId, this.attrOf(e.speciesId)), { bubble: !SKILL_STAGES[skillId]?.bind });
    const bindAttr = SKILL_DEFS[skillId]?.attr ?? this.attrOf(e.speciesId);
    if (!preFlashed) {
      this.emitSkillName(e, skillId, 0.9);
      const body = this.body(e);
      const flashSec = this.B.stage.defaults.special.flashSec;
      this.emit('skillFlash', { x: body.x, y: body.y, attr: bindAttr, color: this.theme(e).main, sec: flashSec });
      if (this.save.settings.flashback !== 'off') this.emit('se', { id: 'skillFlash', tx: e.tx, ty: e.ty });
    }
    const dx = e.tx - this.exp.hero.tx;
    const dy = e.ty - this.exp.hero.ty;
    const heroDir = this.exp.hero.dir;
    // 体勢崩し中は、尻の拘束が背面からになる
    const isBackBind = dx * heroDir.dx + dy * heroDir.dy < 0 || this.conditions.backBind(bindAttr);
    this.bound = {
      binders: [],
      isBackBind,
      elapsed: 0,
      sincePulse: 0,
      pulseTimer: Math.max(0, this.B.bound.pulseSec - this.B.bound.firstPulseDelaySec),
      idleSec: 0,
      surrenderRate: isBackBind ? this.B.bound.backSurrenderGain : 0,
      escapeProgress: 0,
      requiredClicks: 0,
      choiceDrainMul: choiceResult?.drainMul ?? 1
    };
    this.addBoundBinder(e, skillId, false);
    recordSkillSeen(this.p, e.speciesId, skillId);
    this.bound.surrenderRate = Math.min(1, this.bound.surrenderRate + startSurrenderFor(this.p, e.speciesId, this.B));
    this.bound.requiredClicks = this.getRequiredClicks();
    // 選択肢付きの拘束を受け入れたら、その敵の蓄積デバフが進む
    const bindDef = SKILL_DEFS[skillId];
    if (choiceResult && choiceResult.answer !== 'resist' && bindDef?.cond) {
      const mulC = choiceResult.answer === 'timeout' ? this.B.temptation.timeoutCondMul : this.B.temptation.acceptCondMul;
      this.handleEvents(this.conditions.gain(bindDef.cond.id, bindDef.cond.gain * mulC, {
        floorKey: this.floorKey(), voluntary: choiceResult.answer === 'accept'
      }), e, skillId);
    }
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
    // 拘束攻撃を受けるたびに、その子専用の蓄積デバフ（→ 永続段階）が進む
    this.bindCondGain(e, skillId, this.B.conditioning.bindHitGain);
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
      this.emit('se', { id: 'bindJoin', tx: e.tx, ty: e.ty });
      this.joinEffect(e, bound.binders.length);
      this.bindEffect(e, skillId, false);
      this.emit('boundChanged', { binders: bound.binders.map((b) => b.unit) });
      this.climax.extend();
    }
    this.updateFormation();
    return true;
  }

  // 別の敵が拘束に加わったときの演出。人数が増えるほど派手になる
  joinEffect(e, count) {
    const hero = this.exp.hero;
    const hb = this.body(hero);
    const hh = this.head(hero);
    const theme = this.theme(e);
    const k = Math.min(1, (count - 1) / 3);
    this.fx({ type: 'flow', from: this.head(e), to: { x: hb.x, y: hb.y - 16 }, shapes: ['heart', 'heart', 'heartLine'],
      colors: [theme.main, theme.glow, theme.accent], count: 14, life: 0.45, spanSec: 0.3, arc: 30, size: [6, 10], glow: true });
    this.fx({ type: 'speedLines', delay: 0.15, x: hb.x, y: hb.y, color: theme.main, count: 40 + 20 * k, alpha: 0.5 });
    this.fx({ type: 'flash', delay: 0.15, color: theme.main, alpha: 0.2 + 0.2 * k });
    this.fx({ type: 'ring', delay: 0.15, x: hb.x, y: hb.y + 40, r: 90 + 30 * k, squash: 0.45, color: theme.main, width: 7, alpha: 0.75, life: 0.5 });
    this.fx({ type: 'burst', delay: 0.18, x: hb.x, y: hb.y - 10, shapes: ['heart', 'heartLine'], colors: [theme.main, theme.glow, '#ff2d86'],
      count: 16 + 14 * k, speed: [120, 300], size: [6, 12], life: 0.8, glow: true });
    this.fx({ type: 'shake', delay: 0.15, power: 0.6 + 0.6 * k });
    this.fx({ type: 'callout', delay: 0.2, x: hb.x, y: hh.y - 40, text: `追加拘束！ ×${count}`, color: theme.main, size: 30 + 8 * k, wobble: 0.1 });
    this.fx({ type: 'callout', delay: 0.45, x: this.body(e).x, y: this.head(e).y - 30, text: `${e.name}も♡`, color: theme.glow, size: 20 });
    this.emit('drainPulse', { strength: 1, delay: 0.15 });
  }

  // 主人公から見た、拘束している敵の向き
  binderSides() {
    const hero = this.exp.hero;
    return (this.bound?.binders ?? []).map(({ unit }) => bindSideOf(unit.tx - hero.tx, unit.ty - hero.ty, hero.dir));
  }

  // 複数方向からの拘束の陣形を求め直す。新しく成立した陣形は演出で知らせる
  updateFormation() {
    const bound = this.bound;
    if (!bound) return;
    const before = new Set(bound.formation?.ids ?? []);
    bound.formation = formationFor(this.binderSides());
    const hero = this.exp.hero;
    const hb = this.body(hero);
    const hh = this.head(hero);
    bound.formation.active.forEach((f, i) => {
      if (before.has(f.id)) return;
      const d = 0.5 + i * 0.35;
      this.emit('log', 'formationOn', { name: f.name, desc: f.desc });
      this.emit('se', { id: 'formationOn', delay: d });
      this.fx({ type: 'callout', delay: d, x: hb.x, y: hh.y - 80, text: `【${f.name}】`, color: f.color, size: 30, wobble: 0.06, life: 1.6 });
      this.fx({ type: 'wash', delay: d, color: f.color, alpha: 0.3, life: 1.0 });
      this.fx({ type: 'swirl', delay: d, x: hb.x, y: hb.y - 10, shapes: ['heart', 'heartLine'], colors: [f.color, '#ffd6ec'],
        count: 16, r0: 130, r1: 30, turns: 1.2, life: 0.9, size: [6, 10], glow: true });
      const sides = this.binderSides();
      for (const [side, line] of Object.entries(f.lines ?? {})) {
        const i = sides.indexOf(side);
        if (i >= 0) this.later(d + 0.3, () => this.bound && this.speak(this.bound.binders[i]?.unit, line));
      }
      if (f.chorus) {
        this.fx({ type: 'callout', delay: d + 0.6, x: hb.x, y: hh.y - 120, text: f.chorus, color: f.color, size: 34, wobble: 0.08, life: 2.0 });
        this.emit('log', 'formationChorus', { line: f.chorus });
      }
    });
    if (before.size !== bound.formation.ids.length || bound.formation.ids.some((id) => !before.has(id))) {
      this.refreshBoundRequirement();
    }
    this.emit('bindFormation', { formation: bound.formation });
  }

  bindEffect(e, skillId, pulse = false) {
    // 台本に拘束の演出があれば、そちらを使う
    const custom = SKILL_STAGES[skillId]?.bind?.[pulse ? 'pulse' : 'start'];
    if (custom) {
      this.runCueList(e, custom, pulse ? 'hit' : 'start', { evolved: isEvolved(this.p, e.speciesId, skillId) });
      return;
    }
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
    if (e.bonding) return false;
    const def = ENEMIES_BY_ID[e.speciesId];
    const skillId = def.bindSkills.find((id) => SKILL_DEFS[id]);
    // 絆を結んだ相方が拘束していれば、必ず息を合わせて加わる（ユナイト拘束）
    const partner = e.bondPartner && this.bound.binders.find((b) => b.unit === e.bondPartner);
    if (!skillId || (!partner && Math.random() >= this.B.bound.uniteChance)) return false;
    const ok = this.addBoundBinder(e, skillId);
    if (ok && partner) {
      const me = this.bound.binders.find((b) => b.unit === e);
      me.unite = true;
      partner.unite = true;
      this.uniteFlourish(partner.unit, e, true);
    }
    return ok;
  }

  // ---- ユナイト攻撃（二人の連携）----
  // 種類：同じまとまり（enemyGroups.js）の二人はそのまとまりの専用技、それ以外はこすり合わせた部位の技
  uniteType(a, b) {
    return uniteTypeFor(a, b, (x, y) => {
      const g = sharedGroup(x, y);
      return g ? ENEMY_GROUPS[g] : null;
    });
  }

  // 二人の見せ場の演出。bindJoin = 拘束中に相方が加わったとき
  uniteFlourish(a, b, bindJoin = false) {
    const hero = this.exp.hero;
    const hb = this.body(hero);
    const hy = this.head(hero).y;
    const ta = this.theme(a);
    const tb = this.theme(b);
    const type = this.uniteType(a, b);
    const name = type.name;
    this.emit('skillName', { key: `unite:${a.id}:${b.id}`, title: `ユナイト：${name}`, sub: `${a.name} × ${b.name}${type.group ? `（${type.group}）` : ''}`, attr: (a.bondAttrs ?? [])[0], color: ta.main, holdSec: 1.4 });
    this.emit('se', { id: 'uniteStrike', tx: a.tx, ty: a.ty });
    for (const [u, th] of [[a, ta], [b, tb]]) {
      const ub = this.body(u);
      this.fx({ type: 'glyph', x: ub.x, y: ub.y + 42, style: 'heart', color: th.main, sub: th.glow, r: 48, life: 1.2, spin: 2 });
      this.fx({ type: 'flow', delay: 0.15, from: this.head(u), to: { x: hb.x, y: hb.y - 20 }, shapes: ['heart', 'heartLine'],
        colors: [th.main, th.glow, '#ffd6ec'], count: 16, life: 0.5, spanSec: 0.3, arc: 40, size: [6, 11], glow: true });
    }
    this.fx({ type: 'swirl', delay: 0.4, x: hb.x, y: hb.y - 20, shapes: ['heart', 'heart', 'heartLine'], colors: [ta.main, tb.main, '#ffd6ec'],
      count: 22, r0: 140, r1: 20, turns: 1.5, life: 0.9, size: [7, 12], glow: true });
    this.fx({ type: 'flash', delay: 0.45, color: ta.main, alpha: 0.35 });
    this.fx({ type: 'shake', delay: 0.45, power: 1.1 });
    this.fx({ type: 'callout', delay: 0.1, x: hb.x, y: hy - 90, text: 'せーのっ♡', color: tb.main, size: 30, wobble: 0.1, life: 1.2 });
    this.fx({ type: 'callout', delay: 0.5, x: hb.x, y: hy - 50, text: bindJoin ? 'ユナイト拘束♡' : `${name}♡`, color: ta.main, size: 32, wobble: 0.08, life: 1.6 });
    if (type.line) this.fx({ type: 'callout', delay: 0.9, x: hb.x, y: hy - 130, text: type.line, color: tb.glow, size: 20, life: 2.0 });
    this.emit('drainPulse', { strength: 1, delay: 0.45 });
    return type;
  }

  // 二人同時の攻撃：大きく吸い、二人ぶんの蓄積デバフを進め、種類ごとの効果のあと、二人がかりで拘束する
  uniteAttack(a, b) {
    const { B, hs } = this;
    const U = B.unite;
    this.actedThisTurn = true;
    a.uniteReadyTurn = this.exp.turnCount + U.cooldownTurns;
    b.uniteReadyTurn = a.uniteReadyTurn;
    const type = this.uniteFlourish(a, b);
    this.emit('log', 'uniteAttack', { a: a.name, b: b.name, skill: type.name });
    const E = U.effects[type.effect] ?? {};
    this.later(0.55, () => {
      if (this.defeated) return;
      const scale = this.climax.drainScale() * this.buffs.mult('drainTaken') * this.conditions.mult('drainTaken')
        * (a.bondPower ?? 1) * (b.bondPower ?? 1) * (a.bondPartner === b ? 1 : U.groupPowerMul);
      const mp = Math.min(hs.mp, Math.round(hs.maxMp * U.mpRate * (E.mp ?? 1) * scale));
      hs.mp -= mp;
      const res = this.drainHeroExp(U.expRate * (E.exp ?? 1) * scale);
      const hb = this.body(this.exp.hero);
      const hy = this.head(this.exp.hero).y;
      if (mp > 0) this.fx({ type: 'damage', x: hb.x, y: hy - 26, text: `MP -${mp}`, style: 'mp', big: true });
      if (res.lost > 0) this.fx({ type: 'damage', x: hb.x, y: hy - 56, text: `EXP -${res.lost}`, style: 'exp', big: true });
      for (const u of [a, b]) {
        this.gainDrainExperience(u, (mp + res.lost) / 2);
        const condId = conditionOfRace(u.speciesId);
        if (condId) this.handleEvents(this.conditions.gain(condId, U.condGain * (E.cond ?? 1), { floorKey: this.floorKey() }), u, null);
      }
      this.uniteEffect(type, a, b);
      if (hs.mp === 0) this.emit('log', 'mpEmpty', {});
      this.emit('persist');
    });
    if (E.noBind) return;
    // 続けて、二人がかりで拘束する
    this.later(E.bindDelay ?? 1.2, () => {
      if (this.defeated || this.bound || this.climax.blocksBinding()) return;
      if (!this.exp.units.includes(a) || !this.exp.units.includes(b)) return;
      const bindA = ENEMIES_BY_ID[a.speciesId]?.bindSkills.find((id) => SKILL_DEFS[id]);
      const bindB = ENEMIES_BY_ID[b.speciesId]?.bindSkills.find((id) => SKILL_DEFS[id]);
      if (!bindA || !bindB) return;
      const hero = this.exp.hero;
      if (chebyshev(b.tx, b.ty, hero.tx, hero.ty) > 1) this.exp.stepToward?.(b);
      this.startBound(a, bindA, true, { answer: 'unite', drainMul: U.bindDrainMul * (E.bindDrain ?? 1) });
      if (!this.bound) return;
      this.bound.binders[0].unite = true;
      this.bound.surrenderRate = Math.min(1, this.bound.surrenderRate + (E.surrender ?? 0));
      if (chebyshev(b.tx, b.ty, hero.tx, hero.ty) <= 1 && this.addBoundBinder(b, bindB)) {
        const me = this.bound.binders.find((x) => x.unit === b);
        if (me) me.unite = true;
      }
      this.refreshBoundRequirement();
    });
  }

  // 連携攻撃の種類ごとの追加効果
  uniteEffect(type, a, b) {
    const hero = this.exp.hero;
    const hb = this.body(hero);
    const hy = this.head(hero).y;
    const ta = this.theme(a);
    const add = (id, turns) => this.handleEvents(this.conditions.addStatus(id, turns), a, null);
    switch (type.effect) {
      case 'chorus':   // メイド隊：呼び鈴で仲間が集まり、声をそろえる
        this.callMaids(a);
        this.emit('se', { id: 'maidChorus', clear: true });
        add('exhausted', 3);
        break;
      case 'rush':     // バニーズ：左右から飛び込み、転ばせる
        add('tripped', 1);
        this.fx({ type: 'speedLines', x: hb.x, y: hb.y, color: ta.main, count: 70, alpha: 0.6 });
        break;
      case 'whisper':  // 小悪魔：左右の耳から囁き。音がこもり、集中が切れる
        add('unfocused', 4);
        this.emit('uniteWhisper', { sec: 3 });
        this.fx({ type: 'callout', x: hb.x - 110, y: hy - 10, text: 'びゅー……♡', color: ta.main, size: 22, life: 1.8 });
        this.fx({ type: 'callout', delay: 0.3, x: hb.x + 110, y: hy - 10, text: 'だしちゃえだしちゃえ……♡', color: this.theme(b).main, size: 20, life: 1.8 });
        this.fx({ type: 'wash', color: ta.main, alpha: 0.3, mode: 'edge', life: 2.4 });
        break;
      case 'doubleDrain':   // サキュバス：二重の吸精（経験値を大きく）
        this.fx({ type: 'swirl', x: hb.x, y: hy, shapes: ['dot', 'heart'], colors: ['#c08bff', ta.main], count: 30, r0: 120, r1: 10, turns: 2, life: 1.4, size: [4, 8], glow: true });
        break;
      case 'judgment':      // シスター：二人のカウントダウン
        ['ご', 'よん', 'さん', 'に', 'いち', 'ぜろ。'].forEach((t, i) => this.fx({ type: 'callout', delay: i * 0.3, x: hb.x, y: hy - 40, text: t, color: ta.main, size: 54, life: 0.32, wobble: 0 }));
        this.emit('se', { id: 'zeroDrop', delay: 1.6 });
        add('cowed', 3);
        break;
      case 'command':       // 高貴な二人：二重命令で服従
        add('obedient', 4);
        break;
      case 'capture':       // 追跡者：逃げ場を塞ぐ
        add('cornered', 4);
        break;
      case 'lullaby':       // 甘やかし：とろとろに寝かしつける
        add('asleep', 1);
        this.fx({ type: 'burst', x: hb.x, y: hy, shapes: ['note', 'fluff'], colors: [ta.main, '#ffffff'], count: 14, speed: [20, 60], size: [6, 10], life: 1.4, gravity: -30 });
        break;
      case 'gaze':          // 視線包囲：視線ロックが一気に溜まる
        this.save.currentRun.gazeLock = this.B.traits.gazeMax - 1;
        add('pinned', 1);
        break;
      default:
        if (type.status) add(type.status, 2);
    }
  }

  // ---- 離れた所からの誘惑を受け入れた ----
  // 技の始まり：ハートの光がまっすぐ届き、目がハートになる
  rangedAcceptIntro(e, timeout) {
    const hero = this.exp.hero;
    const hb = this.body(hero);
    const hy = this.head(hero).y;
    const th = this.theme(e);
    const eh = this.head(e);
    this.fx({ type: 'wash', color: th.main, alpha: 0.38, mode: 'full', life: 1.8, inSec: 0.2 });
    this.fx({ type: 'wash', color: '#ff2d86', alpha: 0.3, mode: 'edge', life: 2.6, inSec: 0.3 });
    this.fx({ type: 'flow', from: { x: eh.x, y: eh.y + 24 }, to: { x: hb.x, y: hy + 6 }, shapes: ['heart', 'heart', 'heartLine'],
      colors: [th.main, th.glow, '#ffd6ec'], count: 40, life: 0.7, spanSec: 1.2, arc: 20, size: [6, 12], glow: true });
    this.fx({ type: 'speedLines', delay: 0.2, x: hb.x, y: hb.y, color: th.main, count: 60, alpha: 0.5 });
    this.fx({ type: 'swirl', delay: 0.5, x: hb.x, y: hy + 4, shapes: ['heart'], colors: [th.main, '#ff2d86'], count: 12, r0: 50, r1: 10, turns: 2, life: 1.2, size: [5, 9], glow: true });
    this.fx({ type: 'glyph', delay: 0.3, x: hb.x, y: hb.y + 42, style: 'heart', color: th.main, sub: th.glow, r: 70, life: 2.2, spin: 1.5 });
    this.fx({ type: 'callout', delay: 0.4, x: hb.x, y: hy - 80, text: timeout ? '（目が……離せない……♡）' : '（あの子のところへ……行かなきゃ♡）', color: th.main, size: 26, life: 2.2, rise: 10 });
    this.fx({ type: 'callout', delay: 0.9, x: eh.x, y: eh.y - 40, text: 'おいで……♡', color: th.glow, size: 30, wobble: 0.1, life: 1.8 });
    this.emit('se', { id: 'temptAccept', tx: e.tx, ty: e.ty, gain: 1.2 });
    this.emit('se', { id: 'lowMpHeartbeat', delay: 0.3, gain: 1.0 });
    this.emit('se', { id: 'lowMpHeartbeat', delay: 0.9, gain: 1.1 });
    this.emit('drainPulse', { strength: 1, delay: 0.4 });
    this.emit('log', 'rangedAccept', { name: e.name });
  }

  // 技のあと：一歩ずつ、あの子の胸の中へ歩いていき、そのまま抱きとめられて拘束される
  rangedAcceptFollow(e, timeout) {
    const RA = this.B.temptation.rangedAccept;
    const hero = this.exp.hero;
    if (this.bound || !this.exp.units.includes(e)) return;
    const path = this.pathToNeighbor(hero, e);
    this.rangedPull = true;
    const th = this.theme(e);
    path.forEach((cell, i) => {
      this.later(RA.stepSec * (i + 1), () => {
        if (this.bound || this.defeated) return;
        hero.moveTo(cell.x, cell.y);
        hero.setDir(e.tx - hero.tx, e.ty - hero.ty);
        this.exp.refresh?.();
        this.emit('heroPulled', { unit: hero });
        const hb = this.body(hero);
        this.fx({ type: 'burst', x: hb.x, y: hb.y + 30, shapes: ['heart'], colors: [th.main, '#ffd6ec'], count: 5, speed: [20, 60], size: [4, 7], life: 0.8, gravity: -50 });
      });
    });
    this.later(RA.stepSec * (path.length + 1) + 0.15, () => {
      this.rangedPull = false;
      if (this.bound || this.defeated || !this.exp.units.includes(e)) return;
      if (chebyshev(e.tx, e.ty, hero.tx, hero.ty) > 1) return;
      const bindId = ENEMIES_BY_ID[e.speciesId]?.bindSkills.find((id) => SKILL_DEFS[id]);
      if (!bindId) return;
      const hb = this.body(hero);
      this.speak(e, timeout ? 'ずっと見とれてたね♡ ……ほら、つかまえた' : '自分から来てくれたんだ♡ ……ぎゅーっ♡');
      this.fx({ type: 'callout', x: hb.x, y: this.head(hero).y - 70, text: '自分から、飛び込んだ……♡', color: th.main, size: 30, wobble: 0.08, life: 1.8 });
      this.fx({ type: 'burst', x: hb.x, y: hb.y - 10, shapes: ['heart', 'heart', 'heartLine'], colors: [th.main, th.glow, '#ff2d86'], count: 30, speed: [120, 300], size: [7, 13], life: 1.0, glow: true });
      this.fx({ type: 'flash', color: th.main, alpha: 0.35 });
      this.startBound(e, bindId, true, { answer: 'accept', drainMul: RA.bindDrainMul });
      if (this.bound) {
        // 自分から身を任せたので、最初から抜け出しにくい
        this.bound.surrenderRate = Math.min(1, this.bound.surrenderRate + RA.surrender);
        this.refreshBoundRequirement();
      }
    });
  }

  // 主人公から、敵の隣の空いたマスまでの道（歩く順）。見つからなければ空
  pathToNeighbor(hero, e) {
    const walk = (x, y) => this.exp.walk(x, y) && (!this.exp.unitAt(x, y) || this.exp.unitAt(x, y) === hero);
    const key = (x, y) => `${x},${y}`;
    const start = key(hero.tx, hero.ty);
    const prev = new Map([[start, null]]);
    const queue = [{ x: hero.tx, y: hero.ty }];
    while (queue.length && prev.size < 4000) {
      const cur = queue.shift();
      if (chebyshev(cur.x, cur.y, e.tx, e.ty) === 1 && key(cur.x, cur.y) !== start) {
        const path = [];
        for (let c = cur; c && key(c.x, c.y) !== start; c = prev.get(key(c.x, c.y))) path.unshift(c);
        return path.slice(0, this.B.temptation.rangedAccept.maxSteps);
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (prev.has(key(nx, ny)) || !walk(nx, ny) || !canStep(walk, cur.x, cur.y, dx, dy)) continue;
        prev.set(key(nx, ny), cur);
        queue.push({ x: nx, y: ny });
      }
    }
    return [];
  }

  // ---- 追加18体の専用の仕組み ----
  // 選択肢付き技を受け入れた（applySkillEffects から）
  onTemptAccepted(e, def, flags) {
    // 自分から受け入れると、その子が成長する（ご褒美の罠・過保護の罠・甘えのおねだり）
    if (def.acceptGrow && !flags.timeout) {
      this.gainDrainExperience(e, this.B.memory.acceptGrowExp);
      this.celebrateEnemy(e, '甘えてくれた♡ 成長');
      this.emit('log', 'acceptGrow', { name: e.name });
    }
    this.rememberYield(e);
  }

  // お願いを聞いた・抵抗をやめた：カモ認定と諦め学習
  rememberYield(e) {
    if (remember(this.p, e.speciesId, 'kamo', this.B)) {
      this.later(0.4, () => this.speak(e, 'やったぁ♡ ……おにーさん、カモ確定だね'));
      this.emit('log', 'memoryKamo', { name: e.name });
    }
    if (remember(this.p, e.speciesId, 'giveUps', this.B)) this.emit('log', 'memoryGiveUp', { name: e.name });
  }

  // メイド連携追跡：呼び鈴で、階にいるメイドたちが集まってくる
  callMaids(caller) {
    const hero = this.exp.hero;
    let n = 0;
    for (const u of this.exp.units) {
      if (u.kind !== 'enemy' || u === caller || !ENEMIES_BY_ID[u.speciesId]?.maid) continue;
      if (chebyshev(u.tx, u.ty, hero.tx, hero.ty) > this.B.memory.maidCallRange) continue;
      u.lured = true;
      n += 1;
      const b = this.body(u);
      this.fx({ type: 'callout', delay: 0.3 + n * 0.15, x: b.x, y: this.head(u).y - 30, text: 'はい、ただいま', color: this.theme(u).main, size: 18 });
      this.emit('se', { id: 'heelStep', tx: u.tx, ty: u.ty, delay: 0.3 + n * 0.15 });
    }
    if (n) this.emit('log', 'maidCall', { name: caller.name, count: n });
  }

  // メイドが2人以上で拘束していると、声をそろえて吸い上げる
  maidChorus(bound) {
    bound.chorusTimer = (bound.chorusTimer ?? 0) - 1;
    if (bound.chorusTimer > 0) return;
    bound.chorusTimer = 4;
    const hero = this.exp.hero;
    const hb = this.body(hero);
    this.fx({ type: 'callout', x: hb.x, y: this.head(hero).y - 100, text: '「「経験値、だして……♡」」', color: '#ff7ab8', size: 30, wobble: 0.08, life: 1.6 });
    this.fx({ type: 'wash', color: '#ffd36b', alpha: 0.18, mode: 'edge', life: 1.2 });
    this.emit('se', { id: 'maidChorus', clear: true });
  }

  // この敵が、いまユナイト攻撃できる相方。絆を結んだ相手が最優先、いなければ近くにいる同じまとまりの仲間
  unitePartnerFor(e, dist) {
    const U = this.B.unite;
    if (dist > 1 || this.bound || this.climax.blocksBinding()) return null;
    if ((e.uniteReadyTurn ?? 0) > this.exp.turnCount) return null;
    const hero = this.exp.hero;
    const ok = (p) => p && p !== e && p.hp > 0 && !p.bonding && !(p.stunTurns > 0) && (p.uniteReadyTurn ?? 0) <= this.exp.turnCount
      && chebyshev(p.tx, p.ty, hero.tx, hero.ty) <= U.partnerRange;
    const bonded = partnerReady(e, this.exp.units);
    if (ok(bonded)) return Math.random() < U.chance ? bonded : null;
    const mates = this.exp.units.filter((u) => u.kind === 'enemy' && ok(u) && sharedGroup(e.speciesId, u.speciesId));
    if (!mates.length || Math.random() >= U.groupChance) return null;
    return mates[Math.floor(Math.random() * mates.length)];
  }

  getRequiredClicks() {
    const bound = this.bound;
    const binders = bound.binders;
    const first = binders[0];
    const res = this.eco.resistanceOf(first.attr);
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
    // 一時状態（油断・誘惑受容など）と、発症中の蓄積デバフで脱出しにくくなる
    const condMul = this.conditions.mult('escapeNeed') * this.conditions.boost(first.unit.speciesId, 'escape')
      * (bound.formation?.escape ?? 1)
      * Math.max(...binders.map((b) => this.eco.escapeMulFrom(b.unit.speciesId)))   // 贈り物の呪い
      * Math.max(...binders.map((b) => escapeMulFor(this.p, b.unit.speciesId, this.B)))   // 逃げた回数・覚えた逃げ方
      * escapeMulForBound(this, bound);   // 重圧
    return Math.max(1, Math.round(base * this.buffs.mult('escapeNeed') * condMul));
  }

  struggle() {
    const bound = this.bound;
    if (!bound) return false;
    if (this.climax.escapeLocked()) return true;
    bound.idleSec = 0;
    bound.surrenderRate = Math.max(0, bound.surrenderRate - 0.01);
    this.refreshBoundRequirement();
    // 集中力低下などで、もがき1回の効きが落ちる
    bound.escapeProgress = Math.min(bound.requiredClicks, bound.escapeProgress + this.conditions.mult('struggle'));
    this.emit('se', { id: 'tick', tx: this.exp.hero.tx, ty: this.exp.hero.ty });
    this.fx({ type: 'ring', x: this.body(this.exp.hero).x, y: this.body(this.exp.hero).y, r: 36 });
    if (bound.escapeProgress >= bound.requiredClicks) this.escapeBound();
    return true;
  }

  // 拘束で吸われている間も、その子専用の蓄積デバフ（→ 永続段階）が進む
  bindCondGain(unit, skillId, amount) {
    if (!(amount > 0)) return;
    const condId = SKILL_DEFS[skillId]?.cond?.id ?? conditionOfRace(unit.speciesId);
    if (!condId || !CONDITIONS[condId]) return;
    this.handleEvents(this.conditions.gain(condId, amount, { floorKey: this.floorKey() }), unit, skillId);
  }

  // 主人公のEXPを失う。足りなければレベルが下がる
  drainHeroExp(rate) {
    const { B, hs } = this;
    rate *= this.conditions.mult('expTaken');   // 弱点看破などで、経験値が吸われやすくなる
    const amount = Math.max(1, Math.round(expNeeded(hs.level, B) * rate));
    this.runStats();   // 吸われる前のレベルを、このランの最高レベルとして記録しておく
    const res = loseHeroExp(hs, amount, {
      needFn: (lv) => expNeeded(lv, B),
      levelUp: B.battle.levelUp,
      minLevel: B.bound.expDrainMinLevel,
      keepHp: true
    });
    if (res.lost > 0) {
      const rs = this.runStats();
      rs.expLost += res.lost;
      this.emit('heroExpDrained', { amount: res.lost, levelsLost: res.levelsLost, level: hs.level });
    }
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
    const res = this.drainHeroExp(B.bound.expDrainPerSec * drainMult * this.buffs.mult('drainTaken') * (bound.choiceDrainMul ?? 1));
    for (const { unit } of bound.binders) {
      this.gainDrainExperience(unit, res.lost * B.bound.expShareRate);
    }
    // 絶頂中は、その子専用の蓄積デバフがいっそう深く刻まれる
    for (const { unit, skillId } of bound.binders) this.bindCondGain(unit, skillId, B.conditioning.bindGainPerSec * B.conditioning.climaxGainMul);
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
    // 拘束役が、絶頂に合わせて囁く（性格で言い方が違う）
    const voice = bound.binders[Math.floor(Math.random() * bound.binders.length)]?.unit;
    if (voice) {
      const hb2 = this.body(this.exp.hero);
      this.fx({ type: 'callout', x: hb2.x + (Math.random() - 0.5) * 120, y: this.head(this.exp.hero).y - 20 - Math.random() * 50,
        text: climaxVoiceFor(voice.speciesId), color: this.theme(voice).main, size: 24 + 10 * progress, wobble: 0.1, life: 1.2 });
    }
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
      this.onFinish();
      this.p.stats.climaxCount = (this.p.stats.climaxCount ?? 0) + 1;
      this.runStats().climaxes += 1;
      const lead = this.bound?.binders[0]?.unit;
      if (lead) {
        const line = sceneLineFor(lead.speciesId, 'climaxStart');
        this.speak(lead, line);
        this.fx({ type: 'callout', delay: 0.4, x: hb.x, y: this.head(hero).y - 70, text: line.length > 14 ? 'イけ♡' : line,
          color: this.theme(lead).main, size: 40, wobble: 0.12, life: 1.6 });
      }
      const first = this.bound?.binders[0]?.unit;
      this.flashback?.cancel();
      // 絶頂の音（wav）を、0.5秒ずらして2回重ねる
      for (const delay of this.B.climaxSe.delays) this.emit('se', { id: 'climaxBurst', delay, exact: true });
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
      this.climaxStartDrain(payload.count ?? 1);
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

  // 絶頂の瞬間に、まとめて大きく吸い上げる。拘束役が多いほど、絶頂を重ねているほど多い
  climaxStartDrain(count) {
    const { B } = this;
    const bound = this.bound;
    if (!bound?.binders.length) return;
    if (this.eco.consumeAmulet()) return;   // 身代わりのお守り
    const C = B.climax.startDrain;
    const n = bound.binders.length;
    const rate = C.expRate * (1 + C.perBinder * (n - 1)) * (1 + Math.min(C.countCap, C.perCount * (count - 1)))
      * this.buffs.mult('drainTaken') * (bound.choiceDrainMul ?? 1);
    const res = this.drainHeroExp(rate);
    if (!(res.lost > 0)) return;
    const hero = this.exp.hero;
    const hb = this.body(hero);
    const hy = this.head(hero).y;
    for (const [i, { unit }] of bound.binders.entries()) {
      const share = res.lost * B.bound.expShareRate * C.shareMul / n;
      this.later(0.25 + i * 0.12, () => this.gainDrainExperience(unit, share));
      const th = this.theme(unit);
      const eb = this.body(unit);
      this.fx({ type: 'flow', delay: 0.2 + i * 0.12, from: { x: hb.x, y: hb.y - 20 }, to: { x: eb.x, y: this.head(unit).y + 20 },
        shapes: ['heart', 'dot', 'heart'], colors: ['#b85cff', th.main, '#ffd6ec'], count: 26, size: [5, 10], life: 0.9, spread: 26, glow: true });
      this.fx({ type: 'ring', delay: 0.9 + i * 0.12, x: eb.x, y: eb.y, r: 70, color: th.main, width: 6, alpha: 0.8, life: 0.5 });
    }
    this.fx({ type: 'wash', color: '#9b3dff', alpha: 0.28, mode: 'full', life: 1.3, inSec: 0.15 });
    this.fx({ type: 'burst', delay: 0.1, x: hb.x, y: hy, shapes: ['heart', 'heartLine', 'dot'], colors: ['#b85cff', '#ff4fa3', '#ffd6ec'],
      count: 34, speed: [160, 360], size: [6, 13], life: 1.1, gravity: 80, glow: true });
    this.fx({ type: 'damage', delay: 0.35, x: hb.x, y: hy - 70, text: `EXP -${res.lost}`, style: 'exp', big: true });
    this.emit('se', { id: 'expDrained', delay: 0.2, gain: 1.3 });
    this.emit('se', { id: 'levelDown', delay: 0.55, gain: res.levelsLost > 0 ? 1 : 0.5 });
    this.emit('log', 'climaxStartDrain', { amount: res.lost });
  }

  // MP0 フィニッシュ。拘束技の進化（finish）と、指定技による上位技の永続習得
  onFinish() {
    for (const { unit, skillId } of this.bound?.binders ?? []) {
      const raceId = unit.speciesId;
      this.handleEvents(recordEvoProgress(this.p, raceId, skillId, SKILL_DEFS[skillId], 'finish'), unit, skillId);
      const advanced = ENEMIES_BY_ID[raceId]?.advancedSkill;
      if (!advanced || SKILL_DEFS[advanced]?.advancedFrom !== skillId) continue;
      if (!learnAdvanced(this.p, raceId, advanced)) continue;
      for (const u of this.exp.units) {
        if (u.kind === 'enemy' && u.speciesId === raceId) u.advancedSkillUnlocked = true;
      }
      this.emit('log', 'advancedLearned', { name: unit.name, skill: this.skillLabel(advanced) });
      this.emit('se', { id: 'skillEvolve', tx: unit.tx, ty: unit.ty });
      this.celebrateEnemy(unit, '上位技 習得');
    }
    this.emit('persist');
  }

  // 永続デバフが深まった。画面と永続デバフの欄で知らせる（id は debuffPanel の collectDebuffs と同じ）
  deepenDebuff(id, label) {
    this.emit('debuffDeepen', { id, label });
    this.emit('se', { id: 'debuffDeepen', delay: 0.15 });
    const hero = this.exp.hero;
    const hb = this.body(hero);
    this.fx({ type: 'wash', color: '#c2006b', alpha: 0.32, mode: 'full', life: 1.4, inSec: 0.25 });
    this.fx({ type: 'callout', delay: 0.2, x: hb.x, y: this.head(hero).y - 60, text: `「${label}」が刻まれた…`, color: '#ff4fa3', size: 24, life: 1.8, rise: 20 });
    this.fx({ type: 'burst', delay: 0.15, x: hb.x, y: this.head(hero).y - 30, shapes: ['heart', 'heartLine'], colors: ['#c2006b', '#ff4fa3', '#ffd6ec'],
      count: 18, speed: [60, 160], size: [6, 11], life: 1.4, gravity: 160, glow: true });
  }

  // ランの中の記録（敗北の回想に使う）
  runStats() {
    const run = this.save.currentRun;
    run.runStats ??= { expLost: 0, climaxes: 0, peakLevel: 0 };
    run.runStats.peakLevel = Math.max(run.runStats.peakLevel ?? 0, this.hs.level);
    return run.runStats;
  }

  // 演出の合図を少し遅らせる（台詞の順番を作る）。'later' の受け手が無いテストでは、すぐ実行する
  later(sec, fn) {
    if (this.handlers.get('later')?.size) this.emit('later', { sec, fn });
    else fn();
  }

  // 前に負けた敵と再会したとき：勝った記憶で煽ってくる。負けた回数が多いほど強く
  encounterTaunt(u) {
    const gift = this.eco.giftsOf(u.speciesId)[0];
    if (gift) {
      // 自分の贈り物を着けているのに気づく
      this.speak(u, `あっ……わたしの${gift.name.split('の').pop()}、着けてくれてるんだ♡`);
      const hb = this.body(this.exp.hero);
      this.fx({ type: 'burst', x: hb.x, y: hb.y - 10, shapes: ['heart'], colors: [this.theme(u).main, '#ffd6ec'], count: 10, speed: [40, 120], size: [5, 8], life: 0.9, gravity: -40 });
      return;
    }
    const defeats = this.p.codex?.entries?.[u.speciesId]?.defeats ?? 0;
    if (defeats <= 0) return;
    const C = this.B.encounterTaunt;
    const tier = defeats >= C.tiers[2] ? 2 : defeats >= C.tiers[1] ? 1 : 0;
    const theme = this.theme(u);
    const b = this.body(u);
    const h = this.head(u);
    this.speak(u, familiarLineFor(u.speciesId, tier));
    this.emit('log', 'enemyRemembers', { name: u.name, count: defeats });
    this.fx({ type: 'burst', x: h.x, y: h.y, shapes: ['heart', 'heartLine'], colors: [theme.main, theme.glow, theme.accent],
      count: 6 + tier * 8, speed: [40, 120 + tier * 60], size: [5, 9 + tier * 2], life: 1.0, gravity: -40, glow: tier > 0 });
    if (tier >= 1) this.fx({ type: 'glyph', x: b.x, y: b.y + 42, style: 'heart', color: theme.main, sub: theme.glow, r: 40 + tier * 12, life: 1.6 });
    if (tier >= 2) this.fx({ type: 'wash', color: theme.main, alpha: 0.18, life: 1.2 });
    this.emit('se', { id: tier >= 1 ? 'temptPrelude' : 'warning', tx: u.tx, ty: u.ty, gain: 0.6 + 0.2 * tier });
  }

  // 敗北の回想に出す内容（finalizeDefeat の中で集める）
  buildDefeatRecap(d, beforeLose) {
    const p = this.p;
    const rs = this.runStats();
    const name = ENEMIES_BY_ID[d.raceId]?.name ?? d.name;
    const hints = [ENEMY_HINTS[d.raceId], GENERAL_HINTS[p.stats.defeatCount % GENERAL_HINTS.length]].filter(Boolean);
    return {
      raceId: d.raceId,
      name,
      skill: DEFEAT_SKILLS[d.skillId]?.name ?? SKILL_STAGES[d.skillId]?.name ?? d.skillId,
      line: sceneLineFor(d.raceId, 'defeat'),
      theme: themeOf(d.raceId),
      expLost: rs.expLost,
      climaxes: rs.climaxes,
      peakLevel: rs.peakLevel,
      level: this.hs.level,
      defeats: p.codex?.entries?.[d.raceId]?.defeats ?? 0,
      loseHabit: { from: beforeLose, to: p.debuffs.loseHabit.byRace[d.raceId] ?? 0 },
      harvest: this.harvest ? { ...this.harvest } : null,
      rpGain: this.lastRpGain ?? 0,
      hints
    };
  }

  // 敵が強くなったときの演出
  celebrateEnemy(unit, text) {
    const theme = this.theme(unit);
    const b = this.body(unit);
    const h = this.head(unit);
    this.fx({ type: 'glyph', x: b.x, y: b.y + 42, style: 'heart', color: theme.main, sub: theme.glow, r: 58, life: 1.8, spin: 2 });
    this.fx({ type: 'burst', x: b.x, y: h.y, shapes: ['heart', 'heart', 'heartLine'], colors: [theme.main, theme.glow, theme.accent], count: 18, speed: [80, 220], size: [5, 10], life: 1.0, gravity: -40, glow: true });
    this.fx({ type: 'ring', x: b.x, y: b.y, r: 80, color: theme.main, width: 6, alpha: 0.7, life: 0.5 });
    this.fx({ type: 'callout', x: b.x, y: h.y - 30, text, color: theme.main, size: 26 });
    this.emit('anim', { unit, tag: 'skill_sexyPose' });
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
    this.emit('bindFormation', { formation: null });
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
    bound.idleSec += 1;
    if (tickPressure(this, bound)) this.refreshBoundRequirement();
    // 拘束中、動けないうちにポーチを漁られる
    if (Math.random() < this.B.itemSnatch.bindChancePerSec) {
      const binder = bound.binders?.[Math.floor(Math.random() * bound.binders.length)]?.unit;
      if (binder) this.eco.snatchAndUse(binder);
    }
    if (bound.idleSec >= this.B.bound.idleSurrenderSec) {
      bound.surrenderRate = Math.min(1, bound.surrenderRate + this.B.bound.surrenderPerIdleSec);
      this.refreshBoundRequirement();
    }
    if (bound.surrenderRate >= 0.8) {
      bound.escapeProgress = Math.max(0, bound.escapeProgress - 0.5);
    }
  }

  // 拘束中の吸収パルス。毎フレーム呼ぶ（dtSec はポーズ中 0）。
  // 1回の吸収量は前回からの秒数に比例するので、間隔を変えても毎秒の吸収量は変わらない
  boundUpdate(dtSec) {
    const bound = this.bound;
    if (!bound || !(dtSec > 0)) return;
    this.updateBindRequest(dtSec);
    if (!this.bound || this.climax.isClimax()) return;
    bound.sincePulse += dtSec;
    bound.pulseTimer += dtSec;
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
    const maids = bound.binders.filter((b) => ENEMIES_BY_ID[b.unit.speciesId]?.maid).length;
    if (maids >= 2) this.maidChorus(bound);
    const drainMul = avg((b) => {
      const ability = getAbilityLevel(this.p, b.unit.speciesId, drainAbilityId(b.attr));
      const lose = this.p.debuffs.loseHabit.byRace[b.unit.speciesId] ?? 0;
      const evolved = isEvolved(this.p, b.unit.speciesId, b.skillId) ? B.skillEvolution.powerMul : 1;
      const cond = this.conditions.boost(b.unit.speciesId, 'drain');
      const formation = bound.formation?.drain(b.attr) ?? 1;
      const u = b.unit;
      const bond = (u.bondPower ?? 1) * ((u.bondSkillAttrs ?? []).includes(b.attr) ? (u.bondSkillMul ?? 1) : 1)
        * (b.unite ? B.unite.bindDrainMul : 1)
        * this.eco.drainMulFrom(u.speciesId)   // 贈り物の呪い・貢いだ額
        * drainMulFor(this.p, u.speciesId, B)   // カモ認定
        * bindDrainMulFor(this, b, bound)   // 丁寧な収奪・重圧
        * (maids >= 2 && ENEMIES_BY_ID[u.speciesId]?.maid ? B.memory.maidChorusMul : 1);   // メイドの合唱
      return (1 + B.battle.drainPerLevel * ability) * (1 + lose * B.habit.loseMpPerStage) * evolved * cond * formation * bond;
    });
    const resistance = Math.min(...bound.binders.map((b) => this.eco.resistanceOf(b.attr)));
    const resMul = 1 + Math.max(0, -resistance) / 100;
    const uniteMul = B.escape.uniteCoef[Math.min(bound.binders.length, B.escape.uniteCoef.length) - 1];
    const backMul = bound.isBackBind ? B.bound.backAbsorb : 1;
    const surrenderMul = 1 + bound.surrenderRate * 0.8;
    const mul = Math.min(B.bound.absorbCap, drainMul * softness.drainMul * resMul * uniteMul * backMul * surrenderMul);
    const angry = bound.angerSec > 0 ? B.bindRequest.refuseDrainMul : 1;
    const scale = this.climax.drainScale() * this.buffs.mult('drainTaken') * this.conditions.mult('drainTaken') * angry;
    const choiceMul = bound.choiceDrainMul ?? 1;
    const amount = Math.min(hs.mp, Math.max(1, Math.round(B.bound.mpPerSec * durationSec * mul * scale * choiceMul)));
    hs.mp -= amount;
    this.eco.wearGear(bound.binders);   // その部位の装備が溶かされていく
    const expMul = avg((b) => (SKILL_DEFS[b.skillId]?.bindExpMul ?? 1) * bindExpMulFor(this, b, bound));
    this.drainHeroExp(B.bound.expDrainPerSec * durationSec * mul * scale * choiceMul * expMul);
    for (const binder of bound.binders) {
      const { unit, attr, skillId } = binder;
      this.gainDrainExperience(unit, amount * B.bound.expShareRate);
      this.bindCondGain(unit, skillId, B.conditioning.bindGainPerSec * durationSec);
      const abilityId = drainAbilityId(attr);
      if (abilityId) this.abilityEvents(addAbilityProgress(this.p, unit.speciesId, abilityId, B, {
        pts: 1, grownThisBattle: this.grown
      }));
      // 耳をふさがれている間も、拘束役の音だけは耳元ではっきり聞こえる
      this.emit('se', { id: SKILL_DEFS[skillId].se, tx: unit.tx, ty: unit.ty, behind: bound.isBackBind, clear: (bound.formation?.muffle ?? 0) > 0 });
    }
    const binder = bound.binders[0];
    const skillName = DEFEAT_SKILLS[binder.skillId]?.name ?? binder.skillId;
    this.emit('log', 'heroDrained', { name: binder.unit.name, skill: skillName, amount });
    if (hs.mp === 0) this.emit('log', 'mpEmpty', {});
    for (const { unit, skillId } of bound.binders) this.bindEffect(unit, skillId, true);
    this.emit('drainPulse', { strength: 1 });
    if (!bound.lowMpSaid && hs.mp > 0 && hs.mp / hs.maxMp < B.bindRequest.lowMpWhisperRatio) {
      bound.lowMpSaid = true;
      const u = bound.binders[Math.floor(Math.random() * bound.binders.length)].unit;
      this.speak(u, sceneLineFor(u.speciesId, 'lowMp'));
    }
    if (bound.blissSec > 0) {
      const hb = this.body(this.exp.hero);
      this.fx({ type: 'burst', x: hb.x, y: hb.y - 30, shapes: ['heart', 'heartLine'], colors: ['#ff4fa3', '#ffd6ec', '#ff9fd0'],
        count: 10, speed: [80, 200], size: [6, 11], life: 0.9, gravity: -60, glow: true });
    }
    this.emit('persist');
  }

  // ---- 拘束中のおねだり ----
  // 一定時間ごとに、拘束役が「おねがい」してくる。受け入れると脱出の進みが戻る代わりに、甘い演出が強まる。
  // 拒むと、しばらく吸われる量が増える。時間切れは受け入れ扱い
  updateBindRequest(dtSec) {
    const bound = this.bound;
    const R = this.B.bindRequest;
    bound.angerSec = Math.max(0, (bound.angerSec ?? 0) - dtSec);
    bound.blissSec = Math.max(0, (bound.blissSec ?? 0) - dtSec);
    if (bound.request) {
      bound.request.age += dtSec;
      if (bound.request.age >= R.timeoutSec) this.answerBindRequest('timeout');
      return;
    }
    if (this.climax.isClimax() || this.hs.mp <= 0) return;
    bound.requestTimer = (bound.requestTimer ?? R.firstSec) - dtSec;
    if (bound.requestTimer > 0) return;
    bound.requestTimer = R.everySec * (bound.binders.some((b) => this.p.enemyMemory?.[b.unit.speciesId]?.kamo) ? this.B.memory.kamoRequestMul : 1);
    const unit = bound.binders[Math.floor(Math.random() * bound.binders.length)].unit;
    bound.request = { unit, line: sceneLineFor(unit.speciesId, 'request'), age: 0, timeoutSec: R.timeoutSec };
    this.speak(unit, bound.request.line, { bubble: false });
    this.emit('se', { id: 'temptPrelude', tx: unit.tx, ty: unit.ty, clear: true });
    this.emit('bindRequest', { request: bound.request });
  }

  answerBindRequest(answer) {
    const bound = this.bound;
    const req = bound?.request;
    if (!req) return false;
    const R = this.B.bindRequest;
    bound.request = null;
    this.emit('bindRequestEnd', { answer });
    const u = req.unit;
    const hb = this.body(this.exp.hero);
    const theme = this.theme(u);
    if (answer === 'refuse') {
      bound.angerSec = R.refuseSec;
      this.speak(u, sceneLineFor(u.speciesId, 'requestRefuse'));
      this.emit('log', 'bindRequestRefused', { name: u.name });
      this.fx({ type: 'burst', x: hb.x, y: hb.y - 20, shapes: ['heartLine'], colors: [RESIST_COLORS.main, '#ffffff'], count: 10, speed: [100, 220], size: [6, 9], life: 0.6 });
      this.emit('se', { id: 'contestWin', gain: 0.6 });
      return true;
    }
    // お金を差し出す（貢ぎ）：脱出が進む代わりに、その子が強くなる
    if (answer === 'tribute') {
      if (this.eco.tribute(u) <= 0) {
        this.speak(u, 'お金、ないじゃん♡ じゃあ……体で払ってもらうね？');
        answer = 'timeout';
      } else {
        this.speak(u, 'わぁ、こんなに？♡ ……ふふ、また貢いでね？');
        return true;
      }
    }
    // 受け入れる（時間切れも同じ）
    bound.escapeProgress = Math.max(0, bound.escapeProgress - bound.requiredClicks * R.acceptPushback);
    bound.surrenderRate = Math.min(1, bound.surrenderRate + R.acceptSurrender);
    bound.blissSec = R.blissSec;
    this.refreshBoundRequirement();
    this.p.stats.requestAcceptCount = (this.p.stats.requestAcceptCount ?? 0) + 1;
    this.speak(u, sceneLineFor(u.speciesId, 'requestAccept'));
    this.emit('log', answer === 'timeout' ? 'bindRequestTimeout' : 'bindRequestAccepted', { name: u.name });
    this.rememberYield(u);
    const binderAttr = bound.binders.find((b) => b.unit === u)?.attr ?? this.attrOf(u.speciesId);
    this.eco.rollGift(u, binderAttr, 'request');
    this.emit('se', { id: 'temptAccept' });
    this.fx({ type: 'wash', color: theme.main, alpha: 0.3, mode: 'full', life: 1.2 });
    this.fx({ type: 'burst', x: hb.x, y: hb.y - 20, shapes: ['heart', 'heart', 'heartLine'], colors: [theme.main, theme.glow, '#ff2d86'],
      count: 26, speed: [120, 300], size: [7, 13], life: 1.0, glow: true });
    this.fx({ type: 'callout', x: hb.x, y: this.head(this.exp.hero).y - 50, text: 'すきすき♡', color: theme.main, size: 32, wobble: 0.12 });
    this.emit('drainPulse', { strength: 1 });
    this.emit('persist');
    return true;
  }

  gainDrainExperience(enemy, amount) {
    if (!(amount > 0)) return;
    const absorbedExp = amount * (this.B.enemy.absorbExpMultiplier ?? 1);
    enemy.exp += absorbedExp;
    this.emit('enemyExperience', { enemy, amount: absorbedExp });
    // 一気に何レベルも上がっても、演出とログは1回にまとめる
    let gained = 0;
    const raceId = enemy.speciesId;
    while (enemy.exp >= enemyExpNeeded(enemy.level + gained, this.B)) {
      enemy.exp -= enemyExpNeeded(enemy.level + gained, this.B);
      gained += 1;
    }
    if (gained > 0) {
      this.p.enemyLevels[raceId] = (this.p.enemyLevels[raceId] ?? 0) + gained;
      const raceUnits = this.exp.units.filter((unit) => unit.kind === 'enemy' && unit.speciesId === raceId);
      if (!raceUnits.includes(enemy)) raceUnits.push(enemy);
      for (const unit of raceUnits) {
        unit.level += gained;
        unit.maxHp += this.B.enemy.hpPerLevel * gained;
        unit.hp = Math.min(unit.maxHp, unit.hp + this.B.enemy.hpPerLevel * gained);
        if (!this.exp.units.includes(unit)) continue;
        this.emit('anim', { unit, tag: 'skill_sexyPose' });
        const pos = this.body(unit);
        const th = this.theme(unit);
        const big = Math.min(3, gained);
        this.fx({ type: 'burst', x: pos.x, y: this.head(unit).y, shapes: ['heart', 'heartLine'], colors: [th.main, th.glow, th.accent], count: 10 + 6 * big, speed: [60, 140 + 30 * big], size: [5, 8 + big], life: 0.9, gravity: -50, glow: true });
        this.fx({ type: 'ring', x: pos.x, y: pos.y + 40, r: 50 + 8 * big, squash: 0.45, color: th.main, width: 5, alpha: 0.7, life: 0.5 });
        this.fx({ type: 'callout', x: pos.x, y: this.head(unit).y - 34, text: gained > 1 ? `Lv UP×${gained}♡` : 'Lv UP♡', color: th.main, size: 22 + 3 * big });
      }
      this.emit('log', 'enemyLevelUp', { name: enemy.name, level: enemy.level, gain: gained });
    }
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
    if (!byClimax) {
      for (const { unit } of bound.binders) {
        const key = unit.speciesId === 'yandereGirl' ? 'escapes' : unit.speciesId === 'jiangshiGirl' ? 'learn' : null;
        if (key && remember(this.p, unit.speciesId, key, this.B)) {
          this.later(0.3, () => this.speak(unit, key === 'escapes' ? '……逃げたね。覚えたよ' : 'その逃げ方、おぼえちゃった♡'));
          this.emit('log', key === 'escapes' ? 'memoryEscape' : 'memoryLearn', { name: unit.name });
        }
      }
    }
    this.escapeInvulnTurns = 1;
    this.bound = null;
    for (const [id, def] of Object.entries(STATUSES)) if (def.consumeOnBind) this.conditions.consume(id);
    this.emit('bindFormation', { formation: null });
    this.emit('bindRequestEnd', { answer: null });
    this.emit('anim', { unit: hero, tag: 'idle' });
    this.emit('boundEnd', { escaped: true, reason: byClimax ? 'climax' : 'escape' });
    this.emit('se', { id: 'bindRelease', tx: hero.tx, ty: hero.ty });
    this.emit('persist');
  }

  boundTurnElapsed() {
    this.exp.refresh();
    this.exp.turnCount += 1;
  }

  // 技名。進化済みの技は「・改」が付く
  skillLabel(skillId, unit = null) {
    const name = DEFEAT_SKILLS[skillId]?.name ?? SKILL_STAGES[skillId]?.name ?? skillId;
    return unit && isEvolved(this.p, unit.speciesId, skillId) ? `${name}・改` : name;
  }

  shouldBanner(def, rawStage) {
    return rawStage?.banner ?? this.B.stage.bannerCategories.includes(def.category);
  }

  emitSkillName(e, skillId, holdSec) {
    const def = SKILL_DEFS[skillId];
    if (!def || !this.shouldBanner(def, SKILL_STAGES[skillId])) return;
    this.emit('skillName', {
      key: skillId,
      title: this.skillLabel(skillId, e),
      sub: e.name,
      attr: def.attr ?? this.attrOf(e.speciesId),
      color: this.theme(e).main,
      holdSec
    });
  }

  stageContext(perf, index, progress, losses) {
    const { e, def, attr } = perf.payload;
    const hero = this.exp.hero;
    return {
      hero: { body: this.body(hero), head: this.head(hero) },
      enemy: { body: this.body(e), head: this.head(e) },
      dir: { dx: Math.sign(e.tx - hero.tx), dy: Math.sign(e.ty - hero.ty) },
      def, attr, index, count: perf.stage.hits.count, progress,
      theme: this.theme(e),
      ...losses
    };
  }

  runCues(perf, at, index, losses = { hpLoss: 0, mpLoss: 0, expLost: 0 }) {
    const { e, def } = perf.payload;
    const { stage } = perf;
    const count = stage.hits.count;
    const progress = at === 'start' ? 0 : at === 'end' ? 1 : count > 1 ? index / (count - 1) : 0;
    const context = this.stageContext(perf, index, progress, losses);
    const flags = perf.payload.flags ?? {};
    for (const cue of cuesFor(stage.fx, at, index, count)) {
      if (!this.cueAllowed(cue, flags)) continue;
      const build = STAGE_FX[cue.id];
      if (!build) {
        console.warn(`Unknown skill stage effect: ${cue.id}`);
        continue;
      }
      for (const fx of build({ ...context, opts: cue })) {
        this.fx({ ...fx, delay: (fx.delay ?? 0) + (cue.delay ?? 0) });
      }
    }
    for (const cue of cuesFor(stage.se, at, index, count)) {
      if (!this.cueAllowed(cue, flags)) continue;
      const id = cue.id === '$skill' ? def.se : cue.id;
      if (!id) continue;
      const from = cue.gain ?? 1;
      const to = cue.gainEnd ?? from;
      this.emit('se', {
        id, tx: e.tx, ty: e.ty,
        gain: from + (to - from) * progress,
        delay: cue.delay ?? 0,
        params: { progress }
      });
    }
  }

  onStageStart(perf) {
    if (perf.payload.prelude) {
      this.startChoicePrelude(perf.payload);
      return;
    }
    const { e, skillId, def, attr, ctx, skillName, windupOnly } = perf.payload;
    const { stage } = perf;
    if (!windupOnly && perf.payload.flags?.rangedAccept) this.rangedAcceptIntro(e, perf.payload.flags.timeout);
    if (!windupOnly) {
      const hero = this.exp.hero;
      const motion = def.category === 'attack'
        ? attackTag(hero.tx - e.tx, hero.ty - e.ty)
        : def.category === 'bind'
          ? bindTag(hero.tx - e.tx, hero.ty - e.ty)
          : def.motion ?? 'skill_sexyPose';
      this.emit('anim', { unit: e, tag: motion });
      if (skillId === ctx?.rememberedSkillId) this.emit('log', 'rememberUse', { name: e.name, skill: skillName });
    }
    if (stage.flashSec > 0) {
      const b = this.body(e);
      this.emit('skillFlash', { x: b.x, y: b.y, attr, color: this.theme(e).main, sec: stage.flashSec });
      if (this.save.settings.flashback !== 'off') this.emit('se', { id: 'skillFlash', tx: e.tx, ty: e.ty });
    }
    if (windupOnly) return;
    if (def.category === 'special' && !ctx?.choiceResolved) {
      this.speak(e, speechFor(e.speciesId, attr, skillId));
    }
    if (this.shouldBanner(def, SKILL_STAGES[skillId])) {
      this.emit('skillName', {
        key: skillId,
        title: skillName,
        sub: e.name,
        attr,
        color: this.theme(e).main,
        holdSec: Math.max(this.B.stage.banner.holdMinSec, stage.flashSec + stage.durationSec + 0.2)
      });
    }
    this.runCues(perf, 'start', 0);
  }

  onStageHit(perf, index) {
    const pl = perf.payload;
    if (pl.windupOnly || pl.prelude) return;
    const { B, hs } = this;
    const { e, skillId, def, nums, attr, skillName } = pl;
    const { stage } = perf;
    const count = stage.hits.count;
    const per = stage.perHit;
    // 押し返した・中断した・まだ無害な技のときは、演出だけ流して被害は無い
    if (pl.blocked || pl.flags?.gentle) {
      this.runCues(perf, 'hit', index);
      return;
    }
    const guard = this.guarding ? B.battle.guardMul : 1;
    const scale = this.climax.drainScale() * this.buffs.mult('drainTaken') * (pl.choiceDrainMul ?? 1)
      * this.conditions.mult('drainTaken');

    let hpLoss = 0;
    if (nums.hpRate && per.hp > 0) {
      const [lo, hi] = def.category === 'attack' ? [B.damage.minRate, B.damage.maxRate] : [0, 1];
      const rate = rollRate(nums.hpRate, lo, hi, e.level - hs.level, B);
      hpLoss = Math.min(hs.hp, Math.max(1, Math.round(hs.maxHp * rate * per.hp * guard * (pl.powerMul ?? 1))));
    }
    let mpLoss = 0;
    if (nums.mpRate && per.mp > 0) {
      mpLoss = Math.round(hs.maxMp * nums.mpRate * pl.mpMul * per.mp * guard * scale);
    }
    // HP は絶頂のときにしか減らない。それ以外の打撃は、体の力（MP）が抜けていく分に変わる
    if (hpLoss > 0 && !this.climax.isClimax()) {
      mpLoss += Math.round(hs.maxMp * (hpLoss / hs.maxHp) * B.battle.hpToMpRate);
      hpLoss = 0;
    }
    mpLoss = Math.min(hs.mp, mpLoss);
    let expLost = 0;
    if (nums.expRate && per.exp > 0) {
      expLost = this.drainHeroExp(nums.expRate * pl.mpMul * per.exp * guard * scale).lost;
    }
    hs.hp -= hpLoss;
    hs.mp -= mpLoss;
    pl.total.hp += hpLoss;
    pl.total.mp += mpLoss;
    pl.total.exp += expLost;

    const absorbed = mpLoss + expLost;
    if (absorbed > 0) this.gainDrainExperience(e, absorbed);
    if (absorbed > 0) this.emit('drainPulse', { strength: 0.5 });

    const hb = this.body(this.exp.hero);
    const headY = this.head(this.exp.hero).y;
    if (hpLoss > 0) {
      this.fx({ type: 'damage', delay: 0.14, x: hb.x, y: headY, text: String(hpLoss), style: 'hero', big: true });
      this.fx({ type: 'shake', delay: 0.12, power: clamp((hpLoss / hs.maxHp) * 6, 0.5, 1.4) });
    }
    if (stage.hitNumbers) {
      if (mpLoss > 0) this.fx({ type: 'damage', delay: 0.26, x: hb.x, y: headY - 26, text: `MP -${mpLoss}`, style: 'mp' });
      if (expLost > 0) {
        this.fx({
          type: 'damage', delay: 0.26, x: hb.x, y: headY - (mpLoss > 0 ? 44 : 26),
          text: `EXP -${expLost}`, style: 'exp'
        });
      }
    }
    this.runCues(perf, 'hit', index, { hpLoss, mpLoss, expLost });
    this.witness((nums.allyCharm ?? (def.category === 'attack' ? B.ally.charmOnHit : B.ally.charmOnDrain)) / count);

    if (mpLoss > 0 && hs.mp === 0 && !pl.mpEmptyLogged) {
      pl.mpEmptyLogged = true;
      this.emit('log', 'mpEmpty', {});
    }
    if (index === count - 1 && pl.total.mp > 0) {
      this.abilityEvents(addAbilityProgress(this.p, e.speciesId, drainAbilityId(attr), B, {
        pts: 1, grownThisBattle: this.grown
      }));
    }
    if (index === count - 1 && (pl.total.hp > 0 || pl.total.mp > 0)) {
      this.handleEvents(recordEvoProgress(this.p, e.speciesId, skillId, def, 'repeated_use'), e, skillId);
    }
    if (hs.hp <= 0) {
      this.emit('anim', { unit: this.exp.hero, tag: 'down', delay: 0.2 });
      if (!this.defeated) {
        this.defeated = { raceId: e.speciesId, skillId, attr, name: e.name };
        this.emit('log', 'heroDefeated', { name: e.name, skill: skillName });
      }
      this.director.cancel();
      return;
    }
    if (hpLoss > 0) this.emit('anim', { unit: this.exp.hero, tag: 'hit', delay: 0.12 });
    this.emit('persist');
  }

  onStageEnd(perf, cancelled) {
    const pl = perf.payload;
    if (pl.prelude) {
      if (!cancelled) this.endChoicePrelude(pl);
      return;
    }
    if (pl.windupOnly) return;
    const { e, skillName, total } = pl;
    const hero = this.exp.hero;
    const hb = this.body(hero);
    const headY = this.head(hero).y;
    if (total.hp > 0) this.emit('log', 'heroDamaged', { name: e.name, skill: skillName, amount: total.hp });
    if (total.mp > 0) this.emit('log', 'heroDrained', { name: e.name, skill: skillName, amount: total.mp });
    if (total.exp > 0) this.emit('log', 'heroExpDrained', { name: e.name, skill: skillName, amount: total.exp });

    if (perf.stage.hits.count > 1 && !perf.stage.hitNumbers) {
      if (total.mp > 0) this.fx({ type: 'damage', x: hb.x, y: headY - 26, text: `MP -${total.mp}`, style: 'mp', big: true });
      if (total.exp > 0) {
        this.fx({
          type: 'damage', x: hb.x, y: headY - (total.mp > 0 ? 62 : 26),
          text: `EXP -${total.exp}`, style: 'exp', big: true
        });
      }
    }
    if (total.exp > 0) {
      this.handleEvents(recordEvoProgress(this.p, e.speciesId, pl.skillId, pl.def, 'exp_absorbed', total.exp), e, pl.skillId);
    }
    if (pl.def?.countdown && total.mp > 0 && this.hs.mp === 0) {
      this.handleEvents(recordEvoProgress(this.p, e.speciesId, pl.skillId, pl.def, 'mp_zero', 1), e, pl.skillId);
    }
    if (!cancelled) {
      this.runCues(perf, 'end', perf.stage.hits.count - 1, {
        hpLoss: total.hp, mpLoss: total.mp, expLost: total.exp
      });
      if (!pl.blocked && !this.defeated) this.applySkillEffects(pl);
      if (pl.flags?.rangedAccept && !this.defeated) this.rangedAcceptFollow(e, pl.flags.timeout);
      if (!pl.blocked && !pl.flags?.gentle && !this.defeated) this.eco.steal(e, pl.skillId);
      if (!pl.blocked && !pl.flags?.gentle && !this.defeated) onLand(this, pl);
    }
    this.emit('persist');
  }

  // 技が当たったあとの追加効果：蓄積デバフ・一時状態・連携・進化の進み
  applySkillEffects(pl) {
    const { B } = this;
    const { e, skillId, def, flags = {} } = pl;
    // 余韻中でも、蓄積デバフ・一時状態は進む
    const guarded = flags.resisted && def.resist === 'guard';
    if (def.cond && !guarded) {
      let gain = def.cond.gain;
      if (flags.timeout) gain *= B.temptation.timeoutCondMul;
      else if (flags.accepted) gain *= B.temptation.acceptCondMul;
      if (flags.evolved) gain *= B.skillEvolution.condMul;
      if (flags.rangedAccept) gain *= B.temptation.rangedAccept.condMul;
      this.handleEvents(this.conditions.gain(def.cond.id, gain, {
        floorKey: this.floorKey(),
        voluntary: flags.accepted && !flags.timeout
      }), e, skillId);
    }
    if (def.status && !guarded && Math.random() < (def.status.chance ?? 1)) {
      this.handleEvents(this.conditions.addStatus(def.status.id, def.status.turns), e, skillId);
    }
    if (def.acceptStatus && (flags.accepted || flags.contestLose)) {
      this.handleEvents(this.conditions.addStatus(def.acceptStatus.id, def.acceptStatus.turns), e, skillId);
    }
    // 押されるままになると、背中を向けてしまう（次の背面すりすりが背面拘束になる）
    if (def.resist === 'contest' && (flags.accepted || flags.contestLose)) {
      const hero = this.exp.hero;
      hero.setDir(hero.tx - e.tx, hero.ty - e.ty);
    }
    if (def.combo) e.comboNext = def.combo;
    // 偽りの祝福：HP を少し回復する（そのぶん MP が漏れていく）
    if (def.heal && !guarded) {
      const hs = this.hs;
      const heal = Math.min(hs.maxHp - hs.hp, Math.round(hs.maxHp * (pl.nums?.healRate ?? 0)));
      if (heal > 0) {
        hs.hp += heal;
        const hb = this.body(this.exp.hero);
        this.fx({ type: 'damage', delay: 0.1, x: hb.x, y: this.head(this.exp.hero).y, text: `+${heal}`, style: 'heal' });
      }
    }
    // 押し飛ばす
    if (def.knockback) this.knockHero(e, def.knockback);
    // 漏れた分を、まとめて回収する
    if (def.collect) this.collectLeaked(e, pl.nums?.collectMul ?? 1);
    // 足元に罠を仕掛ける
    if (def.traps) this.placeTraps(e, def.traps);
    // 突進が当たったら、そのまま抱きついて拘束に入る
    if (def.chargeBind && !this.bound && !e.bindImmune && this.escapeInvulnTurns <= 0
      && Math.abs(e.tx - this.exp.hero.tx) + Math.abs(e.ty - this.exp.hero.ty) === 1) {
      const bindId = ENEMIES_BY_ID[e.speciesId]?.bindSkills?.[0];
      if (bindId) this.startBound(e, bindId, true, { answer: 'charge', drainMul: 1 });
    }
    if (def.maidCall) this.callMaids(e);
    // 印を付けた種族の敵は、どこにいても追ってくる
    if (def.lure && !guarded) {
      for (const u of this.exp.units) if (u.kind === 'enemy' && u.speciesId === e.speciesId) u.lured = true;
    }
    if (flags.accepted || flags.contestLose) {
      this.handleEvents(recordEvoProgress(this.p, e.speciesId, skillId, def, 'choice_count'), e, skillId);
      this.onTemptAccepted(e, def, flags);
    }
  }

  // 回避率。技の基本値 + 選択肢・防御の上乗せ に、主人公の状態の倍率を掛ける
  evadeChance(nums, bonus = 0) {
    const base = nums.evade ?? 0;
    if (base <= 0 && bonus <= 0) return 0;
    const guard = this.guarding ? this.B.battle.guardEvade : 0;
    return clamp((base + bonus + guard) * this.conditions.mult('evade'), 0, 0.95);
  }

  // 技をかわした
  missSkill(e, skillId, byChoice) {
    const hero = this.exp.hero;
    if (byChoice) this.dodgeChoice(e);
    else this.emit('log', 'skillMiss', { name: e.name, skill: this.skillLabel(skillId, e) });
    const def = SKILL_DEFS[skillId];
    this.emit('anim', { unit: e, tag: def.motion ?? 'skill_sexyPose' });
    this.emit('se', { id: def.se, tx: e.tx, ty: e.ty, gain: 0.6 });
    this.emit('se', { id: 'missWhoosh', tx: hero.tx, ty: hero.ty, delay: 0.2 });
    const hb = this.body(hero);
    const theme = this.theme(e);
    this.fx({ type: 'flow', delay: 0.05, from: this.head(e), to: { x: hb.x, y: hb.y - 20 }, shape: 'heart', colors: [theme.main, theme.glow], count: 6, life: 0.4, spanSec: 0.2, arc: 30, size: [4, 7] });
    this.fx({ type: 'burst', delay: 0.2, x: hb.x, y: hb.y - 10, shapes: ['heartLine', 'heart'], colors: [RESIST_COLORS.main, RESIST_COLORS.glow, theme.glow], count: 8, speed: [120, 240], size: [5, 9], life: 0.5 });
    this.fx({ type: 'callout', delay: 0.2, x: hb.x, y: this.head(hero).y - 18, text: 'かわした！', color: RESIST_COLORS.main, size: 28 });
    this.actedThisTurn = true;
  }

  // カウントダウンの中断。成功すればカウントが止まり、永続段階の回復も進む
  rollInterrupt(e) {
    const c = this.B.interrupt;
    const chance = clamp(c.base + (this.hs.level - e.level) * c.perLevel - this.conditions.value('submission') * 0.03, c.min, c.max);
    const ok = Math.random() < chance;
    this.emit('log', ok ? 'countInterrupted' : 'countNotInterrupted', { name: e.name });
    if (ok) this.handleEvents(this.conditions.recordResist('submission'), e, 'countdown');
    return ok;
  }

  // 主人公を、敵から離れる向きに n マス押し飛ばす
  knockHero(e, n) {
    const hero = this.exp.hero;
    const dx = Math.sign(hero.tx - e.tx);
    const dy = Math.sign(hero.ty - e.ty);
    if (!dx && !dy) return;
    const from = this.body(hero);
    let moved = 0;
    for (let i = 0; i < n; i++) {
      const x = hero.tx + dx;
      const y = hero.ty + dy;
      if (!this.exp.map.isWalkable(x, y) || this.exp.unitAt(x, y)) break;
      hero.moveTo(x, y);
      moved += 1;
    }
    hero.setDir(-dx, -dy);
    if (!moved) return;
    hero.fromX = hero.tx;
    hero.fromY = hero.ty;
    this.exp.refresh();
    const to = this.body(hero);
    this.fx({ type: 'flow', from, to, shape: 'streak', colors: ['#ffffff', this.theme(e).main], count: 8, life: 0.25, spanSec: 0.1, arc: 0, wobble: 4, size: [6, 10] });
    this.fx({ type: 'burst', x: to.x, y: to.y + 36, shape: 'fluff', colors: ['#ffc2dc', '#ffe3f2'], count: 8, speed: [40, 120], size: [8, 14], life: 0.6, gravity: -20 });
  }

  // 魔力漏出で漏れた分を、まとめて回収する
  collectLeaked(e, mul) {
    const hs = this.hs;
    const run = this.conditions.run;
    const leaked = run.leaked ?? 0;
    const amount = Math.min(hs.mp, Math.round(leaked * mul));
    run.leaked = 0;
    const hb = this.body(this.exp.hero);
    const eb = this.body(e);
    const theme = this.theme(e);
    if (amount <= 0) {
      this.fx({ type: 'callout', x: eb.x, y: this.head(e).y - 30, text: '回収するものがありませんね', color: theme.glow, size: 18 });
      return;
    }
    hs.mp -= amount;
    this.gainDrainExperience(e, amount);
    this.emit('log', 'manaCollected', { name: e.name, amount });
    // まわりに散った魔力が、すべてメイドの手元へ吸い寄せられる
    this.fx({ type: 'swirl', x: eb.x, y: eb.y - 20, shapes: ['dot', 'heart'], colors: ['#c9a6ff', theme.main, '#ffffff'], count: 24, r0: 220, r1: 6, turns: 0.8, life: 0.9, size: [3, 6], glow: true });
    this.fx({ type: 'flow', from: { x: hb.x, y: hb.y - 20 }, to: { x: eb.x, y: eb.y - 20 }, shapes: ['dot', 'heart'], colors: ['#c9a6ff', theme.main], count: 16, life: 0.5, spanSec: 0.3, arc: 30, size: [3, 6], glow: true });
    this.fx({ type: 'damage', delay: 0.3, x: hb.x, y: this.head(this.exp.hero).y - 20, text: `MP -${amount}`, style: 'mp', big: true });
    this.fx({ type: 'callout', delay: 0.5, x: eb.x, y: this.head(e).y - 34, text: '回収完了です', color: theme.main, size: 22 });
  }

  // 主人公のまわりに罠を仕掛ける（踏むと転倒して体勢を崩す）
  placeTraps(e, n) {
    const T = this.B.traps;
    const hero = this.exp.hero;
    const traps = (this.exp.traps ??= []);
    const cells = [];
    for (let dy = -T.radius; dy <= T.radius; dy++) {
      for (let dx = -T.radius; dx <= T.radius; dx++) {
        const x = hero.tx + dx;
        const y = hero.ty + dy;
        if ((!dx && !dy) || !this.exp.map.isWalkable(x, y) || this.exp.unitAt(x, y)) continue;
        if (traps.some((t) => t.x === x && t.y === y)) continue;
        cells.push({ x, y });
      }
    }
    const theme = this.theme(e);
    let placed = 0;
    for (let i = 0; i < n && cells.length && traps.length < T.max; i++) {
      const c = cells.splice(Math.floor(Math.random() * cells.length), 1)[0];
      traps.push({ x: c.x, y: c.y, species: e.speciesId, turns: T.lifeTurns, color: theme.main });
      const p = this.body({ tx: c.x, ty: c.y });
      this.fx({ type: 'glyph', delay: 0.15 * i, x: p.x, y: p.y + 42, style: 'heart', color: theme.main, sub: theme.sub, r: 30, life: 0.8 });
      placed += 1;
    }
    if (placed) this.emit('log', 'trapsSet', { name: e.name, count: placed });
  }

  // 罠を踏んだ
  triggerTrap(trap) {
    const T = this.B.traps;
    const hero = this.exp.hero;
    const hb = this.body(hero);
    const owner = this.exp.units.find((u) => u.kind === 'enemy' && u.speciesId === trap.species) ?? null;
    this.emit('se', { id: 'trapSpring', tx: hero.tx, ty: hero.ty });
    this.emit('log', 'trapTriggered', {});
    this.fx({ type: 'glyph', x: hb.x, y: hb.y + 42, style: 'heart', color: trap.color, sub: '#ffffff', r: 50, life: 0.7, spin: 4 });
    this.fx({ type: 'burst', x: hb.x, y: hb.y + 20, shapes: ['heart', 'heartLine'], colors: [trap.color, '#ffd6ec'], count: 16, speed: [120, 260], size: [5, 9], life: 0.7, angle: -Math.PI / 2, spread: Math.PI });
    this.fx({ type: 'callout', x: hb.x, y: this.head(hero).y - 30, text: 'ひっかかった♡', color: trap.color, size: 30, wobble: 0.12 });
    this.fx({ type: 'shake', power: 0.6 });
    this.emit('anim', { unit: hero, tag: 'hit' });

    this.handleEvents(this.conditions.gain('trapHabit', T.condGain, { floorKey: this.floorKey() }), owner, 'footTrap');
    this.handleEvents(this.conditions.addStatus('offBalance', 2), owner, 'footTrap');
    this.handleEvents(this.conditions.addStatus('tripped', 1), owner, 'footTrap');
    this.emit('persist');
  }

  // 主人公の隣（前後左右）の、敵にいちばん近い空きマスへ一気に詰める（charge: 突進の見た目）
  pullToward(e, charge = false) {
    const hero = this.exp.hero;
    if (Math.abs(e.tx - hero.tx) + Math.abs(e.ty - hero.ty) <= 1) return;
    const spots = [[0, -1], [1, 0], [0, 1], [-1, 0]]
      .map(([dx, dy]) => ({ x: hero.tx + dx, y: hero.ty + dy }))
      .filter(({ x, y }) => this.exp.map.isWalkable(x, y) && !this.exp.unitAt(x, y))
      .sort((a, b) => chebyshev(a.x, a.y, e.tx, e.ty) - chebyshev(b.x, b.y, e.tx, e.ty));
    if (!spots.length) return;
    const from = this.body(e);
    e.moveTo(spots[0].x, spots[0].y);
    e.fromX = e.tx;
    e.fromY = e.ty;
    const to = this.body(e);
    const theme = this.theme(e);
    this.fx({ type: 'flow', from, to, shape: 'streak', colors: [theme.main, theme.glow], count: charge ? 22 : 10, life: 0.25, spanSec: 0.12, arc: 0, wobble: charge ? 14 : 6, size: charge ? [8, 14] : [6, 10], glow: true });
    if (charge) this.fx({ type: 'burst', x: from.x, y: from.y + 36, shape: 'fluff', colors: ['#ffc2dc', '#ffe3f2'], count: 10, speed: [60, 160], size: [10, 16], life: 0.6, gravity: -20 });
    this.fx({ type: 'burst', x: to.x, y: to.y + 30, shapes: ['heart', 'heartLine'], colors: [theme.main, theme.glow], count: 8, speed: [60, 140], size: [5, 8], life: 0.5 });
    this.exp.refresh();
  }

  // 力比べ。勝てば押し返して、相手を1ターンひるませる
  rollContest(e) {
    const { B, hs } = this;
    const c = B.contest;
    let chance = c.base + (hs.level - e.level) * c.perLevel;
    if (this.conditions.has('offBalance')) chance -= c.offBalancePenalty;
    chance -= this.conditions.value('hipPressure') * c.perGauge;
    const win = Math.random() < clamp(chance, c.min, c.max);
    if (!win) {
      this.emit('log', 'contestLose', { name: e.name });
      return false;
    }
    const hero = this.exp.hero;
    const x = e.tx + Math.sign(e.tx - hero.tx);
    const y = e.ty + Math.sign(e.ty - hero.ty);
    if (this.exp.map.isWalkable(x, y) && !this.exp.unitAt(x, y)) e.moveTo(x, y);
    e.stunTurns = 1;
    this.emit('log', 'contestWin', { name: e.name });
    this.handleEvents(this.conditions.recordResist('hipPressure'), e, 'foxPushContest');
    return true;
  }

  // 蓄積デバフ・状態・進化のイベントを、ログ・音・演出にする
  handleEvents(events, e, skillId) {
    const hero = this.exp.hero;
    const hb = this.body(hero);
    const hh = this.head(hero);
    for (const ev of events ?? []) {
      const cond = CONDITIONS[ev.id];
      switch (ev.kind) {
        case 'condWarn':
          this.emit('log', 'condWarn', { cond: cond.name, hint: cond.hint });
          this.emit('se', { id: 'conditionWarn', delay: 0.1 });
          this.fx({ type: 'callout', delay: 0.15, x: hb.x, y: hh.y - 46, text: `${cond.name} 前兆`, color: cond.color, size: 22 });
          this.fx({ type: 'ring', delay: 0.1, x: hb.x, y: hb.y, r: 60, color: cond.color, width: 3, alpha: 0.6 });
          break;
        case 'condOnset':
          this.emit('log', 'condOnset', { cond: cond.name });
          this.emit('se', { id: 'conditionOnset', delay: 0.1 });
          this.fx({ type: 'swirl', delay: 0.1, x: hb.x, y: hb.y - 10, shape: 'heartLine', colors: [cond.color, '#ffffff'], count: 10, r0: 30, r1: 90, turns: 0.6, life: 0.9, size: [7, 11] });
          this.fx({ type: 'wash', delay: 0.1, color: cond.color, alpha: 0.22, life: 1.0 });
          this.fx({ type: 'callout', delay: 0.2, x: hb.x, y: hh.y - 46, text: `${cond.name} 発症`, color: cond.color, size: 28 });
          break;
        case 'condDanger':
          this.emit('log', 'condDanger', { cond: cond.name });
          this.emit('se', { id: 'conditionDanger', delay: 0.2 });
          if (e && this.exp.units.includes(e)) this.speak(e, sceneLineFor(e.speciesId, 'danger'));
          this.fx({ type: 'wash', delay: 0.2, color: cond.color, alpha: 0.3, mode: 'full', life: 1.2 });
          break;
        case 'condMax':
          if (!e) break;
          this.handleEvents(recordEvoProgress(this.p, e.speciesId, skillId, SKILL_DEFS[skillId], 'debuff_max'), e, skillId);
          break;
        case 'condPermanent':
          this.emit('log', 'condPermanent', { cond: cond.name, stage: PERMANENT_STAGE_NAMES[ev.stage] });
          this.deepenDebuff(`cond:${ev.id}`, `${cond.name} ${PERMANENT_STAGE_NAMES[ev.stage]}`);
          this.emit('se', { id: 'conditionPermanent', delay: 0.3 });
          this.fx({ type: 'flash', delay: 0.3, color: cond.color, alpha: 0.35, life: 0.5 });
          this.fx({ type: 'glyph', delay: 0.3, x: hb.x, y: hb.y + 42, style: 'heart', color: cond.color, sub: '#ffffff', r: 80, life: 1.8 });
          break;
        case 'condRecoverProgress':
          this.emit('log', 'condRecoverProgress', { cond: cond.name, progress: ev.progress, need: ev.need });
          break;
        case 'condRecover':
          this.emit('log', 'condRecover', { cond: cond.name, stage: PERMANENT_STAGE_NAMES[ev.stage] || 'なし' });
          this.emit('se', { id: 'conditionRecover' });
          this.fx({ type: 'sparkle', x: hb.x, y: hh.y, color: RESIST_COLORS.main });
          break;
        case 'statusAdd': {
          const st = STATUSES[ev.id];
          this.emit('log', 'statusAdd', { status: st.name, turns: ev.turns });
          this.fx({ type: 'callout', delay: 0.35, x: hb.x, y: hh.y - 70, text: st.name, color: st.color, size: 22 });
          if (ev.stun) this.stunTurns += ev.stun;
          break;
        }
        case 'statusLeak': {
          const hs = this.hs;
          const leak = Math.min(hs.mp, Math.max(1, Math.round(hs.maxMp * ev.rate)));
          if (leak <= 0) break;
          hs.mp -= leak;
          this.conditions.run.leaked = (this.conditions.run.leaked ?? 0) + leak;
          this.fx({ type: 'damage', x: hb.x, y: hh.y - 30, text: `MP -${leak}`, style: 'mp' });
          this.fx({ type: 'burst', x: hb.x, y: hb.y - 10, shapes: ['heart', 'dot'], colors: ['#c08bff', '#ffc6e2'],
            count: 6, speed: [30, 80], size: [3, 6], life: 0.9, gravity: 140 });
          break;
        }
        case 'statusEnd':
          this.emit('log', 'statusEnd', { status: STATUSES[ev.id]?.name ?? ev.id });
          break;
        case 'skillEvolved': {
          const unit = e && e.speciesId === ev.raceId ? e : null;
          this.emit('log', 'skillEvolved', { name: ENEMIES_BY_ID[ev.raceId]?.name ?? ev.raceId, skill: this.skillLabel(ev.skillId) });
          this.emit('se', { id: 'skillEvolve', tx: unit?.tx, ty: unit?.ty, delay: 0.3 });
          const line = sceneLineFor(ev.raceId, 'evolved');
          if (unit) {
            this.celebrateEnemy(unit, '技が進化！');
            if (line) this.speak(unit, line);
          }
          break;
        }
        default:
          break;
      }
    }
  }

  useSkill(e, skillId, ctx) {
    const { B, p } = this;
    const def = SKILL_DEFS[skillId];
    if (!def) return;
    recordSkillSeen(p, e.speciesId, skillId);   // 図鑑：見たことのある技
    const nums = B.skills[skillId] ?? {};
    const attr = def.attr ?? this.attrOf(e.speciesId);
    if (!ctx?.choiceResolved && this.offerChoice(e, skillId, (result) =>
      this.useSkill(e, skillId, {
        ...ctx, choiceResolved: true, choiceAnswer: result.answer, choiceDrainMul: result.drainMul
      })
    )) return;

    // 選択肢の結果と、演出の条件（台本の when）
    const answer = ctx?.choiceAnswer ?? null;
    const flags = {
      evolved: isEvolved(p, e.speciesId, skillId),
      accepted: answer === 'accept' || answer === 'timeout',
      timeout: answer === 'timeout',
      resisted: answer === 'resist',
      careless: this.conditions.has('careless')
    };
    let blocked = false;
    if (def.resist === 'contest') {
      // 断る＝押し返す。選択肢が出なかったときも、力比べになる
      if (!flags.accepted) {
        flags.contestWin = this.rollContest(e);
        blocked = flags.contestWin;
      }
      flags.contestLose = !flags.contestWin;
    } else if (def.resist === 'interrupt' && flags.resisted) {
      // 集中して中断する：成功すればカウントは止まる
      flags.interrupted = this.rollInterrupt(e);
      blocked = flags.interrupted;
    } else if (def.resist === 'guard' && flags.resisted) {
      this.guarding = true;   // 身構える：この技の被害を減らし、追加効果を防ぐ
    } else if (def.category === 'special' && !flags.accepted) {
      const bonus = flags.resisted && def.resist === 'dodge' ? B.temptation.resistEvadeBonus * resistBonusMulFor(this, e) : 0;
      if (Math.random() < this.evadeChance(nums, bonus)) {
        this.missSkill(e, skillId, flags.resisted);
        return;
      }
      if (flags.resisted) this.emit('log', 'choiceBlocked', { name: e.name });
    }

    if (FLASHBACK_STRONG.has(skillId)) this.requestFlashback('strong', e, attr, skillId);
    else if (skillId === ctx?.rememberedSkillId) this.requestFlashback('rematch', e, attr, skillId);

    // 離れた所からの誘惑を受け入れた：自分から、あの子の胸の中へ歩いていく
    const RA = B.temptation.rangedAccept;
    flags.rangedAccept = Boolean(flags.accepted && def.category === 'special' && !def.pull && !def.chargeBind
      && chebyshev(e.tx, e.ty, this.exp.hero.tx, this.exp.hero.ty) > 1);
    // にじり寄る技：主人公の隣まで一気に詰める
    if (def.pull || def.chargeBind) this.pullToward(e, def.chargeBind);
    // 最初は無害な技：蓄積デバフが発症するか、技が進化するまでは被害を出さない
    flags.gentle = Boolean(def.gentle && !flags.evolved && !flags.rangedAccept
      && (!def.cond || this.conditions.value(def.cond.id) < B.conditioning.onsetAt));
    flags.countdown = Boolean(def.countdown);
    const heroBack = this.exp.hero.dir;
    flags.backstab = (e.tx - this.exp.hero.tx) * heroBack.dx + (e.ty - this.exp.hero.ty) * heroBack.dy < 0;

    let mpMul = 1;
    if (nums.mpRate || nums.expRate) {
      const drainLv = getAbilityLevel(p, e.speciesId, drainAbilityId(attr));
      const loseMp = (p.debuffs.loseHabit.byRace[e.speciesId] ?? 0) * B.habit.loseMpPerStage;
      const soft = softnessEffects(getSoftness(e.speciesId, attr, B, p.softnessOverrides), B).drainMul;
      mpMul = Math.min(B.bound.absorbCap, (1 + B.battle.drainPerLevel * drainLv) * (1 + loseMp) * soft);
      mpMul *= this.conditions.boost(e.speciesId, 'drain') * this.eco.drainMulFrom(e.speciesId) * drainMulFor(p, e.speciesId, B);
      // 一度負けた相手ほど溶かされる（甘やかしバニーの敗北依存）
      if (nums.loseHabitBonus) mpMul *= 1 + nums.loseHabitBonus * (p.debuffs.loseHabit.byRace[e.speciesId] ?? 0);
      if (flags.careless && nums.carelessBonus) mpMul *= nums.carelessBonus;
      if (flags.backstab && nums.backBonus) mpMul *= nums.backBonus;
      if (nums.bonusWhen && this.conditions.has(nums.bonusWhen.status)) {
        mpMul *= nums.bonusWhen.mul;
        flags.bonus = true;
      }
    }
    // 敵どうしの絆で強くなった技（能力上昇・こすり合わせた部位の技の強化）
    const bondMul = (e.bondPower ?? 1) * ((e.bondSkillAttrs ?? []).includes(attr) ? (e.bondSkillMul ?? 1) : 1);
    const powerMul = (flags.evolved ? B.skillEvolution.powerMul : 1) * bondMul * (flags.rangedAccept ? RA.drainMul : 1)
      * powerMulFor(this, e, skillId, nums);   // 自信成長・吸収進化・弱点学習・視線ロック
    mpMul *= powerMul;
    let stage = normalizeStage(SKILL_STAGES[skillId], def.category, B.stage);
    if (ctx?.preFlashed) stage = { ...stage, flashSec: 0 };
    this.director.start({
      stage,
      payload: {
        e, skillId, def, nums, attr, ctx, mpMul, powerMul, flags, blocked,
        choiceDrainMul: ctx?.choiceDrainMul ?? 1,
        skillName: this.skillLabel(skillId, e),
        total: { hp: 0, mp: 0, exp: 0 },
        mpEmptyLogged: false
      }
    });
    this.actedThisTurn = true;
  }
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
    this.eco.endTurn();
    const { B } = this;
    const hs = this.hs;
    const hero = this.exp.hero;
    const threat = this.exp.units.some(
      (u) => u.kind === 'enemy' && chebyshev(u.tx, u.ty, hero.tx, hero.ty) <= 2
    );

    if (!this.bound) this.climax.onHeroTurnEnd();
    const hadBuffs = this.buffs.items.length > 0;
    this.buffs.tick();

    // 罠は時間がたつと消える
    if (this.exp.traps?.length) {
      for (const t of this.exp.traps) t.turns -= 1;
      this.exp.traps = this.exp.traps.filter((t) => t.turns > 0);
    }
    const near = new Set();
    for (const u of this.exp.units) {
      if (u.kind !== 'enemy') continue;
      if (u.choiceCooldown > 0) u.choiceCooldown -= 1;
      if (chebyshev(u.tx, u.ty, hero.tx, hero.ty) <= B.conditioning.nearRange) near.add(u.speciesId);
    }
    this.handleEvents(this.conditions.tickTurn(near), null, null);

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
  // 敗北の搾取：倒れた主人公から、まわりの敵が経験値を吸い尽くし、癖を刻み込む。
  // 演出の長さ（秒）を返す。finalizeDefeat はその後に呼ぶ
  defeatHarvest() {
    const d = this.defeated;
    if (!d || this.harvest) return 0;
    const { B, p, hs } = this;
    const H = B.defeatHarvest;
    const hero = this.exp.hero;
    const hb = this.body(hero);
    const hy = this.head(hero).y;
    const near = (u) => Math.max(Math.abs(u.tx - hero.tx), Math.abs(u.ty - hero.ty));
    const present = this.exp.units
      .filter((u) => u.kind === 'enemy' && (this.exp.map.isVisible(u.tx, u.ty) || near(u) <= H.range))
      .sort((a, b) => near(a) - near(b))
      .slice(0, H.maxEnemies);
    const cause = present.find((u) => u.speciesId === d.raceId) ?? null;
    const harvest = { expLost: 0, levelsLost: 0, debuffs: [], enemies: present.map((u) => u.name), gold: 0 };
    // 所持金は、すべて貢がされる
    const run = this.save.currentRun;
    if (run.gold > 0) {
      harvest.gold = run.gold;
      p.tributes ??= {};
      p.tributes[d.raceId] = (p.tributes[d.raceId] ?? 0) + run.gold;
      run.gold = 0;
      this.later(0.9, () => {
        const target = cause ?? present[0];
        if (!target) return;
        this.fx({ type: 'flow', from: { x: hb.x, y: hb.y - 10 }, to: this.head(target), shapes: ['dot', 'dot', 'heart'], colors: ['#ffd36b', '#fff2b0', '#ff4fa3'], count: 26, size: [4, 8], life: 0.8, glow: true });
        this.fx({ type: 'damage', x: hb.x, y: hy - 100, text: `-${harvest.gold}G`, style: 'mp', big: true });
        this.emit('se', { id: 'coinTribute' });
      });
    }
    this.harvest = harvest;
    this.clearChoice();
    this.director.clear();

    // 暗転と、勝ち誇る声
    this.fx({ type: 'wash', color: '#3a0030', alpha: 0.45, mode: 'full', life: H.firstWaveSec + H.waves * H.waveGapSec + H.tailSec + 0.6, inSec: 0.4 });
    this.fx({ type: 'callout', delay: 0.2, x: hb.x, y: hy - 80, text: '敗北……', color: '#ff4fa3', size: 46, life: 2.2, rise: 10 });
    this.emit('se', { id: 'levelDown', gain: 1.2 });
    this.emit('se', { id: 'temptPrelude', delay: 0.3, gain: 0.8 });
    const speaker = cause ?? present[0];
    if (speaker) this.later(0.6, () => this.speak(speaker, sceneLineFor(speaker.speciesId, 'defeat')));

    // 吸い尽くす：何度かに分けて、全員で経験値を吸い上げる
    const waves = H.waves;
    const total = expNeeded(hs.level, B) * H.expRate * (1 + H.perEnemy * Math.max(0, present.length - 1));
    for (let w = 0; w < waves; w++) {
      this.later(H.firstWaveSec + w * H.waveGapSec, () => {
        const res = loseHeroExp(hs, Math.round(total / waves), {
          needFn: (lv) => expNeeded(lv, B), levelUp: B.battle.levelUp, minLevel: 1, keepHp: true
        });
        harvest.expLost += res.lost;
        harvest.levelsLost += res.levelsLost;
        if (res.lost > 0) this.emit('heroExpDrained', { amount: res.lost, levelsLost: res.levelsLost, level: hs.level });
        const takers = present.filter((u) => this.exp.units.includes(u));
        for (const u of takers) {
          const th = this.theme(u);
          const eb = this.body(u);
          this.fx({ type: 'flow', from: { x: hb.x, y: hb.y - 20 }, to: { x: eb.x, y: this.head(u).y + 20 },
            shapes: ['heart', 'dot', 'heartLine'], colors: ['#b85cff', th.main, '#ffd6ec'], count: 18, size: [5, 10], life: 0.8, spread: 30, glow: true });
          this.later(0.7, () => this.gainDrainExperience(u, (res.lost * H.shareMul) / takers.length));
        }
        this.fx({ type: 'burst', x: hb.x, y: hy, shapes: ['heart', 'heartLine'], colors: ['#b85cff', '#ff4fa3', '#ffd6ec'],
          count: 20 + 6 * w, speed: [100, 260], size: [5, 11], life: 1.0, gravity: 60, glow: true });
        if (res.lost > 0) this.fx({ type: 'damage', x: hb.x + (w - 1) * 40, y: hy - 40 - w * 20, text: `EXP -${res.lost}`, style: 'exp', big: true });
        this.fx({ type: 'shake', power: 0.5 + 0.2 * w });
        this.emit('se', { id: 'expDrained', gain: 1 + 0.15 * w });
        this.emit('drainPulse', { strength: 1 });
      });
    }

    // 癖を刻み込む：まわりにいた敵の負け癖・蓄積デバフ・チャームポイントの耐性
    const markAt = H.firstWaveSec + waves * H.waveGapSec + 0.2;
    this.later(markAt, () => {
      const byRace = p.debuffs.loseHabit.byRace;
      const seenRace = new Set([d.raceId]);
      for (const u of present) {
        if (seenRace.has(u.speciesId)) continue;
        seenRace.add(u.speciesId);
        if (Math.random() >= H.bystanderLoseChance) continue;
        const before = byRace[u.speciesId] ?? 0;
        if (before >= B.habit.loseMax) continue;
        byRace[u.speciesId] = before + 1;
        harvest.debuffs.push(`負け癖・${u.name} ${before} → ${before + 1}`);
        this.emit('log', 'loseHabitUp', { name: u.name, stage: before + 1 });
      }
      // 負かした敵の蓄積デバフ：発症を1回ぶん刻む（永続段階へ近づく）
      const condId = Object.keys(CONDITIONS).find((id) => CONDITIONS[id].source === d.raceId);
      if (condId) {
        const events = this.conditions.markOnset(condId, `defeat:${p.runCount}`);
        const st = this.conditions.stage(condId);
        harvest.debuffs.push(events.length
          ? `${CONDITIONS[condId].name} ${PERMANENT_STAGE_NAMES[st]}に悪化`
          : `${CONDITIONS[condId].name}が体に染みついた`);
        if (events.length && cause) this.handleEvents(events, cause, null);
      }
      // まわりの敵のチャームポイントの耐性が、さらに下がる
      const attrs = new Set();
      for (const u of present) for (const a of charmAttrsOf(u.speciesId)) attrs.add(a);
      for (const attr of [...attrs].slice(0, H.maxResistAttrs)) {
        const cur = p.resistances[attr] ?? 0;
        const next = Math.max(B.resist.floor, cur - H.resistDrop);
        if (next === cur) continue;
        p.resistances[attr] = next;
        harvest.debuffs.push(`${ATTRS[attr].label}耐性 ${cur} → ${next}`);
      }
      this.fx({ type: 'wash', color: '#c2006b', alpha: 0.35, mode: 'full', life: 1.4, inSec: 0.2 });
      this.fx({ type: 'glyph', x: hb.x, y: hb.y + 42, style: 'heart', color: '#ff2d86', sub: '#ffd6ec', r: 90, life: 2.0, spin: 1.5 });
      this.fx({ type: 'callout', delay: 0.15, x: hb.x, y: hy - 70, text: '負け癖が刻まれていく……', color: '#ff4fa3', size: 26, life: 1.8, rise: 16 });
      this.emit('se', { id: 'debuffDeepen' });
      this.emit('se', { id: 'conditionPermanent', delay: 0.35 });
      this.emit('persist');
    });
    return markAt + H.tailSec;
  }

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
    const beforeLose = byRace[d.raceId] ?? 0;
    byRace[d.raceId] = Math.min(B.habit.loseMax, (byRace[d.raceId] ?? 0) + 1);
    this.emit('log', 'loseHabitUp', { name: d.name, stage: byRace[d.raceId] });
    this.deepenDebuff(`lose:${d.raceId}`, `負け癖・${d.name}`);

    const attr = d.attr === 'all' ? 'mouth' : d.attr;
    const cur = p.resistances[attr] ?? 0;
    const next = Math.max(B.resist.floor, cur - B.battle.defeatResistDrop);
    if (next !== cur) {
      p.resistances[attr] = next;
      this.emit('log', 'resistDown', { attr: ATTRS[attr].label, from: cur, to: next });
      this.deepenDebuff(`res_${attr}`, `${ATTRS[attr].label}耐性`);
    }

    p.stats.defeatCount += 1;
    // 拠点の強化に使う雪辱ポイント
    const rpGain = this.eco.rpForDefeat(run.floor, this.runStats().climaxes);
    p.rp = (p.rp ?? 0) + rpGain;
    this.lastRpGain = rpGain;
    // 図鑑・回想部屋：どの技で何回負けたか
    const entry = p.codex.entries[d.raceId];
    if (entry && d.skillId) {
      entry.defeatsBySkill ??= {};
      entry.defeatsBySkill[d.skillId] = (entry.defeatsBySkill[d.skillId] ?? 0) + 1;
    }
    this.emit('defeatRecap', this.buildDefeatRecap(d, beforeLose));
    p.runCount += 1;
    this.defeated = null;
    this.harvest = null;
    this.stunTurns = 0;
    this.clearChoice();
    this.director.clear();
    this.climax.reset();
    this.buffs.clear();
    this.flashback.reset();
    this.emit('persist');
  }
}
