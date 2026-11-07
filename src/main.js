// File: src/main.js
import { B } from './data/balance.js';
import { SE_TABLE } from './data/seTable.js';
import { flashbackSeFor } from './data/flashbackData.js';
import { ENEMIES, ENEMIES_BY_ID, ATTRS } from './data/enemies.js';
import { getCharmPointsForAttr, getCharmPoints, setCharmPoints, resetCharmPoint } from './data/charmPoint.js';
import { DEFEAT_SKILLS } from './data/defeatSkills.js';
import { SKILL_DEFS as SKILL_DEFS_DEBUG } from './data/skills.js';
import { expNeeded } from './battle/damage.js';
import { loadSave, saveNow, scheduleSave, flushSave, saveCharmPointsNow } from './core/storage.js';
import { createLayers, fitLayers, beginFrame, clientToLogical } from './core/renderScale.js';
import { GameClock } from './core/timer.js';
import { Input } from './core/input.js';
import { EventState } from './core/eventState.js';
import { TimeMode } from './core/timeMode.js';
import { AudioEngine } from './core/audio.js';
import { BgmPlayer } from './core/bgm.js';
import { runDebugAction, DEBUG_ACTIONS } from './core/debugTools.js';
import { clamp } from './core/util.js';
import { spatialFromOffset } from './core/spatialPan.js';
import { FloatLog } from './ui/floatLog.js';
import { DebugHud } from './ui/debugHud.js';
import { openTitleDebugPanel } from './ui/titleDebugPanel.js';
import { Exploration } from './dungeon/exploration.js';
import { DungeonView } from './ui/dungeonView.js';
import { drawMinimap } from './ui/minimap.js';
import { drawExploreHud } from './ui/exploreHud.js';
import { getPortrait, initPortraitLoader, preloadPortrait, importPortrait } from './ui/portraitLoader.js';
import { BoundCharmView } from './ui/boundCharmView.js';
import { openCharmPointEditor } from './ui/charmPointEditor.js';
import { HeartFx, loadHeartOverrides } from './ui/heartFx.js';
import { KissMarkLayer, loadKissmarkOverrides } from './ui/kissmark.js';
import { BattleFx } from './ui/battleFx.js';
import { DrainFx } from './ui/drainFx.js';
import { bindSideOf } from './ui/boundCharmMath.js';
import { Heartbeat } from './core/heartbeat.js';
import { InputGate } from './core/inputGate.js';
import { FlashbackFx } from './ui/flashbackFx.js';
import { buildCharmCanvas } from './ui/charmCanvas.js';
import { drawEnemyLabels } from './ui/enemyLabels.js';
import { drawPartyPanel } from './ui/partyPanel.js';
import { drawDebuffPanel, markDebuffDeepen } from './ui/debuffPanel.js';
import { buildStatusEntries, drawStatusPanel } from './ui/statusPanel.js';
import { SkillHud } from './ui/skillHud.js';
import { EnemyChoiceView } from './ui/enemyChoiceView.js';
import { LevelHud } from './ui/levelHud.js';
import { CorruptionCrest } from './ui/corruptionCrest.js';
import { DefeatRecapView } from './ui/defeatRecapView.js';
import { CORRUPTION } from './data/corruption.js';
import { openGameMenu } from './ui/gameMenu.js';
import { openShop } from './ui/shopView.js';
import { rubAttrsOf } from './battle/pairBond.js';
import {
  recordDefeat, getMarkScore, markTier, MARK_TIER_NAMES, recordEncounter
} from './battle/learning.js';

// ---- 初期化 ----
const save = loadSave();
const clock = new GameClock();
const audio = new AudioEngine(B);
audio.setVolume(save.settings.volume);
audio.setSpatialEnabled(save.settings.spatialAudio);
const bgm = new BgmPlayer({ audio, B });
bgm.play('explore');

const eventState = new EventState(B);
const timeMode = new TimeMode(B, () => save.settings);
const floatLog = new FloatLog(B, { onSE: (id) => id && audio.playSE(id) });
const debugHud = new DebugHud();
const exploration = new Exploration(B, save);
const dungeonView = new DungeonView(B);
// 全キャラのドット絵を読み込む（読んでいないキャラは色の四角で仮表示される）
dungeonView.preload(['hero', 'priest', 'merchant', ...ENEMIES.map((enemy) => enemy.id)]);

// ---- 演出 ----
initPortraitLoader(B);
const heartFx = new HeartFx(B, () => save.settings);
const kissMarks = new KissMarkLayer(B, () => save.settings);
kissMarks.setArea('screen', { x: 0, y: 0, w: B.render.logicalWidth, h: B.render.logicalHeight });
loadHeartOverrides();
loadKissmarkOverrides();
const battleFx = new BattleFx(B, {
  hearts: heartFx,
  kissMarks,
  getCam: () => exploration.camera,
  getSettings: () => save.settings
});

const layers = createLayers(document.getElementById('game'), B);
const refit = () => fitLayers(layers, B, save.settings.integerScaleOnly);
refit();
window.addEventListener('resize', refit);
const input = new Input(window);
input.setBindings(save.settings.keyBindings);
input.setPointerMapper((x, y) => clientToLogical(layers.hires, B, x, y));
input.attach();

// 最初のキー入力かクリックで、音を使えるようにする
const unlockAudio = () => {
  audio.unlock();
  bgm.sync();
};
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

// タブを離れたら自動でポーズし、閉じる前にセーブする
window.addEventListener('blur', () => clock.pause('blur'));
window.addEventListener('focus', () => clock.resume('blur'));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) flushSave(save);
});
window.addEventListener('beforeunload', () => saveNow(save));

eventState.on('watchdog', (owner) => {
  floatLog.push({ text: `イベントのロックを強制解除しました（${owner}）`, color: 'red', mark: '■', importance: 'major' });
});

