// File: src/data/skillsWave4.js
// 追加18体の後半10体（elite）の技の定義（構造のみ。数値は balance.js の skills）。skills.js / defeatSkills.js に合流する。
// 後半で追加した項目（処理は src/battle/enemyTraits.js）：
//   charmChain  主人公が魅了中に当たると、集中力低下・脱力・魔力漏出を連鎖で付ける（魅了の連鎖）
//   gaze        当たると視線ロックが1段進む。最大で動けなくなる（目を逸らすと戻る）
//   backstep    主人公の背後へ回り込む（次の拘束が背面からになる）
//   forceFace   主人公の顔を、その子の方へ向けさせる
//   giveMp      受け入れると、MP を自分から差し出す（魔力を、ちょうだい／もっとちょうだい）
//   sweetDeal   受け入れると、その場で MP と HP が回復する代わりに、自滅癖と尻の耐性が永続で下がる
export const WAVE4_SKILL_DEFS = {
  // ---- 魔性のお嬢様（胸・口）：上品に見下し、魅了を連鎖させる ----
  ladyHand: { category: 'attack', attr: 'bust', fx: 'embrace', se: 'ladyCurtsy',
    cond: { id: 'charmSeal', gain: 0.6 }, charmChain: true, evolve: { type: 'repeated_use', need: 15 } },
  demonicKissHug: { category: 'bind', attr: 'mouth', fx: 'kiss', se: 'deepDrainKiss', evolve: { type: 'finish', need: 1 } },
  charmEye: { category: 'special', attr: 'bust', fx: 'pose', se: 'gazeLock', motion: 'skill_blowKiss', windupSe: 'ladyCurtsy',
    cond: { id: 'charmSeal', gain: 1.5 }, status: { id: 'charmed', turns: 1, chance: 0.6 }, evolve: { type: 'debuff_max', need: 1 } },
  sweetOrder: { category: 'special', attr: 'mouth', fx: 'pose', se: 'royalBell', motion: 'skill_sexyPose',
    resist: 'dodge', gentle: true, charmChain: true, cond: { id: 'charmSeal', gain: 2 }, acceptStatus: { id: 'obedient', turns: 4 },
    evolve: { type: 'choice_count', need: 3 } },
  charmCascade: { category: 'special', attr: 'mouth', fx: 'kiss', se: 'deepDrainKiss', motion: 'skill_blowKiss', windupSe: 'gazeLock',
    charmChain: true, cond: { id: 'charmSeal', gain: 1.2 }, evolve: { type: 'exp_absorbed', need: 200 } },
  absoluteCharmEye: { category: 'special', attr: 'bust', fx: 'pose', se: 'gazeLock', motion: 'skill_sexyPose', windupSe: 'royalBell',
    charmChain: true, cond: { id: 'charmSeal', gain: 3 }, status: { id: 'charmed', turns: 1, chance: 1 }, advancedFrom: 'demonicKissHug' },

  // ---- いじわる小悪魔ちゃん（手・胸・口）：弱点を解析して、経験値を直接盗む ----
  weakSpotTouch: { category: 'attack', attr: 'hand', fx: 'hit', se: 'punishSlap',
    cond: { id: 'weakExposure', gain: 0.6 }, evolve: { type: 'repeated_use', need: 15 } },
  weakAnalysisHold: { category: 'bind', attr: 'bust', fx: 'embrace', se: 'handDrain', bindExpMul: 2.0, evolve: { type: 'finish', need: 1 } },
  weakDiagnosis: { category: 'special', attr: 'mouth', fx: 'pose', se: 'whisperPosho', motion: 'skill_blowKiss',
    cond: { id: 'weakExposure', gain: 1.5 }, status: { id: 'weakExposed', turns: 3, chance: 1 }, evolve: { type: 'debuff_max', need: 1 } },
  weakPointDrain: { category: 'special', attr: 'hand', fx: 'kiss', se: 'handDrain', motion: 'skill_sexyPose', windupSe: 'whisperPosho',
    cond: { id: 'weakExposure', gain: 1 }, evolve: { type: 'exp_absorbed', need: 200 } },
  weakRevealed: { category: 'special', attr: 'mouth', fx: 'pose', se: 'insultGiggle', motion: 'skill_blowKiss',
    resist: 'dodge', gentle: true, cond: { id: 'weakExposure', gain: 2 }, acceptStatus: { id: 'weakExposed', turns: 5 },
    evolve: { type: 'choice_count', need: 3 } },
  completeLevelDrain: { category: 'special', attr: 'hand', fx: 'kiss', se: 'handDrain', motion: 'skill_sexyPose', windupSe: 'insultGiggle',
    cond: { id: 'weakExposure', gain: 3 }, advancedFrom: 'weakAnalysisHold' },

  // ---- 控えめアイドル（胸・口）：ハートのビーム。決まるたびに自信がつく ----
  shyStep: { category: 'attack', attr: 'bust', fx: 'embrace', se: 'idolSparkle',
    cond: { id: 'gazeNailed', gain: 0.6 }, evolve: { type: 'repeated_use', need: 15 } },
  idolHold: { category: 'bind', attr: 'bust', fx: 'embrace', se: 'idolSparkle', evolve: { type: 'finish', need: 1 } },
  sexyBeam: { category: 'special', attr: 'mouth', fx: 'blowKiss', se: 'heartBeam', motion: 'skill_blowKiss', windupSe: 'idolSparkle',
    cond: { id: 'gazeNailed', gain: 1.5 }, status: { id: 'slowed', turns: 2, chance: 0.6 }, evolve: { type: 'repeated_use', need: 8 } },
  lookAtMe: { category: 'special', attr: 'bust', fx: 'pose', se: 'idolSparkle', motion: 'skill_sexyPose',
    resist: 'dodge', gentle: true, cond: { id: 'gazeNailed', gain: 2 }, acceptStatus: { id: 'charmed', turns: 1 },
    evolve: { type: 'choice_count', need: 3 } },
  heartfulEncore: { category: 'special', attr: 'mouth', fx: 'blowKiss', se: 'heartBeam', motion: 'skill_blowKiss', windupSe: 'idolSparkle',
    cond: { id: 'gazeNailed', gain: 1.2 }, evolve: { type: 'debuff_max', need: 1 } },
  centerStage: { category: 'special', attr: 'bust', fx: 'pose', se: 'heartBeam', motion: 'skill_sexyPose', windupSe: 'idolSparkle',
    cond: { id: 'gazeNailed', gain: 3 }, status: { id: 'charmed', turns: 1, chance: 1 }, advancedFrom: 'idolHold' },

  // ---- 堕落のお姉さん（尻）：その場の回復と引き換えに、長く弱らせる ----
  sisterTease: { category: 'attack', attr: 'hip', fx: 'hit', se: 'hipStroke',
    cond: { id: 'selfRuin', gain: 0.6 }, evolve: { type: 'repeated_use', need: 15 } },
  ruinHipHold: { category: 'bind', attr: 'hip', fx: 'embrace', se: 'wallPress', evolve: { type: 'finish', need: 1 } },
  sweetDealOffer: { category: 'special', attr: 'hip', fx: 'pose', se: 'coinTribute', motion: 'skill_sexyPose',
    resist: 'dodge', gentle: true, sweetDeal: true, cond: { id: 'selfRuin', gain: 2 }, acceptStatus: { id: 'corrupted', turns: 4 },
    evolve: { type: 'choice_count', need: 3 } },
  rewardHipAttack: { category: 'special', attr: 'hip', fx: 'hit', se: 'dokkan', motion: 'skill_sexyPose', windupSe: 'warning',
    cond: { id: 'selfRuin', gain: 1.2 }, evolve: { type: 'repeated_use', need: 8 } },
  justOnceMore: { category: 'special', attr: 'hip', fx: 'pose', se: 'sweetWhisper', motion: 'skill_blowKiss',
    cond: { id: 'selfRuin', gain: 1.5 }, status: { id: 'tempted', turns: 3, chance: 1 }, evolve: { type: 'debuff_max', need: 1 } },
  ruinPamperPress: { category: 'special', attr: 'hip', fx: 'hit', se: 'wallPress', motion: 'skill_sexyPose', windupSe: 'sweetWhisper',
    cond: { id: 'selfRuin', gain: 3 }, advancedFrom: 'ruinHipHold' },

  // ---- 桃髪サキュバス（胸）：奪った魔力の分だけ、吸い方がうまくなる ----
  manaSeekTouch: { category: 'attack', attr: 'bust', fx: 'embrace', se: 'manaDrip',
    cond: { id: 'manaAbsorbHabit', gain: 0.6 }, evolve: { type: 'repeated_use', need: 15 } },
  succubusHold: { category: 'bind', attr: 'bust', fx: 'embrace', se: 'pafuDrain', evolve: { type: 'finish', need: 1 } },
  manaTaste: { category: 'special', attr: 'bust', fx: 'pose', se: 'manaDrip', motion: 'skill_blowKiss',
    cond: { id: 'manaAbsorbHabit', gain: 1.2 }, status: { id: 'manaLeak', turns: 3, chance: 0.7 }, evolve: { type: 'repeated_use', need: 8 } },
  giveMeMore: { category: 'special', attr: 'bust', fx: 'embrace', se: 'pafuDrain', motion: 'skill_sexyPose',
    resist: 'dodge', gentle: true, giveMp: 0.25, cond: { id: 'manaAbsorbHabit', gain: 2 }, acceptStatus: { id: 'manaLeak', turns: 5 },
    evolve: { type: 'choice_count', need: 3 } },
  manaPlunder: { category: 'special', attr: 'bust', fx: 'embrace', se: 'succubusSuck', motion: 'skill_sexyPose', windupSe: 'manaDrip',
    cond: { id: 'manaAbsorbHabit', gain: 1.2 }, evolve: { type: 'debuff_max', need: 1 } },
  supremeManaHold: { category: 'special', attr: 'bust', fx: 'embrace', se: 'succubusSuck', motion: 'skill_sexyPose', windupSe: 'manaDrip',
    cond: { id: 'manaAbsorbHabit', gain: 3 }, advancedFrom: 'succubusHold' },

  // ---- むちむち小悪魔（尻）：見つめるほど目が離せない視線ロック ----
  curvyTouch: { category: 'attack', attr: 'hip', fx: 'hit', se: 'hipBounce',
    cond: { id: 'gazeDependence', gain: 0.6 }, evolve: { type: 'repeated_use', need: 15 } },
  curvyHipHold: { category: 'bind', attr: 'hip', fx: 'embrace', se: 'thighSquish', evolve: { type: 'finish', need: 1 } },
  lookBackTempt: { category: 'special', attr: 'hip', fx: 'pose', se: 'hipBounce', motion: 'skill_sexyPose',
    gaze: true, cond: { id: 'gazeDependence', gain: 1.2 }, evolve: { type: 'debuff_max', need: 1 } },
  stillWatching: { category: 'special', attr: 'hip', fx: 'pose', se: 'gazeLock', motion: 'skill_sexyPose',
    resist: 'dodge', gentle: true, gaze: true, cond: { id: 'gazeDependence', gain: 2 }, acceptStatus: { id: 'feinted', turns: 4 },
    evolve: { type: 'choice_count', need: 3 } },
  gazeHipAttack: { category: 'special', attr: 'hip', fx: 'hit', se: 'dokkan', motion: 'skill_sexyPose', windupSe: 'hipBounce',
    cond: { id: 'gazeDependence', gain: 1 }, evolve: { type: 'repeated_use', need: 8 } },
  gazeHipTrap: { category: 'special', attr: 'hip', fx: 'hit', se: 'thighSquish', motion: 'skill_sexyPose', windupSe: 'gazeLock',
    gaze: true, cond: { id: 'gazeDependence', gain: 3 }, advancedFrom: 'curvyHipHold' },

  // ---- 青髪プリンセス（胸・口・手）：静かに、長く拘束するほど丁寧に徴収する ----
  princessFingertip: { category: 'attack', attr: 'hand', fx: 'hit', se: 'royalBell',
    cond: { id: 'manaTribute', gain: 0.6 }, evolve: { type: 'repeated_use', need: 15 } },
  princessEmbrace: { category: 'bind', attr: 'bust', fx: 'embrace', se: 'royalBell', evolve: { type: 'finish', need: 1 } },
  quietOrder: { category: 'special', attr: 'mouth', fx: 'pose', se: 'royalBell', motion: 'skill_blowKiss',
    cond: { id: 'manaTribute', gain: 1.2 }, status: { id: 'obedient', turns: 2, chance: 0.6 }, evolve: { type: 'repeated_use', need: 8 } },
  giveMeMana: { category: 'special', attr: 'hand', fx: 'embrace', se: 'handDrain', motion: 'skill_sexyPose',
    resist: 'dodge', gentle: true, giveMp: 0.2, cond: { id: 'manaTribute', gain: 2 }, acceptStatus: { id: 'dependent', turns: 4 },
    evolve: { type: 'choice_count', need: 3 } },
  royalLevy: { category: 'special', attr: 'hand', fx: 'kiss', se: 'handDrain', motion: 'skill_sexyPose', windupSe: 'royalBell',
    cond: { id: 'manaTribute', gain: 1.2 }, evolve: { type: 'exp_absorbed', need: 200 } },
  princessPlunder: { category: 'special', attr: 'bust', fx: 'embrace', se: 'royalBell', motion: 'skill_sexyPose', windupSe: 'handDrain',
    cond: { id: 'manaTribute', gain: 3 }, advancedFrom: 'princessEmbrace' },

  // ---- 黒衣のシスター（尻）：拘束の重圧が、少しずつ増していく ----
  quietAdmonish: { category: 'attack', attr: 'hip', fx: 'hit', se: 'repentToll',
    cond: { id: 'resistDrain', gain: 0.6 }, evolve: { type: 'repeated_use', need: 15 } },
  blackPressHold: { category: 'bind', attr: 'hip', fx: 'embrace', se: 'wallPress', evolve: { type: 'finish', need: 1 } },
  pressureNotice: { category: 'special', attr: 'hip', fx: 'pose', se: 'repentToll', motion: 'skill_blowKiss',
    cond: { id: 'resistDrain', gain: 1.2 }, status: { id: 'cowed', turns: 3, chance: 1 }, evolve: { type: 'repeated_use', need: 8 } },
  willYouResist: { category: 'special', attr: 'hip', fx: 'pose', se: 'repentToll', motion: 'skill_sexyPose',
    resist: 'guard', gentle: true, cond: { id: 'resistDrain', gain: 2 }, acceptStatus: { id: 'weakened', turns: 5 },
    evolve: { type: 'choice_count', need: 3 } },
  silentPressure: { category: 'special', attr: 'hip', fx: 'hit', se: 'wallPress', motion: 'skill_sexyPose', windupSe: 'repentToll',
    cond: { id: 'resistDrain', gain: 1.2 }, status: { id: 'pinned', turns: 1, chance: 0.5 }, evolve: { type: 'debuff_max', need: 1 } },
  absolutePressure: { category: 'special', attr: 'hip', fx: 'hit', se: 'wallPress', motion: 'skill_sexyPose', windupSe: 'repentToll',
    cond: { id: 'resistDrain', gain: 3 }, advancedFrom: 'blackPressHold' },

  // ---- 白銀バニー（胸・手）：背後から捕まえ、経験値まで盗む（選択肢付き技は無い） ----
  bunnyManaTouch: { category: 'attack', attr: 'hand', fx: 'hit', se: 'manaDrip',
    cond: { id: 'backFear', gain: 0.6 }, evolve: { type: 'repeated_use', need: 15 } },
  silverCling: { category: 'bind', attr: 'bust', fx: 'embrace', se: 'squeezeHug', bindExpMul: 1.6, evolve: { type: 'finish', need: 1 } },
  limpHug: { category: 'special', attr: 'bust', fx: 'embrace', se: 'squeezeHug', motion: 'skill_sexyPose',
    cond: { id: 'backFear', gain: 1.2 }, status: { id: 'limp', turns: 2, chance: 1 }, evolve: { type: 'repeated_use', need: 8 } },
  backOpen: { category: 'special', attr: 'hand', fx: 'pose', se: 'missWhoosh', motion: 'skill_blowKiss', windupSe: 'warning',
    backstep: true, cond: { id: 'backFear', gain: 1.5 }, status: { id: 'exposed', turns: 2, chance: 1 }, evolve: { type: 'repeated_use', need: 6 } },
  expPlease: { category: 'special', attr: 'hand', fx: 'kiss', se: 'handDrain', motion: 'skill_sexyPose', windupSe: 'manaDrip',
    cond: { id: 'backFear', gain: 1 }, evolve: { type: 'exp_absorbed', need: 200 } },
  silverPlunder: { category: 'special', attr: 'bust', fx: 'embrace', se: 'handDrain', motion: 'skill_sexyPose', windupSe: 'missWhoosh',
    backstep: true, cond: { id: 'backFear', gain: 3 }, advancedFrom: 'silverCling' },

  // ---- 強引な桃髪メイド（胸・口）：顔を逸らす癖まで覚えて、視線を矯正する ----
  maidGuide: { category: 'attack', attr: 'mouth', fx: 'pose', se: 'maidBell',
    cond: { id: 'faceLock', gain: 0.6 }, evolve: { type: 'repeated_use', need: 15 } },
  pinkGazeBind: { category: 'bind', attr: 'bust', fx: 'embrace', se: 'gazeLock', evolve: { type: 'finish', need: 1 } },
  faceThisWay: { category: 'special', attr: 'mouth', fx: 'pose', se: 'gazeLock', motion: 'skill_blowKiss', windupSe: 'maidBell',
    forceFace: true, cond: { id: 'faceLock', gain: 1.5 }, status: { id: 'feinted', turns: 2, chance: 1 }, evolve: { type: 'repeated_use', need: 8 } },
  lookAwayQ: { category: 'special', attr: 'bust', fx: 'pose', se: 'gazeLock', motion: 'skill_sexyPose',
    resist: 'dodge', gentle: true, forceFace: true, cond: { id: 'faceLock', gain: 2 }, acceptStatus: { id: 'charmed', turns: 1 },
    evolve: { type: 'choice_count', need: 3 } },
  noEscapeMaid: { category: 'special', attr: 'bust', fx: 'hit', se: 'maidChorus', motion: 'skill_sexyPose', windupSe: 'maidBell',
    pull: true, maidCall: true, cond: { id: 'faceLock', gain: 1.2 }, evolve: { type: 'repeated_use', need: 6 } },
  pinkEscort: { category: 'special', attr: 'bust', fx: 'embrace', se: 'gazeLock', motion: 'skill_sexyPose', windupSe: 'maidChorus',
    forceFace: true, cond: { id: 'faceLock', gain: 3 }, advancedFrom: 'pinkGazeBind' }
};

