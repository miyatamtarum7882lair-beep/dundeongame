// File: src/ui/shopView.js
// 行商ちゃんの店。お金のほかに「経験値払い」もできる。堕ち度が上がるほど値段が上がる。
//   道具 / 装備 / 呪いを外す（敵からの贈り物）/ 買い戻し（盗まれた物）/ 取引（負け癖と引き換えに値引き）
// 一枚絵は public/assets/portraits/merchant.(png|jpg|webp)。無ければ仮の絵を描く。
import { ENEMIES, ENEMIES_BY_ID } from '../data/enemies.js';
import { ITEMS, GEAR, SLOTS, SLOT_NAMES } from '../data/shopCatalog.js';
import { corruptionState } from '../data/corruption.js';

const PINK = '#ff4fa3';
const GOLD = '#ffd36b';

function el(tag, text = '', style = {}) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  Object.assign(node.style, style);
  return node;
}

function button(label, onClick, { primary = false, disabled = false, color = null } = {}) {
  const b = el('button', label, {
    padding: '6px 12px', cursor: disabled ? 'default' : 'pointer', color: '#fff', borderRadius: '8px', font: '600 13px inherit',
    border: `1px solid ${color ?? (primary ? '#ff9dcc' : '#65546d')}`, opacity: disabled ? '0.45' : '1',
    background: primary ? 'linear-gradient(135deg, #a83e78, #6c397f)' : '#292230'
  });
  b.type = 'button';
  b.disabled = disabled;
  b.addEventListener('click', onClick);
  return b;
}

// 行商ちゃん（travelingMerchant.yaml）：丁寧で柔らかい接客口調。堕ち度が高いほど甘い誘いと含み笑いが増える
const GREETINGS = [
  'いらっしゃいませ♪ 今日もいい品が入っていますよ。',
  'お支払いは、お金か経験値から選べますよ。',
  'あら、お客さま。少しお疲れのご様子ですね？',
  'ふふ、経験値払いにも慣れてきましたね♡',
  'あら、またいらしたんですね。今日は何を差し出してくださいます？♡',
  'お客さま、もうお金なんて要りませんよね？♡ ……経験値で、いかがですか？'
];

