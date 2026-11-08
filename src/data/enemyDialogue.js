// File: src/data/enemyDialogue.js
// 敵の台詞。選択肢付きの技は各敵ちょうど1つ（v6）。その他の技は吹き出しとログで話す。
//
// choice      選択肢付きの技。intro は選択肢の画面の台詞、resist / accept はボタンと返事
// speech      技の台詞が無いときの決まり文句
// skillLines  技ごとの台詞 { windup: 構えたとき, use: [使ったとき（どれか1つ）] }
// lines       場面ごとの台詞（拘束・進化など）
// 台詞は mdungeon_pack の口調設定に合わせた仮の文。
import { WAVE1_DIALOGUE } from './enemyDialogueWave1.js';
import { WAVE2_DIALOGUE } from './enemyDialogueWave2.js';
import { WAVE3_DIALOGUE } from './enemyDialogueWave3.js';
import { WAVE4_DIALOGUE } from './enemyDialogueWave4.js';

export const ENEMY_DIALOGUE = {
  ...WAVE1_DIALOGUE,
  ...WAVE2_DIALOGUE,
  ...WAVE3_DIALOGUE,
  ...WAVE4_DIALOGUE,
  // 一人称：あたし／呼び方：ザコくん／生意気で軽快、挑発が多い
  kitten: {
    choice: {
      skillId: 'kittenDare',
      intro: 'ほらぁ、自分から負けちゃえば？',
      resistLabel: '拒否して身構える',
      acceptLabel: '負けちゃう',
      resistLine: 'はぁ？ ザコくんのくせに生意気〜',
      acceptLine: 'あはっ♡ 自分から負けるとか、ほんとザコ〜♡',
      timeoutLine: '黙っちゃった？ じゃあ負け確定ね♡'
    },
    speech: 'あはっ、ザコくん発見♡',
    skillLines: {
      kittenTease: { use: ['ざぁこ♡ ざぁこ♡', 'ほらほら、よそ見してていいの〜？', 'その顔、ちょー油断してる♡'] },
      kittenBlowKiss: { windup: 'ねえ、こっち見て？', use: ['ちゅっ♡ 受け取ってね、ザコくん', '避けられるもんなら避けてみなよ♡'] },
      kittenDare: { windup: 'ねえねえ、ザコくん♡' },
      kittenFullTemptation: { windup: 'もう、ぜーんぶもらっちゃうね♡', use: ['ほら、ぜんぶ吸われちゃえ♡'] }
    },
    lines: {
      bind: 'つっかまえたぁ♡',
      drain: 'MP減ってるよぉ？',
      evolved: 'これ前も効いたよね？ もっと上手になっちゃった♡',
      idle: ['ねえ、まだ来ないの？ ザコくん♡', 'ふふっ、どうしよっかなぁ♡', 'こっち見てるの、バレバレだよ？'],
      familiar: [
        ['あはっ、また負けに来たの？ ザコくん♡'],
        ['ザコくんの弱いとこ、ぜーんぶ覚えてるよ？♡'],
        ['もうあたしの顔見ただけで、力抜けてるじゃん……♡ ざぁこ♡']
      ],
      request: ['ねえ、抵抗やめちゃお？ 一回だけ、きもちよ〜くなっちゃおうよ♡', 'ほら、力抜いて？ ザコくんにはそれがお似合いだよ♡'],
      requestAccept: 'あはっ、素直〜♡ えらいえらい♡',
      requestRefuse: 'はぁ？ 生意気〜。じゃあ、もっと吸っちゃお♡',
      climaxStart: 'ほら、イけ♡ ……ざぁこ♡',
      defeat: 'あたしの勝ちぃ♡ 経験値、ごちそうさま♡',
      danger: 'いいの……？♡ このまま受け入れたら、覚えちゃって……もう二度とあたしに勝てなくなっちゃうけど♡',
      lowMp: 'MP、もうないじゃん♡ あと少しで……ぜ〜んぶ、もらっちゃうね♡'
    }
  },

  // 一人称：わたし／呼び方：キミ／柔らかくゆっくりしたお姉さん口調
  blackRibbon: {
    choice: {
      skillId: 'peachBreath',
      intro: 'ふぅ……この香り、避けずに受けてみる？',
      resistLabel: '横へ避ける',
      acceptLabel: '受けてみる',
      resistLine: 'あら、残念。次は逃がさないよ？',
      acceptLine: 'いい子ね。ゆっくり吸いこんで……♡',
      timeoutLine: 'ふふ、もう香りに酔っちゃったのね♡'
    },
    speech: '少し遊んでいかない？',
    skillLines: {
      peachBreath: { windup: 'ふぅ……' },
      sweetWhisper: { use: ['ねえ、ちょっとだけ、こっちに集中して？', '耳、くすぐったい？', 'ふふ、ぼーっとしてきたでしょ？'] },
      closeBreath: { windup: 'もっと近くで、ね？', use: ['はぁ……♡ あったかいでしょ？'] },
      supremePeachBreath: { windup: 'とっておき、あげる', use: ['桃色に溶けちゃえ……♡'] }
    },
    lines: {
      bind: 'はい、つかまえた♡',
      drain: '吐息、効いてきた？',
      evolved: '前より弱くなったみたいね',
      idle: ['ふぅ……急がなくていいのよ？', 'キミの顔、もっと見ていたいな', 'ゆっくりでいいよ……♡'],
      familiar: [
        ['また来てくれたのね。うれしい……♡'],
        ['キミの弱いところ、ちゃんと覚えてるよ'],
        ['ふふ……もう、わたしの吐息が恋しくなっちゃったのね♡']
      ],
      request: ['……くす♡ 力、抜いていいのよ？ ゆっくり、吸ってあげる♡', '一回だけ、きもちよ〜くなっちゃお……？♡'],
      requestAccept: 'いい子ね……♡ そのまま、ゆっくり……',
      requestRefuse: 'あら……じゃあ、もう少し深く吸わせてもらうね？',
      climaxStart: '……くす♡ だいじょうぶだよ～♡ 安心して、ぜんぶ出しちゃおうね～……♡',
      defeat: '経験値もいただいちゃった♡ またおいで？',
      danger: 'ねえ……このまま吸いこみ続けたら、この香りなしじゃいられなくなっちゃうよ？ それでも、いい？♡',
      lowMp: 'だめ……♡ わたしの声に集中しちゃだめ……♡ 集中すると、ほんとにそうなっちゃうから……♡'
    }
  },

  // 一人称：あたし／呼び方：キミ／勝ち気で挑発的
  pinkFox: {
    choice: {
      skillId: 'foxPushContest',
      intro: '押し返してみなよ。勝てると思う？',
      resistLabel: '足場を固めて押し返す',
      acceptLabel: '押されるままになる',
      resistLine: 'へぇ、やる気？ いいよ、勝負っ！',
      acceptLine: 'あはっ、素直じゃん♡ 背中、もらうね',
      timeoutLine: '固まっちゃった？ じゃ、あたしの勝ちっ♪'
    },
    speech: '避けられるかな？',
    skillLines: {
      foxHipAttack: { windup: 'いっくよー♪', use: ['どーんっ♡', '受け止めてみなよ！'] },
      foxPushContest: { use: ['ほらほら、押し返してみなよ♡'] },
      tailFeint: { use: ['こっちこっち♪', 'しっぽに見とれた？'] },
      foxHipPress: { windup: 'とっておき、いくよ？', use: ['きつね式・極上プレス♡'] }
    },
    lines: {
      bind: 'つっかまえたぁ♡',
      drain: '押し返せないの？',
      evolved: 'この技、前も避けられなかったよね？',
      contestWin: 'うそっ、押し返された!?',
      contestLose: 'よわよわ〜♡',
      idle: ['ほらほら、かかってきなよ♪', 'しっぽ、気になる？', 'へへっ、次はどこから行こっかな♡'],
      familiar: [
        ['また挑戦するんだ？ 懲りないねー♡'],
        ['キミ、あたしのお尻に弱いの、もうバレバレだよ？'],
        ['あはっ、もう押し返そうともしないじゃん♡']
      ],
      request: ['ほらほら、押し返さないの？ じゃあ、力抜いちゃえば？♡', 'あたしに全部まかせちゃいなよ♪'],
      requestAccept: 'へへっ、素直でよろしい♡',
      requestRefuse: 'へぇ、まだ抵抗するんだ？ じゃあ本気出しちゃお♡',
      climaxStart: 'はい、あたしの勝ちっ♡ ぜ〜ろっ♡',
      defeat: 'あたしの勝ちっ♪ また遊ぼうね、キミ♡',
      danger: '次も負けたら……キミ、もうあたしに勝てなくなっちゃうかもよ？ いいの？♡',
      lowMp: 'あとちょっとで空っぽじゃん♡ ほらほら、どうするの？'
    }
  }
};

