// File: src/core/util.js
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const clamp01 = (v) => clamp(v, 0, 1);
export const lerp = (a, b, t) => a + (b - a) * t;

// シード付きの乱数（ダンジョン生成など、再現したい場面で使う）
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 小さなイベント通知。ハンドラのエラーで全体が止まらないようにしている
export class Emitter {
  constructor() {
    this.handlers = new Map();
  }

  on(name, fn) {
    if (!this.handlers.has(name)) this.handlers.set(name, new Set());
    this.handlers.get(name).add(fn);
    return () => this.off(name, fn);
  }

  off(name, fn) {
    this.handlers.get(name)?.delete(fn);
  }

  emit(name, ...args) {
    for (const fn of [...(this.handlers.get(name) ?? [])]) {
      try {
        fn(...args);
      } catch (error) {
        console.error(`イベント「${name}」の処理でエラーが起きました`, error);
      }
    }
  }
}