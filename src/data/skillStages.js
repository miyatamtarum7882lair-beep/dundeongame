// File: src/data/skillStages.js
// 技ごとの演出台本。ここに無い技は、従来の演出（legacy）で1回だけ当たる。
//
// name        HUD に出す技名（defeatSkills.js に名前があればそちらが優先）
// banner      true / false で、技名 HUD を強制する。省略時は B.stage.bannerCategories に従う
// flashSec    技前の発光の長さ（この間、ヒットは始まらない）
// durationSec 発光のあとに続く演出の長さ。この間は、他の敵が動かない
// hits        { count, startSec, endSec }  発光後 startSec から endSec まで、等間隔にヒットする
// perHit      1ヒットごとの倍率 { hp, mp, exp }。基準は B.skills[技] の hpRate / mpRate / expRate。
//             省略した項目は 1 / count（全ヒットの合計で基準値ちょうど）
// hitNumbers  ヒットごとにダメージ数字を出すか。省略時は、1ヒットなら true、複数なら false（終了時に合計を出す）
// fx / se     演出キュー。fx の id は src/battle/stageFx.js の STAGE_FX、se の id は seTable.js の ID
//             se の id に '$skill' を書くと、skills.js の se を使う
export const SKILL_STAGES = {
  drainBerochu: {
    name: 'どれいんべろちゅー',
    flashSec: 0.25,
    durationSec: 3.1,
    hits: { count: 10, startSec: 0.1, endSec: 2.9 },
    perHit: { exp: 0.5 },
    hitNumbers: false,
    se: [
      { at: 'hit', id: 'vacuumKiss', gain: 0.7, gainEnd: 1.0 }
    ],
    fx: [
      { at: 'start', id: 'ring', r: 60, color: '#ff9ccf' },
      { at: 'hit', id: 'drainStream', count: 5 },
      { at: 'hit', id: 'hearts', every: 2, count: 3 },
      { at: 'hit', id: 'kissMark', every: 3 },
      { at: 'hit', id: 'shake', every: 2, power: 0.25 },
      { at: 'end', id: 'sparkle' }
    ]
  }
};