// File: src/data/enemyHints.js
// 敗北後の回想で出す、敵ごとの対抗手段のヒント。
// mdungeon_pack/BALANCE_MATRIX.csv の「対抗手段」と、初期3体の YAML の counterplay から。
export const ENEMY_HINTS = {
  kitten: '挑発には「拒否して身構える」。誘惑癖が溜まる前に距離を取る',
  blackRibbon: '桃色の吐息は横へ避ける。魅了が切れた直後は再発しない猶予がある',
  pinkFox: '力比べは足場を固めて押し返す。体勢崩し中は背中を見せないように',
  thiefGirl: '遮蔽物と背後警戒で退路を守る',
  angelGirl: '祝福効果を解除し、遠距離の詠唱に割り込む',
  blueHairGal: '距離を維持して、狭い通路への誘導を避ける',
  mikuGirl: '魅了を解除し、1マス空けて対処する',
  pleadingBunny: '接近前に正体を見極め、範囲外から妨害する',
  velvetBunny: '広い場所へ誘導し、押し込まれる前に側面へ回る',
  darkSister: 'カウント開始を予備動作で見抜き、中断する',
  powerBunny: '予備動作を見たら横へ回避し、外した隙を突く',
  sakuraEnchantress: '印を優先して解除し、長期戦を避ける',
  demonicChinaGirl: '距離を保ち、盗取の予備動作を中断する',
  littleDevilLady: '誘導に乗らず、予備動作で距離を取り直す',
  silverFoxMaid: '漏出を早めに解除し、まとめて回収する技を阻止する',
  tricksterDevil: '足元の罠を見て迂回し、HP減少後の演技を警戒する',
  kissHunter: '印を解除し、遮蔽物で追尾の射線を切る',
  dreamLady: '眠気を解除し、長く足止めされる地形を避ける',
  whisperDevil: '囁きを遮断し、一度距離を取って体勢を立て直す',
  blondeBunny: '側面から仕掛け、正面の予備動作を見たら離れる',
  pamperingLady: '甘やかしを断ち、後退して状態異常を解除する',
  blondeMaid: 'メイドが集まる前に1人ずつ倒す。催促には身構える',
  sweetBunny: '一度負けた相手には近づかない。甘えるたびに強くなる',
  yandereGirl: '逃げるほど執着される。拘束されたら一度で抜け出す',
  littleDevilMaid: 'ご褒美は受け取らない。囁きの後はもがく回数を増やす',
  jiangshiGirl: '飛びつきは横へ避ける。同じ逃げ方は覚えられる',
  silverDevil: '最初のお願いを断る。カモにされると、おねだりが止まらない',
  expressionlessSuccubus: '抵抗をやめない。足払いの予備動作で横へ',
  sweetCatMaid: 'お世話は自分でやる。依存が溜まったら休憩時間に注意',
  demonicLady: '魅了されている間は近づかない。命令には従わない',
  mischievousDevil: '弱点を教わらない。経験値ドレインの予備動作を見たら離れる',
  shyIdol: 'ビームの射線を切る。見つめるほど、あの子は自信をつける',
  corruptionLady: '甘い取引は断る。その場だけの回復は、長い弱体化と引き換え',
  pinkSuccubus: '吸わせるほど吸い方がうまくなる。魔力を差し出さない',
  curvyLittleDevil: '振り返られたら目を逸らす。視線ロックが溜まると動けない',
  bluePrincess: '長く拘束されるほど丁寧に吸われる。一度で抜け出す',
  blackSister: '重圧は時間とともに増す。抵抗をやめない',
  silverBunny: '背中を見せない。回り込まれたら向き直る',
  assertiveMaid: '顔を逸らすたびに覚えられる。予備動作で距離を取る'
};

export const GENERAL_HINTS = [
  '囲まれる前に、広い場所から通路へ下がると拘束に加わる敵を減らせる',
  '左右や前後から同時に拘束されると、陣形の効果でドレインが強まる',
  '拘束中の「おねだり」を断ると吸われる量は増えるが、脱出の進みは守れる'
];
