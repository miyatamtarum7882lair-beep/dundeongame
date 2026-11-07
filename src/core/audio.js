// File: src/core/audio.js
// Web Audio による SE 再生。assets/se/<ID>.(ogg|mp3|wav) があればそれを、無ければ合成音を鳴らす。
import { SE_TABLE } from '../data/seTable.js';
import { clamp } from './util.js';

// ---- 合成音の部品 ----
// rig: { ctx, out, t0, rate, noiseBuffer, sources, end }
function tone(rig, { type = 'sine', f0, f1 = f0, start = 0, dur, gain = 0.2, attack = 0.005 }) {
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

function noise(rig, { filter = 'bandpass', f0 = 1000, f1 = f0, q = 1, start = 0, dur, gain = 0.2, attack = 0.005 }) {
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

// ---- 仮の合成音（本番の音は assets/se/ に置いて差し替える）----
export const SYNTH = {
  // キスの音
  kiss(rig) {
    tone(rig, { f0: 1100, f1: 380, dur: 0.09, gain: 0.22 });
    noise(rig, { f0: 2600, q: 2, dur: 0.05, gain: 0.18 });
    tone(rig, { start: 0.12, f0: 700, f1: 260, dur: 0.08, gain: 0.16 });
    noise(rig, { start: 0.12, f0: 2200, q: 2, dur: 0.04, gain: 0.12 });
  },
  // ぐりぐりする音
  rub(rig) {
    noise(rig, { f0: 350, f1: 650, q: 3, dur: 0.5, gain: 0.28, attack: 0.1 });
    noise(rig, { start: 0.05, f0: 180, f1: 260, q: 2, dur: 0.4, gain: 0.18, attack: 0.1 });
  },
  // 衣擦れの音
  stroke(rig) {
    noise(rig, { filter: 'highpass', f0: 1800, f1: 3200, q: 0.7, dur: 0.38, gain: 0.2, attack: 0.12 });
  },
  // 踏みつける音
  press(rig) {
    tone(rig, { f0: 150, f1: 55, dur: 0.22, gain: 0.35 });
    noise(rig, { filter: 'lowpass', f0: 400, dur: 0.1, gain: 0.25 });
  },
  // 吐息
  breath(rig) {
    noise(rig, { f0: 1400, f1: 900, q: 0.8, dur: 0.75, gain: 0.22, attack: 0.3 });
  },
  // 能力ダウン
  down(rig) {
    tone(rig, { type: 'triangle', f0: 520, f1: 170, dur: 0.55, gain: 0.22 });
    tone(rig, { f0: 260, f1: 90, dur: 0.55, gain: 0.12 });
  },
  // 敵の成長
  grow(rig) {
    tone(rig, { f0: 523, dur: 0.18, gain: 0.18 });
    tone(rig, { start: 0.1, f0: 659, dur: 0.18, gain: 0.18 });
    tone(rig, { start: 0.2, f0: 784, dur: 0.3, gain: 0.2 });
  },
  // 特殊攻撃の習得
  learn(rig) {
    tone(rig, { type: 'triangle', f0: 880, dur: 0.15, gain: 0.18 });
    tone(rig, { type: 'triangle', start: 0.12, f0: 1175, dur: 0.35, gain: 0.2 });
    tone(rig, { start: 0.12, f0: 1760, dur: 0.2, gain: 0.08 });
  },
  // フラッシュバック（上がっていく音と、冒頭のチャイム）
  swell(rig) {
    tone(rig, { f0: 320, f1: 980, dur: 0.9, gain: 0.22, attack: 0.12 });
    tone(rig, { type: 'triangle', f0: 1318, dur: 0.3, gain: 0.18, attack: 0.01 });
  },
  // 確認用の短い音
  tick(rig) {
    tone(rig, { f0: 1200, dur: 0.04, gain: 0.08 });
  },
  // 斬る音
  slash(rig) {
    noise(rig, { filter: 'bandpass', f0: 2400, f1: 700, q: 0.8, dur: 0.22, gain: 0.23, attack: 0.012 });
    noise(rig, { filter: 'highpass', f0: 5200, f1: 1800, q: 0.6, start: 0.015, dur: 0.11, gain: 0.12 });
    tone(rig, { type: 'triangle', f0: 1180, f1: 360, dur: 0.16, gain: 0.07, attack: 0.004 });
  },
  // 殴られる音
  thud(rig) {
    tone(rig, { type: 'triangle', f0: 150, f1: 48, dur: 0.24, gain: 0.42, attack: 0.003 });
    tone(rig, { type: 'sine', f0: 82, f1: 44, start: 0.025, dur: 0.22, gain: 0.2 });
    noise(rig, { filter: 'lowpass', f0: 620, f1: 160, q: 0.8, dur: 0.12, gain: 0.26, attack: 0.002 });
  },
  warning(rig) {
    tone(rig, { type: 'sine', f0: 740, f1: 620, dur: 0.14, gain: 0.12 });
    tone(rig, { type: 'triangle', f0: 1046, f1: 880, start: 0.09, dur: 0.2, gain: 0.1 });
    noise(rig, { filter: 'highpass', f0: 3800, f1: 2400, start: 0.06, dur: 0.11, gain: 0.055 });
  },
  bind(rig) {
    noise(rig, { filter: 'bandpass', f0: 900, f1: 320, q: 1.4, dur: 0.28, gain: 0.18, attack: 0.03 });
    tone(rig, { type: 'triangle', f0: 420, f1: 260, start: 0.08, dur: 0.3, gain: 0.11 });
    tone(rig, { type: 'sine', f0: 180, f1: 120, start: 0.04, dur: 0.22, gain: 0.09 });
  },
  unite(rig) {
    noise(rig, { filter: 'bandpass', f0: 1800, f1: 400, q: 1.1, dur: 0.42, gain: 0.21, attack: 0.04 });
    tone(rig, { type: 'triangle', f0: 260, f1: 130, dur: 0.3, gain: 0.16 });
    tone(rig, { type: 'sine', f0: 620, f1: 300, start: 0.08, dur: 0.35, gain: 0.07 });
  },
  vacuumKiss(rig) {
    noise(rig, { f0: 500, f1: 3400, q: 4, dur: 0.45, gain: 0.26, attack: 0.3 });
    tone(rig, { f0: 280, f1: 950, dur: 0.42, gain: 0.1, attack: 0.3 });
    tone(rig, { f0: 900, f1: 180, start: 0.43, dur: 0.07, gain: 0.3, attack: 0.002 });
    noise(rig, { filter: 'highpass', f0: 3200, f1: 2000, start: 0.43, dur: 0.05, gain: 0.22, attack: 0.002 });
    noise(rig, { f0: 1800, q: 3, start: 0.52, dur: 0.06, gain: 0.15, attack: 0.004 });
    noise(rig, { f0: 1300, q: 3, start: 0.61, dur: 0.07, gain: 0.12, attack: 0.004 });
  },
  levelDrainKiss(rig) {
    noise(rig, { f0: 400, f1: 3000, q: 5, dur: 0.75, gain: 0.3, attack: 0.5 });
    tone(rig, { f0: 700, f1: 160, dur: 0.8, gain: 0.12, attack: 0.05 });
    tone(rig, { type: 'triangle', f0: 190, f1: 85, start: 0.78, dur: 0.2, gain: 0.32, attack: 0.004 });
    noise(rig, { filter: 'lowpass', f0: 900, f1: 200, start: 0.78, dur: 0.18, gain: 0.2, attack: 0.004 });
  },
  deepDrainKiss(rig) {
    noise(rig, { f0: 350, f1: 3200, q: 5, dur: 1.0, gain: 0.32, attack: 0.7 });
    tone(rig, { f0: 600, f1: 140, dur: 1.0, gain: 0.13, attack: 0.1 });
    tone(rig, { type: 'triangle', f0: 180, f1: 80, start: 0.98, dur: 0.2, gain: 0.34, attack: 0.004 });
    tone(rig, { type: 'triangle', f0: 160, f1: 70, start: 1.24, dur: 0.24, gain: 0.3, attack: 0.004 });
    noise(rig, { filter: 'lowpass', f0: 800, f1: 160, start: 0.98, dur: 0.5, gain: 0.18, attack: 0.004 });
  },
  pafuDrain(rig) {
    noise(rig, { filter: 'lowpass', f0: 500, f1: 1200, q: 0.8, dur: 0.5, gain: 0.24, attack: 0.15 });
    noise(rig, { f0: 800, q: 1, start: 0.2, dur: 0.3, gain: 0.12, attack: 0.1 });
    tone(rig, { f0: 120, f1: 80, dur: 0.45, gain: 0.14, attack: 0.1 });
  },
  drainPulse(rig) {
    tone(rig, { f0: 140, f1: 45, dur: 0.5, gain: 0.38, attack: 0.01 });
    noise(rig, { filter: 'lowpass', f0: 900, f1: 150, q: 0.8, dur: 0.4, gain: 0.25, attack: 0.01 });
    tone(rig, { type: 'triangle', f0: 70, f1: 50, start: 0.1, dur: 0.4, gain: 0.18, attack: 0.02 });
  },
  bindRelease(rig) {
    [392, 494, 587].forEach((f, i) => {
      tone(rig, { f0: f, start: i * 0.08, dur: 0.8, gain: 0.1, attack: 0.05 });
    });
    noise(rig, { filter: 'highpass', f0: 3000, f1: 1800, dur: 0.4, gain: 0.08, attack: 0.1 });
  },
  skillFlash(rig) {
    tone(rig, { type: 'triangle', f0: 600, f1: 1800, dur: 0.2, gain: 0.12, attack: 0.02 });
    tone(rig, { f0: 1200, f1: 2400, start: 0.05, dur: 0.18, gain: 0.05, attack: 0.02 });
    noise(rig, { filter: 'highpass', f0: 2500, f1: 4500, dur: 0.15, gain: 0.08, attack: 0.03 });
  },
  climaxStart(rig) {
    tone(rig, { f0: 80, f1: 220, dur: 1.2, gain: 0.35, attack: 0.4 });
    noise(rig, { f0: 400, f1: 5000, q: 3, dur: 1.1, gain: 0.3, attack: 0.6 });
    tone(rig, { f0: 120, f1: 35, start: 1.1, dur: 0.6, gain: 0.5, attack: 0.004 });
    noise(rig, { filter: 'lowpass', f0: 3000, f1: 120, q: 0.8, start: 1.1, dur: 0.5, gain: 0.4, attack: 0.004 });
    tone(rig, { f0: 3800, f1: 3600, start: 1.15, dur: 2.0, gain: 0.03, attack: 0.05 });
  },
  climaxPulse(rig) {
    const p = rig.params?.progress ?? 0;
    tone(rig, { f0: 100 + 80 * p, f1: 40, dur: 0.35, gain: 0.3 + 0.15 * p, attack: 0.005 });
    noise(rig, { f0: 600 + 1200 * p, q: 2, dur: 0.3, gain: 0.2, attack: 0.02 });
    tone(rig, { type: 'triangle', f0: 900 + 600 * p, f1: 300, dur: 0.25, gain: 0.06, attack: 0.01 });
  },
  climaxExtend(rig) {
    tone(rig, { f0: 120, f1: 240, dur: 0.8, gain: 0.3, attack: 0.3 });
    noise(rig, { f0: 400, f1: 3500, q: 5, dur: 0.7, gain: 0.3, attack: 0.3 });
    tone(rig, { f0: 70, f1: 45, start: 0.5, dur: 0.16, gain: 0.5, attack: 0.004 });
    tone(rig, { f0: 60, f1: 40, start: 0.68, dur: 0.2, gain: 0.38, attack: 0.004 });
  },
  flashbackHit(rig) {
    noise(rig, { f0: 300, f1: 6000, q: 5, dur: 0.35, gain: 0.35, attack: 0.3 });
    tone(rig, { f0: 110, f1: 38, start: 0.33, dur: 0.5, gain: 0.55, attack: 0.004 });
    noise(rig, { filter: 'lowpass', f0: 2500, f1: 120, q: 0.8, start: 0.33, dur: 0.4, gain: 0.4, attack: 0.003 });
    tone(rig, { f0: 3800, f1: 3600, start: 0.36, dur: 2.4, gain: 0.04, attack: 0.05 });
    tone(rig, { f0: 70, f1: 45, start: 0.8, dur: 0.16, gain: 0.4, attack: 0.004 });
    tone(rig, { f0: 60, f1: 40, start: 0.98, dur: 0.2, gain: 0.3, attack: 0.004 });
  },
  priestCast(rig) {
    [523, 659, 784, 1047].forEach((f, i) => {
      tone(rig, { f0: f, start: i * 0.09, dur: 0.9, gain: 0.09, attack: 0.06 });
    });
    noise(rig, { filter: 'highpass', f0: 3500, f1: 6500, dur: 0.6, gain: 0.06, attack: 0.2 });
  },
  // 低MP時の心音（ドッ・クン）。三角波で小さなスピーカーでも聞こえる倍音を足す。
  lowMpHeartbeat(rig) {
    const { ctx, out, t0, rate } = rig;
    const thump = (at, f0, f1, peak, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f0 * rate, t0 + at);
      osc.frequency.exponentialRampToValueAtTime(f1 * rate, t0 + at + dur);
      gain.gain.setValueAtTime(0.0001, t0 + at);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
      osc.connect(gain);
      gain.connect(out);
      osc.start(t0 + at);
      osc.stop(t0 + at + dur + 0.02);
      rig.sources.push(osc);
    };
    thump(0, 80, 50, 0.9, 0.16);
    thump(0.17, 70, 46, 0.6, 0.18);
    rig.end = Math.max(rig.end, 0.17 + 0.18 + 0.05);
  },
  buffGain(rig) {
    tone(rig, { type: 'triangle', f0: 880, dur: 0.18, gain: 0.12, attack: 0.005 });
    tone(rig, { type: 'triangle', f0: 1320, start: 0.1, dur: 0.3, gain: 0.12, attack: 0.005 });
  },
  autoGuard(rig) {
    tone(rig, { f0: 880, f1: 1760, dur: 0.12, gain: 0.3, attack: 0.002 });
    tone(rig, { type: 'triangle', f0: 2640, start: 0.02, dur: 0.35, gain: 0.1, attack: 0.002 });
    noise(rig, { f0: 4000, f1: 1200, q: 3, dur: 0.25, gain: 0.2, attack: 0.005 });
  }
};

function createNoiseBuffer(ctx) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export class AudioEngine {
  constructor(B) {
    this.B = B;
    this.ctx = null;
    this.master = null;
    this.seBus = null;
    this.bgmBus = null;
    this.noiseBuffer = null;
    this.buffers = new Map();   // SE ID → AudioBuffer（ファイルが読めたもの）
    this.voices = [];
    this.volume = { master: 1, bgm: 0.8, se: 1 };
    this.spatial = true;
  }

  get state() {
    return this.ctx ? this.ctx.state : 'locked';
  }

  // ブラウザの制限のため、最初のキー入力かクリックのあとに呼ぶ
  unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) {
        console.warn('Web Audio に未対応のため、音を出せません');
        return null;
      }
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.seBus = this.ctx.createGain();
      this.bgmBus = this.ctx.createGain();
      this.seBus.connect(this.master);
      this.bgmBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = createNoiseBuffer(this.ctx);
      this.applyVolume();
      this.preload();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setVolume(volume) {
    this.volume = { ...this.volume, ...volume };
    this.applyVolume();
  }

  applyVolume() {
    if (!this.ctx) return;
    this.master.gain.value = this.volume.master;
    this.seBus.gain.value = this.volume.se;
    this.bgmBus.gain.value = this.volume.bgm;
  }

  // false でモノラル（左右の定位と背後のこもりをなくす）
  setSpatialEnabled(enabled) {
    this.spatial = enabled;
  }

  async preload() {
    await Promise.all(Object.keys(SE_TABLE).map((id) => this.loadFile(id)));
  }

  async loadFile(id) {
    for (const ext of this.B.audio.fileExts) {
      try {
        const res = await fetch(`assets/se/${id}.${ext}`);
        if (!res.ok) continue;
        const type = res.headers.get('content-type') ?? '';
        if (type.includes('text/html')) continue;   // 開発サーバーが index.html を返したとき
        const data = await res.arrayBuffer();
        this.buffers.set(id, await this.ctx.decodeAudioData(data));
        return true;
      } catch (error) {
        // 読めなければ次の拡張子へ。最後まで読めなければ合成音を使う
      }
    }
    return false;
  }

  // opts: { pan: -1〜1, gain: 0〜, behind: 背後ならこもらせる, ally: 仲間なら音量を下げる, vertical: 前後定位, params: 合成音用 }
  // 戻り値: 鳴らせたら true（ロック解除前は false）
  playSE(id, { pan = 0, gain = 1, behind = false, ally = false, vertical = 0, params = {} } = {}) {
    const def = SE_TABLE[id];
    if (!def) {
      console.warn(`未定義のSEです: ${id}`);
      return false;
    }
    if (!this.ctx || this.ctx.state !== 'running') return false;

    const { ctx, B } = this;
    const now = ctx.currentTime;
    const jitter = 1 + (Math.random() * 2 - 1) * B.audio.pitchJitter;
    const rate = jitter * (1 + clamp(vertical, -1, 1) * (B.spatial.verticalPitch ?? 0.04));
    const level = (def.gain ?? 1) * gain * (ally ? B.audio.allyGain : 1);

    // 同時発音の上限。超えたら、いちばん古い音を止める
    while (this.voices.length >= B.audio.maxVoices) {
      this.stopVoice(this.voices.shift());
    }

    const voiceGain = ctx.createGain();
    voiceGain.gain.value = level;
    let node = voiceGain;
    const extra = [];
    if (this.spatial && behind) {
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = B.spatial.behindLowpassHz;
      node.connect(lowpass);
      node = lowpass;
      extra.push(lowpass);
    }
    if (this.spatial && ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = clamp(pan, -1, 1);
      node.connect(panner);
      node = panner;
      extra.push(panner);
    }
    node.connect(this.seBus);

    const voice = { voiceGain, extra, sources: [] };
    let durationSec = 0;
    const buffer = this.buffers.get(id);
    if (buffer) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rate;
      src.connect(voiceGain);
      src.start(now);
      voice.sources.push(src);
      durationSec = buffer.duration / rate;
    } else {
      const synth = SYNTH[def.synth];
      if (!synth) {
        console.warn(`合成音が未定義です: ${def.synth}`);
        return false;
      }
      const rig = {
        ctx,
        out: voiceGain,
        t0: now,
        rate,
        noiseBuffer: this.noiseBuffer,
        sources: voice.sources,
        end: 0,
        params
      };
      synth(rig);
      durationSec = rig.end;
    }

    this.voices.push(voice);
    window.setTimeout(() => this.releaseVoice(voice), (durationSec + 0.2) * 1000);
    return true;
  }

  stopVoice(voice) {
    if (!voice) return;
    const now = this.ctx.currentTime;
    try {
      voice.voiceGain.gain.cancelScheduledValues(now);
      voice.voiceGain.gain.setTargetAtTime(0, now, 0.01);
      for (const src of voice.sources) src.stop(now + 0.05);
    } catch (error) {
      // すでに止まっている音は無視する
    }
    window.setTimeout(() => this.disconnectVoice(voice), 150);
  }

  releaseVoice(voice) {
    const i = this.voices.indexOf(voice);
    if (i >= 0) this.voices.splice(i, 1);
    this.disconnectVoice(voice);
  }

  disconnectVoice(voice) {
    voice.voiceGain.disconnect();
    for (const n of voice.extra) n.disconnect();
  }
}
