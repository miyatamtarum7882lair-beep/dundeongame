// File: src/data/balance.js
// すべての暫定値はここに集約する。コードへ直書きしない。値は読み取り専用。
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
  ui: { fontFamily: '"Noto Sans JP", "Yu Gothic UI", "Hiragino Sans", "Meiryo", sans-serif' },

  // ---- 時間・状態 ----
  decision: { baseSec: 8, speedMin: 0.5, speedMax: 2.0 },   // speed は制限時間の減る速さ
  watchdog: { eventLockSec: 90 },

  // ---- 戦闘 ----
  battle: {
    rate: { sword: 0.13, fist: 0.22 },
    levelDiffRate: 0.06,
    guardMul: 0.5,
    beatSec: 0.2,
    baseWeights: { move: 3, attack: 3, bind: 2, special: 1 },
    drainPerLevel: 0.10,
    exp: { base: 12, perEnemyLevel: 6, need: 30, needPerLevel: 20 },
    levelUp: { hp: 10, mp: 8, healRate: 0.3 },
    regenRate: 0.01,
    defeatResistDrop: 5,
    touch: { mpRate: 0.08, resistDrop: 3 }
  },
  enemy: {
    baseHp: 60,
    hpPerLevel: 14,
    expBase: 200,
    expPerLevel: 60,
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
    sexyPose: { mpRate: 0.04, range: 3, allyCharm: 10, windup: true }
  },
  debuffPanel: {
    rowH: 28,
    maxRows: 8,
    glowFrom: 0.34,
    maxGlow: 0.30,
    pulseSec: 2.6
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
    tickSec: 2,               // 拘束中の1ターン
    pulseSec: 5,              // ドレインパルスの間隔
    firstPulseDelaySec: 1.0,  // 拘束成立から最初のパルスまで
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
    extraBinderDrainMult: 0.5
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
    maxVoices: 8,
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
    width: 56,
    height: 40,
    floorsPerDungeon: 3,
    rooms: { min: 6, max: 10, attempts: 80, minSize: 4, maxSize: 9 },
    extraCorridorRate: 0.34,
    fovRadius: 7,
    roomLit: true,
    enemySpecies: ['kitten', 'blackRibbon', 'pinkFox'],
    enemiesPerFloor: { min: 3, max: 5 },
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
  flashback: {
    durSec: 3,
    inSec: 0.1,
    startMul: 0.8,
    endMul: 1.5,
    fitRatio: 0.6,
    zoomMin: 0.5,
    zoomMax: 2.0,
    maxTintAlpha: 0.25,
    minIntervalSec: 8,
    cropMargin: 1.6,
    cropMaxPx: 1536,
    featherStart: 0.7,
    heartsOn: ['charm'],
    heartRing: 6,
    heartPerSpot: 2,
    reduced: { zoomScale: 0.6, endMul: 1.1, tintScale: 0.5 },
    erectSec: 3,
    erectActionDelaySec: 0.35,
    portraitWaitMs: 250,
    maxZoom: 2.6,
    reducedMaxZoom: 1.6,
    noiseFps: 12
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
    spatialLog: false,
    bindLog: false
  }
});

export default B;
