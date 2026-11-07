// File: src/ui/enemyChoiceView.js
// 敵の技に対する選択肢の画面。一枚絵を全画面に出し、台詞と2つの選択肢を表示する。
//
// 演出の流れ
//   登場     桃色の光が広がり、一枚絵が寄ってくる。台詞は1文字ずつ出る。選択肢は下から浮かぶ
//   待つ間   鼓動に合わせて画面の縁が脈打ち、下からハートが立ちのぼる。絵はじわじわ迫ってくる
//   3秒後    鼓動が速くなり、縁がピンクに染まってハートが増える。「受け入れる」が大きく光り、
//            「断る」は少しかすむ（誘惑に負けそうになる）
//   決めた後 受け入れ：ハートがはじけ、絵がさらに迫る / 断る：ハートの輪郭が散る
// 光は点滅させず、ゆっくり強まって弱まる（明滅の刺激を避ける）。
const el = (tag, text = '') => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
};

const style = (node, values) => Object.assign(node.style, values);
const DPR = () => Math.min(2, window.devicePixelRatio || 1);
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const easeOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

// 警告後に画面の縁に漂うハート
const EDGE_HEARTS = [
  { x: 0.07, y: 0.12, size: 0.084, phase: 0.2, outline: true },
  { x: 0.22, y: 0.08, size: 0.052, phase: 1.3 },
  { x: 0.47, y: 0.06, size: 0.044, phase: 2.5 },
  { x: 0.78, y: 0.10, size: 0.058, phase: 3.1, outline: true },
  { x: 0.94, y: 0.24, size: 0.070, phase: 0.9 },
  { x: 0.96, y: 0.51, size: 0.045, phase: 2.1, outline: true },
  { x: 0.91, y: 0.77, size: 0.058, phase: 3.8 },
  { x: 0.73, y: 0.93, size: 0.049, phase: 1.8, outline: true },
  { x: 0.28, y: 0.94, size: 0.055, phase: 4.4 },
  { x: 0.06, y: 0.78, size: 0.069, phase: 2.9, outline: true },
  { x: 0.04, y: 0.48, size: 0.051, phase: 5.2 },
  { x: 0.17, y: 0.66, size: 0.035, phase: 1.1 },
  { x: 0.84, y: 0.57, size: 0.038, phase: 4.9 },
  { x: 0.64, y: 0.05, size: 0.033, phase: 0.6 }
];

function heartPath(g, cx, cy, s) {
  g.beginPath();
  g.moveTo(cx, cy + s * 0.9);
  g.bezierCurveTo(cx - s * 1.3, cy + s * 0.1, cx - s * 0.9, cy - s * 0.9, cx, cy - s * 0.35);
  g.bezierCurveTo(cx + s * 0.9, cy - s * 0.9, cx + s * 1.3, cy + s * 0.1, cx, cy + s * 0.9);
  g.closePath();
}

function canvasContext(canvas) {
  const ratio = DPR();
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelsWide = Math.max(1, Math.round(width * ratio));
  const pixelsHigh = Math.max(1, Math.round(height * ratio));
  if (canvas.width !== pixelsWide || canvas.height !== pixelsHigh) {
    canvas.width = pixelsWide;
    canvas.height = pixelsHigh;
  }
  const g = canvas.getContext('2d');
  g.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { g, width, height };
}

// ボタンの脈動などの CSS アニメーション（1度だけ登録する）
function ensureStyles() {
  if (document.getElementById('enemy-choice-style')) return;
  const css = el('style');
  css.id = 'enemy-choice-style';
  css.textContent = `
@keyframes ecv-accept-glow {
  0%, 100% { box-shadow: 0 0 18px 2px rgba(255, 79, 163, .55), inset 0 0 18px rgba(255, 200, 230, .25); }
  50% { box-shadow: 0 0 34px 8px rgba(255, 79, 163, .85), inset 0 0 26px rgba(255, 220, 240, .45); }
}
@keyframes ecv-ribbon-shine {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.ecv-btn { transition: transform .35s ease, opacity .35s ease, filter .35s ease; }
.ecv-btn:hover { transform: translateY(-2px) scale(1.02); filter: brightness(1.12); }
.ecv-accept { animation: ecv-accept-glow 1.1s ease-in-out infinite; }
.ecv-warn .ecv-accept { animation-duration: .65s; transform: scale(1.05); }
.ecv-warn .ecv-resist { opacity: .72; transform: scale(.96); filter: saturate(.6); }
`;
  document.head.append(css);
}

