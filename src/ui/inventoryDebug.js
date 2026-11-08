// File: src/ui/inventoryDebug.js
// デバッグ：所持金・雪辱ポイント・アイテム・装備（部位ごと／袋）・盗まれた物を自由に変更する。
// タイトルのデバッグ設定と、メニューの「持ち物」タブの両方から使う。変更はすぐセーブデータに入る。
import { ENEMIES } from '../data/enemies.js';
import { ITEMS, GEAR, SLOTS, SLOT_NAMES, giftName } from '../data/shopCatalog.js';
import { ensureEconomy, makeGear } from '../battle/economy.js';

function el(tag, text = '', style = {}) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  Object.assign(node.style, style);
  return node;
}

function btn(label, onClick) {
  const b = el('button', label, {
    padding: '4px 9px', cursor: 'pointer', color: '#fff', borderRadius: '7px', font: '600 12px inherit',
    border: '1px solid #65546d', background: '#292230'
  });
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

function num(value, min, max, onChange, width = '90px') {
  const input = el('input', '', { width, padding: '4px 6px', boxSizing: 'border-box' });
  input.type = 'number';
  input.min = String(min);
  input.max = String(max);
  input.step = '1';
  input.value = String(value);
  input.addEventListener('change', () => {
    const v = Math.max(min, Math.min(max, Math.round(Number(input.value) || 0)));
    input.value = String(v);
    onChange(v);
  });
  return input;
}

function row(parent, label, ...controls) {
  const r = el('div', '', { display: 'grid', gridTemplateColumns: 'minmax(120px, 160px) 1fr', gap: '10px', alignItems: 'center', margin: '4px 0' });
  const right = el('div', '', { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' });
  right.append(...controls);
  r.append(el('span', label, { color: '#d9b3ce' }), right);
  parent.append(r);
  return r;
}

const heading = (text) => el('div', text, { color: '#ffb9dc', fontWeight: 'bold', margin: '10px 0 4px' });

/**
 * 持ち物を変更する欄を作る。
 * @param {object} save
 * @param {object} B
 * @param {() => void} onChange 変更のたびに呼ぶ（保存など）
 * @returns {HTMLElement}
 */
export function buildInventoryDebug(save, B, onChange) {
  const root = el('div', '', { fontSize: '13px', color: '#fff' });
  const p = ensureEconomy(save.persistent);
  const run = save.currentRun;
  const changed = () => { onChange?.(); render(); };

  function render() {
    root.replaceChildren();

    // ---- お金 ----
    root.append(heading('お金'));
    const gold = num(run.gold ?? 0, 0, 9999999, (v) => { run.gold = v; onChange?.(); });
    row(root, '所持金（G）', gold,
      btn('+100', () => { run.gold = (run.gold ?? 0) + 100; changed(); }),
      btn('+1000', () => { run.gold = (run.gold ?? 0) + 1000; changed(); }),
      btn('0 にする', () => { run.gold = 0; changed(); }));
    row(root, '雪辱ポイント', num(p.rp ?? 0, 0, 999999, (v) => { p.rp = v; onChange?.(); }),
      btn('+100', () => { p.rp = (p.rp ?? 0) + 100; changed(); }));

    // ---- アイテム ----
    root.append(heading('アイテム'));
    for (const [id, it] of Object.entries(ITEMS)) {
      row(root, it.name, num(p.consumables[id] ?? 0, 0, 99, (v) => { p.consumables[id] = v; onChange?.(); }, '70px'),
        btn('+5', () => { p.consumables[id] = Math.min(99, (p.consumables[id] ?? 0) + 5); changed(); }));
    }
    row(root, 'まとめて', btn('全部 10 個', () => { for (const id of Object.keys(ITEMS)) p.consumables[id] = 10; changed(); }),
      btn('全部 0 個', () => { for (const id of Object.keys(ITEMS)) p.consumables[id] = 0; changed(); }));

    // ---- 装備（部位ごと）----
    root.append(heading('装備（部位ごと）'));
    for (const slot of SLOTS) {
      const cur = p.equipment.slots[slot];
      const sel = el('select', '', { padding: '4px', maxWidth: '220px' });
      const add = (value, label) => {
        const o = el('option', label);
        o.value = value;
        sel.append(o);
      };
      add('', 'なし');
      for (const [id, g] of Object.entries(GEAR)) if (g.slot === slot) add(`gear:${id}`, `${g.name}（耐性 ${g.resist >= 0 ? '+' : ''}${g.resist}）`);
      for (const e of ENEMIES) add(`gift:${e.id}`, `♥ ${giftName(e.id, slot)}`);
      sel.value = cur ? (cur.kind === 'gift' ? `gift:${cur.raceId}` : `gear:${cur.id}`) : '';
      sel.addEventListener('change', () => {
        const v = sel.value;
        if (!v) p.equipment.slots[slot] = null;
        else if (v.startsWith('gear:')) p.equipment.slots[slot] = makeGear(v.slice(5));
        else {
          const raceId = v.slice(5);
          p.equipment.slots[slot] = { kind: 'gift', id: `gift:${raceId}:${slot}`, slot, raceId, name: giftName(raceId, slot), level: 1 };
        }
        changed();
      });
      const extra = [];
      if (cur?.kind === 'gift') {
        extra.push(el('span', '段', { color: '#cbbbd0' }), num(cur.level, 1, B.gifts.maxLevel, (v) => { cur.level = v; onChange?.(); }, '56px'));
      } else if (cur?.kind === 'gear') {
        extra.push(el('span', '耐久', { color: '#cbbbd0' }), num(cur.dur, 0, cur.maxDur, (v) => { cur.dur = v; onChange?.(); }, '64px'),
          btn('直す', () => { cur.dur = cur.maxDur; changed(); }));
      }
      row(root, SLOT_NAMES[slot], sel, ...extra);
    }
    row(root, 'まとめて', btn('全部外す（贈り物も）', () => { for (const s of SLOTS) p.equipment.slots[s] = null; changed(); }),
      btn('贈り物だけ外す', () => { for (const s of SLOTS) if (p.equipment.slots[s]?.kind === 'gift') p.equipment.slots[s] = null; changed(); }));

    // ---- 袋 ----
    root.append(heading(`袋の中（${p.equipment.bag.length}）`));
    const addSel = el('select', '', { padding: '4px', maxWidth: '240px' });
    for (const [id, g] of Object.entries(GEAR)) {
      const o = el('option', `${SLOT_NAMES[g.slot]}：${g.name}`);
      o.value = id;
      addSel.append(o);
    }
    row(root, '袋に入れる', addSel, btn('入れる', () => { p.equipment.bag.push(makeGear(addSel.value)); changed(); }),
      btn('袋を空にする', () => { p.equipment.bag.length = 0; changed(); }));
    p.equipment.bag.forEach((it, i) => {
      const dur = it.kind === 'gear' ? `・耐久 ${it.dur}/${it.maxDur}` : '';
      row(root, `　${i + 1}.`, el('span', `${it.name}（${SLOT_NAMES[it.slot]}${dur}）`),
        btn('捨てる', () => { p.equipment.bag.splice(i, 1); changed(); }));
    });

    // ---- 盗まれた物 ----
    root.append(heading('盗まれた物'));
    const stolen = p.stolenItems.map((s) => ITEMS[s.id]?.name ?? s.id).join('・') || 'なし';
    row(root, `${p.stolenItems.length} 個`, el('span', stolen, { color: '#cbbbd0' }),
      btn('取り返す（持ち物に戻す）', () => {
        for (const s of p.stolenItems) p.consumables[s.id] = (p.consumables[s.id] ?? 0) + 1;
        p.stolenItems.length = 0;
        changed();
      }),
      btn('消す', () => { p.stolenItems.length = 0; changed(); }));
  }

  render();
  return root;
}
