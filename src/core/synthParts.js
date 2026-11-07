// File: src/core/synthParts.js
// 合成音の部品。rig: { ctx, out, t0, rate, noiseBuffer, sources, end, params }
// start / dur は秒。gain は 0〜1 程度。周波数は rate（ピッチの揺らぎ）を掛けて鳴らす。

export function tone(rig, { type = 'sine', f0, f1 = f0, start = 0, dur, gain = 0.2, attack = 0.005 }) {
  const { ctx, out, t0, rate } = rig;
  const t = t0 + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0 * rate, t);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1 * rate, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + Math.min(attack, dur * 0.5));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.05);
  rig.sources.push(osc);
  rig.end = Math.max(rig.end, start + dur + 0.05);
}

export function noise(rig, { filter = 'bandpass', f0 = 1000, f1 = f0, q = 1, start = 0, dur, gain = 0.2, attack = 0.005 }) {
  const { ctx, out, t0, rate } = rig;
  const t = t0 + start;
  const src = ctx.createBufferSource();
  src.buffer = rig.noiseBuffer;
  src.loop = true;
  const filt = ctx.createBiquadFilter();
  filt.type = filter;
  filt.Q.value = q;
  filt.frequency.setValueAtTime(f0 * rate, t);
  if (f1 !== f0) filt.frequency.exponentialRampToValueAtTime(f1 * rate, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + Math.min(attack, dur * 0.5));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filt).connect(g).connect(out);
  src.start(t, Math.random() * 0.4);
  src.stop(t + dur + 0.05);
  rig.sources.push(src);
  rig.end = Math.max(rig.end, start + dur + 0.05);
}

// ビブラート付きの音（甘い声・うなりの代わり）。vibHz で揺れの速さ、vibDepth で揺れ幅（Hz）
export function vib(rig, {
  type = 'sine', f0, f1 = f0, start = 0, dur, gain = 0.15, attack = 0.03, vibHz = 6, vibDepth = 12, release = 0.6
}) {
  const { ctx, out, t0, rate } = rig;
  const t = t0 + start;
  const osc = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0 * rate, t);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1 * rate, t + dur);
  lfo.frequency.value = vibHz;
  lfoGain.gain.value = vibDepth * rate;
  lfo.connect(lfoGain).connect(osc.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + Math.min(attack, dur * 0.5));
  g.gain.setValueAtTime(gain, t + dur * (1 - release));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(out);
  osc.start(t);
  lfo.start(t);
  osc.stop(t + dur + 0.05);
  lfo.stop(t + dur + 0.05);
  rig.sources.push(osc, lfo);
  rig.end = Math.max(rig.end, start + dur + 0.05);
}

// 鈴・ベル。基音と、少しずれた倍音を重ねる
export function chime(rig, { f, start = 0, dur = 0.8, gain = 0.12, bright = 1 }) {
  tone(rig, { f0: f, start, dur, gain, attack: 0.003 });
  tone(rig, { f0: f * 2.76, start, dur: dur * 0.55, gain: gain * 0.45 * bright, attack: 0.002 });
  tone(rig, { f0: f * 5.4, start, dur: dur * 0.3, gain: gain * 0.25 * bright, attack: 0.002 });
}

// きらめき。高い鈴をばらばらに鳴らす
export function sparkle(rig, { start = 0, count = 4, spread = 0.25, base = 2093, gain = 0.06 }) {
  for (let i = 0; i < count; i++) {
    const f = base * [1, 1.26, 1.5, 1.68, 2][i % 5];
    chime(rig, { f, start: start + (i / Math.max(1, count - 1)) * spread, dur: 0.35, gain, bright: 0.6 });
  }
}

// 囁き。帯域を絞ったノイズを、音節のように区切って鳴らす
export function syllables(rig, { start = 0, count = 5, gap = 0.11, f0 = 2800, spread = 900, q = 3, gain = 0.14 }) {
  for (let i = 0; i < count; i++) {
    const f = f0 + (Math.random() - 0.5) * spread;
    const len = gap * (0.6 + Math.random() * 0.5);
    noise(rig, { f0: f, f1: f * 0.85, q, start: start + i * gap, dur: len, gain: gain * (0.7 + Math.random() * 0.4), attack: len * 0.35 });
  }
}

// 鼓動（ドッ・クン）
export function heartbeat(rig, { start = 0, gain = 0.5 }) {
  tone(rig, { type: 'triangle', f0: 80, f1: 50, start, dur: 0.16, gain, attack: 0.01 });
  tone(rig, { type: 'triangle', f0: 70, f1: 46, start: start + 0.17, dur: 0.18, gain: gain * 0.7, attack: 0.01 });
}

// 風を切る音。f0 → f1 に動く帯域ノイズ
export function whoosh(rig, { start = 0, dur = 0.25, f0 = 600, f1 = 2400, gain = 0.2, q = 1.2 }) {
  noise(rig, { f0, f1, q, start, dur, gain, attack: dur * 0.45 });
}

// 弾むような音（ぷるん）。速いビブラートで下がっていく
export function boing(rig, { start = 0, f0 = 300, f1 = 170, dur = 0.32, gain = 0.16 }) {
  vib(rig, { f0, f1, start, dur, gain, attack: 0.005, vibHz: 17, vibDepth: f0 * 0.12, release: 0.8 });
}

// 唇を離す音（ちゅっ）
export function smack(rig, { start = 0, gain = 0.22, pitch = 1 }) {
  tone(rig, { f0: 1100 * pitch, f1: 380 * pitch, start, dur: 0.07, gain });
  noise(rig, { f0: 2600 * pitch, q: 2, start, dur: 0.045, gain: gain * 0.8 });
}