export function openShop({ save, B, eco, loadPortrait, playSe, onClose }) {
  const p = save.persistent;
  let tab = 'items';
  let method = 'gold';
  const level = corruptionState(p).level;
  let line = GREETINGS[Math.min(GREETINGS.length - 1, level)];
  let dealRace = ENEMIES.find((e) => p.codex.entries[e.id]?.seen)?.id ?? ENEMIES[0].id;

  const root = el('div', '', {
    position: 'fixed', inset: '0', zIndex: '950', display: 'grid', placeItems: 'center', fontFamily: B.ui.fontFamily, color: '#fff',
    background: 'radial-gradient(ellipse at 30% 50%, rgba(80,40,30,.85), rgba(10,6,12,.95))'
  });
  const panel = el('div', '', {
    width: 'min(1060px, calc(100vw - 32px))', height: 'min(690px, calc(100vh - 32px))', display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) 1fr', gridTemplateRows: 'minmax(0, 1fr)',
    background: 'rgba(24,14,22,.95)', border: `1px solid ${GOLD}88`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 18px 60px rgba(0,0,0,.6)'
  });
  const left = el('div', '', { position: 'relative', background: 'linear-gradient(180deg, #3a1f2b, #160c14)', overflow: 'hidden', minHeight: '0' });
  const art = el('canvas', '', { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', objectFit: 'cover' });
  art.width = 340;
  art.height = 690;
  const bubble = el('div', '', {
    position: 'absolute', left: '12px', right: '12px', bottom: '14px', padding: '12px 14px', borderRadius: '14px', fontWeight: 'bold', lineHeight: '1.5',
    background: 'rgba(30,6,30,.88)', border: `2px solid ${PINK}`, boxShadow: `0 0 18px ${PINK}55`, fontSize: '15px'
  });
  left.append(art, bubble);
  const right = el('div', '', { display: 'flex', flexDirection: 'column', minWidth: '0' });
  const head = el('div', '', { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', padding: '12px 14px', borderBottom: '1px solid #59435e' });
  const body = el('div', '', { flex: '1', overflow: 'auto', padding: '12px 14px' });
  right.append(head, body);
  panel.append(left, right);
  root.append(panel);

  // 仮の一枚絵（本物の絵が来たら差し替わる）
  function drawPlaceholder() {
    const g = art.getContext('2d');
    g.clearRect(0, 0, art.width, art.height);
    const grad = g.createRadialGradient(170, 260, 20, 170, 260, 240);
    grad.addColorStop(0, '#ff9fd0');
    grad.addColorStop(1, '#3a1f2b');
    g.fillStyle = grad;
    g.fillRect(0, 0, art.width, art.height);
    g.fillStyle = 'rgba(40,10,30,.85)';
    g.beginPath();
    g.arc(170, 200, 62, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(170, 420, 120, 170, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffe3f2';
    g.font = `bold 22px ${B.ui.fontFamily}`;
    g.textAlign = 'center';
    g.fillText('行商ちゃん', 170, 80);
    g.font = `13px ${B.ui.fontFamily}`;
    g.fillText('（一枚絵は準備中）', 170, 104);
  }
  drawPlaceholder();
  void loadPortrait('gyousyoumaid').then((img) => {
    if (!img) return;
    const g = art.getContext('2d');
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const s = Math.max(art.width / iw, art.height / ih);
    g.clearRect(0, 0, art.width, art.height);
    g.drawImage(img, (art.width - iw * s) / 2, 0, iw * s, ih * s);
  }).catch(() => {});

  const say = (text) => {
    line = text;
    bubble.textContent = `「${line}」`;
  };

  // 値段の表示（経験値払いなら EXP に換算）
  const cost = (gold) => (method === 'exp' ? `${Math.round(gold * B.merchant.expPerGold)} EXP` : `${gold} G`);

  function afterPay(res, okLine) {
    if (!res.ok) {
      say(method === 'gold' ? 'お金が足りませんか？ ……経験値で、いいよ？♡' : res.message);
      playSe('choiceWarning');
      render();
      return false;
    }
    if (res.paidExp) {
      say(res.levelsLost > 0 ? 'んっ……♡ レベルごと、いただいちゃいました♡' : '経験値でのお支払い、確かにいただきました♪');
      playSe('expDrained');
    } else {
      say(okLine);
      playSe('coinTribute');
    }
    render();
    return true;
  }

  function renderHead() {
    head.replaceChildren();
    const hs = save.currentRun.hero;
    head.append(el('div', `所持金 ${save.currentRun.gold} G`, { color: GOLD, fontWeight: 'bold' }));
    head.append(el('div', `Lv${hs.level}  EXP ${hs.exp}`, { color: '#c08bff', fontWeight: 'bold' }));
    if (save.currentRun.merchantDeal) head.append(el('div', '次のお買い物は半額♡', { color: PINK, fontWeight: 'bold' }));
    head.append(el('div', '', { flex: '1' }));
    for (const [id, label] of [['gold', 'お金で払う'], ['exp', '経験値で払う']]) {
      head.append(button(label, () => {
        method = id;
        if (id === 'exp') say('経験値でのお支払いですね♡ ……ふふ、たっぷりいただきますよ');
        render();
      }, { primary: method === id, color: id === 'exp' ? PINK : GOLD }));
    }
    head.append(button('店を出る（Esc）', close));
    const tabs = el('div', '', { display: 'flex', gap: '6px', width: '100%', marginTop: '6px', flexWrap: 'wrap' });
    for (const [id, label] of [['items', '道具'], ['gear', '装備'], ['gift', '呪いを外す'], ['back', '買い戻し'], ['deal', '取引']]) {
      tabs.append(button(label, () => { tab = id; render(); }, { primary: tab === id }));
    }
    head.append(tabs);
  }

  function row(name, desc, priceText, action, extra = null) {
    const r = el('div', '', {
      display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '10px', alignItems: 'center', padding: '8px 10px', marginBottom: '6px',
      borderRadius: '10px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,190,225,.18)'
    });
    const info = el('div');
    info.append(el('div', name, { fontWeight: 'bold' }), el('div', desc, { fontSize: '12px', color: '#cbbbd0' }));
    if (extra) info.append(extra);
    r.append(info, el('div', priceText, { color: method === 'exp' ? '#c08bff' : GOLD, fontWeight: 'bold', whiteSpace: 'nowrap' }), action);
    body.append(r);
  }

  function render() {
    renderHead();
    bubble.textContent = `「${line}」`;
    body.replaceChildren();
    const mul = eco.priceMul();
    if (mul > 1.001) body.append(el('div', `（堕ち度のぶん、値段が ${Math.round((mul - 1) * 100)}% 上がっている）`, { fontSize: '12px', color: PINK, marginBottom: '8px' }));
    if (tab === 'items') {
      for (const [id, it] of Object.entries(ITEMS)) {
        const price = eco.price(it.price);
        row(`${it.name}（所持 ${p.consumables[id] ?? 0}）`, it.desc, cost(price), button('買う', () => afterPay(eco.buyItem(id, method), `はい、『ちゃり～ん……♡』 ${it.name}、お買い上げありがとうございます♪`), { primary: true }));
      }
    } else if (tab === 'gear') {
      for (const [id, g] of Object.entries(GEAR)) {
        const cur = p.equipment.slots[g.slot];
        const note = cur?.kind === 'gift' ? `　※いまは「${cur.name}」が外れないので、袋にしまわれます` : '';
        row(`${g.name}（${SLOT_NAMES[g.slot]}）`, `${g.desc ?? `${SLOT_NAMES[g.slot]}への耐性 +${g.resist}`}・耐久 ${g.dur}（拘束されるたびに溶かされる）${note}`, cost(eco.price(g.price)),
          button('買う', () => afterPay(eco.buyGear(id, method), `${g.name}ですね♪ ……あの子たちに溶かされないと、いいですね♡`), { primary: true }));
      }
    } else if (tab === 'gift') {
      const gifts = SLOTS.map((s) => p.equipment.slots[s]).filter((g) => g?.kind === 'gift');
      if (!gifts.length) body.append(el('div', '呪いの装備は着けていない', { color: '#cbbbd0' }));
      else say('あら、可愛いものを着けていますね♡ 外して差し上げてもいいですけど……お高いですよ？');
      for (const g of gifts) {
        row(`${g.name}（${g.level}段）`, `${ENEMIES_BY_ID[g.raceId]?.name ?? ''}からの贈り物。自分では外せない`, cost(eco.giftRemovePrice(g)),
          button('外してもらう', () => afterPay(eco.removeGift(g.slot, method), 'はい、外れましたよ♡ ……でも、体はまだ覚えているかもしれませんね'), { primary: true }));
      }
    } else if (tab === 'back') {
      if (!p.stolenItems.length) body.append(el('div', '盗まれた物は無い', { color: '#cbbbd0' }));
      p.stolenItems.forEach((st, i) => {
        const it = ITEMS[st.id];
        row(it.name, `${ENEMIES_BY_ID[st.raceId]?.name ?? ''}に盗まれた物。どこかで手に入れてきたみたい`, cost(eco.price(it.price * B.merchant.buyBackMul)),
          button('買い戻す', () => afterPay(eco.buyBack(i, method), '買い戻しですね。こちらからどうぞ♪ ……少し割高ですけど♡'), { primary: true }));
      });
    } else {
      body.append(el('div', '「負け癖を一段、差し出しますか？ 次のお買い物は半額ですよ♡」（選んだ子への負け癖が1段進む）', { color: '#ffe3f2', marginBottom: '8px' }));
      const sel = el('select', '', { padding: '6px', marginRight: '8px' });
      for (const e of ENEMIES.filter((x) => p.codex.entries[x.id]?.seen || x.id === dealRace)) {
        const opt = el('option', `${e.name}（いま ${p.debuffs.loseHabit.byRace[e.id] ?? 0} 段）`);
        opt.value = e.id;
        sel.append(opt);
      }
      sel.value = dealRace;
      sel.addEventListener('change', () => { dealRace = sel.value; });
      body.append(sel, button('負け癖を差し出す', () => {
        const res = eco.dealLoseHabit(dealRace);
        if (res.ok) {
          say(`${ENEMIES_BY_ID[dealRace].name}への負け癖、一段いただきました♡ 次のお買い物は半額ですよ`);
          playSe('debuffDeepen');
        } else say(res.message);
        render();
      }, { primary: true, color: PINK }));
    }
  }

  function onKey(ev) {
    ev.stopPropagation();
    if (ev.key === 'Escape') {
      ev.preventDefault();
      close();
    }
  }
  window.addEventListener('keydown', onKey, true);
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    window.removeEventListener('keydown', onKey, true);
    root.remove();
    onClose?.();
  }
  say(line);
  render();
  document.body.append(root);
  playSe('shopBell');
  return { close, isOpen: () => !closed };
}