const combat = exploration.combat;
const flashbackFx = new FlashbackFx({
  cfg: B.flashbackFx,
  render: B.render,
  getTargets: () => (layers.pixel ? [layers.pixel] : [])
});
const inputGate = new InputGate({
  lockSec: B.flashbackFx.inputLockSec,
  isActive: () => combat.flashback.isErect()
});
const skillHud = new SkillHud({
  cfg: B.stage,
  render: B.render,
  fontFamily: B.ui.fontFamily,
  getSettings: () => save.settings,
  toScreen: (x, y) => battleFx.toScreen(x, y)
});
combat.on('skillName', (info) => skillHud.show(info));
combat.on('skillFlash', (info) => skillHud.flash(info));
exploration.on('heroTurnDone', () => {
  if (!combat.bound && timeMode.mode === 'TURN') {
    inputGate.onAction(Math.max(0, exploration.busySec ?? 0));
    if (combat.flashback.erectTurnsLeft() > 0) combat.flashback.onHeroTurn();
  }
});
timeMode.tickSecProvider = () => combat.climax.boundTickSec();
let boundPortraitLoading = false;
let titleActive = false;
let closeTitle = () => {};   // タイトル画面を閉じる（showTitleScreen が差し替える）
let gameMenu = null;
let pendingItemTurn = false;
let shopView = null;
const charmCfg = {
  ...B.charm,
  get centerTransparency() {
    return save.settings.charmCenterTransparency ?? B.charm.centerTransparency;
  },
  get innerRatio() {
    return save.settings.charmInnerRatio ?? B.charm.innerRatio;
  }
};
async function loadEnemyPortrait(speciesId) {
  await preloadPortrait(speciesId);
  return getPortrait(speciesId);
}
const enemyChoiceView = new EnemyChoiceView({
  cfg: B.temptation,
  fontFamily: B.ui.fontFamily,
  loadPortrait: loadEnemyPortrait,
  onChoose: (answer) => combat.resolveChoice(answer),
  onWarning: () => audio.playSE('choiceWarning'),
  onBeat: (strength) => audio.playSE('lowMpHeartbeat', { gain: 0.45 + 0.4 * strength }),
  isReduced: () => save.settings.flashback === 'reduced'
});
async function attachFlashbackArt(id, speciesId, attr, skillId, tx, ty) {
  try {
    const hero = exploration.hero;
    const side = bindSideOf(tx - hero.tx, ty - hero.ty, hero.dir);
    const img = await loadEnemyPortrait(speciesId);
    if (!img) return;
    const point = getCharmPointsForAttr(save.persistent, speciesId, attr, B.charm)[0];
    const canvas = buildCharmCanvas(img, point, {
      ...charmCfg,
      outputPx: B.flashbackFx.art.outputPx
    }, side);
    flashbackFx.setArt(id, canvas);
  } catch (error) {
    console.error('フラッシュバックの絵を読み込めませんでした', error);
  }
}
const boundCharm = new BoundCharmView({
  cfg: charmCfg,
  getPoint: (speciesId, attr) => getCharmPointsForAttr(save.persistent, speciesId, attr, B.charm),
  loadPortrait: loadEnemyPortrait,
  getHero: () => exploration.hero
});
const later = (sec, fn) => (sec > 0 ? clock.after(sec, fn) : fn());
const heroMpRatio = () => (combat.hs.maxMp > 0 ? combat.hs.mp / combat.hs.maxMp : 1);
const drainFx = new DrainFx({
  cfg: B.drainFx,
  render: B.render,
  getSettings: () => save.settings,
  getState: () => {
    const hero = exploration.hero;
    const climax = combat.climax;
    return {
      mpRatio: heroMpRatio(),
      // The particle origin follows the center used by the bound charm portraits.
      hero: { x: charmCfg.anchorX, y: charmCfg.anchorY },
      climax: climax.isClimax()
        ? { progress: climax.duration > 0 ? Math.min(1, climax.elapsed / climax.duration) : 0 }
        : null,
      binders: (combat.bound?.binders ?? []).map((binder) => {
        const side = bindSideOf(
          binder.unit.tx - hero.tx,
          binder.unit.ty - hero.ty,
          hero.dir
        );
        return {
          front: { dx: 0, dy: -1 },
          back: { dx: 0, dy: 1 },
          left: { dx: -1, dy: 0 },
          right: { dx: 1, dy: 0 }
        }[side];
      })
    };
  }
});
const levelHud = new LevelHud({ B, getSettings: () => save.settings });
// 堕ち度のハートの刻印。段階が上がると BGM も甘くなる
const crest = new CorruptionCrest({ B, getPersistent: () => save.persistent, getSettings: () => save.settings });
bgm.setMood(crest.state.mood);
function refreshCorruption() {
  if (crest.refresh()) {
    floatLog.pushKind('corruptionUp', { name: CORRUPTION.names[crest.state.level] });
    audio.playSE('conditionPermanent');
  }
  bgm.setMood(crest.state.mood);
}
// 敗北の回想。表示中はゲームの時計を止める
const recapView = new DefeatRecapView({
  fontFamily: B.ui.fontFamily,
  loadPortrait: loadEnemyPortrait,
  onClose: () => clock.resume('recap')
});
const heartbeat = new Heartbeat({
  cfg: B.drainFx.heartbeat,
  onBeat: ({ k }) => audio.playSE('lowMpHeartbeat', { gain: 0.6 + 0.4 * k })
});
function spatialAudioOptions(tx, ty) {
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) {
    return { pan: 0, vertical: 0, behind: false };
  }
  const hero = exploration.hero;
  const dx = tx - hero.tx;
  const dy = ty - hero.ty;
  return spatialFromOffset(dx, dy, hero.dir, B.spatial);
}
combat.on('fx', (e) => battleFx.handle(e));
combat.on('enemyChoiceStart', (info) => {
  audio.playSE('choiceAppear');
  enemyChoiceView.show(info);
});
combat.on('enemyChoiceEnd', () => enemyChoiceView.clear());
combat.on('anim', ({ unit, tag, delay = 0 }) =>
  later(delay, () => dungeonView.viewFor(unit).play(tag, { once: !['bound', 'bind_down', 'bind_side'].includes(tag) }))
);
combat.on('se', ({ id, tx, ty, delay = 0, behind = false, gain = 1, ally = false, params = {}, exact = false, clear = false }) =>
  later(delay, () => {
    const position = spatialAudioOptions(tx, ty);
    audio.playSE(id, {
      ...position,
      gain,
      ally,
      params,
      exact,
      clear,
      behind: behind || position.behind
    });
  })
);
combat.on('log', (kind, params) => floatLog.pushKind(kind, params));
combat.on('drainPulse', ({ strength = 1, delay = 0 }) =>
  later(delay, () => drainFx.pulse(strength))
);
// 敵が吸い取った経験値のポップアップ。続けざまのヒットは短い間まとめて1つにする。
// 量が多いほど大きく、濃いピンクになる（基準は主人公の今のレベルの必要EXP）
const pendingExpPopups = new Map();
combat.on('enemyExperience', ({ enemy, amount }) => {
  const cur = pendingExpPopups.get(enemy);
  if (cur) {
    cur.amount += amount;
    return;
  }
  pendingExpPopups.set(enemy, { amount });
  later(B.expPopup.mergeSec, () => {
    const total = pendingExpPopups.get(enemy)?.amount ?? amount;
    pendingExpPopups.delete(enemy);
    const ref = expNeeded(combat.hs.level, B);
    const bound = combat.bound?.binders.some((binder) => binder.unit === enemy);
    if (bound && boundCharm.addExpPopup(enemy, total, ref, B.ui.fontFamily)) return;
    if (!exploration.units.includes(enemy)) return;
    const pos = combat.body(enemy);
    battleFx.handle({ type: 'expGain', x: pos.x, y: combat.head(enemy).y - 24, amount: total, ref });
  });
});
// 経験値を吸われたとき：レベル表示の演出と音（音は短い間隔で鳴りすぎないようにする）
let lastExpDrainSe = -Infinity;
combat.on('heroExpDrained', (info) => {
  levelHud.onDrain(info, combat.hs);
  if (info.levelsLost > 0) {
    audio.playSE('levelDown');
  } else if (clock.time - lastExpDrainSe >= B.levelHud.drainSeIntervalSec) {
    lastExpDrainSe = clock.time;
    audio.playSE('expDrained');
  }
});
combat.on('debuffDeepen', ({ id }) => markDebuffDeepen(id, clock.time));
// 複数方向からの拘束の陣形：音のこもりと、画面の縁・表示
let bindFormation = null;
combat.on('bindFormation', ({ formation }) => {
  bindFormation = formation && formation.ids.length ? formation : null;
  audio.setMuffle(bindFormation?.muffle ?? 0);
});
combat.on('learning', (events) => announceLearning(events));
// 台詞の順番を作るための、少し遅れた処理
combat.on('later', ({ sec, fn }) => later(sec, fn));
// 拘束中のおねだり
let bindRequest = null;
combat.on('bindRequest', ({ request }) => {
  bindRequest = request;
});
combat.on('bindRequestEnd', () => {
  bindRequest = null;
});
combat.on('defeatRecap', (info) => {
  clock.pause('recap');
  recapView.show(info);
  refreshCorruption();
});
combat.on('persist', () => {
  refreshCorruption();
  save.currentRun.buffs = combat.buffs.serialize();
  save.currentRun.afterglowTurns = combat.climax.serialize().afterglowTurns;
  scheduleSave(save);
});
combat.on('flashbackStart', ({ kind, attr, skillId, speciesId, mode, durationSec, tx, ty }) => {
  const position = spatialAudioOptions(tx, ty);
  audio.playSE('flashback');
  const seId = flashbackSeFor(attr);
  if (seId) audio.playSE(seId, position);
  const id = flashbackFx.start({ kind, attr, mode, durationSec });
  if (id && speciesId) void attachFlashbackArt(id, speciesId, attr, skillId, tx, ty);
});
combat.on('flashbackCancel', () => {
  flashbackFx.cancel();
  inputGate.clear();
});
combat.on('boundStart', () => {
  bgm.play('bound');
  boundPortraitLoading = true;
  void (async () => {
    try {
      await boundCharm.sync(combat.bound?.binders ?? []);
    } catch (error) {
      console.error('拘束画像の読み込みに失敗しました', error);
    } finally {
      boundPortraitLoading = false;
      if (combat.bound) timeMode.enterBound();
    }
  })();
});
combat.on('boundChanged', ({ binders }) => {
  const currentBinders = binders.map((unit) => combat.bound?.binders.find((binder) => binder.unit === unit)).filter(Boolean);
  void boundCharm.sync(currentBinders).catch((error) => {
    console.error('拘束画像の読み込みに失敗しました', error);
  });
});
combat.on('boundEnd', () => {
  bgm.play('explore');
  boundCharm.clear();
  if (timeMode.mode === 'BOUND') timeMode.leave();
});
timeMode.on('boundSecond', () => {
  combat.boundSecond();
  // 絶頂開始時のHPドレインで倒れた場合は、通常ターン処理を通らないためここで敗北処理を行う。
  if (combat.defeated) exploration.handleDefeat();
});
timeMode.on('boundTick', () => exploration.boundTick());
timeMode.on('boundMove', () => exploration.boundMove());

