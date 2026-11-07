// File: src/main.js
import { B } from './data/balance.js';
import { SE_TABLE } from './data/seTable.js';
import { flashbackSeFor } from './data/flashbackData.js';
import { ENEMIES, ENEMIES_BY_ID, ATTRS } from './data/enemies.js';
import { getCharmPointsForAttr, getCharmPoints, setCharmPoints, resetCharmPoint } from './data/charmPoint.js';
import { DEFEAT_SKILLS } from './data/defeatSkills.js';
import { loadSave, saveNow, scheduleSave, flushSave, saveCharmPointsNow } from './core/storage.js';
import { createLayers, fitLayers, beginFrame, clientToLogical } from './core/renderScale.js';
import { GameClock } from './core/timer.js';
import { Input } from './core/input.js';
import { EventState } from './core/eventState.js';
import { TimeMode } from './core/timeMode.js';
import { AudioEngine } from './core/audio.js';
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
import { drawDebuffPanel } from './ui/debuffPanel.js';
import { buildStatusEntries, drawStatusPanel } from './ui/statusPanel.js';
import { SkillHud } from './ui/skillHud.js';
import {
  recordDefeat, getMarkScore, markTier, MARK_TIER_NAMES, recordEncounter
} from './battle/learning.js';

// ---- 初期化 ----
const save = loadSave();
const clock = new GameClock();
const audio = new AudioEngine(B);
audio.setVolume(save.settings.volume);
audio.setSpatialEnabled(save.settings.spatialAudio);

const eventState = new EventState(B);
const timeMode = new TimeMode(B, () => save.settings);
const floatLog = new FloatLog(B, { onSE: (id) => id && audio.playSE(id) });
const debugHud = new DebugHud();
const exploration = new Exploration(B, save);
const dungeonView = new DungeonView(B);
dungeonView.preload(['hero', 'priest', 'kitten', 'blackRibbon', 'pinkFox']);

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
const unlockAudio = () => audio.unlock();
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
const charmCfg = {
  ...B.charm,
  get centerTransparency() {
    return save.settings.charmCenterTransparency ?? B.charm.centerTransparency;
  }
};
async function loadEnemyPortrait(speciesId) {
  await preloadPortrait(speciesId);
  return getPortrait(speciesId);
}
async function attachFlashbackArt(id, speciesId, attr, skillId, tx, ty) {
  try {
    const hero = exploration.hero;
    const side = bindSideOf(tx - hero.tx, ty - hero.ty, hero.dir);
    const img = await loadEnemyPortrait(speciesId);
    if (!img) return;
    const point = getCharmPointsForAttr(save.persistent, speciesId, attr, B.charm, skillId)[0];
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
  getPoint: (speciesId, attr, skillId) => getCharmPointsForAttr(save.persistent, speciesId, attr, B.charm, skillId),
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
combat.on('anim', ({ unit, tag, delay = 0 }) =>
  later(delay, () => dungeonView.viewFor(unit).play(tag, { once: !['bound', 'bind_down', 'bind_side'].includes(tag) }))
);
combat.on('se', ({ id, tx, ty, delay = 0, behind = false, gain = 1, ally = false, params = {} }) =>
  later(delay, () => {
    const position = spatialAudioOptions(tx, ty);
    audio.playSE(id, {
      ...position,
      gain,
      ally,
      params,
      behind: behind || position.behind
    });
  })
);
combat.on('log', (kind, params) => floatLog.pushKind(kind, params));
combat.on('drainPulse', ({ strength = 1, delay = 0 }) =>
  later(delay, () => drainFx.pulse(strength))
);
combat.on('enemyExperience', ({ enemy, amount }) => {
  if (combat.bound?.binders.some((binder) => binder.unit === enemy) && boundCharm.addExpPopup(enemy, amount)) return;
  const pos = combat.body(enemy);
  battleFx.handle({ type: 'damage', x: pos.x, y: combat.head(enemy).y - 18, text: `+${Math.max(1, Math.round(amount))} EXP`, style: 'info' });
});
combat.on('learning', (events) => announceLearning(events));
combat.on('persist', () => {
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
  boundCharm.clear();
  if (timeMode.mode === 'BOUND') timeMode.leave();
});
timeMode.on('boundSecond', () => {
  combat.boundSecond();
  // 絶頂開始時のHPドレインで倒れた場合は、通常ターン処理を通らないためここで敗北処理を行う。
  if (combat.defeated) exploration.handleDefeat();
});
timeMode.on('boundTick', () => exploration.boundTick());

exploration.on('floorStart', ({ floor, total }) => {
  kissMarks.clearNow();
  floatLog.push({ text: `${floor}階（全${total}階）`, color: 'white', mark: '◇' });
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
});
exploration.on('stunned', () => floatLog.pushKind('stunned'));
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
      hand: '手'
    },
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
      titleActive = false;
      root.remove();
      clock.resume('title');
    }, true),
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
}

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
  ['enemyLevelUp', { name: '小悪魔ちゃん', level: 7 }],
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
    '6:絶頂  7:同じ行を連続  8:セーブ  9:敗北を記録  L:履歴  ESC:ポーズ'
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

function render() {
  const { gPixel, gHires } = beginFrame(layers, B);
  dungeonView.draw(gPixel, exploration, battleFx.offset);
  battleFx.drawTint(gHires);
  flashbackFx.drawArt(gHires);
  drainFx.drawEdge(gHires);
  drawEnemyLabels(gHires, dungeonView, save.persistent, B);
  battleFx.drawWorld(gHires);
  skillHud.drawFlash(gHires);
  heartFx.draw(gHires);
  kissMarks.draw(gHires);
  if (save.settings.showMinimap) drawMinimap(gHires, exploration, B);
  drawExploreHud(gHires, exploration, B);
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
    }),
    { width: B.render.logicalWidth, height: B.render.logicalHeight, fontFamily: B.ui.fontFamily }
  );
  drawPartyPanel(gHires, exploration, B);
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
  combat.climax.update(dt);
  combat.flashback.update(dt);
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
  heartFx.update(dt);
  kissMarks.update(dt);
  floatLog.update(dt);
  render();
}
requestAnimationFrame(loop);

// 開発中は、コンソールから触れるようにする
if (import.meta.env?.DEV) {
  window.__game = { B, save, clock, audio, eventState, timeMode, floatLog, exploration, debug: debugAction, DEBUG_ACTIONS };
}
