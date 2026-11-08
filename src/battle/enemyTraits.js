// File: src/battle/enemyTraits.js
// 追加18体・後半10体（elite）の専用の仕組み。combat.js から呼ぶ。
//   魅了の連鎖（魔性のお嬢様）     魅了中に当たると、集中力低下・脱力・魔力漏出を連鎖で付ける
//   弱点学習（いじわる小悪魔ちゃん） 経験値を盗めた回数を覚え、経験値ドレインが強くなる（永続）
//   自信成長（控えめアイドル）       技が決まるたびに自信がつき、技が強くなる（永続）
//   甘い取引（堕落のお姉さん）       受け入れると、その場で回復する代わりに尻の耐性が永続で下がり、その子が育つ
//   吸収進化（桃髪サキュバス）       奪った MP の累計で、吸い方が段階的にうまくなる（永続）
//   視線ロック（むちむち小悪魔）     見つめるほど溜まり、最大で動けなくなる。目を逸らすと戻る（その階だけ）
//   丁寧な収奪（青髪プリンセス）     拘束が長いほど吸収が強くなる（拘束ごとに戻る）
//   重圧蓄積（黒衣のシスター）       拘束中に重圧が段階的に増し、吸収と脱出必要数が上がる（拘束ごとに戻る）
//   背面完全捕縛（白銀バニー）       背後へ回り込み、背面から拘束すると経験値も直接吸う
//   視線矯正（強引な桃髪メイド）     顔を逸らした回数を覚え、逸らしにくくなる（永続）
import { memoryOf } from './enemyMemory.js';

const clampLv = (n, max) => Math.max(0, Math.min(max, n));

/** 技の威力（吸収量）の倍率 */
export function powerMulFor(c, e, skillId, nums) {
  const { B, p } = c;
  const T = B.traits;
  const m = p.enemyMemory?.[e.speciesId] ?? {};
  let mul = 1;
  if (e.speciesId === 'shyIdol') mul *= 1 + T.confidenceMul * (m.confidence ?? 0);
  if (e.speciesId === 'pinkSuccubus') mul *= 1 + T.absorbMul * absorbStage(m, B);
  if (e.speciesId === 'mischievousDevil' && nums.expRate) mul *= 1 + T.weakLearnMul * (m.weakLearn ?? 0);
  if (nums.gazeBonus) mul *= 1 + nums.gazeBonus * (c.save.currentRun.gazeLock ?? 0);
  return mul;
}

export function absorbStage(m, B) {
  return clampLv(Math.floor((m.absorbed ?? 0) / B.traits.absorbPerStage), B.memory.max);
}

/** 「断る」を選んだときの回避の上乗せの倍率（視線矯正で減る） */
export function resistBonusMulFor(c, e) {
  if (e.speciesId !== 'assertiveMaid') return 1;
  const n = c.p.enemyMemory?.[e.speciesId]?.faceAways ?? 0;
  return Math.max(0.2, 1 - c.B.traits.faceAwayCut * n);
}

/** 選択肢で断った：視線ロックが解ける・顔を逸らした回数を覚える */
export function onResist(c, e) {
  const run = c.save.currentRun;
  if (e.speciesId === 'curvyLittleDevil' && (run.gazeLock ?? 0) > 0) {
    run.gazeLock = 0;
    c.emit('log', 'gazeReset', {});
  }
  if (e.speciesId === 'assertiveMaid') {
    const m = memoryOf(c.p, e.speciesId);
    if ((m.faceAways ?? 0) < c.B.memory.max) {
      m.faceAways = (m.faceAways ?? 0) + 1;
      c.later(0.4, () => c.speak(e, 'あら。……そのお顔を逸らす癖、覚えておきますね'));
      c.emit('log', 'memoryFaceAway', { name: e.name });
    }
  }
}

