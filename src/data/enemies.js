// 敵ロスター。固有技が未実装の敵は、既存の共通技を仮に使用する。
// skills は固有の特殊攻撃、bindSkills は使える拘束技。
export const ATTRS = {
  mouth: { label: '口', color: '#e0314f', icon: '唇' },
  bust: { label: '胸', color: '#ff7bb5', icon: 'ハート' },
  hip: { label: '尻', color: '#a35cff', icon: '菱形' },
  foot: { label: '足', color: '#3fc9c0', icon: '靴' },
  hand: { label: '手', color: '#ff8a6b', icon: '手' },
  all: { label: '全', color: '#ffffff', icon: '星' }
};

export const ENEMIES = [
  // 初期3体（v6 準拠）。advancedSkill は指定の拘束技でフィニッシュすると永続習得する上位技
  { id: 'kitten', name: '小悪魔キトゥン', attr: 'mouth', rank: 'basic', normalSkill: 'kittenTouch',
    bindSkills: ['kittenKissHold'], skills: ['kittenTease', 'kittenBlowKiss', 'kittenDare'],
    advancedSkill: 'kittenFullTemptation', choiceSkill: 'kittenDare' },
  { id: 'blackRibbon', name: '黒髪リボンちゃん', attr: 'mouth', rank: 'basic', normalSkill: 'ribbonTouch',
    bindSkills: ['peachBreathHold'], skills: ['peachBreath', 'sweetWhisper', 'closeBreath'],
    advancedSkill: 'supremePeachBreath', choiceSkill: 'peachBreath' },
  { id: 'pinkFox', name: 'ピンク髪きつねちゃん', attr: 'hip', rank: 'basic', normalSkill: 'foxStep',
    bindSkills: ['foxBackRub'], skills: ['foxHipAttack', 'foxPushContest', 'tailFeint'],
    advancedSkill: 'foxHipPress', choiceSkill: 'foxPushContest' },

  // 前半9体（技は skillsWave1.js）と後半9体（技は skillsWave2.js）。v6 準拠
  { id: 'thiefGirl', name: 'シーフちゃん', attr: 'hip', rank: 'basic', normalSkill: 'thiefSlip',
    bindSkills: ['thiefHold'], skills: ['thiefPeek', 'heartThief', 'backstabSteal'],
    advancedSkill: 'heartjackMaster', choiceSkill: 'heartThief' },
  { id: 'mikuGirl', name: 'ミクちゃん', attr: 'mouth', rank: 'basic', normalSkill: 'mikuPechi',
    bindSkills: ['mikuBegKiss'], skills: ['mikuPlease', 'mikuBlowKiss'],
    advancedSkill: 'mikuSpecialKiss', choiceSkill: 'mikuBlowKiss' },
  { id: 'pleadingBunny', name: 'おねだりバニー', attr: 'mouth', rank: 'basic', normalSkill: 'bunnyPunch',
    bindSkills: ['pleadStealKiss'], skills: ['pleadPlease', 'sneakyTaste'],
    advancedSkill: 'secretRewardKiss', choiceSkill: 'pleadPlease' },

  { id: 'angelGirl', name: '天使ちゃん', attr: 'bust', rank: 'unique', normalSkill: 'angelTouch',
    bindSkills: ['angelHug'], skills: ['holyLullaby', 'sweetBlessing', 'mercyEye'],
    advancedSkill: 'fallenBlessing', choiceSkill: 'sweetBlessing' },
  { id: 'blondeBunny', name: 'グラマーバニーさん', attr: 'bust', rank: 'unique', normalSkill: 'bunnyPress',
    bindSkills: ['pafuHold'], skills: ['pafupafu', 'sweetSqueeze', 'gazeLock'],
    advancedSkill: 'queensPafu', choiceSkill: 'pafuHold' },
  { id: 'blueHairGal', name: '青髪ギャル', attr: 'all', rank: 'unique', normalSkill: 'muchiTackle',
    bindSkills: ['muchiHold'], skills: ['galPamper', 'muchiPress', 'thighCushion'],
    advancedSkill: 'muchiParadise', choiceSkill: 'muchiHold' },
  { id: 'darkSister', name: 'シスターさん', attr: 'foot', rank: 'unique', normalSkill: 'holyStep',
    bindSkills: ['sinShackle'], skills: ['countdown', 'repent', 'featherConfess'],
    advancedSkill: 'judgmentCount', choiceSkill: 'countdown' },
  { id: 'dreamLady', name: '夢見のお姉さん', attr: 'all', rank: 'unique', normalSkill: 'sleepyTouch',
    bindSkills: ['lapPillow'], skills: ['lullaby', 'dreamPamper', 'fluffyDream'],
    advancedSkill: 'eternalLap', choiceSkill: 'lullaby' },
  { id: 'kissHunter', name: 'キスハンター', attr: 'mouth', rank: 'unique', normalSkill: 'hunterTouch',
    bindSkills: ['huntersKiss'], skills: ['heartMarking', 'hunterDrainKiss', 'cantEscape'],
    advancedSkill: 'perfectHuntKiss', choiceSkill: 'heartMarking' },
  { id: 'littleDevilLady', name: '小悪魔お嬢さん', attr: 'all', rank: 'unique', normalSkill: 'ladyTouch',
    bindSkills: ['ladysHold'], skills: ['ladyWarning', 'ladyStep', 'ladyGaze'],
    advancedSkill: 'royalTemptation', choiceSkill: 'ladyWarning' },
  { id: 'pamperingLady', name: '甘やかしレディ', attr: 'foot', rank: 'unique', normalSkill: 'pamperStep',
    bindSkills: ['pamperLegHold'], skills: ['tiredDarling', 'gentlePat', 'sweetShackle'],
    advancedSkill: 'supremePamperLeg', choiceSkill: 'tiredDarling' },
  { id: 'powerBunny', name: '怪力バニーさん', attr: 'bust', rank: 'unique', normalSkill: 'powerPunch',
    bindSkills: ['powerHold'], skills: ['bunnyRocket', 'dokkanHip', 'contestDare'],
    advancedSkill: 'superBunnyRocket', choiceSkill: 'contestDare' },
  { id: 'silverFoxMaid', name: '銀狐メイドさん', attr: 'foot', rank: 'unique', normalSkill: 'maidStep',
    bindSkills: ['manaStomp'], skills: ['manaLeakProc', 'badManners', 'periodicCollect'],
    advancedSkill: 'totalManaCollect', choiceSkill: 'manaStomp' },
  { id: 'velvetBunny', name: 'ベルベットバニー', attr: 'hip', rank: 'unique', normalSkill: 'hipPush',
    bindSkills: ['velvetPress'], skills: ['heartStamp', 'provokeGaze', 'hipWall'],
    advancedSkill: 'queensPressure', choiceSkill: 'provokeGaze' },
  { id: 'whisperDevil', name: 'ぽしょぽしょ悪魔ちゃん', attr: 'all', rank: 'unique', normalSkill: 'sneakyTouch',
    bindSkills: ['whisperHug'], skills: ['poshoWhisper', 'secretInsult', 'secretLevelDrain'],
    advancedSkill: 'absoluteWhisper', choiceSkill: 'poshoWhisper' },

  // 胸 / 手 の二つのチャームポイント。抱擁と弱点看破は胸、ハンド・妖手・お仕置き・搾取は手属性
  { id: 'demonicChinaGirl', name: '魔性のチャイナ娘', attr: 'bust', sourceAttrs: ['bust', 'hand'], rank: 'elite',
    normalSkill: 'devilHand', bindSkills: ['demonicHug'], skills: ['weakSpotFound', 'mysticHandDrain', 'zakoPunish'],
    advancedSkill: 'demonicExpHarvest', choiceSkill: 'weakSpotFound' },
  { id: 'sakuraEnchantress', name: '桜の妖女', attr: 'hip', rank: 'elite', normalSkill: 'sakuraPush',
    bindSkills: ['sakuraHipHold'], skills: ['sakuraStorm', 'corruptionMark', 'sakuraExpHunt'],
    advancedSkill: 'thousandSakura', choiceSkill: 'sakuraStorm' },
  { id: 'tricksterDevil', name: 'ずるっこ悪魔ちゃん', attr: 'foot', rank: 'elite', normalSkill: 'sneakyKick',
    bindSkills: ['devilLegHold'], skills: ['footTrap', 'legDrain', 'fakeCry'],
    advancedSkill: 'devilsLegTrap', choiceSkill: 'fakeCry' }
];

export const ENEMIES_BY_ID = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));
