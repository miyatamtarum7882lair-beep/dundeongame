// File: src/data/saveSchema.js
import { ENEMIES } from './enemies.js';
import { RACE_ABILITIES, isAbilityAvailable } from './raceAbilities.js';

export const SAVE_VERSION = 11;

const defaultRaceAbilities = Object.fromEntries(ENEMIES.map((enemy) => [
  enemy.id,
  Object.fromEntries(
    RACE_ABILITIES
      .filter((ability) => isAbilityAvailable(ability, enemy))
      .map((ability) => [ability.id, { level: 0, progress: 0 }])
  )
]));

export const DEFAULT_KEY_BINDINGS = {
  up: ['ArrowUp', 'KeyW', 'Numpad8'],
  down: ['ArrowDown', 'KeyS', 'Numpad2'],
  left: ['ArrowLeft', 'KeyA', 'Numpad4'],
  right: ['ArrowRight', 'KeyD', 'Numpad6'],
  upLeft: ['Numpad7'],
  upRight: ['Numpad9'],
  downLeft: ['Numpad1'],
  downRight: ['Numpad3'],
  weaponSwitch: ['KeyQ'],
  guard: ['KeyG'],
  wait: ['Space'],            // 向きだけ変える操作は Shift＋方向（イベントの shift で判定）
  interact: ['KeyE'],
  struggle: ['Enter', 'NumpadEnter'],   // 左クリックも struggle として届く
  log: ['KeyL'],
  map: ['Tab'],
  pause: ['Escape']
};

export const saveSchema = {
  version: SAVE_VERSION,
  settings: {
    keyBindings: DEFAULT_KEY_BINDINGS,
    decisionTimerScale: 1.0,      // 0.5〜2.0。制限時間の減る速さ。0 で「タイマー停止」
    mouseSensitivity: 1.0,
    volume: { master: 1.0, bgm: 0.8, se: 1.0 },
    flashback: 'full',            // 'full' | 'reduced' | 'off'
    flashbackZoom: 1.0,           // 0.5〜2.0
    kissMarks: true,
    spatialAudio: true,
    screenShake: true,
    integerScaleOnly: false,
    codexShowNumbers: true,       // 敵図鑑でカモ度の数値を表示する
    showMinimap: true,
    charmCenterTransparency: 0.4
  },
  persistent: {
    runCount: 0,
    clearCount: 0,
    rp: 0,
    unlocks: [],
    stats: {
      climaxCount: 0, allyClimaxCount: 0, defeatCount: 0,
      fullDefeatCount: 0, betrayalCount: 0, begCount: 0
    },
    raceAbilities: defaultRaceAbilities,
    enemyLevels: {},
    learnedSkills: {},   // 敵種族ID → 習得した特殊攻撃IDの配列（種族単位で共有）
    learning: {          // v6.6
      markScore: {},          // 種族ID → 0〜100
      lastDefeatSkill: {}     // 種族ID → { skillId, run, floor }
    },
    codex: {             // v6.6 敵図鑑
      entries: {}   // 種族ID → { seen, encounters, kills, defeats, charms, begs, firstSeenRun, seenSkills }
    },
    debuffs: {
      loseHabit: { byRace: {} },
      fallHabit: { stage: 0 },
      touchHabit: { count: 0, stage: 0 },
      beggingHabit: { stage: 0 },
      allyTarget: { mage: 0, priest: 0 }
    },
    resistances: { mouth: 0, bust: 0, hip: 0, foot: 0 },
    consumables: { soothingIncense: 0, purifyingDrop: 0 },
    tacticWeights: {
      whisper: 1.0, tradeOffer: 1.0, pickpocket: 1.0,
      decoy: 1.0, scentField: 1.0, hostageTalk: 1.0, charmAlly: 1.0
    },
    revengeEnemies: [],   // { id, species, level, stolenSkills, stolenItems, registeredAtRun }
    characterProfiles: {}, // 敵ID・仲間ID → { cx, cy, rx, ry, intro } など
    charmPoints: {}   // { [speciesId]: { cx, cy, zoom } }
  },
  currentRun: {
    seed: 0, dungeon: 1, floor: 1, floorState: {}, gold: 0,
    debugOptions: { priestCompanion: true, enemySpawnWeights: {} },
    erosion: 0,
    defeatHistory: [],
    hero: { hp: 100, maxHp: 100, mp: 300, maxMp: 300, level: 20, exp: 0, regretStacks: 0, weapon: 'sword' },
    allies: {
      mage: { status: 'ACTIVE', hp: 120, mp: 150, charmGauge: 0 },
      priest: { status: 'ACTIVE', hp: 120, mp: 150, charmGauge: 0, turnCounter: 0 }
    },
    inventory: [],
    pendingRescue: [],
    pendingAmbush: null,
    buffs: [],
    climaxCount: 0,
    afterglowTurns: 0
  }
};

export function createDefaultSave() {
  return structuredClone(saveSchema);
}
