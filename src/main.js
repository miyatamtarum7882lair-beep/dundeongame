// File: src/main.js
import { B } from './data/balance.js';
import { SE_TABLE } from './data/seTable.js';
import { flashbackSeFor } from './data/flashbackData.js';
import { ENEMIES_BY_ID, ATTRS } from './data/enemies.js';
import { DEFEAT_SKILLS } from './data/defeatSkills.js';
import { loadSave, saveNow, scheduleSave, flushSave } from './core/storage.js';
import { createLayers, fitLayers, beginFrame, clientToLogical } from './core/renderScale.js';
import { GameClock } from './core/timer.js';
import { Input } from './core/input.js';
import { EventState } from './core/eventState.js';
import { TimeMode } from './core/timeMode.js';
import { AudioEngine } from './core/audio.js';
import { runDebugAction, DEBUG_ACTIONS } from './core/debugTools.js';
import { clamp } from './core/util.js';
import { FloatLog } from './ui/floatLog.js';
import { DebugHud } from './ui/debugHud.js';
import { Exploration } from './dungeon/exploration.js';
import { DungeonView } from './ui/dungeonView.js';
import { drawMinimap } from './ui/minimap.js';
import { drawExploreHud } from './ui/exploreHud.js';
import { getPortrait, initPortraitLoader, preloadPortrait, releasePortrait } from './ui/portraitLoader.js';
import { HeartFx, loadHeartOverrides } from './ui/heartFx.js';
import { KissMarkLayer, loadKissmarkOverrides } from './ui/kissmark.js';
import { BattleFx } from './ui/battleFx.js';
import { drawEnemyLabels } from './ui/enemyLabels.js';
import { drawPartyPanel } from './ui/partyPanel.js';
import { drawDebuffPanel } from './ui/debuffPanel.js';
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
const boundPortraitIds = new Set();
let boundPortraitLoading = false;
function syncBoundPortraits(binders) {
  const nextIds = new Set(binders.map((unit) => unit.speciesId));
  const loading = [];
  for (const id of nextIds) {
    if (boundPortraitIds.has(id)) continue;
    boundPortraitIds.add(id);
    loading.push(preloadPortrait(id));
  }
  for (const id of boundPortraitIds) {
    if (nextIds.has(id)) continue;
    boundPortraitIds.delete(id);
    releasePortrait(id);
  }
  return Promise.all(loading);
}
const later = (sec, fn) => (sec > 0 ? clock.after(sec, fn) : fn());
function spatialAudioOptions(tx, ty) {
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) {
    return { pan: 0, vertical: 0, behind: false };
  }
  const hero = exploration.hero;
  const length = Math.hypot(hero.dir.dx, hero.dir.dy) || 1;
  const dx = tx - hero.tx;
  const dy = ty - hero.ty;
  const right = (dx * -hero.dir.dy + dy * hero.dir.dx) / length;
  const forward = (dx * hero.dir.dx + dy * hero.dir.dy) / length;
  const vertical = clamp(forward / (Math.hypot(dx, dy) || 1), -1, 1);
  return {
    pan: clamp(right / B.spatial.fadeTiles, -1, 1) * B.spatial.panStrength,
    vertical,
    behind: vertical <= B.spatial.behindDot
  };
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
combat.on('learning', (events) => announceLearning(events));
combat.on('persist', () => scheduleSave(save));
combat.on('flashback', ({ id, attr }) => {
  if (save.settings.flashback === 'off') return;
  const enemy = exploration.units.find((unit) => unit.speciesId === id);
  const position = spatialAudioOptions(enemy?.tx, enemy?.ty);
  audio.playSE('flashback');
  const seId = flashbackSeFor(attr);
  if (seId) audio.playSE(seId, position);
});
combat.on('boundStart', () => {
  boundPortraitLoading = true;
  void (async () => {
    try {
      await syncBoundPortraits(combat.bound?.binders.map((b) => b.unit) ?? []);
    } catch (error) {
      console.error('拘束画像の読み込みに失敗しました', error);
    } finally {
      boundPortraitLoading = false;
      if (combat.bound) timeMode.enterBound();
    }
  })();
});
combat.on('boundChanged', ({ binders }) => {
  void syncBoundPortraits(binders).catch((error) => {
    console.error('拘束画像の読み込みに失敗しました', error);
  });
});
combat.on('boundEnd', () => {
  syncBoundPortraits([]);
  if (timeMode.mode === 'BOUND') timeMode.leave();
});
timeMode.on('boundSecond', () => combat.boundSecond());
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

