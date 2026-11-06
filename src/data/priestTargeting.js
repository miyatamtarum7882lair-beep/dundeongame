// 敵ごとの「僧侶を狙う確率」。値は仮置き。未登録の敵は B.priest.defaultTargetRate。
// 魅了で上がる量は、既存の B.skills[skillId].allyCharm を使う。
export const PRIEST_TARGET_RATE = {
  kitten: 0.25,
  blackRibbon: 0.5,
  pinkFox: 0.35,
  nurse: 0.6,
  officeLady: 0.3,
};