export class EnemyChoiceView {
  /**
   * @param {object} o
   * @param {object} o.cfg B.temptation
   * @param {string} o.fontFamily
   * @param {(id:string) => Promise<HTMLImageElement|null>} o.loadPortrait
   * @param {(answer:string) => void} o.onChoose
   * @param {() => void} [o.onWarning] 3秒経過
   * @param {(strength:number) => void} [o.onBeat] 鼓動のたび（音を鳴らす）
   * @param {() => boolean} [o.isReduced] 演出を控えめにする設定
   */
  constructor({ cfg, fontFamily, loadPortrait, onChoose, onWarning = () => {}, onBeat = () => {}, isReduced = () => false }) {
    this.cfg = cfg;
    this.fontFamily = fontFamily;
    this.loadPortrait = loadPortrait;
    this.onChoose = onChoose;
    this.onWarning = onWarning;
    this.onBeat = onBeat;
    this.isReduced = isReduced;
    this.current = null;
    window.addEventListener('keydown', (event) => {
      if (!this.current || this.current.answer) return;
      if (event.key === '1' || event.key === 'ArrowLeft') this.choose('resist');
      else if (event.key === '2' || event.key === 'ArrowRight') this.choose('accept');
      else return;
      event.preventDefault();
    });
  }

  active() {
    return Boolean(this.current);
  }

  show({ enemyId, name, skillName, choice, theme = null }) {
    this.clear();
    ensureStyles();
    const main = theme?.main ?? '#ff7ac0';
    const glow = theme?.glow ?? '#ffe3f2';
    const root = el('div');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', `${name}の${skillName}`);
    style(root, {
      position: 'fixed', inset: '0', zIndex: '700', overflow: 'hidden',
      color: '#fff', fontFamily: this.fontFamily, background: '#180d26'
    });

    const portrait = el('canvas');
    style(portrait, {
      position: 'absolute', inset: '0', width: '100%', height: '100%',
      opacity: String(this.cfg.portraitAlpha), pointerEvents: 'none'
    });
    const shade = el('div');
    style(shade, {
      position: 'absolute', inset: '0', pointerEvents: 'none',
      background: 'linear-gradient(to bottom, rgba(12, 4, 24, .68), rgba(14, 5, 22, .08) 36%, rgba(17, 5, 27, .12) 58%, rgba(10, 4, 20, .83))'
    });
    const fx = el('canvas');
    style(fx, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });

    const foreground = el('section');
    style(foreground, {
      position: 'relative', zIndex: '1', display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', alignItems: 'center', gap: '20px',
      width: '100%', height: '100%', maxHeight: '100dvh', overflowY: 'auto',
      boxSizing: 'border-box', padding: 'clamp(18px, 3.5vw, 48px)'
    });

