// File: src/data/enemies.js
// 敵ロスター（名称はすべて仮。11.1）。skills は固有の特殊攻撃、bindSkills は使える拘束技。
export const ATTRS = {
  mouth: { label: '口', color: '#e0314f', icon: '唇' },
  bust: { label: '胸', color: '#ff7bb5', icon: 'ハート' },
  hip: { label: '尻', color: '#a35cff', icon: '菱形' },
  foot: { label: '足', color: '#3fc9c0', icon: '靴' },
  all: { label: '全', color: '#ffffff', icon: '星' }
};

export const ENEMIES = [
  { id: 'kitten', name: '小悪魔ちゃん', attr: 'mouth', rank: 'basic', normalSkill: 'kissAttack',
    bindSkills: ['levelDrainKiss'], skills: ['blowKiss', 'pinkBreath', 'sexyPose', 'drainBerochu'] },
  { id: 'blackRibbon', name: '黒髪リボンちゃん', attr: 'mouth', rank: 'basic', normalSkill: 'kissAttack',
    bindSkills: ['levelDrainKiss'], skills: ['blowKiss'], advancedSkill: 'deepDrainKiss' },
  { id: 'pinkFox', name: 'ピンク髪きつねちゃん', attr: 'hip', rank: 'basic',
    normalSkill: 'hipAttack', bindSkills: ['backRub'], skills: ['sexyPose'], advancedSkill: 'foxPounce' },
  { id: 'nurse', name: 'ナースさん', attr: 'bust', rank: 'basic', normalSkill: 'pafuAttack',
    bindSkills: ['onechanPafu'], skills: [] },
  { id: 'dancer', name: 'サテンの踊り子', attr: 'hip', rank: 'basic', normalSkill: 'hipAttack',
    bindSkills: ['backRub'], skills: ['sexyPose'] },
  { id: 'officeLady', name: 'ストッキングのお姉さん', attr: 'foot', rank: 'basic', normalSkill: 'footRubAttack',
    bindSkills: ['footStomp'], skills: [] },
  { id: 'thiefCat', name: '猫耳の怪盗', attr: 'hip', rank: 'unique', normalSkill: 'hipAttack',
    bindSkills: ['backRub'], skills: [] },
  { id: 'incenseWitch', name: '香の魔女', attr: 'bust', rank: 'unique', normalSkill: 'pafuAttack',
    bindSkills: ['onechanPafu'], skills: [] },
  { id: 'charmNun', name: '魅惑のシスター', attr: 'mouth', rank: 'unique', normalSkill: 'kissAttack',
    bindSkills: ['levelDrainKiss'], skills: [] },
  { id: 'twinSisters', name: '双子の姉妹', attr: 'foot', rank: 'unique', normalSkill: 'footRubAttack',
    bindSkills: ['footStomp'], skills: [] },
  { id: 'nightHostess', name: '夜の女将', attr: 'mouth', rank: 'elite', normalSkill: 'kissAttack',
    bindSkills: ['levelDrainKiss'], skills: [] },
  { id: 'queenNurse', name: '女医長', attr: 'bust', rank: 'elite', normalSkill: 'pafuAttack',
    bindSkills: ['onechanPafu'], skills: [] },
  { id: 'silkMistress', name: '絹の女王様', attr: 'foot', rank: 'elite', normalSkill: 'footRubAttack',
    bindSkills: ['footStomp'], skills: [] },
  { id: 'honeyLady', name: '蜜の淑女', attr: 'mouth', rank: 'boss', normalSkill: 'kissAttack',
    bindSkills: ['levelDrainKiss'], skills: [] },
  { id: 'crimsonQueen', name: '紅の踊り女王', attr: 'hip', rank: 'boss', normalSkill: 'hipAttack',
    bindSkills: ['backRub'], skills: [] },
  { id: 'dreamQueen', name: '夢魔の女王', attr: 'all', rank: 'boss', normalSkill: 'normalAttack',
    bindSkills: ['levelDrainKiss', 'onechanPafu', 'backRub', 'footStomp'], skills: [] }
];

export const ENEMIES_BY_ID = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));
