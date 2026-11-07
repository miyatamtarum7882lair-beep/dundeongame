// File: src/ui/defeatRecapView.js
// 敗北の回想。負けた直後に、勝った敵の一枚絵・勝ち誇った台詞・このランで奪われたもの・次へのヒントを見せる。
// 表示中はゲームの時計を止める。クリックか Enter / Space で閉じる（出てから少しの間は閉じない）。
const el = (tag, text = '') => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
};
const style = (node, values) => Object.assign(node.style, values);

export class DefeatRecapView {
  constructor({ fontFamily, loadPortrait, onClose, minShowSec = 1.2 }) {
    this.fontFamily = fontFamily;
    this.loadPortrait = loadPortrait;
    this.onClose = onClose;
    this.minShowSec = minShowSec;
    this.current = null;
    window.addEventListener('keydown', (event) => {
      if (!this.current) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.tryClose();
      }
    });
  }

  active() {
    return Boolean(this.current);
  }

  show(info) {
    this.clear();
    const theme = info.theme ?? { main: '#ff4fa3', glow: '#ffd6ec' };
    const root = el('div');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', `${info.name}に敗北`);
    style(root, {
      position: 'fixed', inset: '0', zIndex: '720', overflow: 'hidden', cursor: 'pointer',
      fontFamily: this.fontFamily, color: '#fff',
      background: 'radial-gradient(ellipse at 70% 40%, rgba(90, 10, 60, .92), rgba(12, 2, 14, .97))',
      opacity: '0', transition: 'opacity .6s ease'
    });
    const portrait = el('div');
    style(portrait, {
      position: 'absolute', right: '0', top: '0', bottom: '0', width: '62%',
      backgroundSize: 'cover', backgroundPosition: 'center 20%',
      maskImage: 'linear-gradient(to right, transparent 0%, #000 35%)',
      WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 35%)',
      transform: 'scale(1.08)', transition: 'transform 6s ease-out', filter: 'saturate(1.1)'
    });
    const panel = el('section');
    style(panel, {
      position: 'absolute', left: 'clamp(16px, 5vw, 64px)', top: '50%', transform: 'translateY(-50%)',
      width: 'min(560px, 88vw)', display: 'flex', flexDirection: 'column', gap: '14px'
    });
    const title = el('div', '敗北');
    style(title, {
      fontSize: 'clamp(42px, 7vw, 76px)', fontWeight: '900', letterSpacing: '.18em', color: theme.main,
      textShadow: `0 0 24px ${theme.main}, 0 4px 0 rgba(40, 0, 25, .9)`
    });
    const who = el('div', `${info.name}の「${info.skill}」に屈した`);
    style(who, { fontSize: '18px', color: theme.glow, fontWeight: 'bold' });
    const line = el('p', `「${info.line}」`);
    style(line, {
      margin: '4px 0', padding: '16px 20px', borderRadius: '16px', fontSize: 'clamp(19px, 2.6vw, 26px)',
      fontWeight: 'bold', lineHeight: '1.5', background: 'rgba(30, 6, 30, .75)', border: `2px solid ${theme.main}`,
      boxShadow: `0 0 22px ${theme.main}66`
    });
    const stats = el('div');
    style(stats, { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 18px', fontSize: '16px' });
    const row = (label, value, color = '#fff0f7') => {
      const a = el('div', label);
      style(a, { color: '#d9b3ce' });
      const b = el('div', value);
      style(b, { color, fontWeight: 'bold' });
      stats.append(a, b);
    };
    row('奪われた経験値', `${info.expLost.toLocaleString()} EXP`, '#c08bff');
    row('絶頂させられた回数', `${info.climaxes} 回`, '#ff9fd0');
    row('到達レベル', `Lv${info.peakLevel} → Lv${info.level}`);
    row(`${info.name}に負けた回数`, `${info.defeats} 回`, theme.main);
    if (info.loseHabit.to > info.loseHabit.from) {
      row('負け癖', `${info.loseHabit.from} → ${info.loseHabit.to} 段`, '#ff4fa3');
    }
    // 倒れたあとの搾取
    const hv = info.harvest;
    if (hv) {
      if (hv.expLost > 0) row('倒れたあと吸い尽くされた', `${hv.expLost.toLocaleString()} EXP（${hv.enemies.length}人がかり）`, '#c08bff');
      for (const text of hv.debuffs) row('刻まれた癖', text, '#ff4fa3');
      if (hv.gold > 0) row('貢がされたお金', `${hv.gold.toLocaleString()} G`, '#ffd36b');
    }
    if (info.rpGain > 0) row('雪辱ポイント', `+${info.rpGain}（拠点で使える）`, '#9fe3ff');
    const hints = el('div');
    style(hints, {
      marginTop: '6px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(255, 255, 255, .06)',
      border: '1px solid rgba(255, 190, 225, .35)', fontSize: '14px', lineHeight: '1.6', color: '#ffe3f2'
    });
    hints.append(el('div', '次は…'));
    for (const h of info.hints) hints.append(el('div', `♡ ${h}`));
    const next = el('div', 'クリック / Enter で続ける');
    style(next, { marginTop: '8px', fontSize: '13px', color: '#d9b3ce', opacity: '0', transition: 'opacity .5s ease' });
    panel.append(title, who, line, stats, hints, next);
    root.append(portrait, panel);
    document.body.append(root);
    root.addEventListener('click', () => this.tryClose());

    const entry = { root, age: 0, next };
    this.current = entry;
    requestAnimationFrame(() => {
      root.style.opacity = '1';
      portrait.style.transform = 'scale(1)';
    });
    void this.loadPortrait(info.raceId).then((img) => {
      if (this.current !== entry || !img) return;
      // ImageBitmap にも対応するため、いったん canvas に描いてから背景にする
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      portrait.style.backgroundImage = `url(${c.toDataURL('image/jpeg', 0.9)})`;
    }).catch(() => {});
  }

  update(dt) {
    const entry = this.current;
    if (!entry) return;
    entry.age += dt;
    if (entry.age >= this.minShowSec) entry.next.style.opacity = '1';
  }

  tryClose() {
    const entry = this.current;
    if (!entry || entry.age < this.minShowSec) return;
    this.clear();
    this.onClose();
  }

  clear() {
    this.current?.root.remove();
    this.current = null;
  }
}