    const speech = el('div');
    style(speech, {
      position: 'relative', width: 'min(820px, 100%)', padding: '30px 26px 16px', boxSizing: 'border-box',
      background: 'linear-gradient(180deg, rgba(40, 10, 40, .82), rgba(18, 6, 28, .82))',
      border: `2px solid ${main}`, borderRadius: '18px',
      boxShadow: `0 12px 38px rgba(0, 0, 0, .45), 0 0 26px ${main}66, inset 0 0 22px ${main}22`,
      backdropFilter: 'blur(7px)',
      transform: 'translateY(-24px)', opacity: '0', transition: 'transform .45s cubic-bezier(.2,1.4,.4,1), opacity .35s ease'
    });
    // 技名のリボン
    const ribbon = el('div', `♥ ${skillName} ♥`);
    style(ribbon, {
      position: 'absolute', left: '50%', top: '-18px', transform: 'translateX(-50%)',
      padding: '6px 26px', borderRadius: '999px', whiteSpace: 'nowrap',
      fontSize: 'clamp(15px, 2.1vw, 21px)', fontWeight: '900', letterSpacing: '.04em', color: '#fff',
      textShadow: '0 1px 3px rgba(80, 0, 40, .9)',
      background: `linear-gradient(100deg, ${main} 0%, ${glow} 45%, ${main} 55%, ${main} 100%)`,
      backgroundSize: '200% 100%', animation: 'ecv-ribbon-shine 2.4s linear infinite',
      boxShadow: `0 0 18px ${main}aa, 0 3px 10px rgba(0, 0, 0, .4)`, border: '2px solid rgba(255, 240, 250, .85)'
    });
    const speaker = el('div', name);
    style(speaker, { color: glow, fontSize: '15px', fontWeight: 'bold', letterSpacing: '.06em' });
    const line = el('p', '');
    style(line, {
      margin: '10px 0 12px', minHeight: '1.45em', fontSize: 'clamp(20px, 3.1vw, 31px)', fontWeight: 'bold',
      lineHeight: '1.45', textShadow: `0 2px 4px #210c21, 0 0 14px ${main}88`
    });
    // 残り時間：ハートの付いたゲージ
    const timerRow = el('div');
    style(timerRow, { display: 'flex', alignItems: 'center', gap: '10px' });
    const timerTrack = el('div');
    style(timerTrack, {
      position: 'relative', flex: '1', height: '10px', borderRadius: '999px',
      background: 'rgba(0, 0, 0, .55)', border: '1px solid rgba(255, 190, 225, .45)', overflow: 'visible'
    });
    const timerFill = el('div');
    style(timerFill, {
      position: 'absolute', left: '0', top: '0', bottom: '0', width: '100%', borderRadius: '999px',
      background: `linear-gradient(90deg, ${main}, ${glow})`, boxShadow: `0 0 10px ${main}`
    });
    const timerHeart = el('div', '♥');
    style(timerHeart, {
      position: 'absolute', top: '50%', left: '100%', transform: 'translate(-50%, -54%)',
      fontSize: '22px', color: '#fff0f7', textShadow: `0 0 8px ${main}, 0 0 2px #000`
    });
    timerTrack.append(timerFill, timerHeart);
    const timer = el('div', `${this.cfg.timeoutSec.toFixed(1)}`);
    style(timer, { color: '#ffd1e7', fontSize: '14px', fontWeight: 'bold', minWidth: '44px', textAlign: 'right' });
    timerRow.append(timerTrack, timer);
    speech.append(ribbon, speaker, line, timerRow);

    const buttons = el('div');
    style(buttons, {
      display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '14px',
      width: 'min(780px, 100%)', padding: '14px', borderRadius: '16px',
      boxSizing: 'border-box', background: 'rgba(12, 6, 22, .5)', backdropFilter: 'blur(6px)',
      transform: 'translateY(40px)', opacity: '0', transition: 'transform .5s cubic-bezier(.2,1.3,.4,1) .15s, opacity .4s ease .15s'
    });
    const makeButton = (label, answer) => {
      const button = el('button', label);
      button.type = 'button';
      button.className = `ecv-btn ${answer === 'resist' ? 'ecv-resist' : 'ecv-accept'}`;
      style(button, {
        flex: '1 1 230px', minHeight: '64px', padding: '13px 20px',
        border: answer === 'resist' ? '2px solid rgba(220, 200, 230, .7)' : '2px solid rgba(255, 220, 240, .95)',
        borderRadius: '14px',
        background: answer === 'resist'
          ? 'linear-gradient(180deg, rgba(70, 64, 92, .92), rgba(38, 34, 56, .92))'
          : `linear-gradient(180deg, ${main}, #b0005a)`,
        color: '#fff', cursor: 'pointer', font: `bold clamp(17px, 2.6vw, 22px) ${this.fontFamily}`,
        textShadow: '0 1px 3px rgba(0, 0, 0, .6)'
      });
      button.addEventListener('click', () => this.choose(answer));
      return button;
    };
    buttons.append(makeButton(`1  ${choice.resistLabel}`, 'resist'), makeButton(`2  ♥ ${choice.acceptLabel}`, 'accept'));
    foreground.append(speech, buttons);
    root.append(portrait, shade, fx, foreground);
    document.body.append(root);

