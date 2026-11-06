// File: src/ui/debugHud.js
// 開発用の表示。F3 で切り替える。
export class DebugHud {
  constructor() {
    this.visible = false;
    this.fps = 0;
    this.frames = 0;
    this.acc = 0;
  }

  toggle() {
    this.visible = !this.visible;
  }

  // realDtSec は実時間の経過（ポーズ中も進む）
  update(realDtSec) {
    this.frames += 1;
    this.acc += realDtSec;
    if (this.acc >= 0.5) {
      this.fps = this.frames / this.acc;
      this.frames = 0;
      this.acc = 0;
    }
  }

  // info は文字列の配列。高解像度層に描く
  draw(g, lines) {
    if (!this.visible) return;
    g.save();
    g.font = '14px monospace';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.lineJoin = 'round';
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    g.fillStyle = '#9fffa8';
    const all = [`FPS ${this.fps.toFixed(0)}`, ...lines];
    all.forEach((text, i) => {
      g.strokeText(text, 12, 12 + i * 18);
      g.fillText(text, 12, 12 + i * 18);
    });
    g.restore();
  }
}