// File: src/ui/floatLog.js
// 画面の下に、文字だけを透過させて並べるログ（3.5）。箱は描かない。
import { LOG_KINDS, formatLog } from '../data/logMessages.js';
import { clamp01 } from '../core/util.js';

const COLORS = {
  white: '#ffffff',
  gold: '#ffd36b',
  pink: '#ff9ccf',
  purple: '#c9a0ff',
  cyan: '#8fe3ff',
  orange: '#ffb25c',
  yellow: '#ffe66b',
  red: '#ff6b6b'
};

export class FloatLog {
  // onSE(SEのID) は、行を実際に流す瞬間に呼ばれる
  constructor(B, { onSE = null } = {}) {
    this.cfg = B.floatLog;
    this.fontFamily = B.ui.fontFamily;
    this.onSE = onSE;
    this.time = 0;
    this.lines = [];        // 表示中。末尾が最新（いちばん下）
    this.queue = [];        // 順番待ち
    this.releasedAt = [];   // 直近1秒に流した時刻
    this.history = [];      // { label, color }
    this.historyVisible = false;
  }

  // 種類（logMessages.js）を指定して流す
  pushKind(kind, params = {}) {
    const def = LOG_KINDS[kind];
    if (!def) throw new Error(`未定義のログ種別です: ${kind}`);
    this.push({
      text: formatLog(kind, params),
      importance: def.importance,
      color: def.color,
      mark: def.mark,
      se: def.se
    });
  }

  // 自由な文言を流す。key が同じ行は「×N」にまとめる
  push({ text, importance = 'minor', color = 'white', mark = '', key = null, se = null }) {
    const item = { text, importance, color, mark, se, key: key ?? `${mark}${text}`, count: 1 };

    const shown = this.lines.find(
      (l) => l.key === item.key && this.time - l.bornAt <= this.cfg.mergeWindowSec
    );
    if (shown) {
      shown.count += 1;
      shown.bornAt = this.time;
      shown.age = Math.min(shown.age, shown.life * 0.3);   // 表示時間をのばす
      return;
    }
    const waiting = this.queue.find((q) => q.key === item.key);
    if (waiting) {
      waiting.count += 1;
      return;
    }

    this.queue.push(item);
    this.trimQueue();
  }

  // 待ちが多すぎるときは、重要でない行から捨てる
  trimQueue() {
    while (this.queue.length > this.cfg.queueMax) {
      const i = this.queue.findIndex((q) => q.importance !== 'major');
      this.queue.splice(i >= 0 ? i : 0, 1);
    }
  }

  lineHeight(line) {
    const px = line.importance === 'major' ? this.cfg.majorFontPx : this.cfg.fontPx;
    return px + this.cfg.lineGapPx;
  }

  release(item) {
    const major = item.importance === 'major';
    const line = {
      ...item,
      age: 0,
      life: major ? this.cfg.majorLifeSec : this.cfg.minorLifeSec,
      bornAt: this.time,
      y: 0,
      rankAlpha: 1
    };
    line.y = -this.lineHeight(line) * 0.8;   // 下から滑り込む
    this.lines.push(line);
    if (this.lines.length > this.cfg.maxLines) this.lines.shift();

    const label = this.labelOf(line);
    this.history.push({ label, color: line.color });
    if (this.history.length > this.cfg.historyMax) this.history.shift();
    if (line.se) this.onSE?.(line.se);
  }

  labelOf(line) {
    const mark = line.mark ? `${line.mark} ` : '';
    const count = line.count > 1 ? ` ×${line.count}` : '';
    return `${mark}${line.text}${count}`;
  }

  // dtSec は共通タイマーの値（ポーズ中は 0 なので、表示時間も止まる）
  update(dtSec) {
    this.time += dtSec;
    this.releasedAt = this.releasedAt.filter((t) => this.time - t < 1);

    // 1秒に流す行数の上限
    while (this.queue.length > 0 && this.releasedAt.length < this.cfg.maxPerSec) {
      this.release(this.queue.shift());
      this.releasedAt.push(this.time);
    }

    for (const line of this.lines) line.age += dtSec;
    this.lines = this.lines.filter((line) => line.age < line.life);

    // 下から順に積み、位置と透け具合をなめらかに動かす
    const follow = 1 - Math.exp(-this.cfg.slideSpeed * dtSec);
    let offset = 0;
    for (let i = this.lines.length - 1; i >= 0; i--) {
      const line = this.lines[i];
      const rank = this.lines.length - 1 - i;
      const targetAlpha = Math.max(0, 1 - this.cfg.rankFade * rank);
      line.y += (offset - line.y) * follow;
      line.rankAlpha += (targetAlpha - line.rankAlpha) * follow;
      offset += this.lineHeight(line);
    }
  }

  toggleHistory() {
    this.historyVisible = !this.historyVisible;
  }

  // 高解像度層（gHires）に描く。rect は文字を出す範囲（論理座標）
  draw(g, rect) {
    const c = this.cfg;
    const baseY = rect.y + rect.h - c.bottomMarginPx;
    const x = rect.x + c.leftMarginPx;
    const maxWidth = rect.w - c.leftMarginPx * 2;

    g.save();
    g.textAlign = 'left';
    g.textBaseline = 'bottom';
    g.lineJoin = 'round';
    g.lineWidth = c.outlinePx;
    g.strokeStyle = 'rgba(0, 0, 0, 0.85)';

    for (const line of this.lines) {
      const major = line.importance === 'major';
      const fadeIn = clamp01(line.age / c.fadeInSec);
      const fadeOut = clamp01((line.life - line.age) / c.fadeOutSec);
      const alpha = line.rankAlpha * fadeIn * fadeOut;
      if (alpha <= 0.01) continue;

      const px = major ? c.majorFontPx : c.fontPx;
      const label = this.labelOf(line);
      const y = baseY - line.y;
      g.font = `${major ? 'bold ' : ''}${px}px ${this.fontFamily}`;
      g.globalAlpha = alpha;
      g.strokeText(label, x, y, maxWidth);
      g.fillStyle = COLORS[line.color] ?? line.color;
      g.fillText(label, x, y, maxWidth);
    }
    g.restore();

    if (this.historyVisible) this.drawHistory(g, rect);
  }

  // L キーの履歴（ポーズ中も見られる）
  drawHistory(g, rect) {
    const px = rect.x + 12;
    const py = rect.y + rect.h * 0.1;
    const pw = rect.w - 24;
    const ph = rect.h * 0.8;
    const lineH = 24;
    const rows = Math.floor((ph - 44) / lineH);

    g.save();
    g.fillStyle = 'rgba(20, 10, 30, 0.82)';
    g.fillRect(px, py, pw, ph);
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.font = `bold 16px ${this.fontFamily}`;
    g.fillStyle = '#ffffff';
    g.fillText('ログ履歴（Lで閉じる）', px + 16, py + 12);
    g.font = `15px ${this.fontFamily}`;
    this.history.slice(-rows).forEach((h, i) => {
      g.fillStyle = COLORS[h.color] ?? h.color;
      g.fillText(h.label, px + 16, py + 40 + i * lineH, pw - 32);
    });
    g.restore();
  }
}