export const WAVE4_SKILL_NAMES = {
  ladyHand: { name: 'お嬢様の魔手', kind: 'basic', attr: 'bust' },
  demonicKissHug: { name: '魔性の抱擁キッス', kind: 'bind', attr: 'mouth' },
  charmEye: { name: '魅了の魔眼', kind: 'special', attr: 'bust' },
  sweetOrder: { name: 'お嬢様の甘い命令', kind: 'special', attr: 'mouth' },
  charmCascade: { name: '魅惑の連鎖', kind: 'special', attr: 'mouth' },
  absoluteCharmEye: { name: '絶対魅了の魔眼', kind: 'special', attr: 'bust' },

  weakSpotTouch: { name: '弱点さがしタッチ', kind: 'basic', attr: 'hand' },
  weakAnalysisHold: { name: '小悪魔の弱点解析ホールド', kind: 'bind', attr: 'bust' },
  weakDiagnosis: { name: 'ぽしょぽしょ弱点診断', kind: 'special', attr: 'mouth' },
  weakPointDrain: { name: 'レベルドレイン・弱点突き', kind: 'special', attr: 'hand' },
  weakRevealed: { name: 'もう弱点バレちゃったね♡', kind: 'special', attr: 'mouth' },
  completeLevelDrain: { name: '完全攻略レベルドレイン', kind: 'special', attr: 'hand' },

  shyStep: { name: 'はにかみステップ', kind: 'basic', attr: 'bust' },
  idolHold: { name: 'あまあまアイドルホールド', kind: 'bind', attr: 'bust' },
  sexyBeam: { name: 'はにかみセクシービーム', kind: 'special', attr: 'mouth' },
  lookAtMe: { name: 'わたしを見てください♡', kind: 'special', attr: 'bust' },
  heartfulEncore: { name: 'ハートフル・アンコール', kind: 'special', attr: 'mouth' },
  centerStage: { name: '絶対魅了のセンターステージ', kind: 'special', attr: 'bust' },

  sisterTease: { name: 'お姉さんのいたずら', kind: 'basic', attr: 'hip' },
  ruinHipHold: { name: '堕落のヒップホールド', kind: 'bind', attr: 'hip' },
  sweetDealOffer: { name: 'お姉さんとの甘い取引', kind: 'special', attr: 'hip' },
  rewardHipAttack: { name: 'ご褒美ヒップアタック', kind: 'special', attr: 'hip' },
  justOnceMore: { name: 'もう一度だけ、ね♡', kind: 'special', attr: 'hip' },
  ruinPamperPress: { name: '破滅の甘やかしヒッププレス', kind: 'special', attr: 'hip' },

  manaSeekTouch: { name: '魔力さがしタッチ', kind: 'basic', attr: 'bust' },
  succubusHold: { name: '魔性の吸精ホールド', kind: 'bind', attr: 'bust' },
  manaTaste: { name: '魔力の味見', kind: 'special', attr: 'bust' },
  giveMeMore: { name: 'もっとちょうだい♡', kind: 'special', attr: 'bust' },
  manaPlunder: { name: '魔力ごっそりドレイン', kind: 'special', attr: 'bust' },
  supremeManaHold: { name: '極上の魔力吸収ホールド', kind: 'special', attr: 'bust' },

  curvyTouch: { name: '小悪魔のいたずらタッチ', kind: 'basic', attr: 'hip' },
  curvyHipHold: { name: 'むちむちヒップホールド', kind: 'bind', attr: 'hip' },
  lookBackTempt: { name: 'こあくま振り返り誘惑', kind: 'special', attr: 'hip' },
  stillWatching: { name: 'まだ見てたいんでしょ？♡', kind: 'special', attr: 'hip' },
  gazeHipAttack: { name: '見とれた隙にヒップアタック', kind: 'special', attr: 'hip' },
  gazeHipTrap: { name: '絶対視線のヒップトラップ', kind: 'special', attr: 'hip' },

  princessFingertip: { name: '王女の指先', kind: 'basic', attr: 'hand' },
  princessEmbrace: { name: '王女の静かな抱擁', kind: 'bind', attr: 'bust' },
  quietOrder: { name: '王女の静命', kind: 'special', attr: 'mouth' },
  giveMeMana: { name: '魔力を、ちょうだい', kind: 'special', attr: 'hand' },
  royalLevy: { name: '王家の魔力徴収', kind: 'special', attr: 'hand' },
  princessPlunder: { name: '王女の完全収奪', kind: 'special', attr: 'bust' },

  quietAdmonish: { name: '静かな戒め', kind: 'basic', attr: 'hip' },
  blackPressHold: { name: '黒衣の重圧ホールド', kind: 'bind', attr: 'hip' },
  pressureNotice: { name: '重圧の予告', kind: 'special', attr: 'hip' },
  willYouResist: { name: '抵抗なさいますか？', kind: 'special', attr: 'hip' },
  silentPressure: { name: '静寂の重圧', kind: 'special', attr: 'hip' },
  absolutePressure: { name: '絶対重圧の聖域', kind: 'special', attr: 'hip' },

  bunnyManaTouch: { name: 'バニーの魔力タッチ', kind: 'basic', attr: 'hand' },
  silverCling: { name: '白銀の密着ホールド', kind: 'bind', attr: 'bust' },
  limpHug: { name: 'ふわり脱力ハグ', kind: 'special', attr: 'bust' },
  backOpen: { name: '後ろ、空いてるよ♡', kind: 'special', attr: 'hand' },
  expPlease: { name: '経験値いただくね♡', kind: 'special', attr: 'hand' },
  silverPlunder: { name: '白銀の完全収奪', kind: 'special', attr: 'bust' },

  maidGuide: { name: 'メイドのご案内', kind: 'basic', attr: 'mouth' },
  pinkGazeBind: { name: '桃色の視線拘束', kind: 'bind', attr: 'bust' },
  faceThisWay: { name: 'こちらを向いてください♡', kind: 'special', attr: 'mouth' },
  lookAwayQ: { name: '目を逸らしますか？', kind: 'special', attr: 'bust' },
  noEscapeMaid: { name: '逃がしませんよ', kind: 'special', attr: 'bust' },
  pinkEscort: { name: '桃色の完全エスコート', kind: 'special', attr: 'bust' }
};
