// 敵ロスター。新規敵の技IDは固有技実装まで既存の共通技を使用する。
// skills は固有の特殊攻撃、bindSkills は使える拘束技。
export const ATTRS = {
  mouth: { label: '口', color: '#e0314f', icon: '唇' },
  bust: { label: '胸', color: '#ff7bb5', icon: 'ハート' },
  hip: { label: '尻', color: '#a35cff', icon: '菱形' },
  foot: { label: '足', color: '#3fc9c0', icon: '靴' },
  all: { label: '全', color: '#ffffff', icon: '星' }
};

export const ENEMIES = [
  { id: 'kitten', name: '小悪魔キトゥン', attr: 'mouth', rank: 'basic', normalSkill: 'kissAttack',
    bindSkills: ['levelDrainKiss'], skills: ['blowKiss', 'pinkBreath', 'sexyPose', 'drainBerochu'] },
  { id: 'blackRibbon', name: '黒髪リボンちゃん', attr: 'mouth', rank: 'basic', normalSkill: 'kissAttack',
    bindSkills: ['levelDrainKiss'], skills: ['blowKiss'], advancedSkill: 'deepDrainKiss' },
  { id: 'pinkFox', name: 'ピンク髪きつねちゃん', attr: 'hip', rank: 'basic',
    normalSkill: 'hipAttack', bindSkills: ['backRub'], skills: ['sexyPose'], advancedSkill: 'foxPounce' },

  // 以下の18体は mdungeon_pack のID・名称・主属性・ランクを登録。
  // 固有技・選択肢・デバフは後続の実装で追加する。
  { id: 'thiefGirl', name: 'シーフちゃん', attr: 'hip', rank: 'basic',
    normalSkill: 'hipAttack', bindSkills: ['backRub'], skills: [] },
  { id: 'mikuGirl', name: 'ミクちゃん', attr: 'mouth', rank: 'basic',
    normalSkill: 'kissAttack', bindSkills: ['levelDrainKiss'], skills: [] },
  { id: 'pleadingBunny', name: 'おねだりバニー', attr: 'mouth', rank: 'basic',
    normalSkill: 'kissAttack', bindSkills: ['levelDrainKiss'], skills: [] },

  { id: 'angelGirl', name: '天使ちゃん', attr: 'bust', rank: 'unique',
    normalSkill: 'pafuAttack', bindSkills: ['onechanPafu'], skills: [] },
  { id: 'blondeBunny', name: 'グラマーバニーさん', attr: 'bust', rank: 'unique',
    normalSkill: 'pafuAttack', bindSkills: ['onechanPafu'], skills: [] },
  { id: 'blueHairGal', name: '青髪ギャル', attr: 'all', rank: 'unique',
    normalSkill: 'normalAttack', bindSkills: ['onechanPafu'], skills: [] },
  { id: 'darkSister', name: 'シスターさん', attr: 'foot', rank: 'unique',
    normalSkill: 'footRubAttack', bindSkills: ['footStomp'], skills: [] },
  { id: 'dreamLady', name: '夢見のお姉さん', attr: 'all', rank: 'unique',
    normalSkill: 'normalAttack', bindSkills: ['onechanPafu'], skills: [] },
  { id: 'kissHunter', name: 'キスハンター', attr: 'mouth', rank: 'unique',
    normalSkill: 'kissAttack', bindSkills: ['levelDrainKiss'], skills: [] },
  { id: 'littleDevilLady', name: '小悪魔お嬢さん', attr: 'all', rank: 'unique',
    normalSkill: 'normalAttack', bindSkills: ['levelDrainKiss'], skills: [] },
  { id: 'pamperingLady', name: '甘やかしレディ', attr: 'foot', rank: 'unique',
    normalSkill: 'footRubAttack', bindSkills: ['footStomp'], skills: [] },
  { id: 'powerBunny', name: '怪力バニーさん', attr: 'bust', rank: 'unique',
    normalSkill: 'pafuAttack', bindSkills: ['onechanPafu'], skills: [] },
  { id: 'silverFoxMaid', name: '銀狐メイドさん', attr: 'foot', rank: 'unique',
    normalSkill: 'footRubAttack', bindSkills: ['footStomp'], skills: [] },
  { id: 'velvetBunny', name: 'ベルベットバニー', attr: 'hip', rank: 'unique',
    normalSkill: 'hipAttack', bindSkills: ['backRub'], skills: [] },
  { id: 'whisperDevil', name: 'ぽしょぽしょ悪魔ちゃん', attr: 'all', rank: 'unique',
    normalSkill: 'normalAttack', bindSkills: ['levelDrainKiss'], skills: [] },

  // 原資料では「胸 / 手」。手属性の戦闘処理を追加するまでは胸を主属性にする。
  { id: 'demonicChinaGirl', name: '魔性のチャイナ娘', attr: 'bust', sourceAttrs: ['bust', 'hand'], rank: 'elite',
    normalSkill: 'pafuAttack', bindSkills: ['onechanPafu'], skills: [] },
  { id: 'sakuraEnchantress', name: '桜の妖女', attr: 'hip', rank: 'elite',
    normalSkill: 'hipAttack', bindSkills: ['backRub'], skills: [] },
  { id: 'tricksterDevil', name: 'ずるっこ悪魔ちゃん', attr: 'foot', rank: 'elite',
    normalSkill: 'footRubAttack', bindSkills: ['footStomp'], skills: [] }
];

export const ENEMIES_BY_ID = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));
