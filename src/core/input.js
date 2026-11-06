// File: src/core/input.js
// キー入力とマウス入力を、アクション名のキューにして渡す。
// 1フレームに1回、drain() で受け取る。
const REPEATABLE = new Set([
  'up', 'down', 'left', 'right', 'upLeft', 'upRight', 'downLeft', 'downRight'
]);

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
}

export class Input {
  constructor(target = window) {
    this.target = target;
    this.codeToActions = new Map();
    this.actionToCodes = new Map();
    this.heldCodes = new Set();
    this.queue = [];      // { action, shift, repeat, source, x?, y? }
    this.rawQueue = [];   // 押された瞬間のキーコード（デバッグキー用。再割り当ての対象外）
    this.pointer = { x: 0, y: 0 };
    this.mapPointer = (x, y) => ({ x, y });
    this.attached = false;

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onBlur = this.onBlur.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
  }

  // bindings: { アクション名: [キーコード, ...] }
  setBindings(bindings) {
    this.codeToActions.clear();
    this.actionToCodes.clear();
    for (const [action, codes] of Object.entries(bindings)) {
      this.actionToCodes.set(action, codes);
      for (const code of codes) {
        if (!this.codeToActions.has(code)) this.codeToActions.set(code, []);
        this.codeToActions.get(code).push(action);
      }
    }
  }

  // (clientX, clientY) → 論理座標
  setPointerMapper(fn) {
    this.mapPointer = fn;
  }

  attach() {
    if (this.attached) return;
    this.target.addEventListener('keydown', this.onKeyDown);
    this.target.addEventListener('keyup', this.onKeyUp);
    this.target.addEventListener('blur', this.onBlur);
    this.target.addEventListener('pointermove', this.onPointerMove);
    this.target.addEventListener('pointerdown', this.onPointerDown);
    this.attached = true;
  }

  detach() {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
    this.target.removeEventListener('pointermove', this.onPointerMove);
    this.target.removeEventListener('pointerdown', this.onPointerDown);
    this.attached = false;
  }

  onKeyDown(e) {
    if (isTypingTarget(e.target)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;   // ブラウザのショートカットを邪魔しない

    const actions = this.codeToActions.get(e.code);
    if (actions || e.code === 'F3') e.preventDefault();

    if (!e.repeat) this.rawQueue.push(e.code);
    this.heldCodes.add(e.code);
    if (!actions) return;

    for (const action of actions) {
      if (e.repeat && !REPEATABLE.has(action)) continue;
      this.queue.push({ action, shift: e.shiftKey, repeat: e.repeat, source: 'key' });
    }
  }

  onKeyUp(e) {
    this.heldCodes.delete(e.code);
  }

  onBlur() {
    this.heldCodes.clear();
  }

  onPointerMove(e) {
    const p = this.mapPointer(e.clientX, e.clientY);
    this.pointer.x = p.x;
    this.pointer.y = p.y;
  }

  onPointerDown(e) {
    if (e.button !== 0) return;
    const p = this.mapPointer(e.clientX, e.clientY);
    this.pointer.x = p.x;
    this.pointer.y = p.y;
    // 左クリックは、決定（click）と脱出連打（struggle）の両方として届く
    for (const action of ['click', 'struggle']) {
      this.queue.push({ action, shift: e.shiftKey, repeat: false, source: 'pointer', x: p.x, y: p.y });
    }
  }

  isDown(action) {
    const codes = this.actionToCodes.get(action) ?? [];
    return codes.some((code) => this.heldCodes.has(code));
  }

  drain() {
    const q = this.queue;
    this.queue = [];
    return q;
  }

  drainRaw() {
    const q = this.rawQueue;
    this.rawQueue = [];
    return q;
  }
}