const GENERIC_SPEECH = {
  mouth: 'こちらを向いて。',
  bust: '少し力を抜いてね。',
  hip: '私から逃げられる？',
  foot: '動かないでね。',
  all: 'さあ、私の番よ。'
};

const pickLine = (v) => (Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v);

export function choiceFor(speciesId, skillId) {
  const choice = ENEMY_DIALOGUE[speciesId]?.choice;
  return choice?.skillId === skillId ? choice : null;
}

// 技を使ったときの台詞。skillId を渡すと、その技の台詞を優先する
export function speechFor(speciesId, attr, skillId = null) {
  const entry = ENEMY_DIALOGUE[speciesId];
  const use = skillId ? entry?.skillLines?.[skillId]?.use : null;
  return pickLine(use) ?? entry?.speech ?? GENERIC_SPEECH[attr] ?? GENERIC_SPEECH.all;
}

export function windupLineFor(speciesId, skillId) {
  return pickLine(ENEMY_DIALOGUE[speciesId]?.skillLines?.[skillId]?.windup) ?? null;
}

// 固有の台詞が無い敵の、場面ごとの決まり文句
const GENERIC_SCENE = {
  idle: ['ふふっ♡', 'どうしたの？ 来ないの？', '見とれちゃった？', 'ゆっくり遊んであげる♡'],
  familiar: [
    ['また会ったね♡'],
    ['あなたの弱いところ、覚えてるよ♡'],
    ['もう、わたしの顔を見ただけで力が抜けちゃうのね……♡']
  ],
  request: ['一回だけ、きもちよ〜くなっちゃおうよ……♡', '力、抜いて……？♡', 'だしてだしてぇ……♡ 経験値、おねが〜い……♡'],
  requestAccept: 'すきすき♡ いい子……♡',
  requestRefuse: 'ふーん……じゃあ、もっと吸っちゃお♡',
  climaxStart: ['イけ♡', 'は〜い……♡ ど〜ぞ……♡', 'ぜ〜ろっ♡'],
  defeat: ['経験値、ごちそうさま♡', 'また来てね……♡ 次も、いっぱい吸ってあげる'],
  danger: 'いいの……？♡ 今、受け入れたら……覚えて、好きになって……もう二度と倒せなくなっちゃうけど……それでも、いい？♡',
  lowMp: 'だめっ♡ 女の子に意識を集中しちゃだめ♡ 集中すると、ほんとにそうなっちゃうからっ……♡'
};