/** 技が当たった（防がれず、無害でもない）あと */
export function onLand(c, pl) {
  const { B, p } = c;
  const T = B.traits;
  const { e, def, flags = {}, total } = pl;
  const hero = c.exp.hero;
  const hb = c.body(hero);
  const hy = c.head(hero).y;
  const th = c.theme(e);
  const m = memoryOf(p, e.speciesId);

  // 自信成長
  if (e.speciesId === 'shyIdol' && def.category === 'special' && (m.confidence ?? 0) < B.memory.max) {
    m.confidence = (m.confidence ?? 0) + 1;
    c.fx({ type: 'callout', delay: 0.3, x: c.body(e).x, y: c.head(e).y - 40, text: `自信 ${'★'.repeat(m.confidence)}`, color: th.main, size: 18 });
    if (m.confidence === 3) c.later(0.6, () => c.speak(e, '私、そんなにサドじゃなかった筈なのに……♡ 先輩のせいですよ？'));
    c.emit('log', 'idolConfidence', { name: e.name, stage: m.confidence });
  }
  // 吸収進化
  if (e.speciesId === 'pinkSuccubus' && total.mp > 0) {
    const before = absorbStage(m, B);
    m.absorbed = (m.absorbed ?? 0) + total.mp;
    const after = absorbStage(m, B);
    if (after > before) {
      c.celebrateEnemy(e, `吸収進化 ${after}段`);
      c.emit('log', 'absorbEvolve', { name: e.name, stage: after });
    }
  }
  // 弱点学習
  if (e.speciesId === 'mischievousDevil' && total.exp > 0 && (m.weakLearn ?? 0) < B.memory.max) {
    m.weakLearn = (m.weakLearn ?? 0) + 1;
    c.emit('log', 'weakLearn', { name: e.name, count: m.weakLearn });
  }
  // 魅了の連鎖
  if (def.charmChain && c.conditions.has('charmed')) {
    T.charmChainStatuses.forEach((id, i) => {
      c.handleEvents(c.conditions.addStatus(id, 2), e, pl.skillId);
      c.fx({ type: 'callout', delay: 0.2 + i * 0.25, x: hb.x + (i - 1) * 70, y: hy - 30 - i * 10, text: ['集中できない', '力が抜ける', '魔力が漏れる'][i], color: th.main, size: 18 });
    });
    c.fx({ type: 'swirl', x: hb.x, y: hy, shapes: ['heart', 'heartLine'], colors: [th.main, th.sub], count: 18, r0: 70, r1: 10, turns: 1.6, life: 1.0, size: [5, 9], glow: true });
    c.emit('log', 'charmChain', { name: e.name });
  }
  // 視線ロック
  if (def.gaze) {
    const run = c.save.currentRun;
    run.gazeLock = (run.gazeLock ?? 0) + 1;
    c.fx({ type: 'callout', delay: 0.3, x: hb.x, y: hy - 50, text: `視線ロック ${'●'.repeat(run.gazeLock)}${'○'.repeat(Math.max(0, T.gazeMax - run.gazeLock))}`, color: th.main, size: 18 });
    if (run.gazeLock >= T.gazeMax) {
      run.gazeLock = 0;
      c.handleEvents(c.conditions.addStatus('pinned', 1), e, pl.skillId);
      c.fx({ type: 'wash', color: th.main, alpha: 0.35, mode: 'full', life: 1.2 });
      c.fx({ type: 'callout', delay: 0.5, x: hb.x, y: hy - 80, text: '目が離せない……動けない！', color: th.main, size: 28, wobble: 0.08 });
      c.emit('log', 'gazeLockMax', { name: e.name });
    }
  }
  // 背後へ回り込む
  if (def.backstep) {
    const bx = hero.tx - Math.sign(hero.dir.dx);
    const by = hero.ty - Math.sign(hero.dir.dy);
    if ((bx !== hero.tx || by !== hero.ty) && c.exp.walk(bx, by) && !c.exp.unitAt(bx, by)) {
      c.fx({ type: 'burst', x: c.body(e).x, y: c.body(e).y, shapes: ['star', 'heart'], colors: [th.sub, th.main], count: 10, speed: [40, 120], size: [4, 8], life: 0.6 });
      e.moveTo(bx, by);
      e.fromX = e.tx;
      e.fromY = e.ty;
      e.setDir(hero.tx - e.tx, hero.ty - e.ty);
      c.exp.refresh?.();
      c.fx({ type: 'callout', delay: 0.2, x: hb.x, y: hy - 60, text: '背後を取られた…', color: th.sub, size: 22 });
    }
  }
  // 顔を向けさせる
  if (def.forceFace) hero.setDir(e.tx - hero.tx, e.ty - hero.ty);
  // 自分から差し出す
  if (flags.accepted && def.giveMp) {
    const hs = c.hs;
    const give = Math.min(hs.mp, Math.round(hs.maxMp * def.giveMp));
    if (give > 0) {
      hs.mp -= give;
      c.fx({ type: 'damage', delay: 0.3, x: hb.x, y: hy - 44, text: `MP -${give}`, style: 'mp', big: true });
      c.fx({ type: 'flow', from: { x: hb.x, y: hb.y - 20 }, to: c.head(e), shapes: ['dot', 'heart'], colors: [th.sub, th.main], count: 20, size: [4, 8], life: 0.7, glow: true });
      c.gainDrainExperience(e, give * T.giveMpGrow);
      c.emit('log', 'giveMp', { name: e.name, amount: give });
    }
  }
  // 甘い取引
  if (flags.accepted && def.sweetDeal) {
    const D = T.sweetDeal;
    const hs = c.hs;
    const mp = Math.round(hs.maxMp * D.mp);
    hs.mp = Math.min(hs.maxMp, hs.mp + mp);
    hs.hp = Math.min(hs.maxHp, hs.hp + Math.round(hs.maxHp * D.hp));
    const cur = p.resistances.hip ?? 0;
    p.resistances.hip = Math.max(B.resist.floor, cur - D.resistDrop);
    c.gainDrainExperience(e, D.grow);
    c.fx({ type: 'damage', delay: 0.3, x: hb.x, y: hy - 44, text: `MP +${mp}`, style: 'heal', big: true });
    c.fx({ type: 'callout', delay: 0.8, x: hb.x, y: hy - 80, text: '楽になった……代わりに、何かを失った', color: th.sub, size: 20, life: 2.0 });
    c.emit('log', 'sweetDeal', { name: e.name, from: cur, to: p.resistances.hip });
  }
}

