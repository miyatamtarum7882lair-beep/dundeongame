// File: src/ui/enemyLabels.js
// 敵の頭上の表示（高解像度層）。名前、レベル、HPバー、カモ度の段階（◇ 見慣れ／◆ 見切り）。
import { ENEMIES_BY_ID, ATTRS } from '../data/enemies.js';
import { markTier, getMarkScore } from '../battle/learning.js';
import { clamp01 } from '../core/util.js';

const TIER_STYLE = {
  stranger: { icon: '', color: '#ffffff', outline: 'rgba(0, 0, 0, 0.85)' },
  familiar: { icon: '◇ ', color: '#fff2c8', outline: 'rgba(0, 0, 0, 0.85)' },
  knowing: { icon: '◆ ', color: '#ffd36b', outline: 'rgba(120, 80, 0, 0.95)' }
};

// view.overlays は DungeonView.draw が作る（各敵の足元の画面座標）
export function drawEnemyLabels(g, view, persistent, B) {
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

    // HPバー
    const bw = 58;
    const bx = Math.round(o.x - bw / 2);
    const by = Math.round(top - 6);
    g.fillStyle = 'rgba(0, 0, 0, 0.65)';
    g.fillRect(bx - 1, by - 1, bw + 2, 7);
    g.fillStyle = '#ff6b8a';
    g.fillRect(bx, by, bw * clamp01(u.hp / u.maxHp), 5);
    const xpProgress = u.advancedSkill && !u.advancedSkillUnlocked
      ? clamp01(u.drainExp / B.enemy.specialUnlockDrain)
      : clamp01(u.exp / B.enemy.specialUnlockDrain);
    g.fillStyle = 'rgba(0, 0, 0, 0.85)';
    g.fillRect(bx, by + 7, bw, 4);
    g.fillStyle = u.advancedSkill && !u.advancedSkillUnlocked ? '#7ee7d6' : '#ffd36b';
    g.fillRect(bx, by + 7, bw * xpProgress, 4);

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
  }
  g.restore();
}