// 絶頂のときの「びゅー」の言い方。性格で言い分ける（甘い♡／とろける……♡／からかう笑・w／事務的な。）
export const CLIMAX_VOICE = {
  kitten: 'びゅー笑',
  blackRibbon: 'びゅ〜……♡',
  pinkFox: 'びゅー♡',
  thiefGirl: 'びゅー♡',
  mikuGirl: 'びゅ〜……♡',
  pleadingBunny: 'びゅ〜……♡',
  angelGirl: 'びゅ〜……♡',
  blondeBunny: 'びゅー♡',
  blueHairGal: 'びゅ〜……w',
  darkSister: 'びゅー。',
  dreamLady: 'びゅ〜……♡',
  kissHunter: 'びゅー♡',
  littleDevilLady: 'びゅー笑',
  pamperingLady: 'びゅ〜……♡',
  powerBunny: 'びゅー♡',
  silverFoxMaid: 'びゅー。',
  velvetBunny: 'びゅー笑',
  whisperDevil: 'びゅ〜……w',
  demonicChinaGirl: 'びゅー笑',
  sakuraEnchantress: 'びゅ〜……♡',
  tricksterDevil: 'びゅ〜……w',
  blondeMaid: 'びゅー。',
  sweetBunny: 'びゅ〜……♡',
  yandereGirl: 'びゅ〜……♡',
  littleDevilMaid: 'びゅー笑',
  jiangshiGirl: 'びゅー♡',
  silverDevil: 'びゅー笑',
  expressionlessSuccubus: 'びゅー。',
  sweetCatMaid: 'びゅ〜……♡',
  demonicLady: 'びゅー。',
  mischievousDevil: 'びゅ〜……w',
  shyIdol: 'びゅ〜……♡',
  corruptionLady: 'びゅ〜……♡',
  pinkSuccubus: 'びゅー♡',
  curvyLittleDevil: 'びゅー笑',
  bluePrincess: 'びゅー。',
  blackSister: 'びゅー。',
  silverBunny: 'びゅ〜……♡',
  assertiveMaid: 'びゅー♡'
};

export function climaxVoiceFor(speciesId) {
  return CLIMAX_VOICE[speciesId] ?? 'びゅ〜……♡';
}

export function sceneLineFor(speciesId, scene) {
  return pickLine(ENEMY_DIALOGUE[speciesId]?.lines?.[scene]) ?? pickLine(GENERIC_SCENE[scene]) ?? null;
}

// 負けた回数に応じた、再会の台詞（tier 0〜2）
export function familiarLineFor(speciesId, tier) {
  const tiers = ENEMY_DIALOGUE[speciesId]?.lines?.familiar ?? GENERIC_SCENE.familiar;
  return pickLine(tiers[Math.min(tier, tiers.length - 1)]);
}