exploration.on('floorStart', ({ floor, total }) => {
  kissMarks.clearNow();
  floatLog.push({ text: `${floor}階（全${total}階）`, color: 'white', mark: '◇' });
  if (exploration.merchant) floatLog.pushKind('merchantHere', {});
  scheduleSave(save);
});
exploration.on('stairs', ({ isExit }) => {
  floatLog.push({
    text: isExit ? '出口がある。Eで外へ出る' : '階段がある。Eで降りる',
    color: 'cyan', mark: '◇', key: 'stairs'
  });
});
exploration.on('encounter', (unit) => {
  floatLog.pushKind('enemySpotted', { name: unit.name, level: unit.level });
  combat.encounterTaunt(unit);
});
exploration.on('stunned', () => floatLog.pushKind('stunned'));
exploration.on('hallOmen', () => {
  floatLog.pushKind('hallOmen', {});
  audio.playSE('temptPrelude', { gain: 0.6 });
});
// 大広間の待ち伏せ：甘い香り → 縁から敵が次々と姿を現す
exploration.on('ambush', ({ enemies, mpGain }) => {
  floatLog.pushKind('ambush', { count: enemies.length, mp: mpGain });
  audio.playSE('formationOn');
  const hb = combat.body(exploration.hero);
  battleFx.handle({ type: 'wash', color: '#ff4fa3', alpha: 0.3, mode: 'full', life: 1.4, inSec: 0.3 });
  battleFx.handle({ type: 'cloud', from: hb, to: hb, colors: ['#ff9fd0', '#ffd6ec', '#ff4fa3'], count: 18, r: [20, 70], life: 1.6, spread: 80, lift: 20 });
  battleFx.handle({ type: 'damage', x: hb.x, y: combat.head(exploration.hero).y, text: `MP +${mpGain}`, style: 'heal' });
  enemies.forEach((e, i) => {
    const d = 0.3 + i * 0.18;
    const b = combat.body(e);
    const theme = combat.theme(e);
    battleFx.handle({ type: 'burst', delay: d, x: b.x, y: b.y - 10, shapes: ['heart', 'heartLine'], colors: [theme.main, theme.glow], count: 14, speed: [60, 180], size: [5, 9], life: 0.8, glow: true });
    battleFx.handle({ type: 'ring', delay: d, x: b.x, y: b.y + 40, r: 60, squash: 0.45, color: theme.main, width: 5, alpha: 0.7 });
    later(d, () => audio.playSE('heelStep', { ...spatialAudioOptions(e.tx, e.ty), gain: 1.2 }));
  });
  later(0.6, () => {
    const first = enemies[0];
    if (first) combat.speak(first, 'いらっしゃい♡ 甘い香り、気に入った？');
  });
});
exploration.on('lured', ({ count }) => {
  floatLog.pushKind('luredByVoice', { count });
  audio.playSE('heelStep', { gain: 1.2 });
  later(0.25, () => audio.playSE('heelStep', { gain: 1.0, params: { alt: true } }));
});
// 足音。主人公は左右の足で少し高さを変え、敵は近くて見えているときだけヒールの音を鳴らす
let stepAlt = false;
let lastEnemyStep = -Infinity;
exploration.on('unitStep', (unit) => {
  if (unit.kind === 'hero') {
    stepAlt = !stepAlt;
    audio.playSE('footstep', { params: { alt: stepAlt } });
    return;
  }
  if (unit.kind !== 'enemy' || !exploration.map.isVisible(unit.tx, unit.ty)) return;
  if (clock.time - lastEnemyStep < B.footsteps.enemyIntervalSec) return;
  const hero = exploration.hero;
  if (Math.max(Math.abs(unit.tx - hero.tx), Math.abs(unit.ty - hero.ty)) > B.footsteps.enemyRange) return;
  lastEnemyStep = clock.time;
  audio.playSE('heelStep', { ...spatialAudioOptions(unit.tx, unit.ty), params: { alt: unit.tx % 2 === 0 } });
});
exploration.on('nothing', () => {
  floatLog.push({ text: 'ここには何もない', color: 'white', mark: '◇', key: 'nothing' });
});
exploration.on('dungeonClear', () => {
  floatLog.push({ text: 'ダンジョンをクリアした！ 最初からやり直します', color: 'gold', mark: '▲', importance: 'major' });
});
exploration.start();
showTitleScreen();

function openCharmEditor() {
  return openCharmPointEditor({
    enemies: ENEMIES,
    attrLabels: {
      ...Object.fromEntries(Object.entries(ATTRS).map(([key, def]) => [key, def.label])),
    },
    attrColors: Object.fromEntries(Object.entries(ATTRS).map(([key, def]) => [key, def.color])),
    cfg: charmCfg,
    loadPortrait: loadEnemyPortrait,
    importPortrait: async (id, file) => {
      const result = await importPortrait(id, file);
      if (!result.ok) throw new Error(result.message);
      return getPortrait(id);
    },
    getPoints: (id) => getCharmPoints(save.persistent, id, B.charm),
    setPoints: (id, points) => {
      const stored = setCharmPoints(save.persistent, id, points, B.charm);
      saveCharmPointsNow(save.persistent.charmPoints);
      flushSave(save);
      return stored;
    },
    resetPoint: (id) => {
      resetCharmPoint(save.persistent, id);
      saveCharmPointsNow(save.persistent.charmPoints);
      flushSave(save);
      return getCharmPoints(save.persistent, id, B.charm);
    },
    onTransparencyChange: (value) => {
      save.settings.charmCenterTransparency = Math.min(0.9, Math.max(0, value));
      scheduleSave(save);
    },
    onInnerChange: (value) => {
      save.settings.charmInnerRatio = Math.min(0.9, Math.max(0.3, value));
      scheduleSave(save);
    },
    onTransparencyCommit: () => flushSave(save)
  });
}

