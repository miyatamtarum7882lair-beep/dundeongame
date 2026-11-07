const el = (tag, text = '') => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
};

const style = (node, values) => Object.assign(node.style, values);
const DPR = () => Math.min(2, window.devicePixelRatio || 1);

// Hearts stay near the edge so the portrait, dialogue, and choices remain readable.
const HEARTS = [
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

// Same rounded heart geometry used by the flashback effect.
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

export class EnemyChoiceView {
  constructor({ cfg, fontFamily, loadPortrait, onChoose }) {
    this.cfg = cfg;
    this.fontFamily = fontFamily;
    this.loadPortrait = loadPortrait;
    this.onChoose = onChoose;
    this.current = null;
    window.addEventListener('keydown', (event) => {
      if (!this.current || this.current.answer) return;
      if (event.key === '1' || event.key === 'ArrowLeft') this.choose('resist');
      else if (event.key === '2' || event.key === 'ArrowRight') this.choose('accept');
      else return;
      event.preventDefault();
    });
    window.addEventListener('resize', () => {
      if (!this.current) return;
      this.paintPortrait(this.current);
      if (this.current.elapsed >= this.cfg.warningSec) this.paintHearts(this.current);
    });
  }

  active() {
    return Boolean(this.current);
  }

  show({ enemyId, name, skillName, choice }) {
    this.clear();
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
    const edge = el('div');
    const edgeWidth = this.cfg.edgeWidthPx;
    style(edge, {
      position: 'absolute', inset: '0', display: 'none', pointerEvents: 'none',
      border: `${Math.round(edgeWidth * 0.34)}px solid rgba(255, 117, 190, .33)`,
      boxSizing: 'border-box',
      background: 'radial-gradient(ellipse at center, transparent 48%, rgba(255, 74, 166, .11) 74%, rgba(255, 86, 171, .32) 100%)',
      boxShadow: `inset 0 0 ${Math.round(edgeWidth * 1.9)}px ${edgeWidth}px rgba(255, 64, 153, .45), inset 0 0 ${Math.round(edgeWidth * 0.65)}px ${Math.round(edgeWidth * 0.3)}px rgba(255, 181, 223, .55)`
    });
    const hearts = el('canvas');
    style(hearts, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });

    const foreground = el('section');
    style(foreground, {
      position: 'relative', zIndex: '1', display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', alignItems: 'center', gap: '20px',
      width: '100%', height: '100%', maxHeight: '100dvh', overflowY: 'auto',
      boxSizing: 'border-box', padding: 'clamp(18px, 3.5vw, 48px)'
    });
    const speech = el('div');
    style(speech, {
      width: 'min(800px, 100%)', padding: '17px 22px', boxSizing: 'border-box',
      background: 'rgba(18, 9, 30, .76)', border: '1px solid rgba(255, 170, 214, .75)',
      borderRadius: '16px', boxShadow: '0 12px 38px rgba(0, 0, 0, .4)',
      backdropFilter: 'blur(7px)'
    });
    const title = el('div', skillName);
    style(title, { color: '#ffb5dc', fontSize: 'clamp(16px, 2.2vw, 23px)', fontWeight: 'bold' });
    const speaker = el('div', name);
    style(speaker, { color: '#fff3f9', fontSize: '14px', marginTop: '2px' });
    const line = el('p', `「${choice.intro}」`);
    style(line, { margin: '12px 0 8px', fontSize: 'clamp(19px, 3vw, 29px)', fontWeight: 'bold', lineHeight: '1.45', textShadow: '0 2px 4px #210c21' });
    const timer = el('div', `残り ${this.cfg.timeoutSec.toFixed(1)} 秒`);
    style(timer, { color: '#ffd1e7', fontSize: '14px', textAlign: 'right' });
    speech.append(title, speaker, line, timer);

    const buttons = el('div');
    style(buttons, {
      display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px',
      width: 'min(760px, 100%)', padding: '12px', borderRadius: '14px',
      boxSizing: 'border-box', background: 'rgba(12, 6, 22, .55)', backdropFilter: 'blur(6px)'
    });
    const makeButton = (label, answer) => {
      const button = el('button', label);
      button.type = 'button';
      style(button, {
        flex: '1 1 220px', minHeight: '62px', padding: '13px 20px',
        border: '2px solid rgba(255, 197, 230, .88)', borderRadius: '12px',
        background: answer === 'resist' ? 'rgba(47, 54, 76, .9)' : 'rgba(134, 49, 111, .91)',
        boxShadow: '0 7px 22px rgba(0, 0, 0, .4)', color: '#fff',
        cursor: 'pointer', font: `bold clamp(17px, 2.6vw, 22px) ${this.fontFamily}`
      });
      button.addEventListener('click', () => this.choose(answer));
      return button;
    };
    buttons.append(makeButton(`1  ${choice.resistLabel}`, 'resist'), makeButton(`2  ${choice.acceptLabel}`, 'accept'));
    foreground.append(speech, buttons);
    root.append(portrait, shade, edge, hearts, foreground);
    document.body.append(root);

    const entry = { root, portrait, edge, hearts, line, timer, buttons, name, image: null, choice, elapsed: 0, answer: null, replyLeft: 0 };
    this.current = entry;
    this.paintPortrait(entry);
    void this.loadPortrait(enemyId).then((image) => {
      if (this.current !== entry) return;
      entry.image = image;
      this.paintPortrait(entry);
    }).catch((error) => console.error('敵の会話画像を読み込めませんでした', error));
  }

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
    // Cover the viewport while keeping the image's proportions.
    const scale = Math.max(width / image.width, height / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    g.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
  }

  paintHearts(entry) {
    const { g, width, height } = canvasContext(entry.hearts);
    g.clearRect(0, 0, width, height);
    const age = entry.elapsed - this.cfg.warningSec;
    if (age < 0) return;
    const appear = Math.min(1, age / 0.55);
    const sizeUnit = Math.min(width, height);
    g.lineJoin = 'round';
    for (const heart of HEARTS) {
      // Slow drifting changes position only; the hearts never blink.
      const x = width * heart.x + Math.sin(age * 0.65 + heart.phase) * 10;
      const y = height * heart.y - Math.min(age, 3) * 7 + Math.cos(age * 0.52 + heart.phase) * 7;
      const size = sizeUnit * heart.size;
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

  choose(answer) {
    const entry = this.current;
    if (!entry || entry.answer) return;
    entry.answer = answer;
    entry.replyLeft = this.cfg.replySec;
    entry.buttons.style.display = 'none';
    entry.timer.style.display = 'none';
    const line = answer === 'timeout' ? entry.choice.timeoutLine
      : answer === 'resist' ? entry.choice.resistLine : entry.choice.acceptLine;
    entry.line.textContent = `「${line}」`;
  }

  update(dtSec) {
    const entry = this.current;
    if (!entry) return;
    const dt = Math.max(0, dtSec);
    if (entry.answer) {
      entry.replyLeft -= dt;
      if (entry.elapsed >= this.cfg.warningSec) this.paintHearts(entry);
      if (entry.replyLeft <= 0) {
        const answer = entry.answer;
        this.clear();
        this.onChoose(answer);
      }
      return;
    }
    entry.elapsed += dt;
    if (entry.elapsed >= this.cfg.warningSec) {
      entry.edge.style.display = 'block';
      this.paintHearts(entry);
    }
    if (entry.elapsed >= this.cfg.timeoutSec) {
      this.choose('timeout');
      return;
    }
    entry.timer.textContent = `残り ${(this.cfg.timeoutSec - entry.elapsed).toFixed(1)} 秒`;
  }

  clear() {
    this.current?.root.remove();
    this.current = null;
  }
}