/** 拘束中の吸収の倍率（拘束役ごと） */
export function bindDrainMulFor(c, binder, bound) {
  const T = c.B.traits;
  const id = binder.unit.speciesId;
  if (id === 'bluePrincess') return 1 + T.princessMul * Math.min(T.princessMax, Math.floor((bound.elapsed ?? 0) / T.princessEverySec));
  if (id === 'blackSister') return 1 + T.pressureDrainMul * (bound.pressure ?? 0);
  return 1;
}

/** 拘束中の経験値の吸収の倍率 */
export function bindExpMulFor(c, binder, bound) {
  return binder.unit.speciesId === 'silverBunny' && bound.isBackBind ? c.B.traits.backBindExpMul : 1;
}

/** 黒衣のシスターの重圧を、時間で1段ずつ上げる。上がったら true */
export function tickPressure(c, bound) {
  const T = c.B.traits;
  const sister = bound.binders.find((b) => b.unit.speciesId === 'blackSister');
  if (!sister) return false;
  const next = Math.min(T.pressureMax, Math.floor((bound.elapsed ?? 0) / T.pressureEverySec));
  if (next <= (bound.pressure ?? 0)) return false;
  bound.pressure = next;
  const hb = c.body(c.exp.hero);
  c.fx({ type: 'ring', x: hb.x, y: hb.y + 40, r: 80 + next * 10, squash: 0.4, color: '#8a2d6e', width: 6, alpha: 0.8 });
  c.fx({ type: 'callout', x: hb.x, y: c.head(c.exp.hero).y - 60, text: `重圧 ${next}段`, color: '#d0307a', size: 24 });
  c.emit('se', { id: 'repentToll', gain: 0.8 });
  c.emit('log', 'pressureUp', { name: sister.unit.name, stage: next });
  return true;
}

/** 脱出必要数の倍率（重圧） */
export function escapeMulForBound(c, bound) {
  return 1 + c.B.traits.pressureEscapeMul * (bound.pressure ?? 0);
}