function showTitleScreen() {
  titleActive = true;
  clock.pause('title');
  const root = document.createElement('main');
  Object.assign(root.style, {
    position: 'fixed', inset: '0', zIndex: '900', display: 'grid', placeItems: 'center',
    background: 'radial-gradient(ellipse at center, rgba(46, 25, 55, 0.94), rgba(6, 5, 12, 0.98))',
    color: '#fff', fontFamily: B.ui.fontFamily
  });
  const panel = document.createElement('section');
  Object.assign(panel.style, {
    width: 'min(560px, calc(100vw - 40px))', padding: '42px 36px', boxSizing: 'border-box',
    textAlign: 'center', background: 'rgba(18, 13, 27, 0.88)', border: '1px solid #9d668d',
    borderRadius: '14px', boxShadow: '0 18px 60px rgba(0,0,0,.55)'
  });
  const heading = document.createElement('h1');
  heading.textContent = 'ダンジョンゲーム';
  Object.assign(heading.style, { margin: '0 0 12px', fontSize: 'clamp(28px, 5vw, 44px)', letterSpacing: '.08em' });
  const subtitle = document.createElement('p');
  subtitle.textContent = '冒険の準備を整えましょう';
  Object.assign(subtitle.style, { margin: '0 0 30px', color: '#d7bfd7' });
  const makeButton = (label, action, primary = false) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    Object.assign(button.style, {
      display: 'block', width: '100%', marginTop: '12px', padding: '14px 18px', cursor: 'pointer',
      color: '#fff', font: `600 16px ${B.ui.fontFamily}`, borderRadius: '8px',
      border: primary ? '1px solid #ff9dcc' : '1px solid #65546d',
      background: primary ? 'linear-gradient(135deg, #a83e78, #6c397f)' : '#292230'
    });
    button.addEventListener('click', action);
    return button;
  };
  panel.append(
    heading,
    subtitle,
    makeButton('冒険を始める', () => {
      exploration.startFloor(save.currentRun.floor || 1);
      scheduleSave(save);
      closeTitle();
    }, true),
    makeButton('図鑑・回想部屋', () => openMenu('codex')),
    makeButton('拠点', () => openMenu('base')),
    makeButton('設定', () => openMenu('settings')),
    makeButton('デバッグ設定', () => {
      if (root.querySelector('[data-title-debug]')) return;
      const editor = openTitleDebugPanel({
        save,
        B,
        onClose: () => {
          scheduleSave(save);
          editor.remove();
        }
      });
      editor.dataset.titleDebug = 'true';
      root.append(editor);
    }),
    makeButton('チャームポイント設定', () => openCharmEditor())
  );
  root.append(panel);
  document.body.append(root);
  closeTitle = () => {
    if (!titleActive) return;
    titleActive = false;
    root.remove();
    clock.resume('title');
  };
}

// ---- メニュー（ステータス・図鑑・回想部屋・設定）----
function openMenu(tab = 'status') {
  if (gameMenu?.isOpen()) return;
  clock.pause('menu');
  gameMenu = openGameMenu({
    save, B, tab,
    loadPortrait: loadEnemyPortrait,
    onVolume: (volume) => audio.setVolume(volume),
    onSettings: () => {
      input.setBindings(save.settings.keyBindings);
      audio.setSpatialEnabled(save.settings.spatialAudio);
      scheduleSave(save);
    },
    onTestSe: () => audio.playSE('heartPop'),
    resistanceOf: (attr) => combat.eco.resistanceOf(attr),
    canUseItem: (id) => combat.eco.canUseItem(id) && timeMode.mode === 'TURN' && !titleActive,
    useItem: (id) => {
      if (titleActive || timeMode.mode !== 'TURN') return { ok: false, message: '冒険の最中にだけ使える' };
      const res = combat.eco.useItem(id);
      if (res.ok) pendingItemTurn = true;
      return res;
    },
    unequip: (slot) => combat.eco.unequip(slot),
    equipFromBag: (i) => combat.eco.equipFromBag(i),
    startRecollection,
    inSandbox: () => Boolean(save.sandboxBackup),
    endRecollection,
    runDebug: (id, opts) => {
      const res = debugAction(id, opts);
      floatLog.push({ text: res.message, color: res.ok ? 'cyan' : 'red', mark: '◇' });
      return res;
    },
    openDebugSettings: titleActive ? () => {
      const editor = openTitleDebugPanel({ save, B, onClose: () => { scheduleSave(save); editor.remove(); } });
      Object.assign(editor.style, { position: 'fixed', zIndex: '960' });
      document.body.append(editor);
    } : null,
    onClose: () => {
      gameMenu = null;
      clock.resume('menu');
      scheduleSave(save);
      // アイテムを使ったら、1ターン経つ
      if (pendingItemTurn) {
        pendingItemTurn = false;
        if (!combat.bound && !exploration.phaseBusy()) exploration.doWait();
      }
    }
  });
}

// ---- 回想部屋：模擬戦・敗北の回想。始める前の状態を取っておき、終わったら元に戻す（結果は残らない）----
function startRecollection(spec) {
  if (save.sandboxBackup) endRecollection();
  flushSave(save);
  Object.defineProperty(save, 'sandboxBackup', { value: JSON.stringify(save), configurable: true, writable: true, enumerable: false });
  save.persistent.debugSettings.priestCompanion = Boolean(spec.priest);
  const hs = save.currentRun.hero;
  hs.hp = hs.maxHp;
  hs.mp = hs.maxMp;
  exploration.arena = spec;
  exploration.startFloor(save.currentRun.floor || 1);
  closeTitle();
  bgm.play('explore');
  const enemies = exploration.units.filter((u) => u.kind === 'enemy');
  // 二人ずつ、絆を結んだ状態で始める（ユナイト攻撃の確認用）
  if (spec.preBond) {
    for (let i = 0; i + 1 < enemies.length; i += 2) {
      const [a, b] = [enemies[i], enemies[i + 1]];
      const attrs = rubAttrsOf(a.speciesId, b.speciesId);
      for (const [u, partner] of [[a, b], [b, a]]) {
        u.bondPartner = partner;
        u.bondAttrs = attrs;
        u.bondPower = B.pairBond.completePowerMul;
      }
    }
  }
  if (spec.startBond && enemies.length >= 2) combat.bonds.start(enemies[0], enemies[1]);
  // 敗北の回想：その敵が主人公のすぐ隣に現れ、あの技をもう一度使う
  if (spec.replaySkill && enemies[0]) {
    const e = enemies[0];
    const hero = exploration.hero;
    e.moveTo(hero.tx + 1, hero.ty);
    e.fromX = e.tx;
    e.fromY = e.ty;
    hero.setDir(1, 0);
    later(1.0, () => {
      if (!save.sandboxBackup || !exploration.units.includes(e)) return;
      e.choiceCooldown = 0;
      if (SKILL_DEFS_DEBUG[spec.replaySkill]?.category === 'bind') combat.startBound(e, spec.replaySkill);
      else combat.useSkill(e, spec.replaySkill, {});
    });
  }
  floatLog.push({ text: spec.replaySkill ? '回想：あの瞬間に戻ってきた……（結果は残らない）' : '模擬戦を始めた（結果は残らない・左上の階段で終了）', color: 'pink', mark: '♡', importance: 'major' });
}

