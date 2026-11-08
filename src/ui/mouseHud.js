// File: src/ui/mouseHud.js
// マウスだけで遊ぶための、画面上の操作ボタン（上の中央）。
//   ☰ メニュー / 持ち物 / 足踏み / 防御 / 武器の持ち替え / 足元（階段を降りる）/ ログ / 地図 / 一時停止
// ゲーム画面の論理座標（1280×720）で置き、画面の拡大率に合わせて縮める。
// マップの操作：左クリック＝そのマスへ（隣なら1歩・敵なら攻撃・行商ちゃんなら話す・自分なら足踏み）、右クリック＝その方向を向く。

const PINK = '#ff4fa3';

/**
 * @param {object} o
 * @param {HTMLElement} o.container ゲーム画面の入れ物（layers.container）
 * @param {object} o.B
 * @param {Record<string, () => void>} o.actions  menu, items, wait, guard, weapon, interact, log, map, pause
 */
export class MouseHud {
  constructor({ container, B, actions }) {
    this.B = B;
    this.container = container;
    const { logicalWidth: lw, logicalHeight: lh } = B.render;
    this.root = document.createElement('div');
    this.root.dataset.ui = 'mouseHud';
    Object.assign(this.root.style, {
      position: 'absolute', left: '0', top: '0', width: `${lw}px`, height: `${lh}px`,
      transformOrigin: '0 0', pointerEvents: 'none', zIndex: '5', fontFamily: B.ui.fontFamily
    });
    this.bar = document.createElement('div');
    Object.assign(this.bar.style, {
      position: 'absolute', top: '10px', left: '400px', display: 'flex', gap: '5px', pointerEvents: 'auto',
      padding: '5px 6px', borderRadius: '12px', background: 'rgba(24, 8, 26, 0.72)', border: '1px solid rgba(255, 140, 200, 0.35)',
      boxShadow: '0 4px 14px rgba(0,0,0,.45)'
    });
    this.root.append(this.bar);
    container.append(this.root);

    this.buttons = {};
    const defs = [
      ['menu', '☰ メニュー', 'M'],
      ['items', '持ち物', 'I'],
      ['wait', '足踏み', 'Space・自分をクリック'],
      ['guard', '防御', 'G'],
      ['weapon', '剣', 'Q：剣と拳を持ち替える（ターンは進まない）'],
      ['interact', '足元', 'E：階段の上なら降りる'],
      ['log', 'ログ', 'L'],
      ['map', '地図', 'Tab'],
      ['pause', '⏸', 'Esc：一時停止']
    ];
    for (const [id, label, key] of defs) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.title = `${label.replace('☰ ', '')}（${key}）`;
      Object.assign(b.style, {
        padding: '5px 10px', cursor: 'pointer', color: '#ffe9f4', borderRadius: '8px', whiteSpace: 'nowrap',
        font: `600 13px ${B.ui.fontFamily}`, border: '1px solid #7b4f74', background: 'linear-gradient(180deg, #3b2142, #261530)'
      });
      b.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        b.blur();   // スペースキーなどでボタンが押され直さないように
        actions[id]?.();
      });
      this.buttons[id] = b;
      this.bar.append(b);
    }
    this.fit();
  }

  fit() {
    const w = this.container.clientWidth || this.B.render.logicalWidth;
    this.root.style.transform = `scale(${w / this.B.render.logicalWidth})`;
  }

  /** 毎フレーム：見せる・隠す、ラベルと強調を更新する */
  update({ visible, weapon, onStairs, paused, bound }) {
    this.root.style.display = visible ? 'block' : 'none';
    if (!visible) return;
    const set = (id, text, hot = false, off = false) => {
      const b = this.buttons[id];
      if (b.textContent !== text) b.textContent = text;
      b.style.borderColor = hot ? PINK : '#7b4f74';
      b.style.boxShadow = hot ? `0 0 10px ${PINK}` : 'none';
      b.style.opacity = off ? '0.45' : '1';
    };
    set('weapon', weapon === 'fist' ? '拳' : '剣', false, bound);
    set('interact', onStairs ? '階段を降りる' : '足元', onStairs, bound);
    set('pause', paused ? '▶ 再開' : '⏸', paused);
    for (const id of ['wait', 'guard', 'items']) set(id, this.buttons[id].textContent, false, bound);
  }
}
