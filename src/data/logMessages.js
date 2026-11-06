// File: src/data/logMessages.js
// ログの種類と文言。種類を増やすときはここへ足す。{名前} は params で置き換える。
export const LOG_KINDS = {
  enemyLevelUp: {
    mark: '▲', color: 'gold', importance: 'major', se: 'enemyGrow',
    text: '{name}のレベルが1上がった！（Lv{level}）'
  },
  raceAbilityGrow: {
    mark: '▲', color: 'gold', importance: 'major', se: 'enemyGrow',
    text: '{name}の「{ability}」がLv{level}に成長した…'
  },
  skillLearn: {
    mark: '★', color: 'pink', importance: 'major', se: 'learn',
    text: '{name}は{source}の能力を吸収して「{skill}」を覚えた！'
  },
  loseHabitUp: {
    mark: '▼', color: 'purple', importance: 'major', se: 'debuffDown',
    text: '負け癖が悪化した…（{name}：{stage}段）'
  },
  fallHabitUp: {
    mark: '▼', color: 'purple', importance: 'major', se: 'debuffDown',
    text: '堕ち癖が深まった…（{stage}段）'
  },
  allyTargetUp: {
    mark: '▼', color: 'purple', importance: 'major', se: 'debuffDown',
    text: '{ally}は「カモ」として学習されていく…'
  },
  resistDown: {
    mark: '▼', color: 'purple', importance: 'minor', se: 'debuffDown',
    text: '{attr}の耐性が下がった（{from} → {to}）'
  },
  levelDown: {
    mark: '▼', color: 'purple', importance: 'minor', se: 'debuffDown',
    text: 'レベルが{level}に下がった…'
  },
  erosionUp: {
    mark: '▼', color: 'purple', importance: 'major', se: null,
    text: '浸食ゲージが上がった（+{gain} → {value}）'
  },
  drainPulse: {
    mark: '◇', color: 'cyan', importance: 'minor', se: null,   // SEは属性別に drainPulse.js が鳴らす
    text: '{victim} MP -{amount} ← {dir}の{name}（{attr}）'
  },
  uniteJoin: {
    mark: '■', color: 'orange', importance: 'minor', se: null,
    text: '{name}が拘束に加わった！'
  },
  allyRun: {
    mark: '■', color: 'yellow', importance: 'minor', se: null,
    text: '{ally}は怯えて逃げ出した！'
  },
  allyCaptured: {
    mark: '■', color: 'red', importance: 'major', se: null,
    text: '{ally}が捕らわれた…'
  },

  // ---- v6.6 敵の学習 ----
  markTierUp: {
    mark: '▲', color: 'gold', importance: 'major', se: 'enemyGrow',
    text: '{name}はあなたの手の内を知り始めた…（{tierName}）'
  },
  rememberSkill: {
    mark: '▲', color: 'gold', importance: 'major', se: 'enemyGrow',
    text: '{name}は「{skill}」で勝った記憶を刻んだ…'
  },
  rememberUse: {
    mark: '★', color: 'pink', importance: 'minor', se: null,
    text: '{name}は「{skill}」を覚えている！'
  },
  enemySpotted: {
    mark: '◇', color: 'orange', importance: 'minor', se: null,
    text: '{name}（Lv{level}）を見つけた'
  },
  enemyWindup: {
    mark: '!', color: 'orange', importance: 'minor', se: null,
    text: '{name}は「{skill}」の構えを取った！'
  },
  enemySkillLearn: {
    mark: '★', color: 'gold', importance: 'major', se: 'learn',
    text: '{name}は吸収を重ね、「{skill}」を覚えた！'
  },
  heroDamaged: {
    mark: '■', color: 'red', importance: 'minor', se: null,
    text: '{name}の{skill}！ HP -{amount}'
  },
  heroDrained: {
    mark: '◇', color: 'cyan', importance: 'minor', se: null,
    text: '{name}の{skill}！ MP -{amount}'
  },
  enemyDown: {
    mark: '◇', color: 'white', importance: 'minor', se: null,
    text: '{name}を倒した！ EXP +{exp}'
  },
  heroLevelUp: {
    mark: '▲', color: 'gold', importance: 'major', se: 'learn',
    text: '主人公のレベルが上がった！（Lv{level}）'
  },
  weaponSwitch: {
    mark: '◇', color: 'white', importance: 'minor', se: 'tick',
    text: '{weapon}に持ちかえた'
  },
  touchPenalty: {
    mark: '▼', color: 'purple', importance: 'minor', se: 'debuffDown',
    text: '{name}に触れてしまった…（{effect}）'
  },
  touchHabitUp: {
    mark: '▼', color: 'purple', importance: 'major', se: 'debuffDown',
    text: '感触の記憶が深まった…（{stage}段）'
  },
  stunned: {
    mark: '■', color: 'yellow', importance: 'minor', se: null,
    text: '体がしびれて動けない…'
  },
  allyHeal: {
    mark: '◇', color: 'cyan', importance: 'minor', se: 'learn',
    text: '{ally}の回復！ HP +{amount}'
  },
  mpEmpty: {
    mark: '■', color: 'red', importance: 'minor', se: null,
    text: 'MPが尽きかけている…'
  },
  heroDefeated: {
    mark: '■', color: 'red', importance: 'major', se: 'debuffDown',
    text: '主人公は倒れた…（{name}の{skill}）'
  },
  climaxStart: {
    mark: '■', color: 'red', importance: 'major', se: null,
    text: '限界を超えた… 意識が白く染まっていく（HP -{hpLoss}）'
  },
  climaxExtend: {
    mark: '■', color: 'red', importance: 'minor', se: null,
    text: '拘束が増え、絶頂が長引く…（+{addSec}秒）'
  },
  climaxEnd: {
    mark: '◇', color: 'cyan', importance: 'major', se: null,
    text: '絶頂が終わり、拘束が解けた。MPが戻った（余韻 {turns}ターン）'
  },
  afterglowEnd: {
    mark: '◇', color: 'white', importance: 'minor', se: null,
    text: '余韻が引いていく…'
  },
  autoGuard: {
    mark: '◇', color: 'cyan', importance: 'minor', se: null,
    text: '余韻で身体が反応し、{name}の拘束を振りほどいた！'
  },
  priestBuff: {
    mark: '◇', color: 'cyan', importance: 'minor', se: 'learn',
    text: '{ally}の加護！「{buff}」（{turns}ターン）'
  }
};

// 敵のセリフ（仮。8.4 に従い、作者と相談して差し替える）
export const TAUNT_LINES = {
  markFamiliar: ['また来たの？ 慣れてきちゃったわね♡', 'あなたの動き、だいたい分かってきたわ'],
  markKnowing: ['もう全部お見通しよ♡', '次はどうやって負けたいの？'],
  rememberUse: ['この前みたいに、してあげる♡', 'あれ、気に入ったでしょ？']
};

export function formatLog(kind, params = {}) {
  const def = LOG_KINDS[kind];
  if (!def) throw new Error(`未定義のログ種別です: ${kind}`);
  return def.text.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? '？'));
}