function canExplore() {
  return !clock.paused && !boundPortraitLoading && timeMode.mode === 'TURN' && eventState.state === 'NONE';
}

// ---- 入力 ----
function handleInput() {
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
      if (ev.action === 'struggle') combat.struggle();
      continue;
    }
    if (ev.action === 'map') {
      save.settings.showMinimap = !save.settings.showMinimap;
      scheduleSave(save);
      continue;
    }
    exploreActions.push(ev);
  }
  exploration.handleEvents(exploreActions, canExplore());

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
  // 拘束中は、一枚絵パネルを避けて、マップ側の範囲に出す
  const width = timeMode.mode === 'BOUND' || boundPortraitLoading
    ? w * (1 - B.boundPanel.widthRatio)
    : w;
  return { x: 0, y: 0, w: width, h };
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

function drawBoundHud(g) {
  const bound = combat.bound;
  if ((timeMode.mode !== 'BOUND' && !boundPortraitLoading) || !bound) return;
  const { logicalWidth: w, logicalHeight: h } = B.render;
  const x = Math.round(w * (1 - B.boundPanel.widthRatio));
  const panelW = w - x;
  const pad = 20;
  const barW = panelW - pad * 2;
  const escapeRatio = bound.escapeProgress / bound.requiredClicks;
  const mpRatio = save.currentRun.hero.mp / save.currentRun.hero.maxMp;

  g.save();
  g.fillStyle = 'rgba(24, 12, 28, 0.88)';
  g.fillRect(x, 0, panelW, h);
  g.strokeStyle = 'rgba(255, 170, 212, 0.75)';
  g.lineWidth = 2;
  g.strokeRect(x + 1, 1, panelW - 2, h - 2);
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillStyle = '#ffe3f1';
  g.font = `bold 25px ${B.ui.fontFamily}`;
  g.fillText(`拘束中（${bound.binders.length}人）`, x + pad, 26);

  const cardTop = 72;
  const cardBottom = 412;
  const gap = 8;
  const columns = bound.binders.length === 1 ? 1 : 2;
  const rows = Math.ceil(bound.binders.length / columns);
  const cardW = (barW - gap * (columns - 1)) / columns;
  const cardH = (cardBottom - cardTop - gap * (rows - 1)) / rows;
  bound.binders.forEach(({ unit, attr }, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const cx = x + pad + col * (cardW + gap);
    const cy = cardTop + row * (cardH + gap);
    const def = ENEMIES_BY_ID[unit.speciesId];
    const image = getPortrait(unit.speciesId);
    const attrInfo = ATTRS[attr] ?? ATTRS[def?.attr] ?? ATTRS.all;

    g.fillStyle = 'rgba(255, 220, 237, 0.08)';
    g.fillRect(cx, cy, cardW, cardH);
    g.strokeStyle = attrInfo.color;
    g.lineWidth = 2;
    g.strokeRect(cx + 1, cy + 1, cardW - 2, cardH - 2);
    g.save();
    g.beginPath();
    g.rect(cx + 3, cy + 3, cardW - 6, cardH - 30);
    g.clip();
    if (image?.width && image?.height) {
      const maxW = cardW - 12;
      const maxH = cardH - 36;
      const scale = Math.min(maxW / image.width, maxH / image.height);
      const drawW = image.width * scale;
      const drawH = image.height * scale;
      g.drawImage(image, cx + (cardW - drawW) / 2, cy + (cardH - 30 - drawH) / 2, drawW, drawH);
    } else {
      const centerX = cx + cardW / 2;
      const centerY = cy + (cardH - 24) / 2;
      const silhouette = g.createLinearGradient(centerX, cy, centerX, cy + cardH - 30);
      silhouette.addColorStop(0, 'rgba(255, 178, 215, 0.32)');
      silhouette.addColorStop(1, 'rgba(116, 37, 89, 0.18)');
      g.fillStyle = silhouette;
      g.beginPath();
      g.ellipse(centerX, centerY - 5, Math.min(cardW * 0.16, cardH * 0.13), Math.min(cardH * 0.16, 34), 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(centerX, centerY + cardH * 0.12, Math.min(cardW * 0.31, cardH * 0.27), Math.min(cardH * 0.28, 62), 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffe3f1';
      g.font = `12px ${B.ui.fontFamily}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(boundPortraitLoading ? '画像読み込み中' : '画像未登録', centerX, cy + cardH - 47);
    }
    g.restore();
    g.font = `bold 13px ${B.ui.fontFamily}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fff4f8';
    g.fillText(`${unit.name} ・ ${attrInfo.label}`, cx + cardW / 2, cy + cardH - 15, cardW - 8);
  });

  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.font = `16px ${B.ui.fontFamily}`;
  g.fillStyle = '#ffffff';
  g.fillText('脱出進行', x + pad, 430);
  g.fillText(`${bound.escapeProgress.toFixed(0)} / ${bound.requiredClicks}`, x + pad, 454);
  g.fillStyle = 'rgba(0, 0, 0, 0.65)';
  g.fillRect(x + pad, 480, barW, 12);
  g.fillStyle = '#ff8fbe';
  g.fillRect(x + pad, 480, barW * clamp(escapeRatio, 0, 1), 12);
  g.fillStyle = '#ffffff';
  g.fillText(`主人公 MP  ${save.currentRun.hero.mp} / ${save.currentRun.hero.maxMp}`, x + pad, 510);
  g.fillStyle = 'rgba(0, 0, 0, 0.65)';
  g.fillRect(x + pad, 536, barW, 8);
  g.fillStyle = '#6bd6ef';
  g.fillRect(x + pad, 536, barW * clamp(mpRatio, 0, 1), 8);
  g.fillStyle = '#ffd8e9';
  g.fillText(`次の吸収まで 約${Math.max(0, B.bound.pulseSec - bound.pulseTimer).toFixed(0)}秒`, x + pad, 560);
  g.fillText('Enter または左クリックを連打して脱出', x + pad, h - 76, barW);
  g.restore();
}

function render() {
  const { gPixel, gHires } = beginFrame(layers, B);
  dungeonView.draw(gPixel, exploration, battleFx.offset);
  battleFx.drawTint(gHires);
  drawEnemyLabels(gHires, dungeonView, save.persistent, B);
  battleFx.drawWorld(gHires);
  heartFx.draw(gHires);
  kissMarks.draw(gHires);
  if (save.settings.showMinimap) drawMinimap(gHires, exploration, B);
  drawExploreHud(gHires, exploration, B);
  drawBoundHud(gHires);
  drawPartyPanel(gHires, exploration, B);
  const minimapBottom = 16 + exploration.map.h * B.explore.minimapScale + 24;
  drawDebuffPanel(gHires, save.persistent, B, {
    time: clock.time,
    top: save.settings.showMinimap ? minimapBottom : 24,
    animate: save.settings.flashback !== 'reduced'
  });
  floatLog.draw(gHires, logRect());
  debugHud.draw(gHires, debugLines());
  if (clock.paused) drawPauseText(gHires);
}

// ---- メインループ ----
function loop(nowMs) {
  requestAnimationFrame(loop);
  const dt = clock.tick(nowMs);
  debugHud.update(clock.realDtSec);
  handleInput();
  timeMode.update(dt);
  eventState.update(clock.time);
  exploration.update(dt, input, canExplore());
  dungeonView.update(dt, exploration);
  battleFx.update(dt);
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