// File: src/data/enemyGroups.js
// 関連のある敵のまとまり。一緒に湧きやすく（generate.js）、連携攻撃（ユナイト攻撃）の種類にもなる（pairBond.js）。
// 1体が複数のまとまりに入ってもよい。
export const ENEMY_GROUPS = {
  maid: {
    name: 'メイド隊', members: ['blondeMaid', 'littleDevilMaid', 'sweetCatMaid', 'assertiveMaid', 'silverFoxMaid'],
    unite: { name: 'メイド隊の総力ご奉仕', effect: 'chorus', line: '「「経験値、だして……♡」」' }
  },
  bunny: {
    name: 'バニーズ', members: ['pleadingBunny', 'blondeBunny', 'powerBunny', 'velvetBunny', 'sweetBunny', 'silverBunny'],
    unite: { name: 'バニーズ・ラビットラッシュ', effect: 'rush', line: 'ぴょ～ん、挟み撃ち♡' }
  },
  devil: {
    name: '小悪魔たち', members: ['kitten', 'littleDevilLady', 'whisperDevil', 'tricksterDevil', 'littleDevilMaid', 'mischievousDevil', 'silverDevil', 'curvyLittleDevil'],
    unite: { name: 'いたずら双子悪魔の左右囁き', effect: 'whisper', line: '右から「びゅー……♡」、左から「だしちゃえだしちゃえ……♡」' }
  },
  succubus: {
    name: 'サキュバス', members: ['pinkSuccubus', 'expressionlessSuccubus', 'demonicLady', 'corruptionLady'],
    unite: { name: '淫魔の二重吸精', effect: 'doubleDrain', line: '二人で、ぜんぶ吸ってあげる……♡' }
  },
  sister: {
    name: 'シスター', members: ['darkSister', 'blackSister', 'angelGirl'],
    unite: { name: '二重の審判', effect: 'judgment', line: 'ご、よん、さん、に、いち……ぜろ。' }
  },
  noble: {
    name: '高貴な方々', members: ['littleDevilLady', 'demonicLady', 'bluePrincess', 'sakuraEnchantress', 'pamperingLady'],
    unite: { name: '高貴なる二重命令', effect: 'command', line: '跪きなさい。……二人に、ね♡' }
  },
  chase: {
    name: '追跡者', members: ['yandereGirl', 'kissHunter', 'blondeMaid', 'thiefGirl', 'jiangshiGirl'],
    unite: { name: '逃げ場なしの包囲捕獲', effect: 'capture', line: 'もう、どこにも行かせない♡' }
  },
  pamper: {
    name: '甘やかし', members: ['sweetBunny', 'pamperingLady', 'dreamLady', 'sweetCatMaid', 'angelGirl', 'blueHairGal'],
    unite: { name: 'あまあま挟み撃ち', effect: 'lullaby', line: 'よしよし……二人で、とろとろにしてあげる♡' }
  },
  gaze: {
    name: '視線', members: ['shyIdol', 'curvyLittleDevil', 'assertiveMaid', 'blondeBunny', 'demonicLady'],
    unite: { name: '視線包囲・目線ロック', effect: 'gaze', line: 'こっち見て♡ ……ううん、こっちも♡' }
  }
};

const GROUPS_OF = {};
for (const [id, g] of Object.entries(ENEMY_GROUPS)) for (const m of g.members) (GROUPS_OF[m] ??= []).push(id);

export function groupsOf(raceId) {
  return GROUPS_OF[raceId] ?? [];
}

/** 二人が共通で入っているまとまり（最初の1つ）。無ければ null */
export function sharedGroup(a, b) {
  const ga = groupsOf(a);
  return groupsOf(b).find((g) => ga.includes(g)) ?? null;
}

/** 関連のある種族の一覧（同じまとまりの仲間） */
export function relatedSpecies(raceId) {
  const out = new Set();
  for (const g of groupsOf(raceId)) for (const m of ENEMY_GROUPS[g].members) if (m !== raceId) out.add(m);
  return [...out];
}
