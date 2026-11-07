// File: src/data/logMessages.js
// ログの種類と文言。種類を増やすときはここへ足す。{名前} は params で置き換える。
export const LOG_KINDS = {
  enemyLevelUp: {
    mark: '▲', color: 'gold', importance: 'major', se: 'enemyGrow',
    text: '{name}のレベルが{gain}上がった！（Lv{level}）'
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
  enemySpeak: {
    mark: '♡', color: 'pink', importance: 'minor', se: null,
    text: '{name}「{line}」'
  },
  choiceAvoided: {
    mark: '◇', color: 'cyan', importance: 'minor', se: null,
    text: '{name}の技をかわした！'
  },
  choiceBlocked: {
    mark: '!', color: 'orange', importance: 'minor', se: null,
    text: '逃げ道がない！ {name}の技を受ける'
  },
  choiceAccepted: {
    mark: '♡', color: 'pink', importance: 'minor', se: null,
    text: '{name}の誘惑を受け入れた。ドレインが強まる'
  },
  choiceTimeout: {
    mark: '♡', color: 'pink', importance: 'major', se: null,
    text: '{name}に見とれ、抗えなくなった！ ドレインが大きく強まる'
  },
  hallOmen: {
    mark: '!', color: 'pink', importance: 'major', se: null,
    text: '大広間から、甘い香りと桃色の霧が漏れている…（入ると誰かに囲まれそう）'
  },
  ambush: {
    mark: '▼', color: 'pink', importance: 'major', se: null,
    text: '甘い香りに誘い込まれた…！ {count}人に囲まれている♡（MP +{mp}）'
  },
  manaCollected: {
    mark: '▼', color: 'cyan', importance: 'minor', se: null,
    text: '{name}が、漏れた魔力をまとめて回収した！ MP -{amount}'
  },
  trapsSet: {
    mark: '!', color: 'pink', importance: 'minor', se: null,
    text: '{name}が足元に罠を{count}つ仕掛けた…♡'
  },
  trapTriggered: {
    mark: '▼', color: 'pink', importance: 'minor', se: null,
    text: '罠を踏んだ！ 足がもつれて転んでしまった…'
  },
  countInterrupted: {
    mark: '▲', color: 'cyan', importance: 'minor', se: null,
    text: '集中して、{name}のカウントを止めた！'
  },
  countNotInterrupted: {
    mark: '▼', color: 'pink', importance: 'minor', se: null,
    text: '集中できない……{name}のカウントが続く'
  },
  luredByVoice: {
    mark: '!', color: 'pink', importance: 'major', se: null,
    text: 'あなたの声を聞きつけて、{count}人の足音が近づいてくる…♡'
  },
  enemyRemembers: {
    mark: '♡', color: 'pink', importance: 'minor', se: null,
    text: '{name}は、あなたに{count}回勝った記憶を覚えている…'
  },
  bindRequestAccepted: {
    mark: '♡', color: 'pink', importance: 'minor', se: null,
    text: '{name}のおねだりを受け入れた。抵抗が緩んでいく…'
  },
  bindRequestTimeout: {
    mark: '♡', color: 'pink', importance: 'minor', se: null,
    text: '答えられないまま、{name}のおねだりに流された…'
  },
  bindRequestRefused: {
    mark: '!', color: 'orange', importance: 'minor', se: null,
    text: '{name}のおねだりを拒んだ。吸われる勢いが強まる！'
  },
  formationChorus: {
    mark: '♡', color: 'pink', importance: 'major', se: null,
    text: '{line}'
  },
  corruptionUp: {
    mark: '♡', color: 'purple', importance: 'major', se: null,
    text: '堕ち度が深まった……【{name}】'
  },
  enemyIdle: {
    mark: '◇', color: 'pink', importance: 'minor', se: null,
    text: '{name}は様子をうかがっている…'
  },
  formationOn: {
    mark: '▼', color: 'pink', importance: 'major', se: null,
    text: '【{name}】{desc}'
  },
  debuffDeepen: {
    mark: '▼', color: 'purple', importance: 'major', se: null,
    text: '「{label}」が深く刻まれた…'
  },
  skillMiss: {
    mark: '◇', color: 'cyan', importance: 'minor', se: null,
    text: '{name}の「{skill}」をかわした！'
  },
  contestWin: {
    mark: '▲', color: 'cyan', importance: 'minor', se: null,
    text: '力比べに勝った！ {name}を押し返した'
  },
  contestLose: {
    mark: '▼', color: 'pink', importance: 'minor', se: null,
    text: '力比べに負けた…{name}に押し込まれる'
  },
  condWarn: {
    mark: '!', color: 'orange', importance: 'minor', se: null,
    text: '「{cond}」が溜まってきた…（{hint}）'
  },
  condOnset: {
    mark: '▼', color: 'pink', importance: 'major', se: null,
    text: '「{cond}」が発症した！'
  },
  condDanger: {
    mark: '▼', color: 'red', importance: 'major', se: null,
    text: '「{cond}」が危険域に達した。このまま受け入れ続けると定着してしまう'
  },
  condPermanent: {
    mark: '▼', color: 'purple', importance: 'major', se: null,
    text: '「{cond}」が体に定着した…（永続 {stage}）'
  },
  condRecoverProgress: {
    mark: '◇', color: 'cyan', importance: 'minor', se: null,
    text: '「{cond}」に抗えた（回復 {progress}/{need}）'
  },
  condRecover: {
    mark: '▲', color: 'cyan', importance: 'major', se: null,
    text: '「{cond}」が和らいだ（永続 {stage}）'
  },
  statusAdd: {
    mark: '▼', color: 'pink', importance: 'minor', se: null,
    text: '{status}になった（{turns}ターン）'
  },
  statusEnd: {
    mark: '◇', color: 'white', importance: 'minor', se: null,
    text: '{status}が治まった'
  },
  skillEvolved: {
    mark: '★', color: 'gold', importance: 'major', se: null,
    text: '{name}の「{skill}」が進化した！'
  },
  advancedLearned: {
    mark: '★', color: 'gold', importance: 'major', se: null,
    text: '{name}はフィニッシュの味を覚え、上位技「{skill}」を習得した！'
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
  heroExpDrained: {
    mark: '◇', color: 'cyan', importance: 'minor', se: null,
    text: '{name}の{skill}！ EXP -{amount}'
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
  goldGain: {
    mark: '◇', color: 'gold', importance: 'minor', se: null,
    text: '{amount}G を手に入れた（所持金 {total}G）'
  },
  goldStolen: {
    mark: '▼', color: 'gold', importance: 'major', se: null,
    text: '{name}にお金を盗まれた…（-{amount}G）'
  },
  itemStolen: {
    mark: '▼', color: 'gold', importance: 'major', se: null,
    text: '{name}に「{item}」を盗まれた…（商人ちゃんの店で買い戻せる）'
  },
  tribute: {
    mark: '♥', color: 'gold', importance: 'major', se: null,
    text: '{name}に {amount}G を貢いだ…（累計 {total}G）'
  },
  giftEquip: {
    mark: '♥', color: 'pink', importance: 'major', se: null,
    text: '{name}に「{item}」を無理やり着けさせられた…（自分では外せない）'
  },
  giftDeepen: {
    mark: '♥', color: 'pink', importance: 'major', se: null,
    text: '「{item}」がさらに馴染んでいく…（{level}段）'
  },
  giftAche: {
    mark: '▼', color: 'purple', importance: 'major', se: 'debuffDown',
    text: '{text}（負け癖・{name}：{stage}段）'
  },
  gearMelted: {
    mark: '▼', color: 'purple', importance: 'major', se: null,
    text: '{name}に「{item}」を溶かされてしまった…'
  },
  itemUsed: {
    mark: '◇', color: 'cyan', importance: 'minor', se: null,
    text: '{item}を使った。{text}'
  },
  amuletBlock: {
    mark: '★', color: 'cyan', importance: 'major', se: null,
    text: '身代わりのお守りが、吸い上げを防いでくれた！'
  },
  merchantHere: {
    mark: '◇', color: 'gold', importance: 'minor', se: null,
    text: 'どこかから、商人ちゃんの呼び声が聞こえる…'
  },
  pairStart: {
    mark: '♥', color: 'pink', importance: 'major', se: null,
    text: '{a}と{b}が、{act}を始めた…（30秒で絆が結ばれる）'
  },
  pairStage1: {
    mark: '▲', color: 'gold', importance: 'major', se: 'enemyGrow',
    text: '{a}と{b}の能力が上がった！（Lv+{gain}）'
  },
  pairStage2: {
    mark: '▲', color: 'gold', importance: 'major', se: null,
    text: '{a}と{b}の、こすり合わせた部位の技が強化された'
  },
  pairShareHabit: {
    mark: '▼', color: 'purple', importance: 'major', se: 'debuffDown',
    text: '{a}と{b}が負け癖を共有した…（{names}：{stage}段）'
  },
  pairComplete: {
    mark: '★', color: 'pink', importance: 'major', se: null,
    text: '{a}と{b}が絆を結んだ！ ユナイト攻撃「{skill}」を使ってくる'
  },
  pairInterrupted: {
    mark: '◇', color: 'white', importance: 'minor', se: null,
    text: '{a}と{b}のこすり合わせを止めた'
  },
  uniteAttack: {
    mark: '♥', color: 'pink', importance: 'major', se: null,
    text: '{a}と{b}のユナイト攻撃「{skill}」！'
  },
  climaxStartDrain: {
    mark: '♥', color: 'purple', importance: 'major', se: null,
    text: '絶頂の瞬間、経験値がまとめて吸い上げられた…（-{amount}）'
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
