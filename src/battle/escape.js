import { clamp } from '../core/util.js';

export function calcRequiredClicks(ctx, B) {
  if (!ctx || typeof ctx !== 'object') {
    throw new TypeError('脱出クリック数の計算には係数を指定してください');
  }

  const { unite, resCoef, yieldCoef, raceCoef, isBackBind = false } = ctx;
  const softCoef = ctx.softEscapeMul ?? 1;
  const factors = { unite, resCoef, yieldCoef, raceCoef, softEscapeMul: softCoef };

  for (const [name, value] of Object.entries(factors)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`脱出クリック数の係数が不正です: ${name}`);
    }
  }
  if (typeof isBackBind !== 'boolean') {
    throw new TypeError('isBackBind は boolean で指定してください');
  }

  const backCoef = isBackBind ? B.escape.backCoef : 1;
  const raw = B.escape.baseClicks * unite * resCoef * yieldCoef * raceCoef * backCoef * softCoef;
  return clamp(Math.round(raw), B.escape.minClicks, B.escape.maxClicks);
}
