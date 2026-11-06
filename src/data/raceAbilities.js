// File: src/data/raceAbilities.js
// 敵種族の永続能力の登録表（10.4）。能力を増やすときは、この配列に1つ足す。
//   attrs: この属性の敵だけが持つ。null なら全種族が持つ
//   maxLevel: 省略すると B.abilities.maxLevel
export const RACE_ABILITIES = [
  { id: 'drainMouth', name: '甘美なる吸引（口）', attrs: ['mouth'],
    trigger: '口属性で吸収', effect: '吸収量+10〜100%、拘束中の視線誘導が強化' },
  { id: 'drainBust', name: '豊満なる抱擁（胸）', attrs: ['bust'],
    trigger: '胸属性で吸収', effect: '吸収量+10〜100%、胸サイズの初期値・最大値が増加' },
  { id: 'drainHip', name: '蠱惑の圧迫（尻）', attrs: ['hip'],
    trigger: '尻属性で吸収', effect: '吸収量+10〜100%、振り向き誘惑の誘導が速くなる' },
  { id: 'drainFoot', name: '嗜虐の蹂躙（足）', attrs: ['foot'],
    trigger: '足属性で吸収', effect: '吸収量+10〜100%、踏みつけ拘束の脱出進行を軽減' },
  { id: 'stolenArts', name: '略奪の術', attrs: null,
    trigger: '仲間を長時間拘束／寝返りの献上', effect: '仲間の能力から特殊攻撃を習得。覚え終えたらバフ・ヒールを習得・強化' },
  { id: 'weaknessLearn', name: '急所と癖の学習', attrs: null,
    trigger: '見とれ・命乞い・拳接触', effect: '最低耐性属性の敵が出やすくなる、弱点部位を優先' },
  { id: 'uniteAttack', name: '連携拘束', attrs: null,
    trigger: '合流拘束の成立', effect: 'ユナイト発生率UP、合流時の押し戻し量が増加' },
  { id: 'teasingPlay', name: '焦らしと舐めプ', attrs: null,
    trigger: '主人公の絶頂／自発的に身を任せる', effect: '拘束・誘惑を選ぶ確率UP、誘い文句の頻度UP' },
  { id: 'captureSkill', name: '捕縛の手際', attrs: null,
    trigger: '仲間をHP0にする', effect: '救出ヒット数+1〜+3、仲間のMP減少速度UP' }
];

export const RACE_ABILITIES_BY_ID = Object.fromEntries(RACE_ABILITIES.map((a) => [a.id, a]));

const DRAIN_ABILITY = { mouth: 'drainMouth', bust: 'drainBust', hip: 'drainHip', foot: 'drainFoot' };

// 属性 → その吸収系の能力ID
export function drainAbilityId(attr) {
  return DRAIN_ABILITY[attr] ?? null;
}

// その敵が持てる能力か。enemyDef は enemies.js の1件
export function isAbilityAvailable(ability, enemyDef) {
  if (!ability.attrs) return true;
  if (enemyDef.attr === 'all') return true;
  return ability.attrs.includes(enemyDef.attr);
}