function endRecollection() {
  if (!save.sandboxBackup) return;
  const data = JSON.parse(save.sandboxBackup);
  delete save.sandboxBackup;
  for (const key of Object.keys(save)) if (!(key in data)) delete save[key];
  Object.assign(save, data);
  exploration.arena = null;
  combat.climax.reset();
  combat.defeated = null;
  combat.harvest = null;
  if (timeMode.mode !== 'TURN') timeMode.leave();
  boundCharm.clear();
  bindRequest = null;
  audio.setMuffle(0);
  exploration.startFloor(save.currentRun.floor || 1);
  bgm.play('explore');
  refreshCorruption();
  flushSave(save);
  floatLog.push({ text: '回想を終えた。元の冒険に戻った', color: 'white', mark: '◇' });
}
// 商人ちゃんにぶつかると、店が開く
exploration.on('merchant', () => {
  if (shopView?.isOpen()) return;
  clock.pause('shop');
  shopView = openShop({
    save, B, eco: combat.eco,
    loadPortrait: loadEnemyPortrait,
    playSe: (id) => audio.playSE(id),
    onClose: () => {
      shopView = null;
      clock.resume('shop');
      scheduleSave(save);
    }
  });
});
exploration.on('arenaExit', ({ reason }) => {
  const text = { clear: '模擬戦：全員を倒した！', defeat: '模擬戦：負けてしまった……', exit: '模擬戦を終える' }[reason] ?? '';
  floatLog.push({ text, color: 'pink', mark: '♡' });
  later(reason === 'clear' ? 1.5 : 0.1, () => endRecollection());
});

function canExplore() {
  return !clock.paused && !boundPortraitLoading && timeMode.mode === 'TURN' && eventState.state === 'NONE';
}

// ---- 入力 ----
function handleInput() {
  if (titleActive) {
    input.drain();
    input.drainRaw();
    return;
  }
  if (recapView.active()) {
    input.drain();
    input.drainRaw();
    return;
  }
  if (enemyChoiceView.active()) {
    for (const event of input.drain()) {
      if (event.action === 'pause') clock.togglePause('esc');
    }
    input.drainRaw();
    return;
  }
  const exploreActions = [];
  for (const ev of input.drain()) {
    if (ev.action === 'pause') {
      clock.togglePause('esc');
      continue;
    }
    if (ev.action === 'log') {
      floatLog.toggleHistory();
      continue;
    }
    if (ev.action === 'menu') {
      openMenu('status');
      continue;
    }
    if (ev.action === 'items') {
      openMenu('bag');
      continue;
    }
    if (clock.paused) continue;
    if (timeMode.mode === 'BOUND') {
      if (!exploration.phaseBusy() && ev.action === 'struggle') combat.struggle();
      continue;
    }
    if (ev.action === 'map') {
      save.settings.showMinimap = !save.settings.showMinimap;
      scheduleSave(save);
      continue;
    }
    exploreActions.push(ev);
  }
  exploration.handleEvents(exploreActions, canExplore() && inputGate.canAct() && !exploration.phaseBusy());

  for (const code of input.drainRaw()) {
    // 拘束中のおねだりへの答え（1: 受け入れる / 2: 拒む / 3: お金を差し出す）
    if (bindRequest && combat.bound && !clock.paused && /^(Digit|Numpad)[123]$/.test(code)) {
      combat.answerBindRequest(code.endsWith('1') ? 'accept' : code.endsWith('2') ? 'refuse' : 'tribute');
      continue;
    }
    if (code === 'F3') debugHud.toggle();
    else if (debugHud.visible && code.startsWith('Digit')) runDebugKey(code);
  }
}

function debugAction(actionId, options = {}) {
  const result = runDebugAction(actionId, save, B, options);
  if (result.ok) scheduleSave(save);
  return result;
}

// ---- デバッグキー（F3 で表示中だけ有効）----
const SAMPLE_LOGS = [
  ['enemyLevelUp', { name: '小悪魔ちゃん', level: 7, gain: 3 }],
  ['raceAbilityGrow', { name: '小悪魔ちゃん', ability: '甘美なる吸引', level: 3 }],
  ['skillLearn', { name: '小悪魔ちゃん', source: '僧侶', skill: '桃色の吐息' }],
  ['loseHabitUp', { name: '小悪魔ちゃん', stage: 3 }],
  ['resistDown', { attr: '口', from: -6, to: -11 }],
  ['erosionUp', { gain: 20, value: 55 }],
  ['drainPulse', { victim: '主人公', amount: 6, dir: '右', name: '小悪魔ちゃん', attr: '口' }],
  ['uniteJoin', { name: '小悪魔ちゃん' }],
  ['allyRun', { ally: '僧侶' }],
  ['allyCaptured', { ally: '僧侶' }]
];
const SE_IDS = Object.keys(SE_TABLE);
let seIndex = 0;

// 演出確認：いちばん近い敵が、通常技 → 拘束 → 特殊技 → 上位技を順に使う
let debugSkillIndex = 0;
function debugCastNextSkill() {
  const hero = exploration.hero;
  const enemies = exploration.units.filter((u) => u.kind === 'enemy');
  if (!enemies.length || combat.bound || combat.choice || combat.director.busy()) return;
  const dist = (u) => Math.max(Math.abs(u.tx - hero.tx), Math.abs(u.ty - hero.ty));
  const e = enemies.sort((a, b) => dist(a) - dist(b))[0];
  const def = ENEMIES_BY_ID[e.speciesId];
  const list = [def.normalSkill, ...def.bindSkills, ...def.skills, def.advancedSkill].filter(Boolean);
  const skillId = list[debugSkillIndex % list.length];
  debugSkillIndex += 1;
  e.choiceCooldown = 0;
  floatLog.push({ text: `演出確認: ${e.name}「${combat.skillLabel(skillId, e)}」`, color: 'cyan', mark: '◇' });
  if (SKILL_DEFS_DEBUG[skillId]?.category === 'bind') {
    if (dist(e) > 1) {
      floatLog.push({ text: '拘束技は隣接している敵だけ確認できます', color: 'orange', mark: '!' });
      return;
    }
    combat.startBound(e, skillId);
  } else {
    combat.useSkill(e, skillId, {});
  }
}

function announceLearning(events) {
  for (const ev of events) {
    const name = ENEMIES_BY_ID[ev.raceId]?.name ?? ev.raceId;
    if (ev.kind === 'rememberSkill') {
      floatLog.pushKind('rememberSkill', { name, skill: DEFEAT_SKILLS[ev.skillId].name });
    } else if (ev.kind === 'markTierUp') {
      floatLog.pushKind('markTierUp', { name, tierName: MARK_TIER_NAMES[ev.tier] });
    }
  }
}

