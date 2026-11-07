// File: src/core/bgm.js
// BGM。public/assets/bgm/<曲ID>.(ogg|mp3|wav) があればそれをループ再生し、無ければ合成のループを鳴らす。
// 曲ID: explore（探索） / bound（拘束中）
// 曲の切り替えはクロスフェード。音量は AudioEngine の bgmBus（設定の BGM 音量）に従う。
//
// 合成のループ（仮の BGM）
//   explore  ゆっくりした甘い和音のパッドと、鈴のような分散和音、ときどき吐息
//   bound    同じ和音で速く、鼓動のような低音が刻む
// mood（堕ち度 0〜1）が深いほど、和音が厚く甘くなり、吐息が増え、探索中にも鼓動が混じる
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

// 和音（MIDI ノート）。4小節で1周
const CHORDS = [
  { root: 38, tones: [62, 65, 69, 72, 76] },   // Dm9
  { root: 34, tones: [58, 62, 65, 69, 74] },   // B♭maj7
  { root: 31, tones: [55, 58, 62, 65, 69] },   // Gm9
  { root: 33, tones: [57, 61, 64, 67, 70] }    // A7(♭9)
];

const TRACKS = {
  explore: { bpm: 68, pad: 0.05, arp: 0.022, bass: 0.07, beat: 0, breath: true, arpEvery: 2 },
  bound: { bpm: 96, pad: 0.045, arp: 0.03, bass: 0.05, beat: 0.22, breath: false, arpEvery: 1 }
};

export class BgmPlayer {
  /**
   * @param {object} o
   * @param {import('./audio.js').AudioEngine} o.audio
   * @param {object} o.B balance
   */
  constructor({ audio, B }) {
    this.audio = audio;
    this.B = B;
    this.cfg = B.bgm;
    this.want = null;          // 鳴らしたい曲ID
    this.current = null;       // { id, gain, source?, synth? }
    this.fading = [];
    this.buffers = new Map();  // 曲ID → AudioBuffer | null（無かった）
    this.loading = new Set();
    this.timer = null;
    this.mood = 0;
  }

  // 堕ち度（0〜1）。合成のループの甘さに反映する
  setMood(mood) {
    this.mood = Math.max(0, Math.min(1, mood ?? 0));
  }

  // 曲を切り替える。null で止める
  play(id) {
    this.want = id;
    this.sync();
  }

