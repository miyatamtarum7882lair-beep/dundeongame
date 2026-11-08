// File: src/data/enemyThemes.js
// 敵ごとのテーマ色。技の発光・技名の帯・粒子・吹き出しに使う。
// ゲームの主題（チャームポイントの誘惑に負けていく）に合わせ、main は全員ピンク系。
// キャラの個性は sub（presentation.colorImage を元にした副色）で出す。
// main 主色（ピンク系） / sub 副色（キャラの色） / glow 光の色（淡いピンク） / accent 締めの色
// 技の台本（skillStages.js）では '$main' '$sub' '$glow' '$accent' と書くと、この色に置き換わる。
export const ENEMY_THEMES = {
  kitten: { main: '#ff4fa3', sub: '#c86bff', glow: '#ffd6ec', accent: '#ff2d86' },
  blackRibbon: { main: '#ff7ec4', sub: '#d17aff', glow: '#ffe3f2', accent: '#ff3d8b' },
  pinkFox: { main: '#ff5fa8', sub: '#ff9ac2', glow: '#ffe6f1', accent: '#ffb35c' },
  thiefGirl: { main: '#ff7ab8', sub: '#a8dcff', glow: '#ffe8f4', accent: '#ff4fa3' },
  mikuGirl: { main: '#ff6fb0', sub: '#5fe0c0', glow: '#ffe6f2', accent: '#ff3d8b' },
  pleadingBunny: { main: '#ff8fc4', sub: '#ffd36b', glow: '#fff0f6', accent: '#ff4fa3' },
  angelGirl: { main: '#ff9fd0', sub: '#ffe28a', glow: '#fff3fa', accent: '#ff6fb0' },
  blondeBunny: { main: '#ff5c9d', sub: '#ffcf5c', glow: '#ffe1ee', accent: '#c2185b' },
  blueHairGal: { main: '#ff7ab8', sub: '#8fb8ff', glow: '#ffe6f3', accent: '#ff4fa3' },
  darkSister: { main: '#e0479a', sub: '#a070ff', glow: '#ffd9ee', accent: '#7a1f5c' },
  dreamLady: { main: '#ffa6cf', sub: '#e6d6ff', glow: '#fff3f9', accent: '#ff6fb0' },
  kissHunter: { main: '#ff4f9a', sub: '#7fe08f', glow: '#ffe1ef', accent: '#e0005f' },
  littleDevilLady: { main: '#ff6fae', sub: '#b8e6ff', glow: '#ffe3f1', accent: '#d61f6e' },
  pamperingLady: { main: '#ff9ccb', sub: '#a8dcff', glow: '#fff0f7', accent: '#ff6fb0' },
  powerBunny: { main: '#ff6f9f', sub: '#ffa64d', glow: '#ffe6ee', accent: '#ff3d7f' },
  silverFoxMaid: { main: '#ff8cc0', sub: '#d6e2f0', glow: '#fff0f7', accent: '#c94f8f' },
  velvetBunny: { main: '#ff3f8e', sub: '#ff9ac2', glow: '#ffdcea', accent: '#a0124f' },
  whisperDevil: { main: '#ff8fbf', sub: '#b77cff', glow: '#fff0f6', accent: '#8a2d6e' },
  demonicChinaGirl: { main: '#ff3fa0', sub: '#d65cff', glow: '#ffd9f0', accent: '#ffcf5c' },
  sakuraEnchantress: { main: '#ff9fc6', sub: '#c070ff', glow: '#fff0f5', accent: '#ff5c9d' },
  tricksterDevil: { main: '#ff2f8f', sub: '#9a4dff', glow: '#ffd2ea', accent: '#ff4f4f' },
  // 追加18体・前半8体
  blondeMaid: { main: '#ff7ab8', sub: '#ffd36b', glow: '#fff1f7', accent: '#c94f8f' },
  sweetBunny: { main: '#ff8fc4', sub: '#ffc6e0', glow: '#fff3f9', accent: '#ff5c9d' },
  yandereGirl: { main: '#ff4f8a', sub: '#a0204f', glow: '#ffd9e6', accent: '#6a0030' },
  littleDevilMaid: { main: '#ff6fb0', sub: '#9a6dff', glow: '#ffe3f1', accent: '#d61f6e' },
  jiangshiGirl: { main: '#ff6f9f', sub: '#ffcf5c', glow: '#ffe6ee', accent: '#c2185b' },
  silverDevil: { main: '#ff9fd0', sub: '#d6e2f0', glow: '#fff4fa', accent: '#ff5fa8' },
  expressionlessSuccubus: { main: '#e06fb0', sub: '#8f7bff', glow: '#f3e6ff', accent: '#5a2d8a' },
  sweetCatMaid: { main: '#ff7aa8', sub: '#e04f5f', glow: '#fff0f4', accent: '#ffd36b' },
  // 追加18体・後半10体
  demonicLady: { main: '#ff3fa0', sub: '#7a1f5c', glow: '#ffd9ee', accent: '#ffd36b' },
  mischievousDevil: { main: '#ff5fa8', sub: '#9a4dff', glow: '#ffe1f0', accent: '#ff2d86' },
  shyIdol: { main: '#ff7ac0', sub: '#7fd8ff', glow: '#fff0f8', accent: '#ffd36b' },
  corruptionLady: { main: '#e0479a', sub: '#c070ff', glow: '#ffd9ee', accent: '#5a1040' },
  pinkSuccubus: { main: '#ff4fa3', sub: '#d070ff', glow: '#ffd6ec', accent: '#8a1f5c' },
  curvyLittleDevil: { main: '#ff4f8a', sub: '#ff9ac2', glow: '#ffe1ee', accent: '#c2185b' },
  bluePrincess: { main: '#ff8fc4', sub: '#5f8fff', glow: '#f0f4ff', accent: '#ffd36b' },
  blackSister: { main: '#d0307a', sub: '#2a1a3a', glow: '#f3d9ea', accent: '#8a2d6e' },
  silverBunny: { main: '#ff8cc0', sub: '#d6e2f0', glow: '#ffffff', accent: '#ff4fa3' },
  assertiveMaid: { main: '#ff8fc4', sub: '#ff4f8a', glow: '#fff0f7', accent: '#c94f8f' }
};

const DEFAULT_THEME = { main: '#ff7ac0', sub: '#d17aff', glow: '#ffe3f2', accent: '#ff3d8b' };

// 主人公が抵抗に成功したときの色。これも淡いピンク（抗えても、甘さは消えない）
export const RESIST_COLORS = { main: '#ffd1e8', glow: '#ffffff' };

export function themeOf(speciesId) {
  return ENEMY_THEMES[speciesId] ?? DEFAULT_THEME;
}

// '$main' などのテーマ参照を、実際の色に置き換える。配列にも使える
export function resolveColor(value, theme) {
  if (Array.isArray(value)) return value.map((v) => resolveColor(v, theme));
  if (typeof value === 'string' && value.startsWith('$')) return theme[value.slice(1)] ?? DEFAULT_THEME.main;
  return value;
}