function runDebugKey(code) {
  switch (code) {
    case 'Digit1':   // ログの種類を一通り流す（1秒3行の制限を確認）
      for (const [kind, params] of SAMPLE_LOGS) floatLog.pushKind(kind, params);
      break;
    case 'Digit2':   // SEを順番に鳴らす
      audio.playSE(SE_IDS[seIndex]);
      floatLog.push({ text: `SE: ${SE_IDS[seIndex]}（${audio.state}）`, color: 'cyan', mark: '◇' });
      seIndex = (seIndex + 1) % SE_IDS.length;
      break;
    case 'Digit3':   // BOUND の入退場
      if (timeMode.mode === 'BOUND') timeMode.leave();
      else timeMode.enterBound();
      break;
    case 'Digit4':   // DECISION（8秒。時間切れで最悪の選択肢を自動実行する想定）
      timeMode.enterDecision({
        onTimeout: () => floatLog.push({
          text: '時間切れ：最も不利な選択肢を自動実行', color: 'red', mark: '■', importance: 'major'
        })
      });
      break;
    case 'Digit5':   // 大イベントのロック
      if (eventState.state === 'NONE') eventState.request('CHARM_EVENT', 'debug', clock.time);
      else eventState.release('debug', clock.time);
      break;
    case 'Digit6':   // 絶頂（大イベント中なら、終了後に移る）
      if (eventState.state === 'HERO_CLIMAX') eventState.release('climax', clock.time);
      else eventState.request('HERO_CLIMAX', 'climax', clock.time);
      break;
    case 'Digit7':   // 同じ行を連続で流す（×N にまとまる）
      for (let i = 0; i < 5; i++) floatLog.pushKind('uniteJoin', { name: '小悪魔ちゃん' });
      break;
    case 'Digit8':   // セーブ（リロードして残るか確認）
      floatLog.push({ text: saveNow(save) ? 'セーブしました' : 'セーブに失敗しました', color: 'white', mark: '◇' });
      break;
    case 'Digit0':   // 近くの敵に、技を順番に使わせる（演出の確認用）
      debugCastNextSkill();
      break;
    case 'Digit9': { // 敗北を1回記録（技の記憶とカモ度）
      recordEncounter(save.persistent, 'kitten', save.persistent.runCount);
      const events = recordDefeat(save.persistent, {
        causeRaceId: 'kitten',
        skillId: 'levelDrainKiss',
        defeatType: 'beatenDown',
        presentRaceIds: ['kitten', 'dancer'],
        run: save.persistent.runCount,
        floor: save.currentRun.floor
      }, B);
      announceLearning(events);
      scheduleSave(save);
      break;
    }
    default:
      break;
  }
}

// ---- 描画 ----
function logRect() {
  const { logicalWidth: w, logicalHeight: h } = B.render;
  return { x: 0, y: 0, w, h };
}

function debugLines() {
  const kittenScore = getMarkScore(save.persistent, 'kitten');
  const decisionText = timeMode.mode === 'DECISION' ? ` 残り ${(timeMode.decisionRatio * 100).toFixed(0)}%` : '';
  const boundText = timeMode.mode === 'BOUND'
    ? ` ターン ${timeMode.bound.ticks}（次まで ${(timeMode.boundTickProgress * 100).toFixed(0)}%）`
    : '';
  return [
    `時間 ${clock.time.toFixed(1)}s  ポーズ ${clock.paused ? [...clock.reasons].join(',') : 'なし'}`,
    `モード ${timeMode.mode}${decisionText}${boundText}`,
    `イベント ${eventState.state}（所有者 ${eventState.ownerId ?? '-'}）  MP下限 ${eventState.mpFloor()}  終了待ち絶頂 ${eventState.pendingClimax}`,
    `音 ${audio.state}  同時発音 ${audio.voices.length}  SEファイル ${audio.buffers.size}件`,
    `ログ 表示 ${floatLog.lines.length}  待ち ${floatLog.queue.length}`,
    `kitten カモ度 ${kittenScore}（${MARK_TIER_NAMES[markTier(kittenScore, B)]}）`,
    `探索 ${save.currentRun.floor}F 位置(${exploration.hero.tx},${exploration.hero.ty}) ターン ${exploration.turnCount} 敵 ${exploration.units.filter((u) => u.kind === 'enemy').length} シード ${save.currentRun.seed}`,
    `拡大 ${layers.scale.toFixed(2)}倍  hires ${layers.hires.width}x${layers.hires.height}`,
    '',
    '1:ログ一式  2:SE順送り  3:BOUND切替  4:DECISION  5:イベントロック',
    '6:絶頂  7:同じ行を連続  8:セーブ  9:敗北を記録  0:近くの敵の技を順に確認  L:履歴  ESC:ポーズ'
  ];
}

function drawPauseText(g) {
  g.save();
  g.font = `bold 40px ${B.ui.fontFamily}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 6;
  g.strokeStyle = 'rgba(0, 0, 0, 0.9)';
  g.fillStyle = '#ffffff';
  const x = B.render.logicalWidth / 2;
  const y = B.render.logicalHeight / 2;
  g.strokeText('ポーズ（ESCで再開）', x, y);   // 暗転は使わない（3.4）
  g.fillText('ポーズ（ESCで再開）', x, y);
  g.font = `bold 18px ${B.ui.fontFamily}`;
  g.strokeText('M：メニュー（ステータス・図鑑・回想部屋・設定）', x, y + 44);
  g.fillText('M：メニュー（ステータス・図鑑・回想部屋・設定）', x, y + 44);
  g.restore();
}

function drawBoundGauge(g) {
  const bound = combat.bound;
  if (!bound) return;
  const width = 500;
  const height = 18;
  const x = (B.render.logicalWidth - width) / 2;
  const y = B.render.logicalHeight - 50;
  const ratio = bound.requiredClicks > 0 ? clamp(bound.escapeProgress / bound.requiredClicks, 0, 1) : 0;
  const locked = combat.climax.escapeLocked();
  g.save();
  g.fillStyle = 'rgba(12, 8, 18, 0.88)';
  g.fillRect(x - 18, y - 31, width + 36, 58);
  g.strokeStyle = 'rgba(255, 222, 242, 0.85)';
  g.lineWidth = 2;
  g.strokeRect(x - 18, y - 31, width + 36, 58);
  g.font = `bold 15px ${B.ui.fontFamily}`;
  g.textAlign = 'center';
  g.textBaseline = 'bottom';
  g.fillStyle = '#fff2f8';
  g.fillText(locked ? '脱出できない' : `脱出進捗  ${Math.round(ratio * 100)}%`, B.render.logicalWidth / 2, y - 7);
  g.fillStyle = 'rgba(0, 0, 0, 0.85)';
  g.fillRect(x, y, width, height);
  g.fillStyle = locked ? '#8d6379' : '#ff79b7';
  g.fillRect(x, y, width * ratio, height);
  g.restore();
}

// 拘束の陣形：ふさがれた側の画面の縁が、鼓動のようにピンクに脈打つ。脱出ゲージの上に陣形の名前を出す
function drawBindFormation(g) {
  const f = bindFormation;
  if (!f || !combat.bound) return;
  const { logicalWidth: lw, logicalHeight: lh } = B.render;
  const beat = 0.5 + 0.5 * Math.pow(Math.max(0, Math.sin(clock.time * 5.2)), 3);
  const color = f.active[f.active.length - 1].color;
  const depth = 150;
  const edges = {
    left: [0, 0, depth, 0, 0, 0, depth, lh],
    right: [lw, 0, lw - depth, 0, lw - depth, 0, depth, lh],
    top: [0, 0, 0, depth, 0, 0, lw, depth],
    bottom: [0, lh, 0, lh - depth, 0, lh - depth, lw, depth]
  };
  g.save();
  for (const side of f.edges) {
    const [x0, y0, x1, y1, rx, ry, rw, rh] = edges[side];
    const grad = g.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, `${color}${Math.round((0.35 + 0.25 * beat) * 255).toString(16).padStart(2, '0')}`);
    grad.addColorStop(1, `${color}00`);
    g.fillStyle = grad;
    g.fillRect(rx, ry, rw, rh);
  }
  g.font = `bold 15px ${B.ui.fontFamily}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  const labels = f.active.map((a) => `【${a.name}】`).join(' ');
  const y = lh - 100;
  g.lineWidth = 4;
  g.strokeStyle = 'rgba(40, 0, 25, 0.9)';
  g.shadowColor = color;
  g.shadowBlur = 10 + 8 * beat;
  g.fillStyle = '#ffe3f2';
  g.strokeText(labels, lw / 2, y);
  g.fillText(labels, lw / 2, y);
  g.restore();
}

