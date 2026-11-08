// File: src/data/skillsWave3.js
// 追加18体の前半8体（unique）の技の定義（構造のみ。数値は balance.js の skills）。skills.js / defeatSkills.js に合流する。
// 項目の意味は skills.js・skillsWave1.js・skillsWave2.js の先頭を参照。前半で追加した項目：
//   acceptGrow  選択肢で「自分から」受け入れると、その子が成長する（時間切れは対象外。過保護の罠・ご褒美の罠など）
//   maidCall    この技を使うと、階にいるメイドたちが主人公の居場所を知って集まってくる（メイド連携追跡）
// 敵ごとの記憶（逃げた回数・脱出の仕方・カモ認定・諦めた回数）は src/battle/enemyMemory.js。
export const WAVE3_SKILL_DEFS = {
  // ---- 金髪メイドさん（胸・足）：無愛想な敬語で、仲間のメイドと追い詰める ----
  maidChaseStep: { category: 'attack', attr: 'foot', fx: 'stomp', se: 'heelStep',
    cond: { id: 'fatigue', gain: 0.6 }, evolve: { type: 'repeated_use', need: 15 } },
  blondeMaidHold: { category: 'bind', attr: 'bust', fx: 'embrace', se: 'squeezeHug', evolve: { type: 'finish', need: 1 } },
  pathBlock: { category: 'special', attr: 'foot', fx: 'stomp', se: 'heelStep', motion: 'skill_sexyPose', windupSe: 'maidBell',
    cond: { id: 'fatigue', gain: 1 }, status: { id: 'cornered', turns: 3, chance: 1 }, pull: true, evolve: { type: 'repeated_use', need: 6 } },
  maidPursuit: { category: 'special', attr: 'foot', fx: 'pose', se: 'maidBell', motion: 'skill_blowKiss', maidCall: true,
    cond: { id: 'fatigue', gain: 1.2 }, status: { id: 'exhausted', turns: 3, chance: 0.6 }, evolve: { type: 'repeated_use', need: 8 } },
  silentUrge: { category: 'special', attr: 'bust', fx: 'pose', se: 'maidChorus', motion: 'skill_sexyPose',
    resist: 'guard', gentle: true, cond: { id: 'fatigue', gain: 2 }, acceptStatus: { id: 'exhausted', turns: 4 },
    evolve: { type: 'choice_count', need: 3 } },
  inescapableMaidHold: { category: 'special', attr: 'bust', fx: 'embrace', se: 'maidChorus', motion: 'skill_sexyPose', windupSe: 'maidBell',
    maidCall: true, cond: { id: 'fatigue', gain: 3 }, advancedFrom: 'blondeMaidHold' },

  // ---- 甘やかしバニー（胸）：甘い敬語で甘やかし、負けた相手ほど溶かしていく ----
  bunnyInvite: { category: 'attack', attr: 'bust', fx: 'embrace', se: 'pamperPat',
    cond: { id: 'defeatDependence', gain: 0.6 }, evolve: { type: 'repeated_use', need: 15 } },
  sweetBunnyHold: { category: 'bind', attr: 'bust', fx: 'embrace', se: 'pafuBounce', evolve: { type: 'finish', need: 1 } },
  rewardWhisper: { category: 'special', attr: 'bust', fx: 'pose', se: 'sweetWhisper', motion: 'skill_blowKiss',
    cond: { id: 'defeatDependence', gain: 1.2 }, status: { id: 'tempted', turns: 3, chance: 0.7 }, evolve: { type: 'repeated_use', need: 8 } },
  pamperMagic: { category: 'special', attr: 'bust', fx: 'pose', se: 'pamperHum', motion: 'skill_sexyPose', windupSe: 'pamperPat',
    heal: true, cond: { id: 'defeatDependence', gain: 1 }, status: { id: 'dependent', turns: 4, chance: 1 }, evolve: { type: 'debuff_max', need: 1 } },
  justALittleMore: { category: 'special', attr: 'bust', fx: 'embrace', se: 'pafuDrain', motion: 'skill_sexyPose',
    resist: 'dodge', gentle: true, acceptGrow: true, cond: { id: 'defeatDependence', gain: 2 }, acceptStatus: { id: 'dependent', turns: 5 },
    evolve: { type: 'choice_count', need: 3 } },
  supremeRewardHold: { category: 'special', attr: 'bust', fx: 'embrace', se: 'pafuDrain', motion: 'skill_sexyPose', windupSe: 'pamperHum',
    cond: { id: 'defeatDependence', gain: 3 }, advancedFrom: 'sweetBunnyHold' },

  // ---- ヤンデレちゃん（尻）：普段は優しく、逃げた相手にだけ執着する ----
  loveTouch: { category: 'attack', attr: 'hip', fx: 'hit', se: 'hipStroke',
    cond: { id: 'possessionMark', gain: 0.6 }, evolve: { type: 'repeated_use', need: 15 } },
  yandereHipHold: { category: 'bind', attr: 'hip', fx: 'embrace', se: 'lockClick', evolve: { type: 'finish', need: 1 } },
  foundYou: { category: 'special', attr: 'hip', fx: 'pose', se: 'yandereWhisper', motion: 'skill_blowKiss', windupSe: 'heelStep',
    pull: true, lure: true, cond: { id: 'possessionMark', gain: 1.5 }, status: { id: 'marked', turns: 6, chance: 1 },
    evolve: { type: 'repeated_use', need: 6 } },
  whyRunAway: { category: 'special', attr: 'hip', fx: 'pose', se: 'yandereWhisper', motion: 'skill_sexyPose',
    resist: 'dodge', gentle: true, cond: { id: 'possessionMark', gain: 2 }, acceptStatus: { id: 'obedient', turns: 4 },
    evolve: { type: 'choice_count', need: 3 } },
  obsessiveRecapture: { category: 'special', attr: 'hip', fx: 'hit', se: 'lockClick', motion: 'skill_sexyPose', windupSe: 'yandereWhisper',
    chargeBind: true, cond: { id: 'possessionMark', gain: 1.5 }, evolve: { type: 'repeated_use', need: 5 } },
  eternalPossession: { category: 'special', attr: 'hip', fx: 'embrace', se: 'lockClick', motion: 'skill_sexyPose', windupSe: 'yandereWhisper',
    cond: { id: 'possessionMark', gain: 3 }, advancedFrom: 'yandereHipHold' },

  // ---- 小悪魔メイドさん（胸・口）：ご褒美を餌に、命令に従う癖をつける ----
  maidMischief: { category: 'attack', attr: 'bust', fx: 'embrace', se: 'teacupClink',
    cond: { id: 'serviceHabit', gain: 0.6 }, evolve: { type: 'repeated_use', need: 15 } },
  devilMaidHold: { category: 'bind', attr: 'mouth', fx: 'kiss', se: 'kissDrain', evolve: { type: 'finish', need: 1 } },
  rewardOffer: { category: 'special', attr: 'bust', fx: 'pose', se: 'teacupClink', motion: 'skill_blowKiss',
    resist: 'dodge', gentle: true, acceptGrow: true, cond: { id: 'serviceHabit', gain: 2 }, acceptStatus: { id: 'obedient', turns: 4 },
    evolve: { type: 'choice_count', need: 3 } },
  serviceKiss: { category: 'special', attr: 'mouth', fx: 'kiss', se: 'kissDrain', motion: 'skill_blowKiss', windupSe: 'teacupClink',
    cond: { id: 'serviceHabit', gain: 1 }, evolve: { type: 'exp_absorbed', need: 150 } },
  quietMaster: { category: 'special', attr: 'mouth', fx: 'pose', se: 'sweetWhisper', motion: 'skill_sexyPose',
    cond: { id: 'serviceHabit', gain: 1.2 }, status: { id: 'unfocused', turns: 3, chance: 1 }, evolve: { type: 'debuff_max', need: 1 } },
  supremeService: { category: 'special', attr: 'mouth', fx: 'kiss', se: 'kissDrain', motion: 'skill_sexyPose', windupSe: 'teacupClink',
    cond: { id: 'serviceHabit', gain: 3 }, advancedFrom: 'devilMaidHold' },

  // ---- キョンシーちゃん（胸・手）：腕でぎっちり抱きつき、逃げ方を覚えてくる ----
  hopTouch: { category: 'attack', attr: 'hand', fx: 'hit', se: 'jiangshiHop',
    cond: { id: 'jiangshiCling', gain: 0.6 }, evolve: { type: 'repeated_use', need: 15 } },
  jiangshiHold: { category: 'bind', attr: 'bust', fx: 'embrace', se: 'squeezeHug', evolve: { type: 'finish', need: 1 } },
  jiangshiLeap: { category: 'special', attr: 'hand', fx: 'hit', se: 'jiangshiHop', motion: 'skill_sexyPose', windupSe: 'talismanSlap',
    chargeBind: true, cond: { id: 'jiangshiCling', gain: 1.2 }, evolve: { type: 'repeated_use', need: 5 } },
  jiangshiHug: { category: 'special', attr: 'bust', fx: 'embrace', se: 'squeezeHug', motion: 'skill_sexyPose',
    resist: 'contest', gentle: true, cond: { id: 'jiangshiCling', gain: 2 }, acceptStatus: { id: 'dependent', turns: 4 },
    evolve: { type: 'choice_count', need: 3 } },
  learnedEscape: { category: 'special', attr: 'hand', fx: 'pose', se: 'talismanSlap', motion: 'skill_blowKiss',
    cond: { id: 'jiangshiCling', gain: 1.2 }, status: { id: 'unfocused', turns: 3, chance: 1 }, evolve: { type: 'debuff_max', need: 1 } },
  perfectJiangshiHug: { category: 'special', attr: 'bust', fx: 'embrace', se: 'squeezeHug', motion: 'skill_sexyPose', windupSe: 'talismanSlap',
    cond: { id: 'jiangshiCling', gain: 3 }, advancedFrom: 'jiangshiHold' },

  // ---- 白銀の小悪魔（胸・口）：甘えん坊を演じ、お願いを聞く相手を「カモ」にする ----
  begTouch: { category: 'attack', attr: 'bust', fx: 'embrace', se: 'mikuPlease',
    cond: { id: 'begWeakness', gain: 0.6 }, evolve: { type: 'repeated_use', need: 15 } },
  silverDevilHold: { category: 'bind', attr: 'mouth', fx: 'kiss', se: 'vacuumKiss', evolve: { type: 'finish', need: 1 } },
  pleaseListen: { category: 'special', attr: 'mouth', fx: 'pose', se: 'mikuPlease', motion: 'skill_blowKiss',
    resist: 'dodge', gentle: true, cond: { id: 'begWeakness', gain: 2 }, acceptStatus: { id: 'tempted', turns: 4 },
    evolve: { type: 'choice_count', need: 3 } },
  sulkyTempt: { category: 'special', attr: 'bust', fx: 'pose', se: 'sulkySigh', motion: 'beg',
    cond: { id: 'begWeakness', gain: 1.2 }, status: { id: 'hesitant', turns: 3, chance: 1 }, evolve: { type: 'repeated_use', need: 8 } },
  secondHelping: { category: 'special', attr: 'mouth', fx: 'kiss', se: 'coinTribute', motion: 'skill_sexyPose', windupSe: 'mikuPlease',
    cond: { id: 'begWeakness', gain: 1 }, evolve: { type: 'exp_absorbed', need: 150 } },
  absoluteBegging: { category: 'special', attr: 'mouth', fx: 'kiss', se: 'vacuumKiss', motion: 'skill_sexyPose', windupSe: 'sulkySigh',
    cond: { id: 'begWeakness', gain: 3 }, advancedFrom: 'silverDevilHold' },

  // ---- 無表情サキュバス（足）：寡黙に、抵抗を諦めさせていく ----
  silentSweep: { category: 'attack', attr: 'foot', fx: 'hit', se: 'footPress',
    cond: { id: 'helplessness', gain: 0.6 }, status: { id: 'tripped', turns: 1, chance: 0.15 }, evolve: { type: 'repeated_use', need: 15 } },
  silentShackle: { category: 'bind', attr: 'foot', fx: 'stomp', se: 'footPress', evolve: { type: 'finish', need: 1 } },
  noUse: { category: 'special', attr: 'foot', fx: 'pose', se: 'coldTick', motion: 'skill_blowKiss',
    cond: { id: 'helplessness', gain: 1.2 }, status: { id: 'weakened', turns: 3, chance: 1 }, evolve: { type: 'repeated_use', need: 8 } },
  giveUp: { category: 'special', attr: 'foot', fx: 'pose', se: 'coldTick', motion: 'skill_sexyPose',
    resist: 'guard', gentle: true, cond: { id: 'helplessness', gain: 2 }, acceptStatus: { id: 'weakened', turns: 5 },
    evolve: { type: 'choice_count', need: 3 } },
  blindSpot: { category: 'special', attr: 'foot', fx: 'stomp', se: 'footPress', motion: 'skill_sexyPose', windupSe: 'coldTick',
    knockback: 1, cond: { id: 'helplessness', gain: 1 }, status: { id: 'tripped', turns: 1, chance: 1 }, evolve: { type: 'debuff_max', need: 1 } },
  totalSurrenderHold: { category: 'special', attr: 'foot', fx: 'stomp', se: 'zeroDrop', motion: 'skill_sexyPose', windupSe: 'coldTick',
    countdown: true, cond: { id: 'helplessness', gain: 3 }, advancedFrom: 'silentShackle' },

  // ---- あまあま猫耳メイド（胸）：お世話を任せるほど、自分では何もできなくなる ----
  catHelp: { category: 'attack', attr: 'bust', fx: 'embrace', se: 'catPurr',
    cond: { id: 'careDependence', gain: 0.6 }, evolve: { type: 'repeated_use', need: 15 } },
  catCareHold: { category: 'bind', attr: 'bust', fx: 'embrace', se: 'catPurr', evolve: { type: 'finish', need: 1 } },
  careRecommend: { category: 'special', attr: 'bust', fx: 'pose', se: 'catBreath', motion: 'skill_pinkBreath',
    cond: { id: 'careDependence', gain: 1.2 }, status: { id: 'careless', turns: 3, chance: 1 }, evolve: { type: 'repeated_use', need: 8 } },
  leaveItToMe: { category: 'special', attr: 'bust', fx: 'embrace', se: 'catPurr', motion: 'skill_sexyPose',
    resist: 'dodge', gentle: true, acceptGrow: true, cond: { id: 'careDependence', gain: 2 }, acceptStatus: { id: 'dependent', turns: 5 },
    evolve: { type: 'choice_count', need: 3 } },
  masterBreak: { category: 'special', attr: 'bust', fx: 'pose', se: 'catBreath', motion: 'skill_blowKiss', windupSe: 'catPurr',
    cond: { id: 'careDependence', gain: 1 }, status: { id: 'weakened', turns: 3, chance: 1 }, evolve: { type: 'debuff_max', need: 1 } },
  supremeCatService: { category: 'special', attr: 'bust', fx: 'embrace', se: 'catPurr', motion: 'skill_sexyPose', windupSe: 'catBreath',
    cond: { id: 'careDependence', gain: 3 }, advancedFrom: 'catCareHold' }
};