    const entry = {
      root, portrait, fx, line, timer, timerFill, timerHeart, buttons, speech, name, image: null, choice,
      main, glow, elapsed: 0, answer: null, replyLeft: 0, answerAge: 0,
      fullText: `「${choice.intro}」`, typed: 0,
      particles: [], spawnAcc: 0, beatAt: 0.35, beatAge: 9, warned: false
    };
    this.current = entry;
    requestAnimationFrame(() => {
      if (this.current !== entry) return;
      speech.style.transform = 'translateY(0)';
      speech.style.opacity = '1';
      buttons.style.transform = 'translateY(0)';
      buttons.style.opacity = '1';
    });
    this.paint(entry);
    void this.loadPortrait(enemyId).then((image) => {
      if (this.current !== entry) return;
      entry.image = image;
      this.paint(entry);
    }).catch((error) => console.error('敵の会話画像を読み込めませんでした', error));
  }

  // 一枚絵：登場で寄ってきて、待つ間じわじわ迫る。鼓動に合わせてわずかに脈打つ
  paintPortrait(entry) {
    const { g, width, height } = canvasContext(entry.portrait);
    g.clearRect(0, 0, width, height);
    g.fillStyle = '#25132c';
    g.fillRect(0, 0, width, height);
    const image = entry.image;
    if (!image) {
      g.fillStyle = '#ffc5e2';
      g.font = `bold ${Math.min(56, Math.max(26, width * 0.06))}px ${this.fontFamily}`;
      g.textAlign = 'center';
      g.fillText(entry.name, width / 2, height / 2);
      return;
    }
    const reduced = this.isReduced();
    const enter = 1.14 - 0.14 * easeOut(entry.elapsed / 0.7);
    const creep = 0.04 * Math.min(1, entry.elapsed / this.cfg.timeoutSec);
    const beat = reduced ? 0 : 0.008 * this.beatEnvelope(entry);
    const after = entry.answer && entry.answer !== 'resist' ? 0.08 * easeOut(entry.answerAge / 0.5) : 0;
    const zoom = (reduced ? 1 : enter) + creep + beat + after;
    const scale = Math.max(width / image.width, height / image.height) * zoom;
    const w = image.width * scale;
    const h = image.height * scale;
    g.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
  }

  // 鼓動の強さ（0〜1）。拍の直後に強く、なめらかに弱まる
  beatEnvelope(entry) {
    const a = entry.beatAge;
    if (a < 0.08) return a / 0.08;
    return Math.max(0, 1 - (a - 0.08) / 0.4);
  }

  paintFx(entry) {
    const { g, width, height } = canvasContext(entry.fx);
    g.clearRect(0, 0, width, height);
    const reduced = this.isReduced();
    const warn = entry.elapsed >= this.cfg.warningSec;
    const beat = this.beatEnvelope(entry);
    const unit = Math.min(width, height);

    // 登場の桃色の光（ゆっくり広がって消える）
    if (entry.elapsed < 0.7) {
      const k = entry.elapsed / 0.7;
      const grad = g.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * (0.3 + 0.7 * k));
      grad.addColorStop(0, `rgba(255, 140, 200, ${(0.5 * (1 - k)).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(255, 79, 163, 0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, width, height);
    }

    // 縁の脈動。警告後はピンクに染まって強くなる
    const base = warn ? 0.32 : 0.14;
    const edge = base + (reduced ? 0 : (warn ? 0.22 : 0.1) * beat);
    const vignette = g.createRadialGradient(width / 2, height / 2, unit * 0.32, width / 2, height / 2, Math.hypot(width, height) * 0.6);
    vignette.addColorStop(0, 'rgba(255, 60, 160, 0)');
    vignette.addColorStop(1, `rgba(255, 60, 160, ${edge.toFixed(3)})`);
    g.fillStyle = vignette;
    g.fillRect(0, 0, width, height);

    // 立ちのぼるハート
    g.lineJoin = 'round';
    for (const p of entry.particles) {
      const k = p.age / p.life;
      const x = p.x * width + Math.sin(p.age * p.swayHz + p.phase) * p.sway;
      const y = p.y * height - p.rise * easeOut(k) * height;
      const s = unit * p.size * (p.burst ? 1 - 0.4 * k : 0.8 + 0.2 * Math.sin(k * Math.PI));
      const a = Math.min(1, k / 0.15, (1 - k) / 0.35);
      if (a <= 0) continue;
      heartPath(g, x + (p.vx ?? 0) * p.age, y + (p.vy ?? 0) * p.age, s);
      g.shadowColor = 'rgba(255, 87, 178, .85)';
      g.shadowBlur = 14;
      if (p.outline) {
        g.strokeStyle = `rgba(255, 225, 245, ${(0.9 * a).toFixed(3)})`;
        g.lineWidth = Math.max(2, s * 0.12);
        g.stroke();
      } else {
        g.fillStyle = `${p.color}${Math.round(a * 200).toString(16).padStart(2, '0')}`;
        g.fill();
      }
    }
    g.shadowBlur = 0;

    // 警告後：縁に漂う大きなハート
    if (warn) {
      const age = entry.elapsed - this.cfg.warningSec;
      const appear = Math.min(1, age / 0.55);
      for (const heart of EDGE_HEARTS) {
        const x = width * heart.x + Math.sin(age * 0.65 + heart.phase) * 10;
        const y = height * heart.y - Math.min(age, 3) * 7 + Math.cos(age * 0.52 + heart.phase) * 7;
        const size = unit * heart.size * (1 + (reduced ? 0 : 0.08 * beat));
        heartPath(g, x, y, size);
        g.shadowColor = 'rgba(255, 87, 178, .85)';
        g.shadowBlur = 18;
        g.fillStyle = `rgba(255, 195, 230, ${((heart.outline ? 0.11 : 0.4) * appear).toFixed(3)})`;
        g.strokeStyle = `rgba(255, 220, 244, ${(0.85 * appear).toFixed(3)})`;
        g.lineWidth = Math.max(3, size * 0.075);
        g.fill();
        g.stroke();
      }
      g.shadowBlur = 0;
    }

    // 決めた瞬間の光（受け入れ：濃いピンク / 断る：白）
    if (entry.answer && entry.answerAge < 0.6) {
      const k = entry.answerAge / 0.6;
      const color = entry.answer === 'resist' ? '255, 240, 250' : '255, 60, 160';
      g.fillStyle = `rgba(${color}, ${(0.35 * (1 - k) * (1 - k)).toFixed(3)})`;
      g.fillRect(0, 0, width, height);
    }
  }

  paint(entry) {
    this.paintPortrait(entry);
    this.paintFx(entry);
  }

  spawnRising(entry) {
    const warn = entry.elapsed >= this.cfg.warningSec;
    entry.particles.push({
      x: rand(0.04, 0.96), y: rand(1.0, 1.08), rise: rand(0.35, 0.7),
      size: rand(0.012, warn ? 0.034 : 0.026), life: rand(2.2, 3.4), age: 0,
      sway: rand(8, 22), swayHz: rand(1.2, 2.4), phase: rand(0, 6),
      color: Math.random() < 0.5 ? '#ff4fa3' : '#ffb3d9', outline: Math.random() < 0.3
    });
  }

  // 決めた瞬間に、画面の中央からハートがはじける
  spawnBurst(entry, answer) {
    const resist = answer === 'resist';
    const count = this.isReduced() ? 10 : resist ? 22 : 40;
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(220, resist ? 520 : 720);
      entry.particles.push({
        x: 0.5, y: 0.55, rise: 0, burst: true,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        size: rand(0.014, resist ? 0.03 : 0.045), life: rand(0.6, 1.0), age: 0,
        sway: 0, swayHz: 0, phase: 0,
        color: resist ? '#ffd6ec' : Math.random() < 0.6 ? '#ff2d86' : '#ff9fd0', outline: resist
      });
    }
  }

  choose(answer) {
    const entry = this.current;
    if (!entry || entry.answer) return;
    entry.answer = answer;
    entry.answerAge = 0;
    entry.replyLeft = this.cfg.replySec;
    entry.buttons.style.opacity = '0';
    entry.buttons.style.transform = answer === 'resist' ? 'translateY(30px)' : 'scale(1.08)';
    entry.buttons.style.pointerEvents = 'none';
    entry.timer.parentElement.style.visibility = 'hidden';
    const line = answer === 'timeout' ? entry.choice.timeoutLine
      : answer === 'resist' ? entry.choice.resistLine : entry.choice.acceptLine;
    entry.fullText = `「${line}」`;
    entry.typed = 0;
    entry.line.textContent = '';
    this.spawnBurst(entry, answer);
    if (answer !== 'resist') this.onBeat(1);
  }

  update(dtSec) {
    const entry = this.current;
    if (!entry) return;
    const dt = Math.max(0, dtSec);
    const warn = entry.elapsed >= this.cfg.warningSec;

    // 台詞を1文字ずつ
    if (entry.typed < entry.fullText.length) {
      entry.typed = Math.min(entry.fullText.length, entry.typed + dt * 34);
      entry.line.textContent = entry.fullText.slice(0, Math.ceil(entry.typed));
    }
    // 鼓動。警告後は速くなる
    entry.beatAge += dt;
    entry.beatAt -= dt;
    if (entry.beatAt <= 0 && !entry.answer) {
      entry.beatAt += warn ? this.cfg.beatWarnSec : this.cfg.beatSec;
      entry.beatAge = 0;
      this.onBeat(warn ? 1 : 0.6);
    }
    // 立ちのぼるハート
    entry.spawnAcc += dt * (this.isReduced() ? 2 : warn ? 14 : 6);
    while (entry.spawnAcc >= 1) {
      entry.spawnAcc -= 1;
      this.spawnRising(entry);
    }
    for (const p of entry.particles) p.age += dt;
    entry.particles = entry.particles.filter((p) => p.age < p.life);

    if (entry.answer) {
      entry.answerAge += dt;
      entry.replyLeft -= dt;
      this.paint(entry);
      if (entry.replyLeft <= 0) {
        const answer = entry.answer;
        this.clear();
        this.onChoose(answer);
      }
      return;
    }
    entry.elapsed += dt;
    if (entry.elapsed >= this.cfg.warningSec && !entry.warned) {
      entry.warned = true;
      entry.root.classList.add('ecv-warn');
      this.onWarning();
    }
    const left = Math.max(0, this.cfg.timeoutSec - entry.elapsed);
    const ratio = left / this.cfg.timeoutSec;
    entry.timerFill.style.width = `${(ratio * 100).toFixed(1)}%`;
    entry.timerHeart.style.left = `${(ratio * 100).toFixed(1)}%`;
    entry.timer.textContent = `${left.toFixed(1)}`;
    this.paint(entry);
    if (entry.elapsed >= this.cfg.timeoutSec) this.choose('timeout');
  }

  clear() {
    this.current?.root.remove();
    this.current = null;
  }
}
