// File: src/ui/exploreHud.js
// 探索中の表示（高解像度層）。階数、HP・MP、Lv・EXP・武器、階の表示、階段の案内。
import { clamp01 } from '../core/util.js';
import { expNeeded } from '../battle/damage.js';

const WEAPON_NAMES = { sword: '剣', fist: '拳' };

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
  text(g, `HP ${hero.hp}/${hero.maxHp}`, 224, 42);
  text(g, `MP ${hero.mp}/${hero.maxMp}`, 224, 58);

  g.fillStyle = '#ffd36b';
  const weapon = WEAPON_NAMES[hero.weapon] ?? '剣';
  text(g, `Lv${hero.level}　EXP ${hero.exp}/${expNeeded(hero.level, B)}　武器：${weapon}（Q）　防御：G`, 16, 78);

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