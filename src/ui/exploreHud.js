// File: src/ui/exploreHud.js
// 探索中の表示（高解像度層）。階数、HP・MP、武器、階の表示、階段の案内。Lv・EXP は levelHud.js
import { clamp01 } from '../core/util.js';


function text(g, str, x, y) {
  g.strokeText(str, x, y);
  g.fillText(str, x, y);
}

function bar(g, x, y, w, h, ratio, color) {
  g.fillStyle = 'rgba(0, 0, 0, 0.55)';
  g.fillRect(x, y, w, h);
  g.fillStyle = color;
  g.fillRect(x, y, w * clamp01(ratio), h);
}

function drawWeaponIcon(g, weapon) {
  const x = 232;
  const y = 42;
  g.save();
  g.fillStyle = 'rgba(24, 18, 28, 0.88)';
  g.strokeStyle = 'rgba(255, 224, 166, 0.9)';
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(x, y, 34, 34, 8);
  g.fill();
  g.stroke();
  if (weapon === 'fist') {
    g.fillStyle = '#ffd7aa';
    g.strokeStyle = '#fff1dc';
    g.lineWidth = 1.5;
    g.beginPath();
    g.roundRect(x + 10, y + 17, 16, 11, 4);
    g.fill();
    g.stroke();
    for (let i = 0; i < 4; i += 1) {
      g.beginPath();
      g.roundRect(x + 9 + i * 4.2, y + 9 + (i === 0 || i === 3 ? 2 : 0), 5, 12, 2.5);
      g.fill();
      g.stroke();
    }
    g.beginPath();
    g.roundRect(x + 5, y + 17, 8, 6, 3);
    g.fill();
    g.stroke();
  } else {
    g.fillStyle = '#fff0b2';
    g.strokeStyle = '#fff8dd';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x + 17, y + 4);
    g.lineTo(x + 22, y + 19);
    g.lineTo(x + 17, y + 24);
    g.lineTo(x + 12, y + 19);
    g.closePath();
    g.fill();
    g.stroke();
    g.strokeStyle = '#d79c53';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x + 9, y + 19);
    g.lineTo(x + 25, y + 19);
    g.moveTo(x + 17, y + 23);
    g.lineTo(x + 17, y + 29);
    g.stroke();
  }
  g.restore();
}

// 高解像度層（gHires）に描く
export function drawExploreHud(g, exp, B) {
  const run = exp.save.currentRun;
  const hero = run.hero;
  const total = B.dungeon.floorsPerDungeon;
  const lw = B.render.logicalWidth;
  const lh = B.render.logicalHeight;

  g.save();
  g.lineJoin = 'round';
  g.lineWidth = 3;
  g.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  g.textBaseline = 'top';
  g.textAlign = 'left';

  g.font = `bold 18px ${B.ui.fontFamily}`;
  g.fillStyle = '#ffffff';
  text(g, `ダンジョン1　${run.floor}F / ${total}F`, 16, 14);

  bar(g, 16, 44, 200, 10, hero.hp / hero.maxHp, '#ff6b8a');
  bar(g, 16, 60, 200, 10, hero.mp / hero.maxMp, '#6bb8ff');
  g.font = `12px ${B.ui.fontFamily}`;
  g.fillStyle = '#ffffff';
  text(g, 'HP ' + hero.hp + '/' + hero.maxHp, 22, 42);
  text(g, 'MP ' + hero.mp + '/' + hero.maxMp, 22, 58);

  g.fillStyle = '#ffd36b';
  drawWeaponIcon(g, hero.weapon);
  // レベルの表示は ui/levelHud.js（経験値を吸われたときの演出つき）

  // 階の表示。ふわっと出て、ゆっくり消える（点滅しない）
  if (exp.bannerSec > 0) {
    const total2 = B.explore.bannerSec;
    const alpha = clamp01(Math.min(exp.bannerSec / 0.8, (total2 - exp.bannerSec) / 0.3));
    g.globalAlpha = alpha;
    g.font = `bold 48px ${B.ui.fontFamily}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 6;
    g.fillStyle = '#ffffff';
    text(g, `${run.floor}F`, lw / 2, lh * 0.28);
    g.globalAlpha = 1;
  }

  if (exp.onStairs) {
    const isExit = run.floor >= total;
    g.font = `bold 20px ${B.ui.fontFamily}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ffd36b';
    text(g, isExit ? 'E：出口から出る（ダンジョンクリア）' : 'E：階段を降りる', lw / 2, lh * 0.82);
  }
  g.restore();
}