// 拘束中のおねだり：脱出ゲージの上に、台詞と答え方と残り時間を出す
function drawBindRequest(g) {
  const req = bindRequest;
  if (!req || !combat.bound) return;
  const theme = combat.theme(req.unit);
  const { logicalWidth: lw, logicalHeight: lh } = B.render;
  const w = 720;
  const h = 92;
  const x = (lw - w) / 2;
  const y = lh - 228;
  const left = Math.max(0, 1 - req.age / req.timeoutSec);
  const appear = Math.min(1, req.age / 0.2);
  g.save();
  g.globalAlpha = appear;
  g.fillStyle = 'rgba(30, 6, 30, 0.9)';
  g.beginPath();
  g.roundRect(x, y, w, h, 14);
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = theme.main;
  g.shadowColor = theme.main;
  g.shadowBlur = 14;
  g.stroke();
  g.shadowBlur = 0;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.font = `bold 13px ${B.ui.fontFamily}`;
  g.fillStyle = theme.glow;
  g.fillText(`♡ ${req.unit.name}のおねだり`, x + 16, y + 16);
  g.font = `bold 18px ${B.ui.fontFamily}`;
  g.fillStyle = '#fff0f7';
  g.fillText(`「${req.line}」`, x + 16, y + 42, w - 32);
  g.font = `bold 14px ${B.ui.fontFamily}`;
  g.fillStyle = theme.main;
  g.fillText('1 受け入れる', x + 16, y + 72);
  g.fillStyle = '#d9c6e6';
  g.fillText('2 拒む（強く吸われる）', x + 128, y + 72);
  const gold = save.currentRun.gold;
  g.fillStyle = gold >= B.tribute.min ? '#ffd36b' : '#7d6a5a';
  g.fillText(`3 貢ぐ（${Math.max(B.tribute.min, Math.round(gold * B.tribute.rate))}G・脱出が進む）`, x + 300, y + 72);
  g.fillStyle = 'rgba(0, 0, 0, 0.6)';
  g.fillRect(x + w - 166, y + 66, 150, 10);
  g.fillStyle = theme.main;
  g.fillRect(x + w - 166, y + 66, 150 * left, 10);
  g.restore();
}

// ずるっこ悪魔ちゃんの罠：足元に、脈打つハートの魔法陣（見えているマスだけ）
function drawTraps(g) {
  const traps = exploration.traps ?? [];
  if (!traps.length) return;
  const T = B.tile.size;
  const t = clock.time;
  g.save();
  for (const trap of traps) {
    if (!exploration.map.isVisible(trap.x, trap.y)) continue;
    const p = battleFx.toScreen(trap.x * T + T / 2, trap.y * T + T - 10);
    const pulse = 0.55 + 0.45 * Math.sin(t * 4 + trap.x);
    g.save();
    g.translate(p.x, p.y);
    g.scale(1, 0.42);
    g.globalAlpha = 0.35 + 0.35 * pulse;
    g.strokeStyle = trap.color;
    g.lineWidth = 3;
    g.shadowColor = trap.color;
    g.shadowBlur = 10;
    g.beginPath();
    g.arc(0, 0, 22, 0, Math.PI * 2);
    g.stroke();
    g.rotate(t * 1.5);
    g.beginPath();
    g.moveTo(0, 9);
    g.bezierCurveTo(-14, 0, -10, -11, 0, -4);
    g.bezierCurveTo(10, -11, 14, 0, 0, 9);
    g.stroke();
    g.restore();
  }
  g.restore();
}

// 敵どうしの絆：二人の間に、ハートのゲージと残り秒数。完遂した二人は、ハートの糸でつながって見える
function drawPairBonds(g) {
  const bonds = combat.bonds;
  const t = clock.time;
  g.save();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const pair of bonds.active) {
    if (!exploration.map.isVisible(pair.a.tx, pair.a.ty) && !exploration.map.isVisible(pair.b.tx, pair.b.ty)) continue;
    const mid = bonds.mid(pair);
    const p = battleFx.toScreen(mid.x, mid.y - 112);
    const k = bonds.progress(pair);
    const ta = combat.theme(pair.a);
    const tb = combat.theme(pair.b);
    const beat = 1 + 0.08 * Math.pow(Math.max(0, Math.sin(t * (4 + 4 * k))), 4);
    const r = 17 * beat;
    // ハートの外枠と、下から満ちていく中身
    const heart = () => {
      g.beginPath();
      g.moveTo(0, r * 0.9);
      g.bezierCurveTo(-r * 0.2, r * 0.7, -r * 1.1, r * 0.1, -r * 1.05, -r * 0.35);
      g.bezierCurveTo(-r * 1.0, -r * 1.0, -r * 0.2, -r * 1.05, 0, -r * 0.45);
      g.bezierCurveTo(r * 0.2, -r * 1.05, r * 1.0, -r * 1.0, r * 1.05, -r * 0.35);
      g.bezierCurveTo(r * 1.1, r * 0.1, r * 0.2, r * 0.7, 0, r * 0.9);
      g.closePath();
    };
    g.save();
    g.translate(p.x, p.y);
    g.fillStyle = 'rgba(30, 6, 30, 0.75)';
    heart();
    g.fill();
    g.save();
    heart();
    g.clip();
    const grad = g.createLinearGradient(-r, 0, r, 0);
    grad.addColorStop(0, ta.main);
    grad.addColorStop(1, tb.main);
    g.fillStyle = grad;
    g.fillRect(-r * 1.2, r * 0.95 - r * 1.95 * k, r * 2.4, r * 1.95 * k);
    g.restore();
    g.lineWidth = 2;
    g.strokeStyle = '#ffe3f2';
    g.shadowColor = ta.main;
    g.shadowBlur = 8 + 8 * k;
    heart();
    g.stroke();
    g.shadowBlur = 0;
    g.font = `bold 13px ${B.ui.fontFamily}`;
    g.lineJoin = 'round';
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(40, 0, 25, 0.9)';
    const label = `${Math.ceil(bonds.remainingSec(pair))}s`;
    g.fillStyle = '#ffffff';
    g.strokeText(label, 0, r + 12);
    g.fillText(label, 0, r + 12);
    // 段階の印（♡ が満ちるごとに増える）
    const marks = '♥'.repeat(pair.stage) + '♡'.repeat(B.pairBond.stages.length + 1 - pair.stage);
    g.font = `bold 11px ${B.ui.fontFamily}`;
    g.fillStyle = ta.glow;
    g.strokeText(marks, 0, -r - 10);
    g.fillText(marks, 0, -r - 10);
    g.restore();
  }
  // 絆を結んだ二人（ユナイト攻撃の準備ができている）
  const drawn = new Set();
  for (const u of exploration.units) {
    const partner = u.bondPartner;
    if (u.kind !== 'enemy' || !partner || drawn.has(partner) || !exploration.units.includes(partner)) continue;
    drawn.add(u);
    if (!exploration.map.isVisible(u.tx, u.ty) || !exploration.map.isVisible(partner.tx, partner.ty)) continue;
    const a = battleFx.toScreen(combat.body(u).x, combat.head(u).y - 4);
    const b = battleFx.toScreen(combat.body(partner).x, combat.head(partner).y - 4);
    const th = combat.theme(u);
    g.save();
    g.globalAlpha = 0.55 + 0.25 * Math.sin(t * 3);
    g.strokeStyle = th.main;
    g.lineWidth = 2;
    g.setLineDash([3, 6]);
    g.lineDashOffset = -t * 20;
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.quadraticCurveTo((a.x + b.x) / 2, Math.min(a.y, b.y) - 30, b.x, b.y);
    g.stroke();
    g.setLineDash([]);
    g.font = `bold 14px ${B.ui.fontFamily}`;
    g.fillStyle = th.main;
    g.fillText('♥', (a.x + b.x) / 2, Math.min(a.y, b.y) - 18);
    g.restore();
  }
  g.restore();
}

