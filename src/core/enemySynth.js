// File: src/core/enemySynth.js
// 敵の固有技と、状態異常・選択肢の合成音。audio.js の SYNTH に合流する。
// 本番の音は public/assets/se/<SE ID>.ogg などを置くと、そちらが優先される。
import { tone, noise, vib, chime, sparkle, syllables, heartbeat, whoosh, boing, smack } from './synthParts.js';

// 短いくすくす笑い（罠の音に添える）
function insultGiggleLite(rig, start) {
  for (let i = 0; i < 3; i++) tone(rig, { type: 'triangle', f0: 1319 + (i % 2) * 196, start: start + i * 0.07, dur: 0.05, gain: 0.05 });
}

export const ENEMY_SYNTH = {
  // ---- 共通 ----
  // ハートが弾ける
  heartPop(rig) {
    tone(rig, { f0: 820, f1: 1500, dur: 0.08, gain: 0.16 });
    noise(rig, { f0: 3000, q: 1.5, dur: 0.05, gain: 0.12 });
    chime(rig, { f: 2093, start: 0.05, dur: 0.4, gain: 0.07 });
  },
  // 身をかわした
  missWhoosh(rig) {
    whoosh(rig, { f0: 1400, f1: 4200, dur: 0.18, gain: 0.2, q: 0.9 });
    chime(rig, { f: 1568, start: 0.08, dur: 0.4, gain: 0.06 });
  },
  // 技が強化（進化）した
  skillEvolve(rig) {
    [523, 659, 784, 1047, 1319].forEach((f, i) => chime(rig, { f, start: i * 0.07, dur: 0.9, gain: 0.08 }));
    noise(rig, { filter: 'highpass', f0: 3000, f1: 7000, dur: 0.8, gain: 0.07, attack: 0.3 });
    vib(rig, { f0: 196, f1: 294, dur: 0.9, gain: 0.1, attack: 0.3, vibHz: 5, vibDepth: 6 });
    heartbeat(rig, { start: 0.35, gain: 0.5 });
  },
  // 選択肢が出た（甘い膨らみと鼓動）
  choiceAppear(rig) {
    vib(rig, { f0: 330, f1: 440, dur: 0.7, gain: 0.08, attack: 0.25, vibHz: 5, vibDepth: 6 });
    chime(rig, { f: 1319, start: 0.1, dur: 0.9, gain: 0.08 });
    chime(rig, { f: 1760, start: 0.22, dur: 0.9, gain: 0.06 });
    heartbeat(rig, { start: 0.3, gain: 0.35 });
  },
  // 選択肢の前置き：敵がにじり寄って誘う（甘い膨らみと鼓動）
  temptPrelude(rig) {
    vib(rig, { f0: 247, f1: 370, dur: 1.0, gain: 0.11, attack: 0.4, vibHz: 5, vibDepth: 7 });
    vib(rig, { type: 'triangle', f0: 494, f1: 740, dur: 1.0, gain: 0.04, attack: 0.4, vibHz: 5, vibDepth: 9 });
    syllables(rig, { start: 0.2, count: 4, gap: 0.12, f0: 2600, gain: 0.07 });
    heartbeat(rig, { start: 0.45, gain: 0.4 });
    chime(rig, { f: 1568, start: 0.9, dur: 0.8, gain: 0.07 });
  },
  // 永続デバフが深まった（重く沈む鐘・粘つく下降音・鼓動）
  debuffDeepen(rig) {
    chime(rig, { f: 233, dur: 1.8, gain: 0.2, bright: 1.4 });
    chime(rig, { f: 220, start: 0.05, dur: 1.8, gain: 0.12 });
    vib(rig, { f0: 660, f1: 165, start: 0.1, dur: 1.2, gain: 0.08, attack: 0.05, vibHz: 7, vibDepth: 18, release: 0.8 });
    noise(rig, { filter: 'lowpass', f0: 1200, f1: 200, start: 0.2, dur: 1.0, gain: 0.12, attack: 0.3 });
    heartbeat(rig, { start: 0.6, gain: 0.6 });
    heartbeat(rig, { start: 1.25, gain: 0.45 });
  },
  // 別の敵が拘束に加わった（どすっ＋ずぶっと沈む）
  bindJoin(rig) {
    tone(rig, { type: 'triangle', f0: 160, f1: 50, dur: 0.3, gain: 0.45, attack: 0.003 });
    noise(rig, { f0: 500, f1: 2600, q: 4, start: 0.05, dur: 0.4, gain: 0.18, attack: 0.25 });
    heartbeat(rig, { start: 0.3, gain: 0.5 });
    chime(rig, { f: 1319, start: 0.25, dur: 0.6, gain: 0.07 });
  },
  // 拘束の陣形が成立した（ぐるりと囲まれる）
  formationOn(rig) {
    [392, 466, 554, 659].forEach((f, i) => vib(rig, { type: 'triangle', f0: f, start: i * 0.06, dur: 0.9, gain: 0.05, attack: 0.2, vibHz: 6, vibDepth: 6 }));
    noise(rig, { f0: 400, f1: 3000, q: 3, dur: 0.8, gain: 0.12, attack: 0.5 });
    heartbeat(rig, { start: 0.4, gain: 0.5 });
  },
  // ---- 敵どうしの絆（チャームポイントのこすり合わせ）----
  // 始まり：二人の甘い声が重なる
  pairStart(rig) {
    vib(rig, { f0: 392, f1: 523, dur: 0.8, gain: 0.07, attack: 0.25, vibHz: 6, vibDepth: 8 });
    vib(rig, { f0: 494, f1: 659, start: 0.12, dur: 0.8, gain: 0.06, attack: 0.25, vibHz: 6.5, vibDepth: 8 });
    chime(rig, { f: 1568, start: 0.3, dur: 0.7, gain: 0.06 });
    heartbeat(rig, { start: 0.45, gain: 0.35 });
  },
  // こすり合わせの1回。params.attr で質感を変える（キス・むにゅ・すりすり）
  pairRub(rig) {
    const attr = rig.params?.attr ?? 'bust';
    const k = 0.8 + 0.4 * (rig.params?.progress ?? 0);
    if (attr === 'mouth') {
      smack(rig, { gain: 0.16 * k });
      noise(rig, { f0: 1800, f1: 900, q: 2, start: 0.05, dur: 0.18, gain: 0.05 * k });
    } else if (attr === 'bust' || attr === 'hip') {
      noise(rig, { filter: 'lowpass', f0: 700, f1: 260, q: 1.2, dur: 0.28, gain: 0.18 * k, attack: 0.05 });
      tone(rig, { type: 'sine', f0: attr === 'hip' ? 150 : 190, f1: 110, dur: 0.22, gain: 0.12 * k, attack: 0.03 });
    } else {
      noise(rig, { f0: 1400, f1: 2400, q: 3, dur: 0.22, gain: 0.08 * k, attack: 0.06 });
      noise(rig, { f0: 2400, f1: 1300, q: 3, start: 0.22, dur: 0.2, gain: 0.07 * k, attack: 0.05 });
    }
    chime(rig, { f: 1760 + 220 * k, start: 0.12, dur: 0.35, gain: 0.03 * k });
  },
  // 絆の段階が上がった
  pairStage(rig) {
    [659, 831, 988].forEach((f, i) => chime(rig, { f, start: i * 0.08, dur: 0.7, gain: 0.07 }));
    heartbeat(rig, { start: 0.25, gain: 0.45 });
  },
  // 30秒を完遂した：二人の和音と、大きな鼓動
  pairComplete(rig) {
    [523, 659, 784, 988, 1175, 1568].forEach((f, i) => chime(rig, { f, start: i * 0.06, dur: 1.2, gain: 0.07 }));
    vib(rig, { f0: 262, f1: 392, dur: 1.2, gain: 0.1, attack: 0.3, vibHz: 5, vibDepth: 8 });
    noise(rig, { filter: 'highpass', f0: 3000, f1: 8000, dur: 1.0, gain: 0.06, attack: 0.4 });
    heartbeat(rig, { start: 0.3, gain: 0.6 });
    heartbeat(rig, { start: 0.75, gain: 0.5 });
  },
  // ---- 追加18体・前半8体 ----
  // メイドたちの声がそろう（「せー、の……♡」）：三つの声が少しずつずれて重なる
  maidChorus(rig) {
    [0, 0.05, 0.1].forEach((d, i) => syllables(rig, { start: d, count: 3, f0: 2200 + i * 300, gain: 0.05 }));
    vib(rig, { f0: 392, f1: 523, start: 0.2, dur: 0.8, gain: 0.07, attack: 0.25, vibHz: 6, vibDepth: 8 });
    tone(rig, { type: 'triangle', f0: 1700, f1: 900, start: 0.02, dur: 0.035, gain: 0.06, attack: 0.001 });
    heartbeat(rig, { start: 0.45, gain: 0.4 });
  },
  // ヤンデレの囁き：低く湿った吐息と、遅れて来る鼓動
  yandereWhisper(rig) {
    noise(rig, { filter: 'bandpass', f0: 900, f1: 600, q: 2.2, dur: 0.6, gain: 0.12, attack: 0.25 });
    vib(rig, { type: 'sine', f0: 247, f1: 220, start: 0.1, dur: 0.7, gain: 0.07, attack: 0.3, vibHz: 4, vibDepth: 5 });
    heartbeat(rig, { start: 0.55, gain: 0.55 });
    heartbeat(rig, { start: 0.85, gain: 0.45 });
  },
  // 錠がかかる：かちり、と甘い鈴
  lockClick(rig) {
    tone(rig, { type: 'square', f0: 2400, f1: 1200, dur: 0.025, gain: 0.07, attack: 0.001 });
    tone(rig, { type: 'triangle', f0: 320, f1: 160, start: 0.03, dur: 0.12, gain: 0.2, attack: 0.002 });
    chime(rig, { f: 1175, start: 0.12, dur: 0.6, gain: 0.06 });
  },
  // ティーカップがかちんと鳴る（メイドのご奉仕）
  teacupClink(rig) {
    chime(rig, { f: 2637, dur: 0.5, gain: 0.08 });
    chime(rig, { f: 3520, start: 0.05, dur: 0.4, gain: 0.05 });
    sparkle(rig, { start: 0.15, gain: 0.04 });
  },
  // キョンシーの跳ねる音（ぴょん）
  jiangshiHop(rig) {
    boing(rig, { f0: 420, f1: 240, dur: 0.25, gain: 0.14 });
    tone(rig, { type: 'triangle', f0: 140, f1: 70, start: 0.2, dur: 0.1, gain: 0.18, attack: 0.002 });
  },
  // お札がぺたりと貼られる
  talismanSlap(rig) {
    noise(rig, { f0: 2200, f1: 800, q: 1.2, dur: 0.08, gain: 0.18, attack: 0.002 });
    tone(rig, { type: 'sine', f0: 660, f1: 880, start: 0.06, dur: 0.4, gain: 0.07, attack: 0.05 });
    chime(rig, { f: 1568, start: 0.12, dur: 0.6, gain: 0.05 });
  },
  // しょんぼりした溜め息（甘えた鼻声）
  sulkySigh(rig) {
    vib(rig, { type: 'triangle', f0: 523, f1: 349, dur: 0.6, gain: 0.08, attack: 0.08, vibHz: 7, vibDepth: 10 });
    noise(rig, { filter: 'bandpass', f0: 1400, f1: 700, q: 1.8, dur: 0.5, gain: 0.06, attack: 0.15 });
  },
  // 無表情サキュバス：時計の針のように冷たく刻む
  coldTick(rig) {
    for (let i = 0; i < 3; i++) tone(rig, { type: 'square', f0: 1800, f1: 1700, start: i * 0.18, dur: 0.02, gain: 0.05, attack: 0.001 });
    tone(rig, { type: 'sine', f0: 196, f1: 196, start: 0.05, dur: 0.6, gain: 0.05, attack: 0.2 });
  },
  // 「ぜろ。」：低く落ちる一打
  zeroDrop(rig) {
    tone(rig, { type: 'triangle', f0: 220, f1: 55, dur: 0.5, gain: 0.4, attack: 0.003 });
    noise(rig, { filter: 'lowpass', f0: 600, f1: 120, dur: 0.4, gain: 0.15, attack: 0.005 });
    chime(rig, { f: 988, start: 0.3, dur: 0.9, gain: 0.05 });
  },
  // 猫の喉鳴らし（ごろごろ）
  catPurr(rig) {
    vib(rig, { type: 'sawtooth', f0: 55, f1: 50, dur: 0.7, gain: 0.05, attack: 0.15, vibHz: 24, vibDepth: 8 });
    noise(rig, { filter: 'lowpass', f0: 300, f1: 200, dur: 0.7, gain: 0.08, attack: 0.15 });
    chime(rig, { f: 1760, start: 0.3, dur: 0.5, gain: 0.04 });
  },
  // 「ふ～っ……♡」と吹きかける吐息
  catBreath(rig) {
    noise(rig, { filter: 'bandpass', f0: 1600, f1: 900, q: 1.4, dur: 0.7, gain: 0.14, attack: 0.3 });
    vib(rig, { type: 'sine', f0: 659, f1: 523, start: 0.25, dur: 0.6, gain: 0.05, attack: 0.2, vibHz: 5, vibDepth: 6 });
  },
  // ---- 追加18体・後半10体 ----
  // 王家の鈴：澄んだ高い鐘が、静かに重なる
  royalBell(rig) {
    [2093, 2637, 3136].forEach((f, i) => chime(rig, { f, start: i * 0.1, dur: 1.1, gain: 0.06 }));
    vib(rig, { type: 'sine', f0: 523, f1: 523, start: 0.1, dur: 0.9, gain: 0.04, attack: 0.3, vibHz: 4, vibDepth: 4 });
  },
  // アイドルのきらめき
  idolSparkle(rig) {
    sparkle(rig, { count: 5, base: 2349, gain: 0.06 });
    chime(rig, { f: 1568, start: 0.08, dur: 0.6, gain: 0.06 });
    tone(rig, { type: 'triangle', f0: 880, f1: 1320, dur: 0.15, gain: 0.06, attack: 0.01 });
  },
  // ハート型のビーム：きゅいーんと伸びて、ぽわん
  heartBeam(rig) {
    vib(rig, { type: 'sawtooth', f0: 600, f1: 1800, dur: 0.45, gain: 0.05, attack: 0.05, vibHz: 18, vibDepth: 30 });
    noise(rig, { f0: 2000, f1: 5000, q: 2, dur: 0.4, gain: 0.08, attack: 0.1 });
    chime(rig, { f: 1760, start: 0.4, dur: 0.7, gain: 0.08 });
    heartbeat(rig, { start: 0.5, gain: 0.4 });
  },
  // サキュバスの吸精：低く長く吸い込む
  succubusSuck(rig) {
    noise(rig, { filter: 'bandpass', f0: 400, f1: 1600, q: 3, dur: 0.9, gain: 0.18, attack: 0.4 });
    vib(rig, { type: 'sine', f0: 110, f1: 220, dur: 0.9, gain: 0.12, attack: 0.3, vibHz: 6, vibDepth: 10 });
    heartbeat(rig, { start: 0.6, gain: 0.5 });
  },
  // ---- お金・贈り物・装備・アイテム・商人 ----
  // 貢ぐ：硬貨がちゃりんと落ちて、甘い鼓動
  coinTribute(rig) {
    [2637, 3136, 2794, 3520].forEach((f, i) => tone(rig, { type: 'triangle', f0: f, f1: f * 0.98, start: i * 0.06, dur: 0.12, gain: 0.07, attack: 0.002 }));
    chime(rig, { f: 1568, start: 0.22, dur: 0.6, gain: 0.06 });
    heartbeat(rig, { start: 0.32, gain: 0.35 });
  },
  // 贈り物を着けさせられる：布がきゅっと締まり、甘い和音が絡みつく
  giftEquip(rig) {
    noise(rig, { f0: 900, f1: 2600, q: 2.5, dur: 0.3, gain: 0.12, attack: 0.12 });
    tone(rig, { type: 'sine', f0: 220, f1: 140, start: 0.25, dur: 0.25, gain: 0.18, attack: 0.02 });
    [659, 831, 988, 1319].forEach((f, i) => vib(rig, { type: 'triangle', f0: f, start: 0.3 + i * 0.07, dur: 0.9, gain: 0.05, attack: 0.15, vibHz: 6, vibDepth: 7 }));
    heartbeat(rig, { start: 0.55, gain: 0.5 });
  },
  // 装備が溶かされた：とろりと溶ける音
  gearMelt(rig) {
    noise(rig, { filter: 'lowpass', f0: 1600, f1: 200, q: 1.5, dur: 0.7, gain: 0.2, attack: 0.05 });
    vib(rig, { type: 'sine', f0: 523, f1: 196, dur: 0.8, gain: 0.08, attack: 0.05, vibHz: 7, vibDepth: 12 });
    boing(rig, { start: 0.15, gain: 0.08 });
  },
  // 敵にポーチを漁られる：布ずれ、ごそごそ、最後に「ちゅぽん」
  pouchRummage(rig) {
    for (let i = 0; i < 4; i++) noise(rig, { f0: 1400 + i * 300, f1: 900, q: 1.8, start: i * 0.09, dur: 0.08, gain: 0.12, attack: 0.01 });
    tone(rig, { type: 'sine', f0: 880, f1: 1760, start: 0.4, dur: 0.09, gain: 0.12, attack: 0.003 });
    [1319, 1661, 1976].forEach((f, i) => chime(rig, { f, start: 0.5 + i * 0.06, dur: 0.4, gain: 0.05 }));
  },
  // 奪ったアイテムを、敵が甘く使う：ふわっと広がる和音と鼓動
  snatchUse(rig) {
    noise(rig, { filter: 'lowpass', f0: 600, f1: 2400, q: 1.2, dur: 0.6, gain: 0.1, attack: 0.2 });
    [523, 659, 784, 1047].forEach((f, i) => vib(rig, { type: 'triangle', f0: f, start: 0.1 + i * 0.08, dur: 0.9, gain: 0.05, attack: 0.1, vibHz: 5, vibDepth: 9 }));
    heartbeat(rig, { start: 0.45, gain: 0.45 });
    heartbeat(rig, { start: 0.85, gain: 0.35 });
  },
  // アイテムを使った
  itemUse(rig) {
    sparkle(rig, { gain: 0.07 });
    chime(rig, { f: 1319, dur: 0.6, gain: 0.07 });
    chime(rig, { f: 1760, start: 0.08, dur: 0.6, gain: 0.05 });
  },
  // 行商ちゃんの店のベル
  shopBell(rig) {
    chime(rig, { f: 1568, dur: 0.9, gain: 0.09 });
    chime(rig, { f: 2093, start: 0.12, dur: 0.9, gain: 0.07 });
    chime(rig, { f: 2637, start: 0.24, dur: 1.0, gain: 0.05 });
  },
  // ユナイト攻撃：二人が息を合わせて飛びかかる
  uniteStrike(rig) {
    whoosh(rig, { f0: 600, f1: 3000, dur: 0.35, gain: 0.22, q: 0.8 });
    whoosh(rig, { f0: 800, f1: 3600, start: 0.08, dur: 0.35, gain: 0.18, q: 0.8 });
    tone(rig, { type: 'triangle', f0: 180, f1: 55, start: 0.32, dur: 0.35, gain: 0.45, attack: 0.003 });
    [784, 988, 1319].forEach((f, i) => chime(rig, { f, start: 0.36 + i * 0.05, dur: 0.8, gain: 0.08 }));
    heartbeat(rig, { start: 0.5, gain: 0.55 });
  },
  // 足音（軽い靴音）。params.side で左右の足の高さを少し変える
  footstep(rig) {
    const alt = rig.params?.alt ? 1.12 : 1;
    noise(rig, { filter: 'lowpass', f0: 900 * alt, f1: 300, q: 0.9, dur: 0.07, gain: 0.22, attack: 0.002 });
    tone(rig, { type: 'triangle', f0: 120 * alt, f1: 70, dur: 0.07, gain: 0.12, attack: 0.002 });
  },
  // 敵の足音（ヒール。こつっ）
  heelStep(rig) {
    const alt = rig.params?.alt ? 1.08 : 1;
    tone(rig, { type: 'triangle', f0: 1700 * alt, f1: 900, dur: 0.035, gain: 0.07, attack: 0.001 });
    noise(rig, { filter: 'highpass', f0: 2500, dur: 0.03, gain: 0.08, attack: 0.001 });
    tone(rig, { type: 'triangle', f0: 180, f1: 90, dur: 0.06, gain: 0.08, attack: 0.002 });
  },
  // 選択肢の残り3秒（鼓動が強くなる）
  choiceWarning(rig) {
    heartbeat(rig, { start: 0, gain: 0.55 });
    vib(rig, { f0: 220, f1: 330, dur: 0.6, gain: 0.07, attack: 0.2, vibHz: 7, vibDepth: 8 });
  },
  // 誘いを受け入れた
  temptAccept(rig) {
    [1568, 1319, 1047, 880].forEach((f, i) => chime(rig, { f, start: i * 0.08, dur: 0.7, gain: 0.07 }));
    noise(rig, { f0: 1200, f1: 700, q: 0.8, start: 0.1, dur: 0.6, gain: 0.1, attack: 0.25 });
  },
  // 蓄積の警告（3）
  conditionWarn(rig) {
    chime(rig, { f: 1319, dur: 0.6, gain: 0.08 });
    chime(rig, { f: 988, start: 0.14, dur: 0.7, gain: 0.08 });
    tone(rig, { f0: 196, dur: 0.5, gain: 0.06, attack: 0.1 });
  },
  // 発症（5）
  conditionOnset(rig) {
    chime(rig, { f: 1109, dur: 0.9, gain: 0.1 });
    chime(rig, { f: 1175, start: 0.02, dur: 0.9, gain: 0.08 });
    vib(rig, { f0: 147, f1: 220, dur: 0.9, gain: 0.12, attack: 0.3, vibHz: 4, vibDepth: 5 });
    heartbeat(rig, { start: 0.25, gain: 0.45 });
  },
  // 危険域（7以上）
  conditionDanger(rig) {
    chime(rig, { f: 587, dur: 1.2, gain: 0.12, bright: 1.3 });
    chime(rig, { f: 622, start: 0.03, dur: 1.2, gain: 0.08 });
    heartbeat(rig, { start: 0.1, gain: 0.6 });
    heartbeat(rig, { start: 0.55, gain: 0.5 });
  },
  // 永続化（低い鐘が2回）
  conditionPermanent(rig) {
    chime(rig, { f: 196, dur: 1.6, gain: 0.2, bright: 1.4 });
    chime(rig, { f: 185, start: 0.6, dur: 1.8, gain: 0.18, bright: 1.4 });
    noise(rig, { f0: 300, f1: 2500, q: 2, dur: 0.9, gain: 0.12, attack: 0.8 });
  },
  // 永続デバフの回復
  conditionRecover(rig) {
    [784, 988, 1175, 1568].forEach((f, i) => chime(rig, { f, start: i * 0.06, dur: 0.6, gain: 0.08 }));
  },
  // 経験値を吸われた（きらめきが下へ吸い出される）
  expDrained(rig) {
    noise(rig, { f0: 3200, f1: 900, q: 3, dur: 0.3, gain: 0.12, attack: 0.05 });
    [2093, 1760, 1319].forEach((f, i) => chime(rig, { f, start: i * 0.05, dur: 0.3, gain: 0.04 }));
  },
  // レベルが下がった（甘く沈む鐘と鼓動）
  levelDown(rig) {
    chime(rig, { f: 784, dur: 1.0, gain: 0.12 });
    chime(rig, { f: 523, start: 0.18, dur: 1.2, gain: 0.12 });
    chime(rig, { f: 392, start: 0.36, dur: 1.5, gain: 0.14, bright: 1.3 });
    vib(rig, { f0: 330, f1: 165, dur: 1.2, gain: 0.08, attack: 0.1, vibHz: 6, vibDepth: 8 });
    heartbeat(rig, { start: 0.5, gain: 0.55 });
  },
  // 魔法陣のうなり
  glyphHum(rig) {
    vib(rig, { type: 'triangle', f0: 330, dur: 0.9, gain: 0.07, attack: 0.3, vibHz: 9, vibDepth: 4 });
    sparkle(rig, { start: 0.1, count: 3, spread: 0.4, gain: 0.04 });
  },

  // ---- 前半9体 ----
  // シーフちゃん：さっと掠め取る（布をかすめる音＋小さな鈴）
  thiefSwipe(rig) {
    whoosh(rig, { dur: 0.14, f0: 1800, f1: 4200, gain: 0.16, q: 0.8 });
    tone(rig, { type: 'triangle', f0: 1760, f1: 2349, start: 0.08, dur: 0.08, gain: 0.06 });
    chime(rig, { f: 2637, start: 0.12, dur: 0.3, gain: 0.05 });
  },
  // ハートを抜き取る（吸い上げて、ぽんっと手に収まる）
  heartSteal(rig) {
    noise(rig, { f0: 600, f1: 3200, q: 4, dur: 0.4, gain: 0.18, attack: 0.3 });
    tone(rig, { f0: 500, f1: 1400, dur: 0.4, gain: 0.07, attack: 0.3 });
    tone(rig, { f0: 900, f1: 1500, start: 0.4, dur: 0.07, gain: 0.16 });
    sparkle(rig, { start: 0.42, count: 4, spread: 0.2, base: 1760, gain: 0.05 });
  },
  // ウインク（ちらっ）
  peekWink(rig) {
    tone(rig, { type: 'triangle', f0: 1319, f1: 1976, dur: 0.1, gain: 0.08 });
    chime(rig, { f: 2093, start: 0.08, dur: 0.5, gain: 0.07 });
    whoosh(rig, { start: 0.02, dur: 0.2, f0: 2500, f1: 4500, gain: 0.06, q: 0.7 });
  },
  // ミクちゃん：「おねがい♡」の甘い上がり調子
  mikuPlease(rig) {
    vib(rig, { type: 'triangle', f0: 660, f1: 990, dur: 0.22, gain: 0.1, attack: 0.02, vibHz: 9, vibDepth: 14 });
    vib(rig, { type: 'triangle', f0: 880, f1: 1320, start: 0.24, dur: 0.26, gain: 0.1, attack: 0.02, vibHz: 9, vibDepth: 18 });
    chime(rig, { f: 1760, start: 0.48, dur: 0.6, gain: 0.07 });
  },
  // おねだりバニー：恥ずかしそうな小さな声（震える高音と吐息）
  shyPlea(rig) {
    vib(rig, { f0: 740, f1: 620, dur: 0.5, gain: 0.07, attack: 0.1, vibHz: 7, vibDepth: 10 });
    noise(rig, { f0: 1500, f1: 900, q: 0.8, dur: 0.5, gain: 0.08, attack: 0.2 });
    chime(rig, { f: 1568, start: 0.45, dur: 0.5, gain: 0.05 });
  },
  // 味見（ちゅるっ）
  tasteLick(rig) {
    noise(rig, { f0: 1200, f1: 2600, q: 5, dur: 0.18, gain: 0.16, attack: 0.08 });
    smack(rig, { start: 0.16, gain: 0.14, pitch: 1.1 });
    tone(rig, { type: 'triangle', f0: 1046, f1: 1568, start: 0.2, dur: 0.12, gain: 0.05 });
  },
  // 天使ちゃん：聖なる鐘（明るい和音）
  holyChime(rig) {
    [1047, 1319, 1568, 2093].forEach((f, i) => chime(rig, { f, start: i * 0.05, dur: 1.0, gain: 0.07 }));
    noise(rig, { filter: 'highpass', f0: 4000, f1: 7000, dur: 0.8, gain: 0.05, attack: 0.3 });
  },
  // 子守唄のハープ
  harpLullaby(rig) {
    [523, 659, 784, 1047, 784, 659].forEach((f, i) => tone(rig, { type: 'triangle', f0: f, start: i * 0.11, dur: 0.6, gain: 0.07, attack: 0.004 }));
    vib(rig, { f0: 262, dur: 0.9, gain: 0.04, attack: 0.3, vibHz: 4, vibDepth: 3 });
  },
  // 慈愛の魔眼（吸い込まれるようなうなり）
  angelGaze(rig) {
    vib(rig, { f0: 330, f1: 220, dur: 0.8, gain: 0.08, attack: 0.3, vibHz: 5, vibDepth: 6 });
    chime(rig, { f: 1319, start: 0.1, dur: 0.9, gain: 0.07 });
    chime(rig, { f: 1397, start: 0.12, dur: 0.9, gain: 0.05 });
    heartbeat(rig, { start: 0.45, gain: 0.35 });
  },
  // 羽で包む（ふわっ）
  featherHug(rig) {
    noise(rig, { filter: 'highpass', f0: 2500, f1: 1500, dur: 0.4, gain: 0.1, attack: 0.15 });
    noise(rig, { filter: 'lowpass', f0: 700, f1: 300, dur: 0.35, gain: 0.12, attack: 0.08 });
    chime(rig, { f: 1568, start: 0.15, dur: 0.6, gain: 0.05 });
  },
  // グラマーバニーさん：ぱふっ（柔らかく弾む）
  pafuBounce(rig) {
    noise(rig, { filter: 'lowpass', f0: 600, f1: 250, dur: 0.16, gain: 0.26, attack: 0.01 });
    tone(rig, { f0: 140, f1: 90, dur: 0.18, gain: 0.2, attack: 0.01 });
    boing(rig, { start: 0.04, f0: 220, f1: 160, dur: 0.24, gain: 0.08 });
  },
  // ぎゅ〜っと締める
  squeezeHug(rig) {
    noise(rig, { filter: 'lowpass', f0: 300, f1: 700, q: 1, dur: 0.6, gain: 0.2, attack: 0.3 });
    vib(rig, { f0: 196, f1: 165, dur: 0.6, gain: 0.07, attack: 0.25, vibHz: 6, vibDepth: 5 });
    heartbeat(rig, { start: 0.3, gain: 0.3 });
  },
  // 逃がさない視線（ロックするような甘い一音）
  gazeLock(rig) {
    vib(rig, { type: 'triangle', f0: 523, f1: 784, dur: 0.35, gain: 0.08, attack: 0.15, vibHz: 6, vibDepth: 8 });
    tone(rig, { f0: 1568, start: 0.32, dur: 0.15, gain: 0.08 });
    whoosh(rig, { start: 0.3, dur: 0.25, f0: 400, f1: 1600, gain: 0.12 });
  },
  // 青髪ギャル：むぎゅっ（重く柔らかい）
  muchiPress(rig) {
    tone(rig, { type: 'triangle', f0: 130, f1: 48, dur: 0.3, gain: 0.42, attack: 0.004 });
    noise(rig, { filter: 'lowpass', f0: 700, f1: 200, dur: 0.22, gain: 0.26, attack: 0.004 });
    boing(rig, { start: 0.05, f0: 200, f1: 140, dur: 0.3, gain: 0.1 });
  },
  // 太もものむにゅっとした圧
  thighSquish(rig) {
    noise(rig, { filter: 'lowpass', f0: 450, f1: 900, q: 1.5, dur: 0.45, gain: 0.22, attack: 0.15 });
    vib(rig, { f0: 175, dur: 0.45, gain: 0.06, attack: 0.15, vibHz: 7, vibDepth: 5 });
  },
  // よしよし（なでる衣擦れと、甘い鈴）
  pamperPat(rig) {
    noise(rig, { filter: 'highpass', f0: 2000, f1: 3000, dur: 0.15, gain: 0.08, attack: 0.05 });
    noise(rig, { filter: 'highpass', f0: 2000, f1: 3000, start: 0.2, dur: 0.15, gain: 0.08, attack: 0.05 });
    chime(rig, { f: 1319, start: 0.3, dur: 0.6, gain: 0.06 });
  },
  // シスターさん：カウントの鐘（params.progress で少しずつ低く、重く）
  countBell(rig) {
    const p = rig.params?.progress ?? 0;
    const f = 660 - 260 * p;
    chime(rig, { f, dur: 1.2, gain: 0.12 + 0.08 * p, bright: 1.2 });
    chime(rig, { f: f * 1.5, start: 0.01, dur: 0.6, gain: 0.04 });
    heartbeat(rig, { start: 0.15, gain: 0.25 + 0.3 * p });
  },
  // 懺悔の鐘（低く重い）
  repentToll(rig) {
    chime(rig, { f: 262, dur: 1.4, gain: 0.16, bright: 1.4 });
    chime(rig, { f: 247, start: 0.03, dur: 1.4, gain: 0.08 });
    noise(rig, { filter: 'lowpass', f0: 500, f1: 150, dur: 0.6, gain: 0.08, attack: 0.1 });
  },
  // 黒羽の告解（羽ばたきと暗い和音）
  featherConfess(rig) {
    for (let i = 0; i < 3; i++) whoosh(rig, { start: i * 0.12, dur: 0.14, f0: 900, f1: 2200, gain: 0.1, q: 0.8 });
    [311, 370, 466].forEach((f) => vib(rig, { type: 'triangle', f0: f, start: 0.2, dur: 0.8, gain: 0.04, attack: 0.3, vibHz: 4, vibDepth: 4 }));
  },
  // 夢見のお姉さん：オルゴール
  musicBox(rig) {
    [1568, 1319, 1175, 1047, 1175, 1319].forEach((f, i) => chime(rig, { f, start: i * 0.16, dur: 0.7, gain: 0.06, bright: 0.6 }));
  },
  // ふわふわと漂う
  dreamFloat(rig) {
    vib(rig, { f0: 392, f1: 523, dur: 1.0, gain: 0.07, attack: 0.4, vibHz: 3, vibDepth: 6 });
    vib(rig, { type: 'triangle', f0: 784, f1: 1047, dur: 1.0, gain: 0.03, attack: 0.4, vibHz: 3, vibDepth: 8 });
    noise(rig, { f0: 1200, f1: 800, q: 0.7, dur: 0.9, gain: 0.05, attack: 0.4 });
  },
  // キスハンター：ロックオン（ぴぴっ＋ハート）
  markLock(rig) {
    tone(rig, { type: 'square', f0: 1760, dur: 0.05, gain: 0.04 });
    tone(rig, { type: 'square', f0: 1760, start: 0.09, dur: 0.05, gain: 0.04 });
    tone(rig, { type: 'triangle', f0: 1319, f1: 2093, start: 0.2, dur: 0.15, gain: 0.08 });
    chime(rig, { f: 2093, start: 0.32, dur: 0.5, gain: 0.06 });
  },
  // ハンターのキス（素早く吸う）
  hunterKiss(rig) {
    noise(rig, { f0: 700, f1: 3600, q: 4, dur: 0.3, gain: 0.2, attack: 0.18 });
    smack(rig, { start: 0.28, gain: 0.2, pitch: 1.1 });
  },
  // 追いかけてくるハート（ひゅんひゅん）
  homingHeart(rig) {
    whoosh(rig, { dur: 0.2, f0: 800, f1: 2400, gain: 0.12 });
    whoosh(rig, { start: 0.14, dur: 0.2, f0: 1000, f1: 2800, gain: 0.1 });
    tone(rig, { f0: 820, f1: 1500, start: 0.32, dur: 0.08, gain: 0.12 });
  },

  // ---- 後半9体 ----
  // 小悪魔お嬢さん：優雅なお辞儀（衣擦れと上品な鈴）
  ladyCurtsy(rig) {
    noise(rig, { filter: 'highpass', f0: 2600, f1: 1800, dur: 0.3, gain: 0.08, attack: 0.1 });
    [1319, 1661, 1976].forEach((f, i) => chime(rig, { f, start: 0.1 + i * 0.07, dur: 0.7, gain: 0.06 }));
  },
  // ヒールの小走り
  ladyStepSe(rig) {
    for (let i = 0; i < 4; i++) {
      tone(rig, { type: 'triangle', f0: 1700, f1: 900, start: i * 0.07, dur: 0.035, gain: 0.07 });
      noise(rig, { filter: 'highpass', f0: 2500, start: i * 0.07, dur: 0.03, gain: 0.06 });
    }
    chime(rig, { f: 1568, start: 0.3, dur: 0.5, gain: 0.06 });
  },
  // 脚が絡む（すべすべと擦れる）
  legWrap(rig) {
    noise(rig, { filter: 'highpass', f0: 1800, f1: 3200, dur: 0.5, gain: 0.12, attack: 0.2 });
    noise(rig, { filter: 'lowpass', f0: 500, f1: 800, dur: 0.5, gain: 0.12, attack: 0.2 });
    vib(rig, { f0: 220, dur: 0.5, gain: 0.04, attack: 0.2, vibHz: 6, vibDepth: 4 });
  },
  // 甘やかしレディ：やわらかな鼻歌
  pamperHum(rig) {
    vib(rig, { f0: 392, f1: 349, dur: 0.5, gain: 0.07, attack: 0.15, vibHz: 5, vibDepth: 6 });
    vib(rig, { f0: 440, f1: 392, start: 0.45, dur: 0.6, gain: 0.07, attack: 0.15, vibHz: 5, vibDepth: 6 });
    chime(rig, { f: 1319, start: 0.8, dur: 0.6, gain: 0.05 });
  },
  // 怪力バニーさん：突進の溜め（上がっていくうなり）
  rocketCharge(rig) {
    tone(rig, { type: 'sawtooth', f0: 80, f1: 260, dur: 0.9, gain: 0.05, attack: 0.3 });
    noise(rig, { filter: 'lowpass', f0: 200, f1: 1600, dur: 0.9, gain: 0.16, attack: 0.5 });
    tone(rig, { type: 'triangle', f0: 400, f1: 1200, start: 0.5, dur: 0.4, gain: 0.06, attack: 0.2 });
  },
  // 突進の衝突（どかんっ）
  rocketImpact(rig) {
    whoosh(rig, { dur: 0.16, f0: 300, f1: 2400, gain: 0.25 });
    tone(rig, { type: 'triangle', f0: 120, f1: 36, start: 0.14, dur: 0.45, gain: 0.55, attack: 0.003 });
    noise(rig, { filter: 'lowpass', f0: 1400, f1: 120, start: 0.14, dur: 0.35, gain: 0.35, attack: 0.002 });
    boing(rig, { start: 0.2, f0: 260, f1: 160, dur: 0.3, gain: 0.1 });
  },
  // どっかーんヒップ（もっと重く、地響き）
  dokkan(rig) {
    whoosh(rig, { dur: 0.2, f0: 250, f1: 1400, gain: 0.22 });
    tone(rig, { type: 'triangle', f0: 100, f1: 30, start: 0.2, dur: 0.6, gain: 0.6, attack: 0.003 });
    noise(rig, { filter: 'lowpass', f0: 900, f1: 80, start: 0.2, dur: 0.6, gain: 0.35, attack: 0.002 });
    boing(rig, { start: 0.26, f0: 240, f1: 140, dur: 0.4, gain: 0.12 });
  },
  // 銀狐メイドさん：呼び鈴（ちりん）
  maidBell(rig) {
    chime(rig, { f: 2349, dur: 0.9, gain: 0.1, bright: 1.2 });
    chime(rig, { f: 2349, start: 0.12, dur: 0.7, gain: 0.06 });
  },
  // 魔力がしたたる（ぽた、ぽた）
  manaDrip(rig) {
    for (let i = 0; i < 4; i++) tone(rig, { f0: 1400 - i * 120, f1: 700, start: i * 0.15, dur: 0.08, gain: 0.08 });
    noise(rig, { f0: 900, f1: 600, q: 2, dur: 0.6, gain: 0.05, attack: 0.2 });
  },
  // 回収のストンプ（ヒールで踏み、吸い上げる）
  collectStomp(rig) {
    tone(rig, { type: 'triangle', f0: 1700, f1: 900, dur: 0.04, gain: 0.08 });
    tone(rig, { type: 'triangle', f0: 140, f1: 55, start: 0.02, dur: 0.22, gain: 0.35 });
    noise(rig, { f0: 500, f1: 3000, q: 4, start: 0.15, dur: 0.4, gain: 0.16, attack: 0.25 });
  },
  // ベルベットバニー：重い圧（ずしっ）
  wallPress(rig) {
    noise(rig, { filter: 'lowpass', f0: 250, f1: 600, q: 1, dur: 0.6, gain: 0.26, attack: 0.2 });
    tone(rig, { type: 'triangle', f0: 90, f1: 60, dur: 0.6, gain: 0.25, attack: 0.15 });
    heartbeat(rig, { start: 0.35, gain: 0.3 });
  },
  // ハートの刻印（どすっ＋ぽんっ）
  heartStampSe(rig) {
    tone(rig, { type: 'triangle', f0: 150, f1: 50, dur: 0.25, gain: 0.45, attack: 0.003 });
    tone(rig, { f0: 820, f1: 1500, start: 0.08, dur: 0.08, gain: 0.14 });
    chime(rig, { f: 1760, start: 0.12, dur: 0.5, gain: 0.06 });
  },
  // ぽしょぽしょ悪魔ちゃん：たくさんの囁き
  whisperPosho(rig) {
    syllables(rig, { count: 10, gap: 0.085, f0: 3200, spread: 1400, gain: 0.12 });
    noise(rig, { f0: 1000, f1: 700, q: 0.7, dur: 0.9, gain: 0.05, attack: 0.3 });
  },
  // くすくす笑い
  insultGiggle(rig) {
    for (let i = 0; i < 4; i++) tone(rig, { type: 'triangle', f0: 1175 + (i % 2) * 220, start: i * 0.08, dur: 0.06, gain: 0.06 });
    syllables(rig, { start: 0.32, count: 3, gap: 0.09, f0: 3000, gain: 0.08 });
  },
  // 手のひらで吸い取る（吸い上げと、きらめき）
  handDrain(rig) {
    noise(rig, { f0: 400, f1: 2800, q: 4, dur: 0.5, gain: 0.2, attack: 0.35 });
    tone(rig, { f0: 300, f1: 900, dur: 0.5, gain: 0.07, attack: 0.35 });
    sparkle(rig, { start: 0.48, count: 4, spread: 0.2, base: 1568, gain: 0.05 });
  },
  // 魔性のチャイナ娘：小さな銅鑼
  chinaGong(rig) {
    chime(rig, { f: 330, dur: 1.4, gain: 0.14, bright: 1.6 });
    chime(rig, { f: 349, start: 0.01, dur: 1.2, gain: 0.08, bright: 1.3 });
    noise(rig, { filter: 'bandpass', f0: 600, f1: 400, q: 3, dur: 0.6, gain: 0.08, attack: 0.01 });
  },
  // お仕置き（ぺしっ）
  punishSlap(rig) {
    noise(rig, { filter: 'highpass', f0: 1500, f1: 800, dur: 0.06, gain: 0.32, attack: 0.001 });
    tone(rig, { type: 'triangle', f0: 600, f1: 200, dur: 0.08, gain: 0.12 });
    tone(rig, { type: 'triangle', f0: 1319, start: 0.12, dur: 0.06, gain: 0.06 });
  },
  // 桜の妖女：桜を運ぶ風（と鈴）
  sakuraWind(rig) {
    noise(rig, { f0: 600, f1: 1800, q: 0.7, dur: 0.9, gain: 0.12, attack: 0.35 });
    sparkle(rig, { start: 0.3, count: 3, spread: 0.4, base: 1760, gain: 0.04 });
  },
  // 花吹雪（強い風と、鈴の雨）
  petalStorm(rig) {
    noise(rig, { f0: 400, f1: 2600, q: 0.6, dur: 1.4, gain: 0.18, attack: 0.5 });
    for (let i = 0; i < 8; i++) chime(rig, { f: [1568, 1760, 2093, 2349][i % 4], start: 0.3 + i * 0.12, dur: 0.5, gain: 0.04, bright: 0.6 });
    vib(rig, { f0: 330, f1: 247, dur: 1.4, gain: 0.05, attack: 0.5, vibHz: 4, vibDepth: 5 });
  },
  // ずるっこ悪魔ちゃん：罠を仕掛ける（魔法陣のうなりと、かちっ）
  trapSet(rig) {
    vib(rig, { type: 'triangle', f0: 220, f1: 330, dur: 0.6, gain: 0.06, attack: 0.2, vibHz: 9, vibDepth: 5 });
    tone(rig, { type: 'square', f0: 1200, start: 0.5, dur: 0.03, gain: 0.04 });
    insultGiggleLite(rig, 0.6);
  },
  // 罠が弾ける（ばちんっ＋ぷるん＋くすっ）
  trapSpring(rig) {
    noise(rig, { filter: 'highpass', f0: 2000, f1: 600, dur: 0.1, gain: 0.3, attack: 0.001 });
    tone(rig, { type: 'triangle', f0: 180, f1: 60, dur: 0.25, gain: 0.35, attack: 0.003 });
    boing(rig, { start: 0.08, f0: 320, f1: 180, dur: 0.35, gain: 0.12 });
    insultGiggleLite(rig, 0.4);
  },
  // うそ泣き（ひっく、ひっく）
  fakeSob(rig) {
    for (let i = 0; i < 3; i++) vib(rig, { f0: 820 - i * 40, f1: 620, start: i * 0.22, dur: 0.16, gain: 0.07, attack: 0.02, vibHz: 14, vibDepth: 30 });
    noise(rig, { f0: 1500, f1: 900, q: 0.8, start: 0.6, dur: 0.4, gain: 0.06, attack: 0.15 });
  },

  // ---- 小悪魔キトゥン ----
  // 小悪魔タッチ：ぺちっ＋くすくす笑い
  kittenTouch(rig) {
    noise(rig, { filter: 'lowpass', f0: 1800, f1: 600, dur: 0.06, gain: 0.25, attack: 0.002 });
    tone(rig, { type: 'triangle', f0: 1319, start: 0.06, dur: 0.06, gain: 0.08 });
    tone(rig, { type: 'triangle', f0: 1568, start: 0.12, dur: 0.07, gain: 0.08 });
    smack(rig, { start: 0.04, gain: 0.12, pitch: 1.2 });
  },
  // ざぁこ♡の誘惑：「ざぁ〜こ♡」の抑揚（下がって、上がる）
  kittenTease(rig) {
    vib(rig, { type: 'triangle', f0: 740, f1: 520, dur: 0.24, gain: 0.12, attack: 0.02, vibHz: 7, vibDepth: 10 });
    vib(rig, { type: 'triangle', f0: 560, f1: 900, start: 0.25, dur: 0.3, gain: 0.12, attack: 0.02, vibHz: 8, vibDepth: 16 });
    noise(rig, { f0: 4200, q: 2, dur: 0.12, gain: 0.05 });
    chime(rig, { f: 1568, start: 0.5, dur: 0.6, gain: 0.09 });
    sparkle(rig, { start: 0.55, count: 3, spread: 0.2, gain: 0.04 });
  },
  // 小悪魔の投げキッス：ちゅっ → ひゅ〜ん
  kittenBlowKiss(rig) {
    smack(rig, { gain: 0.24 });
    smack(rig, { start: 0.1, gain: 0.14, pitch: 0.8 });
    whoosh(rig, { start: 0.18, dur: 0.55, f0: 700, f1: 2600, gain: 0.12 });
    vib(rig, { f0: 1047, f1: 1568, start: 0.2, dur: 0.5, gain: 0.05, vibHz: 10, vibDepth: 30 });
  },
  // ねえ、負けちゃう？♡：低く甘い膨らみと鼓動
  kittenDare(rig) {
    vib(rig, { f0: 220, f1: 330, dur: 0.85, gain: 0.12, attack: 0.3, vibHz: 5, vibDepth: 7 });
    vib(rig, { type: 'triangle', f0: 440, f1: 660, dur: 0.85, gain: 0.05, attack: 0.3, vibHz: 5, vibDepth: 9 });
    heartbeat(rig, { start: 0.3, gain: 0.45 });
    chime(rig, { f: 1319, start: 0.78, dur: 0.8, gain: 0.09 });
    chime(rig, { f: 1976, start: 0.86, dur: 0.8, gain: 0.06 });
  },
  // ざぁこ♡キッスホールド：吸いつき＋紫のきらめき
  kittenKissHold(rig) {
    noise(rig, { f0: 450, f1: 3200, q: 5, dur: 0.65, gain: 0.26, attack: 0.45 });
    tone(rig, { f0: 650, f1: 170, dur: 0.7, gain: 0.1, attack: 0.05 });
    smack(rig, { start: 0.66, gain: 0.26, pitch: 0.9 });
    sparkle(rig, { start: 0.7, count: 3, spread: 0.25, base: 1760, gain: 0.05 });
  },
  // 小悪魔の完全誘惑（1ヒット分。繰り返し鳴らす）
  temptSuck(rig) {
    const p = rig.params?.progress ?? 0;
    noise(rig, { f0: 500 + 600 * p, f1: 2600 + 1200 * p, q: 4, dur: 0.24, gain: 0.2, attack: 0.15 });
    smack(rig, { start: 0.22, gain: 0.16, pitch: 0.9 + 0.3 * p });
    tone(rig, { type: 'triangle', f0: 880 + 440 * p, f1: 440, start: 0.2, dur: 0.15, gain: 0.05 });
  },

  // ---- 黒髪リボンちゃん ----
  // リボンタッチ：衣擦れ＋小さな鈴
  ribbonTouch(rig) {
    noise(rig, { filter: 'highpass', f0: 2200, f1: 4200, dur: 0.18, gain: 0.16, attack: 0.05 });
    noise(rig, { filter: 'lowpass', f0: 900, f1: 400, dur: 0.07, gain: 0.18, attack: 0.002 });
    chime(rig, { f: 1047, start: 0.08, dur: 0.6, gain: 0.08 });
  },
  // 桃色の吐息：長い吐息＋ガラスのような甘いきらめき
  peachBreath(rig) {
    noise(rig, { f0: 1700, f1: 700, q: 0.7, dur: 1.15, gain: 0.24, attack: 0.4 });
    noise(rig, { filter: 'highpass', f0: 4500, f1: 2500, dur: 0.9, gain: 0.04, attack: 0.4 });
    [1760, 2217, 2637].forEach((f, i) => {
      vib(rig, { f0: f, start: 0.25 + i * 0.08, dur: 0.9, gain: 0.025, attack: 0.3, vibHz: 4 + i, vibDepth: 9 });
    });
  },
  // 甘い囁き：耳元の小さな声
  sweetWhisper(rig) {
    syllables(rig, { count: 6, gap: 0.1, f0: 3000, spread: 1100, gain: 0.13 });
    noise(rig, { f0: 900, f1: 600, q: 0.7, dur: 0.75, gain: 0.07, attack: 0.25 });
    chime(rig, { f: 1760, start: 0.62, dur: 0.6, gain: 0.06 });
  },
  // あまあま吐息：至近距離の温かい吐息とキス
  closeBreath(rig) {
    noise(rig, { filter: 'lowpass', f0: 1100, f1: 500, q: 0.8, dur: 0.45, gain: 0.25, attack: 0.15 });
    smack(rig, { start: 0.38, gain: 0.14, pitch: 0.85 });
  },
  // 桃色吐息ホールド：吐息と鼓動
  peachBreathHold(rig) {
    noise(rig, { f0: 1400, f1: 650, q: 0.8, dur: 0.8, gain: 0.22, attack: 0.3 });
    heartbeat(rig, { start: 0.15, gain: 0.32 });
    vib(rig, { f0: 1760, start: 0.3, dur: 0.6, gain: 0.025, vibHz: 5, vibDepth: 10 });
  },
  // 極上の桃色吐息：濃い霧が満ちる（和音の膨らみ＋鐘）
  supremePeachBreath(rig) {
    noise(rig, { f0: 500, f1: 2400, q: 0.9, dur: 1.4, gain: 0.26, attack: 0.9 });
    [440, 554, 659].forEach((f) => {
      vib(rig, { type: 'triangle', f0: f, start: 0.2, dur: 1.3, gain: 0.05, attack: 0.6, vibHz: 5, vibDepth: 6 });
    });
    chime(rig, { f: 880, start: 1.2, dur: 1.4, gain: 0.12 });
    sparkle(rig, { start: 1.25, count: 5, spread: 0.4, gain: 0.05 });
  },
  // 泡がはじける（吐息の追加音）
  bubblePop(rig) {
    tone(rig, { f0: 600, f1: 1400, dur: 0.05, gain: 0.12 });
    tone(rig, { f0: 900, f1: 1900, start: 0.06, dur: 0.04, gain: 0.08 });
  },

  // ---- ピンク髪きつねちゃん ----
  // きつねステップ：軽い足音＋しっぽ
  foxStep(rig) {
    noise(rig, { filter: 'lowpass', f0: 700, dur: 0.05, gain: 0.25, attack: 0.002 });
    noise(rig, { filter: 'lowpass', f0: 650, start: 0.08, dur: 0.05, gain: 0.22, attack: 0.002 });
    whoosh(rig, { start: 0.1, dur: 0.18, f0: 1500, f1: 3500, gain: 0.08, q: 0.7 });
    tone(rig, { type: 'triangle', f0: 150, f1: 60, start: 0.12, dur: 0.15, gain: 0.25 });
  },
  // きつねヒップアタック：ぶんっ → どすん＋ぷるん
  foxHipAttack(rig) {
    whoosh(rig, { dur: 0.2, f0: 300, f1: 1600, gain: 0.22 });
    tone(rig, { type: 'triangle', f0: 140, f1: 42, start: 0.2, dur: 0.32, gain: 0.5, attack: 0.003 });
    noise(rig, { filter: 'lowpass', f0: 900, f1: 150, start: 0.2, dur: 0.18, gain: 0.3, attack: 0.002 });
    boing(rig, { start: 0.24, f0: 280, f1: 170, gain: 0.14 });
  },
  // 押し合い：うなる低音ときしみ
  foxPushStrain(rig) {
    noise(rig, { filter: 'lowpass', f0: 220, f1: 520, q: 1, dur: 0.8, gain: 0.28, attack: 0.4 });
    tone(rig, { type: 'triangle', f0: 90, f1: 135, dur: 0.8, gain: 0.16, attack: 0.3 });
    noise(rig, { f0: 620, f1: 820, q: 14, start: 0.25, dur: 0.4, gain: 0.07, attack: 0.15 });
  },
  // 力比べに勝った
  // 押し返した（それでも甘い余韻が残る）
  contestWin(rig) {
    whoosh(rig, { dur: 0.18, f0: 500, f1: 2500, gain: 0.16 });
    heartbeat(rig, { start: 0.35, gain: 0.25 });
    [523, 659, 784, 1047].forEach((f, i) => chime(rig, { f, start: 0.1 + i * 0.07, dur: 0.6, gain: 0.08 }));
  },
  // 力比べに負けた（へなっと下がる）
  contestLose(rig) {
    vib(rig, { type: 'triangle', f0: 620, f1: 260, dur: 0.5, gain: 0.12, vibHz: 9, vibDepth: 20, release: 0.7 });
    tone(rig, { type: 'triangle', f0: 120, f1: 50, start: 0.35, dur: 0.25, gain: 0.35 });
    boing(rig, { start: 0.4, f0: 240, f1: 150, gain: 0.12 });
  },
  // しっぽフェイント：ふぁさっ、ふぁさっ＋くすっ
  tailFeint(rig) {
    whoosh(rig, { dur: 0.12, f0: 2000, f1: 4500, gain: 0.14, q: 0.7 });
    whoosh(rig, { start: 0.13, dur: 0.12, f0: 2400, f1: 5000, gain: 0.12, q: 0.7 });
    tone(rig, { type: 'triangle', f0: 1568, start: 0.25, dur: 0.06, gain: 0.07 });
    tone(rig, { type: 'triangle', f0: 1760, start: 0.32, dur: 0.08, gain: 0.07 });
  },
  // 背面すりすり（きつね）：こすれる音としっぽ
  foxBackRub(rig) {
    noise(rig, { f0: 380, f1: 700, q: 2.5, dur: 0.55, gain: 0.24, attack: 0.15 });
    noise(rig, { filter: 'highpass', f0: 2600, f1: 4200, start: 0.2, dur: 0.3, gain: 0.07, attack: 0.1 });
    vib(rig, { f0: 196, dur: 0.55, gain: 0.06, attack: 0.15, vibHz: 6, vibDepth: 5 });
  },
  // 極上ヒッププレス（1ヒット分）
  hipBounce(rig) {
    const p = rig.params?.progress ?? 0;
    tone(rig, { type: 'triangle', f0: 130 + 30 * p, f1: 44, dur: 0.26, gain: 0.42, attack: 0.003 });
    noise(rig, { filter: 'lowpass', f0: 800, f1: 150, dur: 0.14, gain: 0.24, attack: 0.002 });
    boing(rig, { start: 0.04, f0: 260 + 60 * p, f1: 160, dur: 0.26, gain: 0.1 });
  }
};