export const WAVE3_SKILL_NAMES = {
  maidChaseStep: { name: '追跡の足音', kind: 'basic', attr: 'foot' },
  blondeMaidHold: { name: '金髪メイドの連携ホールド', kind: 'bind', attr: 'bust' },
  pathBlock: { name: '進路封鎖', kind: 'special', attr: 'foot' },
  maidPursuit: { name: 'メイド追跡', kind: 'special', attr: 'foot' },
  silentUrge: { name: '無言の催促', kind: 'special', attr: 'bust' },
  inescapableMaidHold: { name: '逃がさない連携ホールド', kind: 'special', attr: 'bust' },

  bunnyInvite: { name: 'やさしい誘い', kind: 'basic', attr: 'bust' },
  sweetBunnyHold: { name: 'あまあまバニーホールド', kind: 'bind', attr: 'bust' },
  rewardWhisper: { name: 'ごほうびの囁き', kind: 'special', attr: 'bust' },
  pamperMagic: { name: '甘やかしの魔法', kind: 'special', attr: 'bust' },
  justALittleMore: { name: 'もう少しだけ♡', kind: 'special', attr: 'bust' },
  supremeRewardHold: { name: '極上ごほうびホールド', kind: 'special', attr: 'bust' },

  loveTouch: { name: '愛情タッチ', kind: 'basic', attr: 'hip' },
  yandereHipHold: { name: '逃がさないヒップホールド', kind: 'bind', attr: 'hip' },
  foundYou: { name: 'ずっと探してたよ♡', kind: 'special', attr: 'hip' },
  whyRunAway: { name: 'どうして逃げるの……？', kind: 'special', attr: 'hip' },
  obsessiveRecapture: { name: '執着の再捕獲', kind: 'special', attr: 'hip' },
  eternalPossession: { name: '永遠の独占ホールド', kind: 'special', attr: 'hip' },

  maidMischief: { name: 'メイドのいたずら', kind: 'basic', attr: 'bust' },
  devilMaidHold: { name: '小悪魔ご奉仕ホールド', kind: 'bind', attr: 'mouth' },
  rewardOffer: { name: 'ご褒美はいかがですか？♡', kind: 'special', attr: 'bust' },
  serviceKiss: { name: '甘いご奉仕キッス', kind: 'special', attr: 'mouth' },
  quietMaster: { name: 'ご主人さま、お静かに♡', kind: 'special', attr: 'mouth' },
  supremeService: { name: '小悪魔の極上ご奉仕', kind: 'special', attr: 'mouth' },

  hopTouch: { name: 'ぴょんぴょんタッチ', kind: 'basic', attr: 'hand' },
  jiangshiHold: { name: 'ぎっちりキョンシーホールド', kind: 'bind', attr: 'bust' },
  jiangshiLeap: { name: 'キョンシー飛びつき', kind: 'special', attr: 'hand' },
  jiangshiHug: { name: 'ぎゅーってしてあげる♡', kind: 'special', attr: 'bust' },
  learnedEscape: { name: '逃げ方おぼえちゃった♡', kind: 'special', attr: 'hand' },
  perfectJiangshiHug: { name: '完全捕縛キョンシーハグ', kind: 'special', attr: 'bust' },

  begTouch: { name: 'おねだりタッチ', kind: 'basic', attr: 'bust' },
  silverDevilHold: { name: 'あまあま小悪魔ホールド', kind: 'bind', attr: 'mouth' },
  pleaseListen: { name: 'ねえ、お願い聞いて？♡', kind: 'special', attr: 'mouth' },
  sulkyTempt: { name: 'しょんぼり誘惑', kind: 'special', attr: 'bust' },
  secondHelping: { name: 'おかわりのおねだり', kind: 'special', attr: 'mouth' },
  absoluteBegging: { name: '絶対おねだり小悪魔', kind: 'special', attr: 'mouth' },

  silentSweep: { name: '無言の足払い', kind: 'basic', attr: 'foot' },
  silentShackle: { name: '無言の足枷', kind: 'bind', attr: 'foot' },
  noUse: { name: 'どうせ無理でしょ', kind: 'special', attr: 'foot' },
  giveUp: { name: '抵抗、やめる？', kind: 'special', attr: 'foot' },
  blindSpot: { name: '足元、見えてないね', kind: 'special', attr: 'foot' },
  totalSurrenderHold: { name: '完全無抵抗フットホールド', kind: 'special', attr: 'foot' },

  catHelp: { name: '猫耳のお手伝い', kind: 'basic', attr: 'bust' },
  catCareHold: { name: 'あまあまお世話ホールド', kind: 'bind', attr: 'bust' },
  careRecommend: { name: 'お世話のすすめ', kind: 'special', attr: 'bust' },
  leaveItToMe: { name: 'お任せくださいませ♡', kind: 'special', attr: 'bust' },
  masterBreak: { name: 'ご主人さまの休憩時間', kind: 'special', attr: 'bust' },
  supremeCatService: { name: '極上あまあまご奉仕', kind: 'special', attr: 'bust' }
};
