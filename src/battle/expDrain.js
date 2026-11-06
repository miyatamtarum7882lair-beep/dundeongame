// File: src/battle/expDrain.js
/**
 * 主人公の経験値を減らす。足りなければレベルが下がる（レベルアップの逆）。
 * レベルが下がると maxHp / maxMp も levelUp の分だけ戻り、hp / mp は新しい上限で切り詰める。
 *
 * @param {{level:number, exp:number, hp:number, mp:number, maxHp:number, maxMp:number}} hs
 * @param {number} amount 失う経験値
 * @param {{needFn:(level:number)=>number, levelUp:{hp:number, mp:number}, minLevel?:number}} opt
 * @returns {{lost:number, levelsLost:number, atFloor:boolean}}
 */
export function loseHeroExp(hs, amount, { needFn, levelUp, minLevel = 1 }) {
  let left = Math.max(0, Math.round(amount));
  const start = left;
  let levelsLost = 0;
  while (left > 0) {
    if (hs.exp >= left) {
      hs.exp -= left;
      left = 0;
      break;
    }
    left -= hs.exp;
    hs.exp = 0;
    if (hs.level <= minLevel) break;
    hs.level -= 1;
    hs.maxHp = Math.max(1, hs.maxHp - levelUp.hp);
    hs.maxMp = Math.max(0, hs.maxMp - levelUp.mp);
    // 必要値ちょうどだと次の加算で即レベルアップするため、1手前まで戻す
    hs.exp = Math.max(0, needFn(hs.level) - 1);
    levelsLost += 1;
  }
  hs.hp = Math.min(hs.hp, hs.maxHp);
  hs.mp = Math.min(hs.mp, hs.maxMp);
  return { lost: start - left, levelsLost, atFloor: left > 0 };
}