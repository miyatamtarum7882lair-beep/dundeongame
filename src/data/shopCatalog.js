// File: src/data/shopCatalog.js
// アイテム・装備・敵からの贈り物・拠点の強化の一覧（名前と説明）。数値は balance.js の economy / gifts / merchant / baseCamp。
import { ENEMIES_BY_ID } from './enemies.js';

// 消耗品。保存先は persistent.consumables[id]（個数）
export const ITEMS = {
  soothingIncense: { name: '安らぎの香', price: 60, desc: '蓄積デバフのゲージをすべて 3 下げる' },
  purifyingDrop: { name: '浄めの雫', price: 50, desc: '一時的な状態異常（魅了・油断など）をすべて消す' },
  manaVial: { name: '魔力の小瓶', price: 40, desc: 'MP を最大値の 40% 回復する' },
  charmAmulet: { name: '身代わりのお守り', price: 150, desc: '持っているだけで、絶頂の瞬間の吸い上げを 1 回だけ防ぐ（自動で消費）', passive: true },
  lurePerfume: { name: '誘惑の香水', price: 80, desc: 'この階の敵をすべて呼び寄せる。20 ターンの間、倒した敵の経験値が 1.5 倍' }
};
export const ITEM_IDS = Object.keys(ITEMS);

// 部位ごとの装備（チャームポイントへの耐性が上がる）。拘束されるたびに溶かされて耐久が減る
export const SLOTS = ['mouth', 'hand', 'bust', 'hip', 'foot'];
export const SLOT_NAMES = { mouth: '口', hand: '手', bust: '胸', hip: '尻', foot: '足' };
export const GEAR = {
  veilMask: { slot: 'mouth', name: '清めのヴェール', resist: 8, dur: 24, price: 90 },
  silverMask: { slot: 'mouth', name: '銀糸の口当て', resist: 15, dur: 40, price: 210 },
  leatherGauntlet: { slot: 'hand', name: '革の手甲', resist: 8, dur: 24, price: 90 },
  holyGauntlet: { slot: 'hand', name: '聖銀のガントレット', resist: 15, dur: 40, price: 210 },
  ironPlate: { slot: 'bust', name: '鉄の胸当て', resist: 8, dur: 24, price: 90 },
  blessedPlate: { slot: 'bust', name: '祝福の胸甲', resist: 15, dur: 40, price: 210 },
  thickTrousers: { slot: 'hip', name: '厚手のズボン', resist: 8, dur: 24, price: 90 },
  chainGirdle: { slot: 'hip', name: '鎖帷子の腰当て', resist: 15, dur: 40, price: 210 },
  sturdyBoots: { slot: 'foot', name: '丈夫なブーツ', resist: 8, dur: 24, price: 90 },
  knightGreaves: { slot: 'foot', name: '聖騎士の脛当て', resist: 15, dur: 40, price: 210 }
};

// 敵からの贈り物（呪いの装備）。誘惑に乗ったときなどに、無理やり着けさせられる
export const GIFT_NOUN = { mouth: '刻印', hand: '手袋', bust: 'ブラ', hip: 'パンツ', foot: '靴下' };
export const GIFT_LINES = {
  mouth: ['はい、わたしの印♡ ちゅっ……これ、消えないからね？', 'もう一回、上から押してあげる♡ もっと濃くなったね'],
  hand: ['手袋、はめてあげる♡ これで、ずっとわたしの手を思い出すね', 'ほら、ぎゅって♡ 指の間まで、わたしの形になってく'],
  bust: ['このブラ、着けて？♡ わたしの匂い、ついてるでしょ', 'ふふ、まだ着けてくれてるんだ♡ じゃあ、もっと締めてあげる'],
  hip: ['パンツ、穿かせてあげる♡ 脱いじゃだめだよ？', 'わたしのパンツ、気に入ってくれた？♡ もっと食い込ませてあげる'],
  foot: ['靴下、履かせてあげる♡ 一歩ごとに、わたしを思い出すの', 'その靴下で歩くたびに……わたしに踏まれてるみたいでしょ♡']
};
export const GIFT_ACHE = {
  mouth: '唇の刻印が、熱く疼く……',
  hand: '手袋の中で、指先が甘く痺れる……',
  bust: 'ブラが、きゅっと胸を締めつける……',
  hip: 'パンツが食い込んで、腰が勝手に揺れる……',
  foot: '靴下の中で、足の裏がくすぐったく疼く……'
};

export function giftName(raceId, slot) {
  return `${ENEMIES_BY_ID[raceId]?.name ?? raceId}の${GIFT_NOUN[slot] ?? '贈り物'}`;
}

// 拠点の強化。雪辱ポイント（敗北・クリアでもらえる）で買う。cost は次の段階の値段
export const BASE_UPGRADES = {
  maxMp: { name: '魔力の器', desc: '冒険を始めるときの最大 MP +20', max: 5, cost: (lv) => 20 + lv * 15 },
  resistAll: { name: '心の鎧', desc: 'すべてのチャームポイントへの耐性 +3', max: 5, cost: (lv) => 25 + lv * 20 },
  startGold: { name: 'へそくり', desc: '冒険を始めるときの所持金 +50G', max: 5, cost: (lv) => 15 + lv * 10 },
  amulet: { name: 'お守りの持ち込み', desc: '冒険を始めるとき、身代わりのお守りを 1 つ持っていく', max: 2, cost: (lv) => 40 + lv * 40 },
  merchantDiscount: { name: '常連さん', desc: '商人ちゃんの値段 -5%', max: 4, cost: (lv) => 30 + lv * 25 }
};