  // AudioEngine のロック解除後や、曲の要求が変わったときに呼ぶ
  sync() {
    const ctx = this.audio.ctx;
    if (!ctx || !this.audio.bgmBus) return;
    if (this.current?.id === this.want) return;
    if (this.want && !this.buffers.has(this.want)) {
      void this.load(this.want);
      if (!this.cfg.synthWhileLoading) return;
    }
    this.fadeOutCurrent();
    if (!this.want) return;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + this.cfg.fadeSec);
    gain.connect(this.audio.bgmBus);
    const entry = { id: this.want, gain };
    const buffer = this.buffers.get(this.want);
    if (buffer) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.connect(gain);
      src.start();
      entry.source = src;
    } else {
      entry.synth = { track: TRACKS[this.want] ?? TRACKS.explore, nextBeat: ctx.currentTime + 0.1, beat: 0 };
      this.ensureTimer();
    }
    this.current = entry;
  }

  fadeOutCurrent() {
    const cur = this.current;
    if (!cur) return;
    const ctx = this.audio.ctx;
    const t = ctx.currentTime;
    cur.gain.gain.cancelScheduledValues(t);
    cur.gain.gain.setValueAtTime(cur.gain.gain.value, t);
    cur.gain.gain.linearRampToValueAtTime(0.0001, t + this.cfg.fadeSec);
    cur.stopping = true;
    this.fading.push(cur);
    window.setTimeout(() => {
      try { cur.source?.stop(); } catch { /* 停止済み */ }
      cur.gain.disconnect();
      this.fading = this.fading.filter((f) => f !== cur);
    }, (this.cfg.fadeSec + 0.2) * 1000);
    this.current = null;
  }

  async load(id) {
    if (this.loading.has(id)) return;
    this.loading.add(id);
    let buffer = null;
    for (const ext of this.B.audio.fileExts) {
      try {
        const res = await fetch(`assets/bgm/${id}.${ext}`);
        if (!res.ok || (res.headers.get('content-type') ?? '').includes('text/html')) continue;
        buffer = await this.audio.ctx.decodeAudioData(await res.arrayBuffer());
        break;
      } catch {
        // 次の拡張子へ
      }
    }
    this.buffers.set(id, buffer);
    this.loading.delete(id);
    // ファイルが見つかったら、合成のループから差し替える
    if (buffer && this.current?.id === id && this.current.synth) {
      const want = this.want;
      this.fadeOutCurrent();
      this.want = want;
    }
    this.sync();
  }

  ensureTimer() {
    if (this.timer) return;
    this.timer = window.setInterval(() => this.schedule(), 100);
  }

  // 合成のループ：先読みして、拍ごとに音を予約する
  schedule() {
    const ctx = this.audio.ctx;
    const list = [this.current, ...this.fading].filter((e) => e?.synth && !e.done);
    if (!ctx || list.length === 0) return;
    for (const entry of list) {
      if (entry.stopping && entry.synth.nextBeat > ctx.currentTime + this.cfg.fadeSec) continue;
      const s = entry.synth;
      const spb = 60 / s.track.bpm;
      while (s.nextBeat < ctx.currentTime + 0.35) {
        this.playBeat(entry, s.beat, s.nextBeat, spb);
        s.beat += 1;
        s.nextBeat += spb;
      }
    }
  }

  playBeat(entry, beat, t, spb) {
    const tr = entry.synth.track;
    const bar = Math.floor(beat / 4);
    const inBar = beat % 4;
    const chord = CHORDS[bar % CHORDS.length];
    const out = entry.gain;
    const mood = this.mood;
    // パッド：小節の頭で、和音をゆっくり鳴らす。堕ち度が深いほど厚く甘い
    if (inBar === 0) {
      const voices = mood > 0.5 ? chord.tones : chord.tones.slice(0, 4);
      for (const n of voices) this.pad(out, NOTE(n), t, spb * 4.1, tr.pad * (1 + 0.4 * mood));
      const breathEvery = mood > 0.6 ? 1 : mood > 0.3 ? 2 : 4;
      if ((tr.breath || mood > 0.6) && bar % breathEvery === breathEvery - 1) this.breath(out, t + spb * 2, spb * 2);
    }
    // 堕ち度が深いと、探索中にも小さな鼓動が混じる
    if (tr.beat === 0 && mood > 0.4 && inBar === 0) {
      this.thump(out, t, 0.08 + 0.12 * mood);
      this.thump(out, t + spb * 0.3, (0.08 + 0.12 * mood) * 0.7);
    }
    // 低音
    if (inBar === 0 || inBar === 2) this.bass(out, NOTE(chord.root), t, spb * 1.8, tr.bass);
    // 鼓動（拘束中）
    if (tr.beat > 0) {
      this.thump(out, t, tr.beat);
      this.thump(out, t + spb * 0.28, tr.beat * 0.7);
    }
    // 鈴の分散和音
    const steps = tr.arpEvery === 1 ? 2 : 1;
    for (let i = 0; i < steps; i++) {
      if (Math.random() < 0.18) continue;
      const tone = chord.tones[(beat * 2 + i * 3 + (bar % 2)) % chord.tones.length] + 12;
      this.bell(out, NOTE(tone), t + (i * spb) / steps, tr.arp);
    }
  }

  pad(out, f, t, dur, gain) {
    const ctx = this.audio.ctx;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 1400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + dur * 0.35);
    g.gain.linearRampToValueAtTime(gain * 0.7, t + dur * 0.8);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    filt.connect(g).connect(out);
    for (const detune of [-7, 7]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      osc.detune.value = detune;
      osc.connect(filt);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
  }

  bass(out, f, t, dur, gain) {
    const ctx = this.audio.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  bell(out, f, t, gain) {
    const ctx = this.audio.ctx;
    for (const [mul, amp, dur] of [[1, 1, 0.9], [2.76, 0.3, 0.4]]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.value = f * mul;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gain * amp, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
  }

  thump(out, t, gain) {
    const ctx = this.audio.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(46, t + 0.16);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  breath(out, t, dur) {
    const ctx = this.audio.ctx;
    if (!this.audio.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.audio.noiseBuffer;
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(1500, t);
    filt.frequency.exponentialRampToValueAtTime(700, t + dur);
    filt.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.025, t + dur * 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    src.connect(filt).connect(g).connect(out);
    src.start(t);
    src.stop(t + dur + 0.05);
  }
}
