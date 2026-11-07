// File: src/ui/enemyLabels.js
// 敵の頭上の表示（高解像度層）。名前、レベル、HPバー、カモ度の段階（◇ 見慣れ／◆ 見切り）。
import { ENEMIES_BY_ID, ATTRS } from '../data/enemies.js';
import { markTier, getMarkScore } from '../battle/learning.js';
import { enemyExpNeeded } from '../battle/enemyStats.js';
import { clamp01 } from '../core/util.js';
import { themeOf } from '../data/enemyThemes.js';
import { drawShape } from './fxShapes.js';

// 勢いづいた度合い（0〜max）。上位技の習得・進化した技・種族の成長から数える
export function enemyPower(persistent, speciesId, B) {
  const P = B.enemyPower;
  const def = ENEMIES_BY_ID[speciesId];
  let n = 0;
  if (def?.advancedSkill && persistent.learnedSkills?.[speciesId]?.includes(def.advancedSkill)) n += P.advanced;
  for (const st of Object.values(persistent.skillEvolution?.[speciesId] ?? {})) if (st?.evolved) n += P.evolvedSkill;
  n += Math.floor((persistent.enemyLevels?.[speciesId] ?? 0) / P.levelsPerHeart);
  return Math.min(P.max, n);
}

// 足元のハートの光の輪（勢いづいた敵だけ）
function drawPowerAura(g, x, y, power, color, time) {
  const k = power / 5;
  const pulse = 0.75 + 0.25 * Math.sin(time * 3 + x * 0.01);
  g.save();
  g.translate(x, y - 4);
  g.scale(1, 0.38);
  const r = 26 + 10 * k;
  const grad = g.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.2);
  grad.addColorStop(0, `${color}00`);
  grad.addColorStop(0.7, `${color}${Math.round((0.25 + 0.35 * k) * pulse * 255).toString(16).padStart(2, '0')}`);
  grad.addColorStop(1, `${color}00`);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(0, 0, r * 1.2, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 0.6 + 0.3 * pulse;
  for (let i = 0; i < power + 1; i++) {
    const a = time * 0.9 + (i / (power + 1)) * Math.PI * 2;
    g.save();
    g.translate(Math.cos(a) * r, Math.sin(a) * r);
    g.scale(1, 1 / 0.38);
    drawShape(g, 'heart', 4.5, color);
    g.restore();
  }
  g.restore();
}

const TIER_STYLE = {
  stranger: { icon: '', color: '#ffffff', outline: 'rgba(0, 0, 0, 0.85)' },
  familiar: { icon: '◇ ', color: '#fff2c8', outline: 'rgba(0, 0, 0, 0.85)' },
  knowing: { icon: '◆ ', color: '#ffd36b', outline: 'rgba(120, 80, 0, 0.95)' }
};

// view.overlays は DungeonView.draw が作る（各敵の足元の画面座標）
export function drawEnemyLabels(g, view, persistent, B, time = 0) {
  g.save();
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.lineJoin = 'round';
  g.lineWidth = 3;

  for (const o of view.overlays) {
    const u = o.unit;
    const def = ENEMIES_BY_ID[u.speciesId];
    const attr = ATTRS[def.attr];
    const style = TIER_STYLE[markTier(getMarkScore(persistent, u.speciesId), B)];
    const top = o.y - B.tile.spriteH - 6;
    const power = enemyPower(persistent, u.speciesId, B);
    const theme = themeOf(u.speciesId);
    if (power > 0) drawPowerAura(g, o.x, o.y, power, theme.main, time);

    // HPバー
    const bw = 58;
    const bx = Math.round(o.x - bw / 2);
    const by = Math.round(top - 6);
    g.fillStyle = 'rgba(0, 0, 0, 0.65)';
    g.fillRect(bx - 1, by - 1, bw + 2, 7);
    g.fillStyle = '#ff6b8a';
    g.fillRect(bx, by, bw * clamp01(u.hp / u.maxHp), 5);
    const xpProgress = clamp01(u.exp / enemyExpNeeded(u.level, B));
    g.fillStyle = 'rgba(0, 0, 0, 0.85)';
    g.fillRect(bx, by + 7, bw, u.advancedSkill && !u.advancedSkillUnlocked ? 8 : 4);
    g.fillStyle = '#ffd36b';
    g.fillRect(bx, by + 7, bw * xpProgress, 4);
    if (u.advancedSkill && !u.advancedSkillUnlocked) {
      g.fillStyle = 'rgba(0, 0, 0, 0.85)';
      g.fillRect(bx, by + 12, bw, 2);
      g.fillStyle = '#7ee7d6';
      g.fillRect(bx, by + 12, bw * clamp01(u.drainExp / B.enemy.specialUnlockDrain), 2);
    }

    // 名前とレベル
    const nameText = `${style.icon}${u.name}`;
    const lvText = ` Lv${u.level}`;
    g.font = `bold 14px ${B.ui.fontFamily}`;
    const nameW = g.measureText(nameText).width;
    g.font = `12px ${B.ui.fontFamily}`;
    const lvW = g.measureText(lvText).width;
    const dot = 12;
    const startX = Math.round(o.x - (dot + nameW + lvW) / 2);
    const baseY = by - 5;

    g.fillStyle = attr.color;
    g.beginPath();
    g.arc(startX + 4, baseY - 5, 4, 0, Math.PI * 2);
    g.fill();

    g.font = `bold 14px ${B.ui.fontFamily}`;
    g.strokeStyle = style.outline;
    g.strokeText(nameText, startX + dot, baseY);
    g.fillStyle = style.color;
    g.fillText(nameText, startX + dot, baseY);

    g.font = `12px ${B.ui.fontFamily}`;
    g.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    g.strokeText(lvText, startX + dot + nameW, baseY);
    g.fillStyle = '#ffd36b';
    g.fillText(lvText, startX + dot + nameW, baseY);

    // 勢いづいた敵：名前の上に、強くなった分だけハートが並ぶ
    for (let i = 0; i < power; i++) {
      const beat = 1 + 0.15 * Math.max(0, Math.sin(time * 5 + i * 0.7));
      g.save();
      g.translate(o.x - ((power - 1) * 11) / 2 + i * 11, baseY - 22);
      g.scale(beat, beat);
      g.shadowColor = theme.main;
      g.shadowBlur = 6;
      drawShape(g, 'heart', 6, theme.main);
      g.restore();
    }
  }
  g.restore();
}
