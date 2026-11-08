// File: src/data/balance.js
// すべての暫定値はここに集約する。コードへ直書きしない。値は読み取り専用。
import { ENEMIES } from './enemies.js';
function deepFreeze(obj) {
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') deepFreeze(value);
  }
  return Object.freeze(obj);
}

export const B = deepFreeze({
  // ---- 描画 ----
  render: { logicalWidth: 1280, logicalHeight: 720 },
  hires: { maxDpr: 2 },                    // 高解像度層の倍率の上限
  tile: { size: 64, spriteW: 64, spriteH: 96, anchorX: 32, anchorY: 96, overhangPx: 32 },
  sprite: { maxColors: 24 },
  boundPanel: { widthRatio: 0.35 },        // 拘束中の一枚絵パネルの幅
  portrait: {
    maxSide: 4096,                              // 一枚絵の長辺の上限。これ以下は元ファイルのまま保存
    jpegQuality: 0.95,                          // 上限を超えた JPEG を縮小するときの品質
    exts: ['png', 'jpg', 'jpeg', 'webp']        // 標準の絵を探す拡張子の順番
  },
  charm: {
    zoomMin: 1,
    zoomMax: 5,
    zoomStep: 0.05,
    defaultZoom: 2,
    centerTransparency: 0.4,
    innerRatio: 0.68,      // 中心（はっきり見える範囲）の広さ。0〜1
    edgeSharpness: 1.8,    // 大きいほど、中心の外ですぐ消える
    sizePx: 700,
    offsetPx: 210,
    sideOffsetPx: 380,     // 左右から拘束されたときの絵の位置（外側へ）
    anchorX: 640,
    anchorY: 360,
    outputPx: 384,
    fadeInSec: 0.35
  },
  drainFx: {
    edge: {
      periodSec: 2.6,
      lowMpStart: 0.5,
      lowMpAlpha: 0.16,
      membraneAlpha: 0.10,
      membraneRiseSec: 0.12,
      membraneDecaySec: 0.9,
      capAlpha: 0.22,
      climaxAlpha: 0.20,
      climaxCapAlpha: 0.42,
      color: [255, 95, 170]
    },
    flow: {
      perSec: 7,
      climaxExtraPerSec: 14,
      reachPx: 190,
      lifeSec: 0.9,
      wobblePx: 18,
      maxParticles: 140
    },
    climax: {
      orbitCount: 16,
      orbitRadiusPx: 70,
      orbitSpeed: 1.6,
      burstPerSec: 3,
      burstExtraPerSec: 7,
      burstReachPx: 170
    },
    heartbeat: {
      startRatio: 0.35,
      bpmMin: 60,
      bpmMax: 100,
      climaxBpm: 120
    }
  },
  ui: { fontFamily: '"Noto Sans JP", "Yu Gothic UI", "Hiragino Sans", "Meiryo", sans-serif' },

  // ---- 時間・状態 ----
  decision: { baseSec: 8, speedMin: 0.5, speedMax: 2.0 },   // speed は制限時間の減る速さ
  watchdog: { eventLockSec: 90 },

  // ---- 戦闘 ----
  battle: {
    rate: { sword: 0.13, fist: 0.22 },
    levelDiffRate: 0.06,
    guardMul: 0.5,
    guardEvade: 0.15,          // 防御中の、回避できる技への回避率の上乗せ
    beatSec: 0.2,
    baseWeights: { move: 3, attack: 3, bind: 2, special: 1, idle: 0.6 },   // idle: 何もしない（様子見）
    comboChance: 0.75,         // 連携技を次の行動で使う確率
    idleTalkChance: 0.4,       // 敵が様子見したとき、台詞を言う確率
    drainPerLevel: 0.10,
    exp: { base: 12, perEnemyLevel: 6, need: 30, needPerLevel: 20 },
    levelUp: { hp: 10, mp: 8, healRate: 0.3 },
    heroLevelMax: 1000,     // 主人公のレベルの上限
    regenRate: 0.01,
    hpToMpRate: 0.6,        // 絶頂以外の打撃は HP を減らさず、最大HP比 × この率 の MP を奪う
    defeatResistDrop: 5,
    touch: { mpRate: 0.08, resistDrop: 3 }
  },
  enemy: {
    baseHp: 60,
    hpPerLevel: 14,
    expBase: 30,
    expPerLevel: 12,
    absorbExpMultiplier: 2,
    levelPerFloor: 1,
    rankBonus: { basic: 0, unique: 2, elite: 4, boss: 7 },
    abilityPerLevel: 6,
    specialUnlockDrain: 50
  },
  skills: {
    normalAttack: { hpRate: 0.11, range: 1 },
    kissAttack: { hpRate: 0.10, mpRate: 0.05, range: 1 },
    pafuAttack: { hpRate: 0.12, mpRate: 0.04, range: 1 },
    hipAttack: { hpRate: 0.14, range: 1 },
    footRubAttack: { hpRate: 0.09, mpRate: 0.04, range: 1 },
    levelDrainKiss: { mpRate: 0.12, range: 1 },
    onechanPafu: { mpRate: 0.12, range: 1 },
    backRub: { mpRate: 0.12, range: 1 },
    footRub: { mpRate: 0.10, range: 1 },
    footStomp: { mpRate: 0.10, hpRate: 0.04, range: 1 },
    blowKiss: { mpRate: 0.08, range: 4, allyCharm: 8 },
    pinkBreath: { mpRate: 0.06, hpRate: 0.03, range: 1, allyCharm: 12 },
    deepDrainKiss: { mpRate: 0.18, range: 4, windup: true },
    foxPounce: { hpRate: 0.16, mpRate: 0.08, range: 3, windup: true },
    sexyPose: { mpRate: 0.04, range: 3, allyCharm: 10, windup: true },
    drainBerochu: { expRate: 0.05, range: 1, windup: true, allyCharm: 18 },
    // evade: 基本の回避率。主人公の状態（油断・体勢崩しなど）で下がる
    // 小悪魔キトゥン
    kittenTouch: { hpRate: 0.10, mpRate: 0.03, range: 1 },
    kittenKissHold: { mpRate: 0.12, range: 1 },
    kittenTease: { mpRate: 0.02, range: 3, evade: 0.2, allyCharm: 6 },
    kittenBlowKiss: { mpRate: 0.06, range: 4, windup: true, evade: 0.3, allyCharm: 8, carelessBonus: 1.6 },
    kittenDare: { mpRate: 0.04, range: 2, windup: true, allyCharm: 10 },
    kittenFullTemptation: { mpRate: 0.2, expRate: 0.06, range: 1, windup: true, allyCharm: 20 },
    // 黒髪リボンちゃん
    ribbonTouch: { hpRate: 0.10, mpRate: 0.03, range: 1 },
    peachBreathHold: { mpRate: 0.12, range: 1 },
    peachBreath: { mpRate: 0.05, range: 3, windup: true, evade: 0.25, allyCharm: 12 },
    sweetWhisper: { mpRate: 0.02, range: 3, evade: 0.15, allyCharm: 6 },
    closeBreath: { mpRate: 0.09, range: 1, windup: true, allyCharm: 10 },
    supremePeachBreath: { mpRate: 0.16, range: 3, windup: true, evade: 0.1, allyCharm: 18 },
    // ピンク髪きつねちゃん
    foxStep: { hpRate: 0.12, range: 1 },
    foxBackRub: { mpRate: 0.12, range: 1 },
    foxHipAttack: { hpRate: 0.14, mpRate: 0.04, range: 1, windup: true, evade: 0.25, allyCharm: 8 },
    foxPushContest: { hpRate: 0.04, mpRate: 0.03, range: 1, allyCharm: 8 },
    tailFeint: { hpRate: 0.03, range: 1, evade: 0.1 },
    foxHipPress: { hpRate: 0.10, mpRate: 0.2, range: 1, windup: true, allyCharm: 20 },
    // ---- 前半9体 ----
    // backBonus: 主人公の背後からだと吸収が増える / bonusWhen: 主人公がその状態だと吸収が増える / healRate: 回復の割合
    // シーフちゃん
    thiefSlip: { hpRate: 0.08, expRate: 0.006, range: 1 },
    thiefHold: { mpRate: 0.11, range: 1 },
    thiefPeek: { mpRate: 0.02, range: 3, evade: 0.2, allyCharm: 6 },
    heartThief: { mpRate: 0.03, expRate: 0.03, range: 3, windup: true, evade: 0.3, allyCharm: 10 },
    backstabSteal: { hpRate: 0.04, expRate: 0.02, range: 1, backBonus: 2.0, bonusWhen: { status: 'feinted', mul: 1.4 } },
    heartjackMaster: { mpRate: 0.1, expRate: 0.08, range: 2, windup: true, allyCharm: 20 },
    // ミクちゃん
    mikuPechi: { hpRate: 0.09, mpRate: 0.03, range: 1 },
    mikuBegKiss: { mpRate: 0.12, range: 1 },
    mikuPlease: { mpRate: 0.02, range: 3, evade: 0.15, allyCharm: 6 },
    mikuBlowKiss: { mpRate: 0.07, range: 4, windup: true, evade: 0.3, allyCharm: 10 },
    mikuSpecialKiss: { mpRate: 0.2, expRate: 0.04, range: 1, windup: true, allyCharm: 20 },
    // おねだりバニー
    bunnyPunch: { hpRate: 0.10, range: 1 },
    pleadStealKiss: { mpRate: 0.10, range: 1 },
    pleadPlease: { mpRate: 0.03, range: 2, evade: 0.2, allyCharm: 8 },
    sneakyTaste: { mpRate: 0.02, expRate: 0.015, range: 1, bonusWhen: { status: 'hesitant', mul: 1.8 } },
    secretRewardKiss: { mpRate: 0.12, expRate: 0.06, range: 1, windup: true, allyCharm: 18 },
    // 天使ちゃん
    angelTouch: { hpRate: 0.10, mpRate: 0.03, range: 1 },
    angelHug: { mpRate: 0.12, range: 1 },
    holyLullaby: { mpRate: 0.04, range: 5, windup: true, evade: 0.25, allyCharm: 6 },
    sweetBlessing: { mpRate: 0.02, healRate: 0.08, range: 3, allyCharm: 8 },
    mercyEye: { mpRate: 0.03, range: 3, windup: true, evade: 0.2, allyCharm: 10 },
    fallenBlessing: { mpRate: 0.2, expRate: 0.04, range: 3, windup: true, allyCharm: 20 },
    // グラマーバニーさん
    bunnyPress: { hpRate: 0.12, mpRate: 0.03, range: 1 },
    pafuHold: { mpRate: 0.13, range: 1 },
    pafupafu: { mpRate: 0.08, range: 1, windup: true, allyCharm: 12 },
    sweetSqueeze: { mpRate: 0.03, range: 1, allyCharm: 6 },
    gazeLock: { mpRate: 0.02, range: 4, windup: true, evade: 0.25, allyCharm: 8 },
    queensPafu: { mpRate: 0.22, range: 1, windup: true, allyCharm: 22 },
    // 青髪ギャル
    muchiTackle: { hpRate: 0.12, range: 1 },
    muchiHold: { mpRate: 0.11, range: 1 },
    galPamper: { mpRate: 0.02, range: 1, allyCharm: 6 },
    muchiPress: { hpRate: 0.10, mpRate: 0.04, range: 1, windup: true, evade: 0.2, allyCharm: 8 },
    thighCushion: { mpRate: 0.06, range: 1, windup: true, allyCharm: 10 },
    muchiParadise: { mpRate: 0.22, range: 1, windup: true, allyCharm: 22 },
    // シスターさん
    holyStep: { hpRate: 0.10, mpRate: 0.03, range: 1 },
    sinShackle: { mpRate: 0.11, range: 1 },
    countdown: { mpRate: 0.14, expRate: 0.05, range: 1, windup: true, allyCharm: 16 },
    repent: { mpRate: 0.02, range: 3, windup: true, evade: 0.2, allyCharm: 6 },
    featherConfess: { mpRate: 0.07, range: 5, windup: true, evade: 0.25, allyCharm: 8 },
    judgmentCount: { mpRate: 0.24, expRate: 0.08, range: 1, windup: true, allyCharm: 24 },
    // 夢見のお姉さん
    sleepyTouch: { hpRate: 0.08, mpRate: 0.03, range: 1 },
    lapPillow: { mpRate: 0.11, range: 1 },
    lullaby: { mpRate: 0.03, range: 3, windup: true, allyCharm: 8 },
    dreamPamper: { mpRate: 0.03, range: 1, allyCharm: 6 },
    fluffyDream: { mpRate: 0.06, range: 5, windup: true, evade: 0.25, allyCharm: 8, bonusWhen: { status: 'asleep', mul: 1.8 } },
    eternalLap: { mpRate: 0.22, range: 1, windup: true, allyCharm: 22 },
    // キスハンター
    hunterTouch: { hpRate: 0.10, mpRate: 0.03, range: 1 },
    huntersKiss: { mpRate: 0.12, range: 1 },
    heartMarking: { mpRate: 0.02, range: 6, windup: true, evade: 0.3, allyCharm: 6 },
    hunterDrainKiss: { mpRate: 0.04, expRate: 0.03, range: 1, windup: true, allyCharm: 12, bonusWhen: { status: 'marked', mul: 1.6 } },
    cantEscape: { mpRate: 0.05, range: 4, evade: 0.2, allyCharm: 8, bonusWhen: { status: 'marked', mul: 1.4 } },
    perfectHuntKiss: { mpRate: 0.18, expRate: 0.06, range: 1, windup: true, allyCharm: 22 },
    // ---- 後半9体 ----
    // collectMul: 魔力漏出で漏れた分の、まとめて回収する倍率
    // 小悪魔お嬢さん
    ladyTouch: { hpRate: 0.10, mpRate: 0.03, range: 1 },
    ladysHold: { mpRate: 0.12, range: 1 },
    ladyWarning: { mpRate: 0.03, range: 3, allyCharm: 8 },
    ladyStep: { hpRate: 0.06, mpRate: 0.04, range: 4, windup: true, evade: 0.25, allyCharm: 8 },
    ladyGaze: { mpRate: 0.05, range: 3, windup: true, evade: 0.2, allyCharm: 10, bonusWhen: { status: 'careless', mul: 1.5 } },
    royalTemptation: { mpRate: 0.22, range: 3, windup: true, allyCharm: 22 },
    // 甘やかしレディ
    pamperStep: { hpRate: 0.09, mpRate: 0.04, range: 1 },
    pamperLegHold: { mpRate: 0.12, range: 1 },
    tiredDarling: { mpRate: 0.03, range: 3, allyCharm: 8 },
    gentlePat: { mpRate: 0.03, range: 1, windup: true, allyCharm: 8 },
    sweetShackle: { mpRate: 0.06, range: 1, windup: true, evade: 0.2, allyCharm: 10 },
    supremePamperLeg: { mpRate: 0.24, range: 1, windup: true, allyCharm: 22, bonusWhen: { status: 'dependent', mul: 1.4 } },
    // 怪力バニーさん
    powerPunch: { hpRate: 0.15, range: 1 },
    powerHold: { mpRate: 0.14, range: 1 },
    bunnyRocket: { hpRate: 0.12, mpRate: 0.03, range: 5, windup: true, evade: 0.35, allyCharm: 10, bonusWhen: { status: 'flinch', mul: 1.3 } },
    dokkanHip: { hpRate: 0.14, mpRate: 0.03, range: 1, windup: true, evade: 0.25, allyCharm: 8 },
    contestDare: { hpRate: 0.04, mpRate: 0.04, range: 2, allyCharm: 8 },
    superBunnyRocket: { hpRate: 0.16, mpRate: 0.08, range: 6, windup: true, evade: 0.25, allyCharm: 18 },
    // 銀狐メイドさん
    maidStep: { hpRate: 0.09, mpRate: 0.04, range: 1 },
    manaStomp: { mpRate: 0.13, range: 1 },
    manaLeakProc: { mpRate: 0.02, range: 3, windup: true, evade: 0.2, allyCharm: 6 },
    badManners: { mpRate: 0.03, range: 1, allyCharm: 6 },
    periodicCollect: { mpRate: 0.03, range: 2, windup: true, allyCharm: 12, collectMul: 1.5 },
    totalManaCollect: { mpRate: 0.15, range: 2, windup: true, allyCharm: 22, collectMul: 2.5 },
    // ベルベットバニー
    hipPush: { hpRate: 0.13, range: 1 },
    velvetPress: { mpRate: 0.13, range: 1 },
    heartStamp: { hpRate: 0.08, mpRate: 0.05, range: 1, windup: true, evade: 0.2, allyCharm: 10, bonusWhen: { status: 'cornered', mul: 1.5 } },
    provokeGaze: { mpRate: 0.03, range: 3, evade: 0.2, allyCharm: 8 },
    hipWall: { hpRate: 0.06, mpRate: 0.04, range: 3, windup: true, evade: 0.2, allyCharm: 10 },
    queensPressure: { hpRate: 0.08, mpRate: 0.22, range: 1, windup: true, allyCharm: 22 },
    // ぽしょぽしょ悪魔ちゃん
    sneakyTouch: { hpRate: 0.08, mpRate: 0.04, range: 1 },
    whisperHug: { mpRate: 0.12, range: 1 },
    poshoWhisper: { mpRate: 0.03, range: 3, allyCharm: 8 },
    secretInsult: { mpRate: 0.04, range: 1, windup: true, allyCharm: 8 },
    secretLevelDrain: { mpRate: 0.03, expRate: 0.03, range: 1, windup: true, allyCharm: 12, bonusWhen: { status: 'unfocused', mul: 1.6 } },
    absoluteWhisper: { mpRate: 0.2, expRate: 0.05, range: 1, windup: true, allyCharm: 22 },
    // 魔性のチャイナ娘（elite）
    devilHand: { hpRate: 0.10, mpRate: 0.03, expRate: 0.006, range: 1 },
    demonicHug: { mpRate: 0.12, range: 1 },
    weakSpotFound: { mpRate: 0.03, range: 3, evade: 0.25, allyCharm: 8 },
    mysticHandDrain: { mpRate: 0.04, expRate: 0.06, range: 1, windup: true, allyCharm: 14, bonusWhen: { status: 'weakExposed', mul: 1.5 } },
    zakoPunish: { hpRate: 0.10, mpRate: 0.05, range: 1, windup: true, evade: 0.2, allyCharm: 10 },
    demonicExpHarvest: { mpRate: 0.15, expRate: 0.12, range: 1, windup: true, allyCharm: 24 },
    // 桜の妖女（elite）
    sakuraPush: { hpRate: 0.12, mpRate: 0.03, range: 1 },
    sakuraHipHold: { mpRate: 0.14, range: 1 },
    sakuraStorm: { mpRate: 0.05, range: 4, windup: true, evade: 0.25, allyCharm: 12 },
    corruptionMark: { mpRate: 0.03, range: 3, windup: true, evade: 0.25, allyCharm: 8 },
    sakuraExpHunt: { mpRate: 0.04, expRate: 0.05, range: 1, windup: true, allyCharm: 14, bonusWhen: { status: 'flowerMark', mul: 1.6 } },
    thousandSakura: { mpRate: 0.24, expRate: 0.06, range: 4, windup: true, allyCharm: 26 },
    // ずるっこ悪魔ちゃん（elite）
    sneakyKick: { hpRate: 0.11, mpRate: 0.03, range: 1 },
    devilLegHold: { mpRate: 0.13, range: 1 },
    footTrap: { range: 3, allyCharm: 4 },
    legDrain: { mpRate: 0.04, expRate: 0.05, range: 1, windup: true, allyCharm: 14, bonusWhen: { status: 'offBalance', mul: 1.5 } },
    fakeCry: { mpRate: 0.02, range: 2, allyCharm: 8 },
    devilsLegTrap: { mpRate: 0.18, expRate: 0.05, range: 1, windup: true, allyCharm: 22 },

    // ---- 追加18体・前半8体（unique）----
    // 金髪メイドさん
    maidChaseStep: { hpRate: 0.1, mpRate: 0.03, range: 1 },
    blondeMaidHold: { mpRate: 0.12, range: 1 },
    pathBlock: { mpRate: 0.03, range: 3, windup: true, evade: 0.3, allyCharm: 8 },
    maidPursuit: { mpRate: 0.02, range: 6, evade: 0.2, allyCharm: 6 },
    silentUrge: { mpRate: 0.06, range: 3, windup: true, evade: 0.2, allyCharm: 10 },
    inescapableMaidHold: { mpRate: 0.2, expRate: 0.05, range: 1, windup: true, allyCharm: 20 },
    // 甘やかしバニー
    bunnyInvite: { hpRate: 0.08, mpRate: 0.04, range: 1 },
    sweetBunnyHold: { mpRate: 0.12, range: 1 },
    rewardWhisper: { mpRate: 0.04, range: 3, evade: 0.25, allyCharm: 8 },
    pamperMagic: { mpRate: 0.02, healRate: 0.06, range: 3, allyCharm: 8 },
    justALittleMore: { mpRate: 0.08, range: 3, windup: true, evade: 0.25, allyCharm: 12, loseHabitBonus: 0.12 },
    supremeRewardHold: { mpRate: 0.2, expRate: 0.05, range: 1, windup: true, allyCharm: 20, loseHabitBonus: 0.12 },
    // ヤンデレちゃん
    loveTouch: { hpRate: 0.1, mpRate: 0.03, range: 1 },
    yandereHipHold: { mpRate: 0.13, range: 1 },
    foundYou: { mpRate: 0.03, range: 6, windup: true, evade: 0.2, allyCharm: 8 },
    whyRunAway: { mpRate: 0.07, range: 4, windup: true, evade: 0.25, allyCharm: 10 },
    obsessiveRecapture: { hpRate: 0.1, mpRate: 0.03, range: 5, windup: true, evade: 0.3, allyCharm: 10 },
    eternalPossession: { mpRate: 0.22, expRate: 0.05, range: 1, windup: true, allyCharm: 22 },
    // 小悪魔メイドさん
    maidMischief: { hpRate: 0.08, mpRate: 0.04, range: 1 },
    devilMaidHold: { mpRate: 0.12, range: 1 },
    rewardOffer: { mpRate: 0.06, range: 4, windup: true, evade: 0.25, allyCharm: 10 },
    serviceKiss: { mpRate: 0.08, expRate: 0.03, range: 1, windup: true, allyCharm: 12 },
    quietMaster: { mpRate: 0.03, range: 3, evade: 0.25, allyCharm: 8 },
    supremeService: { mpRate: 0.2, expRate: 0.06, range: 1, windup: true, allyCharm: 22 },
    // キョンシーちゃん
    hopTouch: { hpRate: 0.1, mpRate: 0.03, range: 1 },
    jiangshiHold: { mpRate: 0.13, range: 1 },
    jiangshiLeap: { hpRate: 0.1, mpRate: 0.03, range: 4, windup: true, evade: 0.3, allyCharm: 10 },
    jiangshiHug: { mpRate: 0.08, range: 1, windup: true, allyCharm: 12 },
    learnedEscape: { mpRate: 0.03, range: 3, evade: 0.2, allyCharm: 8 },
    perfectJiangshiHug: { mpRate: 0.22, expRate: 0.05, range: 1, windup: true, allyCharm: 22 },
    // 白銀の小悪魔
    begTouch: { hpRate: 0.08, mpRate: 0.04, range: 1 },
    silverDevilHold: { mpRate: 0.12, range: 1 },
    pleaseListen: { mpRate: 0.06, range: 4, windup: true, evade: 0.25, allyCharm: 10 },
    sulkyTempt: { mpRate: 0.03, range: 3, evade: 0.25, allyCharm: 8 },
    secondHelping: { mpRate: 0.07, expRate: 0.03, range: 1, windup: true, allyCharm: 12 },
    absoluteBegging: { mpRate: 0.2, expRate: 0.06, range: 1, windup: true, allyCharm: 22 },
    // 無表情サキュバス
    silentSweep: { hpRate: 0.1, mpRate: 0.03, range: 1 },
    silentShackle: { mpRate: 0.13, range: 1 },
    noUse: { mpRate: 0.03, range: 3, evade: 0.2, allyCharm: 8 },
    giveUp: { mpRate: 0.07, range: 3, windup: true, evade: 0.2, allyCharm: 10 },
    blindSpot: { hpRate: 0.1, mpRate: 0.03, range: 1, windup: true, evade: 0.3, allyCharm: 8 },
    totalSurrenderHold: { mpRate: 0.22, expRate: 0.06, range: 1, windup: true, allyCharm: 22 },
    // あまあま猫耳メイド
    catHelp: { hpRate: 0.08, mpRate: 0.04, range: 1 },
    catCareHold: { mpRate: 0.12, range: 1 },
    careRecommend: { mpRate: 0.03, range: 3, evade: 0.25, allyCharm: 8 },
    leaveItToMe: { mpRate: 0.07, range: 3, windup: true, evade: 0.25, allyCharm: 10 },
    masterBreak: { mpRate: 0.04, range: 3, allyCharm: 8, bonusWhen: { status: 'dependent', mul: 1.5 } },
    supremeCatService: { mpRate: 0.2, expRate: 0.05, range: 1, windup: true, allyCharm: 22 },

    // ---- 追加18体・後半10体（elite）----
    // 魔性のお嬢様
    ladyHand: { hpRate: 0.11, mpRate: 0.04, range: 1 },
    demonicKissHug: { mpRate: 0.15, range: 1 },
    charmEye: { mpRate: 0.03, range: 4, windup: true, evade: 0.3, allyCharm: 10 },
    sweetOrder: { mpRate: 0.08, range: 4, windup: true, evade: 0.25, allyCharm: 12 },
    charmCascade: { mpRate: 0.08, expRate: 0.04, range: 1, windup: true, allyCharm: 14, bonusWhen: { status: 'charmed', mul: 1.6 } },
    absoluteCharmEye: { mpRate: 0.24, expRate: 0.06, range: 4, windup: true, allyCharm: 26 },
    // いじわる小悪魔ちゃん
    weakSpotTouch: { hpRate: 0.1, mpRate: 0.03, expRate: 0.01, range: 1 },
    weakAnalysisHold: { mpRate: 0.13, range: 1 },
    weakDiagnosis: { mpRate: 0.03, range: 3, evade: 0.25, allyCharm: 8 },
    weakPointDrain: { mpRate: 0.02, expRate: 0.1, range: 1, windup: true, evade: 0.2, allyCharm: 14, bonusWhen: { status: 'weakExposed', mul: 1.5 } },
    weakRevealed: { mpRate: 0.06, expRate: 0.04, range: 3, windup: true, evade: 0.25, allyCharm: 12 },
    completeLevelDrain: { mpRate: 0.12, expRate: 0.16, range: 1, windup: true, allyCharm: 26 },
    // 控えめアイドル
    shyStep: { hpRate: 0.09, mpRate: 0.04, range: 1 },
    idolHold: { mpRate: 0.14, range: 1 },
    sexyBeam: { mpRate: 0.05, range: 5, windup: true, evade: 0.3, allyCharm: 10 },
    lookAtMe: { mpRate: 0.08, range: 5, windup: true, evade: 0.25, allyCharm: 12 },
    heartfulEncore: { mpRate: 0.1, range: 5, windup: true, evade: 0.25, allyCharm: 14 },
    centerStage: { mpRate: 0.24, expRate: 0.06, range: 5, windup: true, allyCharm: 26 },
    // 堕落のお姉さん
    sisterTease: { hpRate: 0.11, mpRate: 0.04, range: 1 },
    ruinHipHold: { mpRate: 0.15, range: 1 },
    sweetDealOffer: { mpRate: 0.02, range: 3, windup: true, evade: 0.2, allyCharm: 10 },
    rewardHipAttack: { hpRate: 0.14, mpRate: 0.05, range: 1, windup: true, evade: 0.25, allyCharm: 10, bonusWhen: { status: 'corrupted', mul: 1.5 } },
    justOnceMore: { mpRate: 0.04, range: 3, evade: 0.2, allyCharm: 10 },
    ruinPamperPress: { mpRate: 0.24, expRate: 0.06, range: 1, windup: true, allyCharm: 26 },
    // 桃髪サキュバス
    manaSeekTouch: { hpRate: 0.09, mpRate: 0.05, range: 1 },
    succubusHold: { mpRate: 0.16, range: 1 },
    manaTaste: { mpRate: 0.06, range: 3, evade: 0.25, allyCharm: 10 },
    giveMeMore: { mpRate: 0.05, range: 3, windup: true, evade: 0.25, allyCharm: 12 },
    manaPlunder: { mpRate: 0.16, range: 1, windup: true, evade: 0.2, allyCharm: 16, bonusWhen: { status: 'manaLeak', mul: 1.4 } },
    supremeManaHold: { mpRate: 0.3, expRate: 0.05, range: 1, windup: true, allyCharm: 26 },
    // むちむち小悪魔
    curvyTouch: { hpRate: 0.11, mpRate: 0.04, range: 1 },
    curvyHipHold: { mpRate: 0.15, range: 1 },
    lookBackTempt: { mpRate: 0.03, range: 4, evade: 0.25, allyCharm: 10 },
    stillWatching: { mpRate: 0.07, range: 4, windup: true, evade: 0.25, allyCharm: 12 },
    gazeHipAttack: { hpRate: 0.14, mpRate: 0.06, range: 1, windup: true, evade: 0.25, allyCharm: 12, gazeBonus: 0.25 },
    gazeHipTrap: { mpRate: 0.24, expRate: 0.06, range: 1, windup: true, allyCharm: 26 },
    // 青髪プリンセス
    princessFingertip: { hpRate: 0.1, mpRate: 0.04, range: 1 },
    princessEmbrace: { mpRate: 0.13, range: 1 },
    quietOrder: { mpRate: 0.03, range: 4, evade: 0.25, allyCharm: 10 },
    giveMeMana: { mpRate: 0.04, range: 3, windup: true, evade: 0.25, allyCharm: 12 },
    royalLevy: { mpRate: 0.12, expRate: 0.04, range: 1, windup: true, allyCharm: 16 },
    princessPlunder: { mpRate: 0.26, expRate: 0.06, range: 1, windup: true, allyCharm: 26 },
    // 黒衣のシスター
    quietAdmonish: { hpRate: 0.11, mpRate: 0.04, range: 1 },
    blackPressHold: { mpRate: 0.14, range: 1 },
    pressureNotice: { mpRate: 0.03, range: 4, windup: true, evade: 0.3, allyCharm: 10 },
    willYouResist: { mpRate: 0.08, range: 3, windup: true, evade: 0.2, allyCharm: 12 },
    silentPressure: { hpRate: 0.12, mpRate: 0.06, range: 1, windup: true, evade: 0.25, allyCharm: 12 },
    absolutePressure: { mpRate: 0.26, expRate: 0.06, range: 1, windup: true, allyCharm: 26 },
    // 白銀バニー
    bunnyManaTouch: { hpRate: 0.1, mpRate: 0.05, range: 1 },
    silverCling: { mpRate: 0.14, range: 1 },
    limpHug: { mpRate: 0.07, range: 1, windup: true, evade: 0.25, allyCharm: 12 },
    backOpen: { mpRate: 0.02, range: 4, windup: true, evade: 0.3, allyCharm: 8 },
    expPlease: { mpRate: 0.03, expRate: 0.09, range: 1, windup: true, evade: 0.2, allyCharm: 14, backBonus: 1.8 },
    silverPlunder: { mpRate: 0.2, expRate: 0.12, range: 1, windup: true, allyCharm: 26, backBonus: 1.5 },
    // 強引な桃髪メイド
    maidGuide: { hpRate: 0.08, mpRate: 0.05, range: 2 },
    pinkGazeBind: { mpRate: 0.14, range: 1 },
    faceThisWay: { mpRate: 0.04, range: 4, windup: true, evade: 0.3, allyCharm: 10 },
    lookAwayQ: { mpRate: 0.08, range: 4, windup: true, evade: 0.25, allyCharm: 12 },
    noEscapeMaid: { hpRate: 0.1, mpRate: 0.04, range: 4, windup: true, evade: 0.3, allyCharm: 10 },
    pinkEscort: { mpRate: 0.24, expRate: 0.06, range: 1, windup: true, allyCharm: 26 }
  },
  // 後半10体の専用の仕組み（enemyTraits.js）
  traits: {
    charmChainStatuses: ['unfocused', 'weakened', 'manaLeak'],   // 魅了中に当たると連鎖して付く
    weakLearnMul: 0.1,          // いじわる小悪魔ちゃん：盗めた回数ごとに、経験値ドレイン +10%
    confidenceMul: 0.08,        // 控えめアイドル：自信1段ごとに技の威力 +8%
    absorbPerStage: 300,        // 桃髪サキュバス：奪ったMPの累計がこの値ごとに1段（最大 memory.max）
    absorbMul: 0.1,
    gazeMax: 4,                 // むちむち小悪魔：視線ロックがこの値で動けなくなる
    princessEverySec: 3,        // 青髪プリンセス：拘束がこの秒数続くごとに吸収 +12%（拘束ごとに戻る）
    princessMul: 0.12,
    princessMax: 5,
    pressureEverySec: 4,        // 黒衣のシスター：この秒数ごとに重圧が1段（拘束ごとに戻る）
    pressureDrainMul: 0.1,
    pressureEscapeMul: 0.08,
    pressureMax: 4,
    backBindExpMul: 2.0,        // 白銀バニー：背面から拘束すると、経験値も直接吸う
    faceAwayCut: 0.15,          // 強引な桃髪メイド：顔を逸らした回数ごとに、逸らす（回避）上乗せが減る
    sweetDeal: { mp: 0.35, hp: 0.2, resistDrop: 1, grow: 80 },
    giveMpGrow: 1.0             // 自分から差し出した MP のぶん、その子が経験値を得る倍率
  },
  // 追加18体の、敵ごとの記憶（enemyMemory.js）と専用の仕組み
  memory: {
    max: 5,
    yandereEscapeMul: 0.1,      // ヤンデレちゃん：逃げた回数ごとの、その子の拘束の脱出必要数
    jiangshiLearnMul: 0.12,     // キョンシーちゃん：覚えた逃げ方ごとの脱出必要数
    kamoRequestMul: 0.5,        // 白銀の小悪魔：カモ認定すると、おねだりの間隔がこの倍率
    kamoDrainMul: 1.25,
    giveUpSurrender: 0.08,      // 無表情サキュバス：諦めた回数ごとの、拘束開始時の「身を任せ」
    giveUpCap: 0.4,
    acceptGrowExp: 60,          // 自分から受け入れたとき、その子が得る経験値（ご褒美の罠・過保護の罠など）
    maidChorusMul: 1.35,        // メイドが2人以上で拘束すると、声をそろえて吸い上げる
    maidCallRange: 30
  },
  // ずるっこ悪魔ちゃんの罠：仕掛ける範囲・消えるまでのターン数・踏んだときの蓄積
  traps: { radius: 2, lifeTurns: 15, condGain: 1.5, max: 8 },
  // カウントダウンの中断（「集中して中断する」を選んだとき）
  interrupt: { base: 0.6, perLevel: 0.02, min: 0.2, max: 0.9 },
  // 技の進化（v5）。進化した技の威力と、蓄積デバフの増え方
  skillEvolution: { powerMul: 1.3, condMul: 1.5 },
  // 主人公の蓄積デバフ（v4）。値はすべて仮
  conditioning: {
    max: 8,
    warnAt: 3,
    onsetAt: 5,
    dangerAt: 7,
    decayEveryTurns: 8,       // 発生源の敵が近くにいないと、このターン数ごとに1減る
    floorCarry: 0.5,          // 次の階へ持ち越す割合
    permanentOnsets: 3,       // 別の階での発症がこの回数で、永続段階が1つ進む
    maxStage: 4,
    stageGainMul: 0.2,        // 永続段階1つごとの、ゲージの増え方の上乗せ
    stageFloor: 1,            // 永続段階1つごとの、ゲージの下限
    recoveryNeed: [4, 6, 8, 10],  // 段階 I〜IV を1つ下げるのに必要な対抗行動の回数
    nearRange: 4,
    bindHitGain: 1.5,         // 拘束攻撃を受けるたびに、その子専用の蓄積デバフが増える量
    bindGainPerSec: 0.2,      // 拘束で吸われている間、その子専用の蓄積デバフが1秒ごとに増える量
    climaxGainMul: 2          // 絶頂中（1秒ごと）はこの倍率
  },
  // 力比べ（ピンク髪きつねちゃん）
  contest: { base: 0.55, perLevel: 0.02, offBalancePenalty: 0.15, perGauge: 0.03, min: 0.15, max: 0.85 },
  debuffPanel: {
    columns: 3,
    chipW: 150,
    chipH: 24,
    gap: 4,
    rowGap: 5,            // 行の間（詰めて表示する）
    maxRows: 8,
    majorFrom: 0.55
  },
  weapons: {
    sword: { minRate: 0.08, maxRate: 0.24 },
    fist: { minRate: 0.14, maxRate: 0.34, touchChance: 0.30 }
  },
  damage: { minRate: 0.08, maxRate: 0.34 },
  resist: { floor: -80, floorMin: -60 },    // floorMin は記憶の祭壇での緩和後
  escape: {
    baseClicks: 15,
    uniteCoef: [1.0, 1.6, 2.2, 2.8, 3.4],
    backCoef: 1.25,
    minClicks: 10,
    maxClicks: 60,
    clicksPerSec: 5
  },
  bound: {
    tickSec: 2,               // 拘束中の1ターン（状態異常・バフの経過）
    moveSec: 0.5,             // 拘束中、まわりの敵が動く間隔（拘束に加わりやすくする）
    pulseSec: 1.2,            // ドレインパルスの基本間隔（1回の吸収量は間隔に比例。毎秒の吸収量は同じ）
    firstPulseDelaySec: 0.6,  // 拘束成立から最初のパルスまで
    pulseStaggerSec: 0.35,    // 拘束役ごとにパルスをずらす間隔
    mpPerSec: 7,
    expBase: 200,
    absorbCap: 3.0,
    backAbsorb: 1.3,
    backSurrenderGain: 0.10,
    maxBinders: 5,
    escapeRecoverMp: 8,
    idleSurrenderSec: 2,
    uniteChance: 0.35,
    unitePushback: 0.25,
    surrenderPerIdleSec: 0.05,
    expShareRate: 1.0,
    expDrainPerSec: 0.02,   // 毎秒、「現在レベルの必要EXP」のこの割合を失う（各種倍率が掛かる）
    expDrainMinLevel: 1     // ラン中のレベルの下限（仮置き）
  },
  climax: {
    // 旧設計との互換用。新コントローラの導入後も使用箇所確認までは維持する。
    lowMpRate: 0.2,
    lowMpRateHighErosion: 0.3,
    highErosionThreshold: 50,
    drainSec: 5,
    chargeSec: 1.2,
    drainMul: 1.5,
    hpDamageRate: 0.03,
    afterglowSec: 3,
    noAttackSec: 2.5,
    fallHabitGain: 1,
    maxSec: 15,
    extendPerClimaxSec: 2,
    afterglowTurns: 10,
    afterglowMinTurns: 3,
    afterglowReducePerClimax: 1,
    afterglowDrainRate: 0.2,
    drainMultStart: 3,
    drainMultEnd: 6,
    tickSec: 1,
    startHpLossRate: 0.3,
    extendPerBinderSec: 5,
    extendMaxPerClimaxSec: 5,
    extraBinderDrainMult: 0.5,
    // 絶頂の瞬間の、まとめての吸い上げ（「現在レベルの必要EXP」に対する割合）
    startDrain: { expRate: 0.9, perBinder: 0.35, perCount: 0.15, countCap: 1.0, shareMul: 1.2 }
  },
  // 敵どうしの絆（チャームポイントのこすり合わせ）。時間はリアルタイムの秒
  pairBond: {
    durationSec: 30,
    stages: [10, 20],         // 能力上昇 → 負け癖の共有・部位の技の強化
    startChance: 0.3,         // 主人公の1ターンごと、隣り合った二人が始める確率（見えている二人だけ）
    bindStartChance: 0.16,    // 拘束中（1秒あたり）
    relatedMul: 2.0,          // 関連のある二人（enemyGroups.js）は始めやすい
    sameAttrMul: 1.4,         // 同じ部位どうしも始めやすい
    hiddenStopSec: 4,         // 見えない間は止まり、この秒数見えないと終わる
    watchCondGain: 0.12,      // 見せつけられている間、二人の蓄積デバフが1回ごとに増える量
    watchStatusChance: 0.25,  // 段階1以降、目移り（目が離せない）になる確率
    maxActive: 2,
    range: 12,                // 主人公からこの距離までの敵だけ（見せるため）
    pulseSec: 1.3,
    levelGain: 2,
    powerMul: 1.15,
    skillMul: 1.3,
    completePowerMul: 1.25,
    familiarSpeedPerBond: 0.25,   // 前に絆を結んだ二人は早い
    familiarSpeedCap: 1.0
  },
  // ユナイト攻撃（絆を結んだ二人の連携）
  unite: {
    chance: 0.45,
    partnerRange: 2,          // 相方が主人公からこの距離にいれば
    cooldownTurns: 6,
    mpRate: 0.22,
    expRate: 0.35,
    condGain: 1.2,
    bindDrainMul: 1.3,
    groupChance: 0.2,         // 絆が無くても、同じまとまりの仲間と連携する確率
    groupPowerMul: 0.8,       // 絆の無い連携は、少しだけ弱い
    // 種類ごとの倍率（mp / exp / cond / bindDrain / surrender / noBind / bindDelay）
    effects: {
      chorus: { mp: 1.3, bindDrain: 1.2 },
      rush: { mp: 1.1, surrender: 0.1 },
      whisper: { mp: 1.0, cond: 1.6 },
      doubleDrain: { mp: 1.2, exp: 2.2 },
      judgment: { mp: 1.6, bindDelay: 2.0 },
      command: { mp: 1.0, surrender: 0.3 },
      capture: { mp: 1.0, surrender: 0.25, bindDrain: 1.2 },
      lullaby: { mp: 1.1, surrender: 0.2 },
      gaze: { mp: 1.0, cond: 1.4 },
      kiss: { mp: 1.3 },
      pafu: { mp: 1.2, surrender: 0.15 },
      hipPress: { mp: 1.2 },
      legLock: { mp: 1.1, surrender: 0.15 },
      hand: { mp: 0.9, exp: 1.8 },
      sandwich: { mp: 1.2, bindDrain: 1.15 }
    }
  },
  // ---- お金・貢ぎ・装備・アイテム ----
  economy: {
    killGold: { base: 6, perLevel: 2 },     // 敵を倒したときの所持金
    // 盗む技：所持金の割合と、アイテムを1つ盗む確率
    steal: {
      thiefSlip: { gold: 0.08 },
      backstabSteal: { gold: 0.25, item: 0.35 },
      heartThief: { gold: 0.2, item: 0.2 },
      heartjackMaster: { gold: 0.4, item: 0.5 },
      sneakyTaste: { gold: 0.15 },
      secretLevelDrain: { gold: 0.1 }
    },
    gearWearPerPulse: 1,         // 拘束の吸収1回ごとに、その部位の装備が溶かされる量
    perfumeTurns: 20,
    perfumeExpMul: 1.5,
    manaVialRate: 0.4,
    incenseDrop: 3
  },
  // 見つめてしまう：マウスで敵の上にカーソルを乗せ続ける（gaze.js）
  gaze: {
    startSec: 1.5,        // この秒数見つめると「目が離せない」
    tickSec: 1.0,         // その後、この秒数ごとに蓄積デバフが進む
    gainPerTick: 0.25,    // 1回に進む量（その子の蓄積デバフ）
    rampPerSec: 0.15,     // 見つめ続けるほど強くなる（1秒ごと +15%）
    rampMax: 2,           // 最大 +200%
    statusTurns: 2,       // 「目が離せない」のターン数（見つめている間は更新され続ける）
    lineChance: 0.3       // 1回ごとに、その子が何か言う確率
  },
  // 敵にアイテムを奪われ、その場で使われてしまう
  itemSnatch: {
    chance: 0.12,             // 隣にいる敵が、行動の代わりにポーチを漁る確率
    bindChancePerSec: 0.04,   // 拘束中、1秒ごとに漁られる確率
    cooldownTurns: 8,         // 同じ敵が次に漁るまで
    healRate: 0.4,            // 魔力の小瓶：敵の HP 回復
    mpStealRate: 0.15,        // 魔力の小瓶：口移しで主人公の MP を奪う（最大MP比）
    incenseGain: 2,           // 安らぎの香：その子の匂いに変えて焚かれ、その子の蓄積デバフが増える
    perfumeGain: 1,           // 誘惑の香水：見えている敵みんなの蓄積デバフが増える
    temptTurns: 4,            // 浄めの雫：誘惑受容
    amuletExp: 60             // 身代わりのお守り：キスで穢されて砕かれ、その子が経験値を得る
  },
  // 拘束中のおねだりに「お金を差し出す」（貢ぎ）
  tribute: {
    rate: 0.3,                   // 所持金のこの割合を差し出す
    min: 10,
    escapeGain: 0.45,            // 脱出の進みがこの割合だけ進む
    expPerGold: 1.5,             // 貢いだ額 × この値の経験値を敵が得る（レベルが上がる）
    drainPerGold: 0.0004,        // 貢いだ累計 × この値だけ、その種族の吸収が強くなる
    drainCap: 0.6
  },
  // 敵からの贈り物（呪いの装備）
  gifts: {
    chance: { accept: 0.4, timeout: 0.55, request: 0.3 },
    maxLevel: 3,
    drainPerLevel: 0.2,          // その種族の吸収 +20%/段
    escapePerLevel: 0.1,         // その種族の拘束の脱出必要数 +10%/段
    resistDownPerLevel: 6,       // その部位の耐性 -6/段
    expBonusPerLevel: 0.15,      // 恩恵：倒した敵の経験値 +15%/段
    goldBonusPerLevel: 0.2,      // 恩恵：拾うお金 +20%/段
    acheChancePerLevel: 0.2      // 階の始まりに、その種族の負け癖が進む確率/段
  },
  // 行商ちゃん
  merchant: {
    floorChance: 0.7,
    corruptionPriceMul: 0.12,    // 堕ち度1段ごとの値上がり
    expPerGold: 2,               // 経験値で払うときの換算
    dealDiscount: 0.5,           // 負け癖を差し出したときの値引き
    removeGift: { base: 120, perLevel: 80 },
    buyBackMul: 2
  },
  // 拠点（雪辱ポイント）
  baseCamp: {
    rpOnDefeat: { base: 10, perFloor: 5, perClimax: 2 },
    rpOnClear: 60
  },
  // 敗北の搾取（ゲームオーバー時）
  defeatHarvest: {
    range: 7,               // 見えていなくても、この距離の敵は集まってくる
    maxEnemies: 6,
    expRate: 3.0,           // 「現在レベルの必要EXP」× この値を、全員で吸い尽くす
    perEnemy: 0.3,          // まわりの敵1体ごとの上乗せ
    waves: 3,
    firstWaveSec: 1.0,
    waveGapSec: 0.75,
    shareMul: 1.5,          // 敵が得る経験値の倍率
    bystanderLoseChance: 0.6,   // 一緒にいた別種族の負け癖も進む確率
    resistDrop: 2,
    maxResistAttrs: 3,
    tailSec: 1.6
  },
  erosion: {
    limit: 100,
    base: { beatenDown: 10, climaxDefeat: 20, charmDefeat: 20, beggingDefeat: 20, betrayalDefeat: 25 },
    surrenderBonusRate: 0.5,
    climaxBonusPerCount: 3,
    climaxBonusMax: 9,
    allyCaptured: 5,
    eliteOrRevenge: 5,
    gainMin: 10,
    gainMax: 45
  },
  ally: {
    hp: 120,
    mp: 150,
    charmRate: { mage: 1.3, priest: 1.7 },
    startResist: -20,
    runThreshold: { mage: 60, priest: 50 },
    recoverBelow: 40,
    stunTurns: 2,
    callCooldownTurns: 8,
    callCharmDown: 40,
    captureHpRatePerSec: 0.04,
    rescueMp: [40, 30, 20, 10, 5],
    rescueInvincibleSec: [4, 3, 2, 1, 0.5],
    charmOnHit: 3,
    charmOnDrain: 5,
    witnessRange: 6,
    charmDecay: 2,
    healRate: 0.3,
    healCostMp: 20,
    healCooldownTurns: 6,
    healRange: 4,
    mpRegenPerTurn: 2
  },

  // ---- 成長・癖 ----
  abilities: { maxLevel: 10, totalCapPerRace: 60, ptPerLevel: 3 },
  // ---- 柔らかさ（v6.7）----
  softness: {
    default: 50,
    tiers: { normal: 25, soft: 50, melting: 75 },
    drainBonus: 0.30,
    escapeBonus: 0.20,
    touchBonus: 0.15
  },
  habit: {
    loseMax: 8,
    loseAbsorbPerStage: 0.12,
    loseMpPerStage: 0.10,
    loseAttackPerStage: 0.04,
    loseAttackCap: 0.30,
    fallMax: 5,
    touchMax: 5,
    touchPerStage: 3,
    beggingMax: 3,
    allyTargetMax: 5
  },

  // ---- 敵の学習（v6.6）----
  learning: {
    markMax: 100,
    tiers: { familiar: 30, knowing: 65 },
    gain: {
      beatenDown: 8,
      climaxDefeat: 12,
      charmDefeat: 12,
      beggingDefeat: 12,
      betrayalDefeat: 14,
      charmSuccess: 5,
      beggingSuccess: 6,
      climax: 3
    },
    loss: { kill: 2, resistCharm: 1 },
    bystanderRate: 0.5,         // 同じ戦闘にいた他の種族への加算率
    clearDungeonLoss: 5,        // ダンジョンクリアで全種族から引く量
    weight: { attackCut: 0.6, bindGain: 1.0, tacticGain: 0.6, specialGain: 0.6 },
    teasingPerLevel: 0.06,
    rememberBoost: 0.6,         // 最後に負けた技の重みの上乗せ
    rememberTierBonus: { stranger: 0, familiar: 0.2, knowing: 0.4 },
    rememberPositionBias: 0.3,  // 記憶した拘束技の位置取りを優先する度合い
    codexBase: { attack: 3, bind: 2, special: 1, tactic: 1 }   // 図鑑の「傾向」の基準
  },

  // ---- 音 ----
  audio: {
    maxVoices: 16,
    muffleMinHz: 650,         // 両耳をふさがれたときに、周りの音がここまでこもる
    pitchJitter: 0.06,
    allyGain: 0.7,
    fileExts: ['ogg', 'mp3', 'wav']
  },
  spatial: {
    panStrength: 0.9,
    fadeTiles: 8,
    minGain: 0.35,
    behindDot: -0.4,
    behindLowpassHz: 2200,
    verticalPitch: 0.04
  },
  // ---- 探索（ステップ1）----
  dungeon: {
    width: 66,
    height: 46,
    floorsPerDungeon: 3,
    // 複数の敵に囲まれやすいよう、広めの部屋と大広間、幅の広い通路にする
    rooms: { min: 6, max: 9, attempts: 120, minSize: 6, maxSize: 11 },
    halls: { min: 1, max: 2, minW: 13, maxW: 17, minH: 9, maxH: 12 },   // 大広間
    corridorWidth: { min: 2, max: 3 },
    extraCorridorRate: 0.5,
    fovRadius: 7,
    roomLit: true,
    enemySpecies: ENEMIES.map((enemy) => enemy.id),
    // 個体ごとの重み。デバッグ画面で指定した敵は、その値で上書きできる。
    enemyRankWeightByFloor: {
      1: { basic: 1, unique: 0, elite: 0 },
      2: { basic: 1, unique: 0.25, elite: 0 },
      3: { basic: 0.55, unique: 0.8, elite: 0.6 }
    },
    enemiesPerFloor: { min: 8, max: 11, perFloor: 2 },   // 階が深いほど perFloor ずつ増える
    packSize: { min: 2, max: 4 },     // 敵は数体ずつの群れで置く
    relatedPackChance: 0.7,           // 群れの仲間が、頭と関連のある敵（enemyGroups.js）になる確率
    packRadius: 2,
    // 時間がたつと、見えない所から敵が増える（maxEnemies まで）
    reinforce: { everyTurns: 12, maxEnemies: 16, minPathDist: 10 },
    // 拘束されると、声を聞きつけた敵が見えない所から来る。bindAggroRange 以内の敵も気づいて寄ってくる
    bindCall: { min: 1, max: 2, minPathDist: 5, maxPathDist: 12 },
    bindAggroRange: 18,
    // 大広間の待ち伏せ：入ると MP が mpRestore だけ戻り、縁に min〜max 体の敵が現れる
    ambush: { min: 3, max: 5, minDistance: 4, mpRestore: 0.25 },
    enemyMinDistance: 7,
    aggroRange: 9,
    wanderChance: 0.5,
    allies: ['priest']
  },
  explore: {
    moveSec: 0.12,
    tapWindowSec: 0.2,
    diagonalGraceSec: 0.05,
    mergeSec: 0.06,
    cameraFollow: 14,
    bannerSec: 2.5,
    minimapScale: 3,
    bumpIntervalSec: 0.5,
    combatSec: 0.22
  },

  // ---- 画面表示 ----
  floatLog: {
    maxLines: 7,
    minorLifeSec: 5,
    majorLifeSec: 9,
    fadeInSec: 0.2,
    fadeOutSec: 1.2,
    rankFade: 0.14,
    slideSpeed: 12,
    maxPerSec: 3,
    mergeWindowSec: 3,
    queueMax: 20,
    historyMax: 100,
    fontPx: 16,
    majorFontPx: 19,
    lineGapPx: 6,
    leftMarginPx: 20,
    bottomMarginPx: 24,
    outlinePx: 3
  },
  kissMark: {
    max: 10,
    popSec: 0.12,
    fadeOutSec: 16,
    minDistance: 90,
    sideBias: 0.3,
    sizePx: 240,
    fadeHoldSec: 4
  },
  cursor: { heartColor: '#ff4fa3', size: 32 },
  expPopup: { mergeSec: 0.25 },
  // 拘束中のおねだり（数値は仮）
  bindRequest: {
    firstSec: 4,             // 拘束されてから最初のおねだりまで
    everySec: 7,             // 次のおねだりまで
    timeoutSec: 3.5,         // 答えないと受け入れたことになる
    acceptPushback: 0.3,     // 受け入れると、脱出の進みがこの割合だけ戻る
    acceptSurrender: 0.12,   // 受け入れると、降参の度合いが増える
    blissSec: 4,             // 受け入れたあと、甘い演出が強まる時間
    refuseSec: 4,            // 拒んだあと、吸われる量が増える時間
    refuseDrainMul: 1.4,
    lowMpWhisperRatio: 0.25  // MPがこの割合を下回ると、拘束役が囁く
  },
  // 前に負けた敵と再会したときの煽り。負けた回数がこの数以上で、段階が上がる
  encounterTaunt: { tiers: [1, 3, 6] },
  // 堕ち度の表示（ハートの刻印）。mood が最大のとき、画面の縁がこの濃さで桃色に染まる
  corruptionUi: { x: 16, y: 160, edgeAlpha: 0.14 },
  // 強くなった敵の頭上のハート（上位技 2、進化した技 1つにつき 1、敵の成長 levelsPerHeart ごとに 1）
  enemyPower: { advanced: 2, evolvedSkill: 1, levelsPerHeart: 3, max: 5 },
  climaxSe: { delays: [0, 0.5] },   // 絶頂の音（climaxBurst）を鳴らすタイミング（秒）。重ねて鳴らす
  bgm: { fadeSec: 1.2, synthWhileLoading: false },   // BGM の切り替えのフェード。曲は public/assets/bgm/<explore|bound>.ogg など
  footsteps: { enemyRange: 6, enemyIntervalSec: 0.08 },   // 敵の足音が聞こえる距離（マス）と、鳴らす最短間隔
  // レベル表示（画面座標）。吸われた分の残像と、吸い出されるハートの量
  levelHud: {
    x: 326, y: 62, radius: 34,
    ghostHoldSec: 0.35, ghostShrinkPerSec: 0.6,
    bigDrainRatio: 0.3,       // 必要EXPのこの割合を一度に吸われると、演出が最大
    particleMin: 4, particleMax: 18,
    downSec: 1.8,
    drainSeIntervalSec: 0.35  // 吸われる音を鳴らす最短の間隔
  },   // 敵の経験値ポップアップを、この秒数のあいだ合算して1つにする
  fx: {
    kissMarkQuality: 2,
    shake: { px: 4, sec: 0.2 },
    tintAlpha: 0.22,
    tintSec: 0.7,
    tintMinSec: 1.5,
    heart: {
      max: 120,
      basePx: 88,
      color: '#ff4fa3',
      lifeMin: 2.4,
      lifeMax: 3.8,
      riseMin: 42,
      riseMax: 88,
      swayPx: 18,
      popSec: 0.22
    },
    bound: { strapAlpha: 0.28, pulseAlpha: 0.2 }
  },
  flashbackFx: {
    minGapSec: 2.2,
    erectTurns: 3,
    inputLockSec: 0.35,
    riseSec: 0.3,
    holdSec: 0.5,
    durationSec: { touch: 1.3, strong: 1.7, rematch: 1.5, bind: 1.5 },
    kindScale: { touch: 0.85, strong: 1, rematch: 0.95, bind: 1 },
    reducedScale: 0.6,
    warp: { enabled: true },
    art: {
      sizePx: 620,
      alpha: 1.0,
      echoAlpha: 0.4,
      echoCount: 2,
      echoLagSec: 0.14,
      pushIn: 0.12,
      pulseHz: 1.1,
      pulseAmp: 0.02,
      driftPx: 14,
      glowAlpha: 0.28,
      outputPx: 512
    },
    hearts: {
      beats: 2,
      beatGapSec: 0.2,
      popAmp: 0.22,
      popAttackSec: 0.05,
      popDecaySec: 0.3,
      sizePx: 280,
      fillAlpha: 0.16,
      lineAlpha: 0.55,
      lineWidthPx: 5,
      ringAlpha: 0.4,
      ringMaxPx: 560,
      ringLifeSec: 0.7,
      smallCount: 14,
      smallSizePx: [14, 30],
      smallReachPx: [180, 340],
      smallLifeSec: 1.0,
      smallAlpha: 0.75
    },
    full: {
      blurPx: 4,
      invert: 0.15,
      desaturate: 0.4,
      dim: 0.3,
      warpScale: 12
    },
    reduced: { artAlpha: 0.35 }
  },
  stage: {
    maxDt: 0.25,
    bannerCategories: ['special', 'bind'],
    defaults: {
      attack: { flashSec: 0, durationSec: 0.35, hitAt: 0.05 },
      special: { flashSec: 0.25, durationSec: 0.8, hitAt: 0.1 }
    },
    banner: { y: 96, minWidthPx: 360, fontPx: 34, subPx: 18, holdMinSec: 1, fadeInSec: 0.12, fadeOutSec: 0.3, slidePx: 40 },
    flash: { localAlpha: 0.35, veilAlpha: 0.08, radiusPx: 150 }
  },
  temptation: {
    warningSec: 3,
    timeoutSec: 6,
    preludeSec: 1.8,          // 技名 → 敵の誘惑を見せてから、選択肢の画面を出すまで
    replySec: 1.1,            // 選んだあと、返事の台詞を見せる時間
    beatSec: 0.95,            // 選択肢の画面の鼓動の間隔
    beatWarnSec: 0.6,         // 3秒経過後の鼓動の間隔（速くなる）
    portraitAlpha: 0.76,
    edgeWidthPx: 72,
    acceptDrainMul: 1.25,
    timeoutDrainMul: 1.8,
    acceptCondMul: 2.0,       // 受け入れたときの、蓄積デバフの増え方
    timeoutCondMul: 2.3,      // 時間切れ（自動受容）。受け入れより少しだけ多い
    resistEvadeBonus: 0.55,   // 「避ける」を選んだときの回避率の上乗せ（必ず避けられるわけではない）
    cooldownTurns: 4,         // 同じ敵が選択肢を出せるようになるまでのターン数
    evolveManualAccept: 3,    // 自発的受容の累計で技が進化する回数
    evolveTimeoutAccept: 4,   // 時間切れ受容の累計で技が進化する回数
    // 離れた所からの誘惑を受け入れたとき：技が強く効き、自分から歩み寄ってそのまま拘束される
    rangedAccept: { drainMul: 1.7, condMul: 1.6, bindDrainMul: 1.5, surrender: 0.35, stepSec: 0.22, maxSteps: 10 }
  },
  buffs: {
    durationTurns: 20
  },
  priest: {
    expPerLevel: 120,
    maxHp: 120,
    actEveryTurns: 10,
    healRate: 0.05,
    defaultTargetRate: 0.3,
    maxBinders: 2,
    pulseSec: 3,
    pulseMp: 8,
    pulseExp: 6,
    hitMp: 12,
    hitExp: 9,
    mp0HpLossRate: 0.6,
    rescueHits: 6,
    charmMax: 100
  },
  debug: {
    heroLevelMax: 1000,
    spatialLog: false,
    bindLog: false
  }
});

export default B;
