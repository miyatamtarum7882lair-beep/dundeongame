// File: src/data/saveSchema.js
import { ENEMIES } from './enemies.js';
import { RACE_ABILITIES, isAbilityAvailable } from './raceAbilities.js';

export const SAVE_VERSION = 14;

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
  menu: ['KeyM'],             // メニュー（ステータス・図鑑・回想部屋・設定）
  items: ['KeyI'],            // 持ち物（アイテム・装備）
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
    charmCenterTransparency: 0.4,
    charmInnerRatio: 0.68
  },
  persistent: {
    runCount: 0,
    clearCount: 0,
    rp: 0,
    unlocks: [],
    stats: {
      climaxCount: 0, allyClimaxCount: 0, defeatCount: 0,
      fullDefeatCount: 0, betrayalCount: 0, begCount: 0,
      acceptCount: 0, timeoutCount: 0, requestAcceptCount: 0   // v12 誘惑を受け入れた回数（堕ち度）
    },
    raceAbilities: defaultRaceAbilities,
    enemyLevels: {},
    learnedSkills: {},   // 敵種族ID → 習得した特殊攻撃IDの配列（種族単位で共有）。上位技の永続習得もここ
    skillEvolution: {},  // v12 敵種族ID → 技ID → { manual, timeout, progress, evolved }（技ごとの進化）
    conditioning: {},    // v12 蓄積デバフID → { stage, onsetKeys, recovery }（永続段階 I〜IV）
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
    resistances: { mouth: 0, bust: 0, hip: 0, foot: 0, hand: 0 },
    consumables: { soothingIncense: 0, purifyingDrop: 0, manaVial: 0, charmAmulet: 0, lurePerfume: 0 },
    // v14 装備（部位ごと）。敵からの贈り物（呪いの装備）もここ。ランをまたいで残る
    equipment: { slots: { mouth: null, hand: null, bust: null, hip: null, foot: null }, bag: [] },
    stolenItems: [],   // v14 盗まれたアイテム { id, raceId }（行商ちゃんの店で買い戻せる）
    tributes: {},      // v14 種族ID → 貢いだお金の累計
    baseUpgrades: {},  // v14 拠点の強化 id → 段階
    tacticWeights: {
      whisper: 1.0, tradeOffer: 1.0, pickpocket: 1.0,
      decoy: 1.0, scentField: 1.0, hostageTalk: 1.0, charmAlly: 1.0
    },
    revengeEnemies: [],   // { id, species, level, stolenSkills, stolenItems, registeredAtRun }
    characterProfiles: {}, // 敵ID・仲間ID → { cx, cy, rx, ry, intro } など
    charmPoints: {},   // { [speciesId]: [{ attr, cx, cy, zoom }] } チャームポイントの数だけ
    // v13 デバッグ設定。ランをまたいで残る（敗北・クリアで新しいランになっても戻らない）
    debugSettings: { priestCompanion: true, enemySpawnWeights: {}, startLevel: 1, maxHpBonus: 0, maxMpBonus: 0 },
    pairBonds: {}     // v13 敵どうしの絆（チャームポイントのこすり合わせ）。'a|b' → { count, completed, lastAt }
  },
  currentRun: {
    seed: 0, dungeon: 1, floor: 1, floorState: {}, gold: 0,
    erosion: 0,
    defeatHistory: [],
    hero: { hp: 100, maxHp: 100, mp: 300, maxMp: 300, level: 1, hpLevel: 1, exp: 0, regretStacks: 0, weapon: 'sword' },
    allies: {
      mage: { status: 'ACTIVE', hp: 120, mp: 150, charmGauge: 0 },
      priest: { status: 'ACTIVE', hp: 120, mp: 150, charmGauge: 0, turnCounter: 0 }
    },
    inventory: [],
    pendingRescue: [],
    pendingAmbush: null,
    buffs: [],
    climaxCount: 0,
    afterglowTurns: 0,
    heroStatus: { gauges: {}, statuses: [], grace: {}, quiet: {} },   // v12 蓄積デバフのゲージと一時状態
    runStats: { expLost: 0, climaxes: 0, peakLevel: 0 }   // v12 このランで吸われた経験値など（敗北の回想）
  }
};

export function createDefaultSave() {
  return structuredClone(saveSchema);
}

/** 新しいランの主人公。デバッグ設定の開始レベル・最大HP/MPの上乗せを反映する */
export function newRunHero(persistent, levelUp) {
  const hero = structuredClone(saveSchema.currentRun.hero);
  const d = persistent?.debugSettings ?? {};
  const level = Math.max(1, Math.round(d.startLevel ?? 1));
  hero.level = level;
  hero.hpLevel = level;
  hero.maxHp = Math.max(1, hero.maxHp + (level - 1) * levelUp.hp + (d.maxHpBonus ?? 0));
  hero.maxMp = Math.max(0, hero.maxMp + (level - 1) * levelUp.mp + (d.maxMpBonus ?? 0) + 20 * (persistent?.baseUpgrades?.maxMp ?? 0));
  hero.hp = hero.maxHp;
  hero.mp = hero.maxMp;
  return hero;
}