// 所持金（HP・MP の下）
function drawGold(g) {
  g.save();
  g.font = `bold 14px ${B.ui.fontFamily}`;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 3;
  g.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  g.fillStyle = '#ffd36b';
  const text = `所持金 ${save.currentRun.gold}G`;
  g.strokeText(text, 18, 88);
  g.fillText(text, 18, 88);
  g.restore();
}

// 商人ちゃんの名札（ぶつかると店が開く）
function drawNpcLabels(g) {
  const m = exploration.merchant;
  if (!m || !exploration.units.includes(m) || !exploration.map.isVisible(m.tx, m.ty)) return;
  const p = battleFx.toScreen(combat.body(m).x, combat.head(m).y - 18);
  g.save();
  g.font = `bold 14px ${B.ui.fontFamily}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 4;
  g.strokeStyle = 'rgba(40, 10, 20, 0.9)';
  g.fillStyle = '#ffd36b';
  const bob = Math.sin(clock.time * 3) * 2;
  g.strokeText('♡ 商人ちゃんの店', p.x, p.y + bob);
  g.fillText('♡ 商人ちゃんの店', p.x, p.y + bob);
  g.restore();
}

// まだ入っていない大広間から、桃色の霧が漏れて見える
function drawHallMist(g) {
  const halls = exploration.halls ?? [];
  if (!halls.length) return;
  const T = B.tile.size;
  const t = clock.time;
  g.save();
  for (const hall of halls) {
    if (hall.sprung) continue;
    let seen = false;
    for (let y = hall.y; y < hall.y + hall.h && !seen; y += 2) {
      for (let x = hall.x; x < hall.x + hall.w; x += 2) {
        if (exploration.map.isVisible(x, y)) {
          seen = true;
          break;
        }
      }
    }
    if (!seen) continue;
    for (let i = 0; i < 9; i++) {
      const fx = hall.x + hall.w * (0.15 + 0.7 * ((i * 0.37 + Math.sin(t * 0.13 + i) * 0.08 + 1) % 1));
      const fy = hall.y + hall.h * (0.2 + 0.6 * ((i * 0.61 + Math.cos(t * 0.11 + i * 1.7) * 0.08 + 1) % 1));
      const p = battleFx.toScreen(fx * T, fy * T);
      const r = T * (1.6 + 0.6 * Math.sin(t * 0.7 + i));
      const grad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      grad.addColorStop(0, `rgba(255, 140, 200, ${(0.16 + 0.06 * Math.sin(t * 1.3 + i)).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(255, 140, 200, 0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(p.x, p.y, r, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.restore();
}

function render() {
  const { gPixel, gHires } = beginFrame(layers, B);
  dungeonView.draw(gPixel, exploration, battleFx.offset);
  battleFx.drawTint(gHires);
  crest.drawVignette(gHires);
  drawHallMist(gHires);
  drawTraps(gHires);
  flashbackFx.drawArt(gHires);
  drainFx.drawEdge(gHires);
  drawEnemyLabels(gHires, dungeonView, save.persistent, B, clock.time);
  drawPairBonds(gHires);
  drawNpcLabels(gHires);
  battleFx.drawWorld(gHires);
  skillHud.drawFlash(gHires);
  battleFx.drawScreen(gHires);
  heartFx.draw(gHires);
  kissMarks.draw(gHires);
  if (save.settings.showMinimap) drawMinimap(gHires, exploration, B);
  drawExploreHud(gHires, exploration, B);
  levelHud.draw(gHires, combat.hs, B.ui.fontFamily);
  drawGold(gHires);
  boundCharm.draw(gHires);
  drainFx.drawParticles(gHires);
  drawStatusPanel(
    gHires,
    buildStatusEntries({
      buffs: combat.buffs.entries(),
      afterglowTurns: combat.climax.afterglowLeft,
      erectTurns: combat.flashback.erectTurnsLeft(),
      erectTotalTurns: combat.flashback.erectTotalTurns(),
      buffTurns: B.buffs.durationTurns
    }).concat(combat.conditions.entries()),
    { width: B.render.logicalWidth, height: B.render.logicalHeight, fontFamily: B.ui.fontFamily }
  );
  drawPartyPanel(gHires, exploration, B);
  crest.draw(gHires, B.ui.fontFamily);
  skillHud.drawBanner(gHires);
  flashbackFx.drawOverlay(gHires);
  const minimapBottom = 16 + exploration.map.h * B.explore.minimapScale + 24;
  drawDebuffPanel(gHires, save.persistent, B, {
    time: clock.time,
    top: save.settings.showMinimap ? minimapBottom : 24,
    animate: save.settings.flashback !== 'reduced'
  });
  floatLog.draw(gHires, logRect());
  debugHud.draw(gHires, debugLines());
  drawBindFormation(gHires);
  drawBindRequest(gHires);
  drawBoundGauge(gHires);
  if (clock.paused) drawPauseText(gHires);
}

// ---- メインループ ----
function loop(nowMs) {
  requestAnimationFrame(loop);
  const dt = clock.tick(nowMs);
  debugHud.update(clock.realDtSec);
  inputGate.update(dt);
  handleInput();
  timeMode.update(dt);
  if (timeMode.mode === 'BOUND') {
    combat.boundUpdate(dt);
    if (combat.defeated) exploration.handleDefeat();
  }
  combat.climax.update(dt);
  if (!titleActive && !combat.defeated) combat.bonds.update(dt);
  combat.flashback.update(dt);
  enemyChoiceView.update(dt);
  eventState.update(clock.time);
  combat.director.update(dt);
  skillHud.update(dt);
  exploration.updatePhase();
  exploration.update(dt, input, canExplore() && inputGate.canAct() && !exploration.phaseBusy());
  dungeonView.update(dt, exploration);
  battleFx.update(dt);
  flashbackFx.update(dt);
  drainFx.update(dt);
  heartbeat.update(dt, {
    mpRatio: heroMpRatio(),
    climax: combat.climax.isClimax(),
    enabled: save.settings.lowMpHeartbeat !== false && combat.hs.hp > 0 && !combat.defeated
  });
  boundCharm.update(dt);
  levelHud.update(dt, combat.hs);
  crest.update(dt);
  recapView.update(clock.realDtSec);
  heartFx.update(dt);
  kissMarks.update(dt);
  floatLog.update(dt);
  render();
}
requestAnimationFrame(loop);

// 開発中は、コンソールから触れるようにする
if (import.meta.env?.DEV) {
  window.__game = { B, save, clock, audio, eventState, timeMode, floatLog, exploration, combat, openShop: () => exploration.emit('merchant'), openMenu, startRecollection, endRecollection, openCharmEditor, debug: debugAction, DEBUG_ACTIONS };
}
