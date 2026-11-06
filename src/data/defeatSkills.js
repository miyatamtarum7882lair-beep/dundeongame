// File: src/data/defeatSkills.js
// 「最後に負けた技」として記録できる技の一覧（暫定）
export const DEFEAT_SKILLS = {
  normalAttack: { name: '通常攻撃', kind: 'basic' },
  kissAttack: { name: 'キス', kind: 'basic', attr: 'mouth' },
  pafuAttack: { name: 'ぱふぱふ', kind: 'basic', attr: 'bust' },
  hipAttack: { name: 'ヒップアタック', kind: 'basic', attr: 'hip' },
  footRubAttack: { name: 'すりすり', kind: 'basic', attr: 'foot' },
  levelDrainKiss: { name: 'レベルドレインべろちゅー♡', kind: 'bind', attr: 'mouth' },
  onechanPafu: { name: 'おねえちゃんのぱふぱふ', kind: 'bind', attr: 'bust' },
  backRub: { name: '背面すりすり', kind: 'bind', attr: 'hip' },
  footStomp: { name: '踏みつけ', kind: 'bind', attr: 'foot' },
  blowKiss: { name: '投げキッス', kind: 'special' },
  pinkBreath: { name: '桃色の吐息', kind: 'special' },
  deepDrainKiss: { name: '深く吸い上げるべろちゅー', kind: 'special', attr: 'mouth' },
  foxPounce: { name: 'きつねの飛びかかり', kind: 'special', attr: 'hip' },
  sexyPose: { name: 'セクシーポーズ', kind: 'tactic' },
  beggingTrap: { name: '命乞い', kind: 'tactic' },
  charmAlly: { name: '味方への魅了', kind: 'tactic' }
};