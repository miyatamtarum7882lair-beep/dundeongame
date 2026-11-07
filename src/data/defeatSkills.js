// File: src/data/defeatSkills.js
// 「最後に負けた技」として記録できる技の一覧（暫定）
import { WAVE1_SKILL_NAMES } from './skillsWave1.js';
import { WAVE2_SKILL_NAMES } from './skillsWave2.js';

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
  charmAlly: { name: '味方への魅了', kind: 'tactic' },
  drainBerochu: { name: 'どれいんべろちゅー♡', kind: 'special', attr: 'mouth' },
  kittenTouch: { name: '小悪魔タッチ', kind: 'basic', attr: 'mouth' },
  kittenKissHold: { name: 'ざぁこ♡キッスホールド', kind: 'bind', attr: 'mouth' },
  kittenTease: { name: 'ざぁこ♡の誘惑', kind: 'special', attr: 'mouth' },
  kittenBlowKiss: { name: '小悪魔の投げキッス', kind: 'special', attr: 'mouth' },
  kittenDare: { name: 'ねえ、負けちゃう？♡', kind: 'special', attr: 'mouth' },
  kittenFullTemptation: { name: '小悪魔の完全誘惑', kind: 'special', attr: 'mouth' },
  ribbonTouch: { name: 'リボンタッチ', kind: 'basic', attr: 'mouth' },
  peachBreathHold: { name: '桃色吐息ホールド', kind: 'bind', attr: 'mouth' },
  peachBreath: { name: '桃色の吐息', kind: 'special', attr: 'mouth' },
  sweetWhisper: { name: '甘い囁き', kind: 'special', attr: 'mouth' },
  closeBreath: { name: 'あまあま吐息', kind: 'special', attr: 'mouth' },
  supremePeachBreath: { name: '極上の桃色吐息', kind: 'special', attr: 'mouth' },
  foxStep: { name: 'きつねステップ', kind: 'basic', attr: 'hip' },
  foxBackRub: { name: '背面すりすり', kind: 'bind', attr: 'hip' },
  foxHipAttack: { name: 'きつねヒップアタック', kind: 'special', attr: 'hip' },
  foxPushContest: { name: 'ほら、押し返してみなよ♡', kind: 'special', attr: 'hip' },
  tailFeint: { name: 'しっぽフェイント', kind: 'special', attr: 'hip' },
  foxHipPress: { name: 'きつねの極上ヒッププレス', kind: 'special', attr: 'hip' },
  ...WAVE1_SKILL_NAMES,
  ...WAVE2_SKILL_NAMES
};
