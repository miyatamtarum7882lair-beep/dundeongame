// File: src/ui/gameMenu.js
// メニュー（M キー / タイトル）。タブ：ステータス・図鑑・回想部屋・設定。
//   ステータス … レベル、属性ごとの耐性、永続デバフ、記録
//   図鑑       … 出会った敵の一枚絵・チャームポイント・技（進化・上位技・その技で負けた回数）・負け癖・絆。デバッグ操作も兼ねる
//   回想部屋   … 負けた技の回想（再現）と、敵を選んでの模擬戦（結果は保存されない）。デバッグ操作
//   設定       … 音量（全体・BGM・効果音）など
import { ENEMIES, ENEMIES_BY_ID, ATTRS } from '../data/enemies.js';
import { DEFEAT_SKILLS } from '../data/defeatSkills.js';
import { SKILL_DEFS } from '../data/skills.js';
import { CONDITIONS, STATUSES, PERMANENT_STAGE_NAMES } from '../data/conditioning.js';
import { charmAttrsOf } from '../data/charmAttrs.js';
import { themeOf } from '../data/enemyThemes.js';
import { collectDebuffs } from './debuffPanel.js';
import { isEvolved, hasLearned, evoState } from '../battle/skillEvolution.js';
import { getMarkScore, markTier, MARK_TIER_NAMES } from '../battle/learning.js';
import { DEBUG_ACTIONS } from '../core/debugTools.js';
import { uniteNameOf, rubAttrsOf } from '../battle/pairBond.js';
import { ITEMS, SLOTS, SLOT_NAMES, BASE_UPGRADES } from '../data/shopCatalog.js';
import { ensureEconomy } from '../battle/economy.js';
import { memoryLines } from '../battle/enemyMemory.js';
import { buildInventoryDebug } from './inventoryDebug.js';

const RANK_NAMES = { basic: 'ベーシック', unique: 'ユニーク', elite: 'エリート' };
const ATTR_ORDER = ['mouth', 'bust', 'hand', 'hip', 'foot'];
const PINK = '#ff4fa3';

function el(tag, text = '', style = {}) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  Object.assign(node.style, style);
  return node;
}

function button(label, onClick, { primary = false, small = false, color = null } = {}) {
  const b = el('button', label, {
    padding: small ? '4px 10px' : '8px 14px', cursor: 'pointer', color: '#fff', borderRadius: '8px',
    font: `600 ${small ? 12 : 14}px inherit`,
    border: `1px solid ${color ?? (primary ? '#ff9dcc' : '#65546d')}`,
    background: primary ? 'linear-gradient(135deg, #a83e78, #6c397f)' : '#292230'
  });
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

function card(title) {
  const box = el('section', '', {
    padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,.05)',
    border: '1px solid rgba(255,190,225,.25)', marginBottom: '12px'
  });
  if (title) box.append(el('h3', title, { margin: '0 0 8px', fontSize: '15px', color: '#ffb9dc' }));
  return box;
}

function rowGrid(parent) {
  const grid = el('div', '', { display: 'grid', gridTemplateColumns: 'minmax(120px, auto) 1fr', gap: '5px 14px', fontSize: '14px' });
  parent.append(grid);
  return (label, value, color = '#fff0f7') => {
    grid.append(el('div', label, { color: '#d9b3ce' }));
    const v = typeof value === 'string' || typeof value === 'number' ? el('div', String(value), { color, fontWeight: 'bold' }) : value;
    grid.append(v);
  };
}

// 耐性などのバー。負の値ほどピンクが濃い
function bar(value, min, max, color) {
  const wrap = el('div', '', { display: 'flex', alignItems: 'center', gap: '8px' });
  const track = el('div', '', { flex: '1', height: '10px', borderRadius: '6px', background: 'rgba(0,0,0,.5)', position: 'relative', overflow: 'hidden' });
  const zero = (0 - min) / (max - min);
  const pos = (value - min) / (max - min);
  const fill = el('div', '', {
    position: 'absolute', top: '0', bottom: '0', borderRadius: '6px', background: color,
    left: `${Math.min(zero, pos) * 100}%`, width: `${Math.abs(pos - zero) * 100}%`
  });
  const mid = el('div', '', { position: 'absolute', top: '0', bottom: '0', left: `${zero * 100}%`, width: '1px', background: '#fff8' });
  track.append(fill, mid);
  wrap.append(track, el('span', value > 0 ? `+${value}` : String(value), { minWidth: '36px', textAlign: 'right', fontWeight: 'bold', color }));
  return wrap;
}

function skillName(id) {
  return DEFEAT_SKILLS[id]?.name ?? id;
}

// 技の進化条件（図鑑）。進み具合も添える
function evolveConditionLines(p, B, raceId, sid, kind) {
  const def = SKILL_DEFS[sid] ?? {};
  const st = p.skillEvolution?.[raceId]?.[sid] ?? {};
  const prog = (need) => `（${Math.min(st.progress ?? 0, need)} / ${need}）`;
  const lines = [];
  if (kind === '上位') {
    const from = def.advancedFrom;
    lines.push(from ? `習得：「${skillName(from)}」で絶頂させられると、永続で覚える` : '習得：永続では覚えない');
    lines.push(`または：1体に経験値を ${B.enemy.specialUnlockDrain} 吸われると、その子だけが使ってくる（その場限り）`);
    return lines;
  }
  const rule = def.evolve;
  const need = rule?.need ?? 1;
  const condName = CONDITIONS[def.cond?.id]?.name ?? STATUSES[def.cond?.id]?.name ?? '蓄積デバフ';
  const text = {
    debuff_max: () => `この技で「${condName}」を最大まで溜められる`,
    finish: () => `この拘束技で絶頂させられる${prog(need)}`,
    repeated_use: () => `この技を ${need} 回受ける${prog(need)}`,
    choice_count: () => `この技の誘惑を受け入れる・力比べに負ける${prog(need)}`,
    exp_absorbed: () => `この技で経験値を ${need} 吸われる${prog(need)}`,
    mp_zero: () => `この技で MP を 0 にされる${prog(need)}`
  }[rule?.type];
  lines.push(text ? `進化：${text()}` : '進化：この技は進化しない');
  if (ENEMIES_BY_ID[raceId]?.choiceSkill === sid || st.manual || st.timeout) {
    const T = B.temptation;
    lines.push(`または：誘惑を自分から受け入れる（${Math.min(st.manual ?? 0, T.evolveManualAccept)} / ${T.evolveManualAccept}）、時間切れで受け入れる（${Math.min(st.timeout ?? 0, T.evolveTimeoutAccept)} / ${T.evolveTimeoutAccept}）`);
  }
  return lines;
}

/**
 * @param {object} o
 * @param {object} o.save
 * @param {object} o.B
 * @param {string} [o.tab]
 * @param {(id: string) => Promise<CanvasImageSource|null>} o.loadPortrait
 * @param {(volume: object) => void} o.onVolume
 * @param {() => void} o.onSettings 設定を変えた（保存など）
 * @param {(sec: string) => void} [o.onTestSe]
 * @param {(spec: object) => void} o.startRecollection 模擬戦・回想を始める
 * @param {() => boolean} o.inSandbox
 * @param {() => void} o.endRecollection
 * @param {(actionId: string, opts: object) => {ok:boolean, message:string}} o.runDebug
 * @param {() => void} [o.openDebugSettings]
 * @param {() => void} o.onClose
 */
export function openGameMenu(o) {
  const { save, B } = o;
  const p = ensureEconomy(save.persistent);
  let tab = o.tab ?? 'status';
  let showAll = false;         // 図鑑：未遭遇も表示（デバッグ）
  let debugBagOpen = false;    // 持ち物：デバッグ欄を開いているか
  let selected = ENEMIES[0].id;

  const root = el('div', '', {
    position: 'fixed', inset: '0', zIndex: '950', display: 'grid', placeItems: 'center',
    background: 'radial-gradient(ellipse at center, rgba(46,25,55,.9), rgba(6,5,12,.96))', color: '#fff',
    fontFamily: B.ui.fontFamily
  });
  const panel = el('div', '', {
    width: 'min(1040px, calc(100vw - 32px))', height: 'min(720px, calc(100vh - 32px))', display: 'flex', flexDirection: 'column',
    background: 'rgba(18,13,27,.94)', border: '1px solid #9d668d', borderRadius: '14px', boxShadow: '0 18px 60px rgba(0,0,0,.6)',
    overflow: 'hidden'
  });
  const tabs = el('div', '', { display: 'flex', gap: '6px', padding: '10px 12px', borderBottom: '1px solid #59435e', flexWrap: 'wrap', alignItems: 'center' });
  const body = el('div', '', { flex: '1', overflow: 'auto', padding: '14px 16px' });
  panel.append(tabs, body);
  root.append(panel);

  const TABS = [['status', 'ステータス'], ['bag', '持ち物'], ['codex', '図鑑'], ['recollection', '回想部屋'], ['base', '拠点'], ['settings', '設定']];
  function renderTabs() {
    tabs.replaceChildren();
    for (const [id, label] of TABS) {
      const active = id === tab;
      const b = button(label, () => { tab = id; render(); }, { primary: active });
      tabs.append(b);
    }
    tabs.append(el('div', '', { flex: '1' }));
    if (o.inSandbox()) tabs.append(button('回想を終える', () => { close(); o.endRecollection(); }, { color: PINK }));
    tabs.append(button('閉じる（Esc / M）', close));
  }

  function render() {
    renderTabs();
    body.replaceChildren();
    if (tab === 'status') renderStatus();
    else if (tab === 'codex') renderCodex();
    else if (tab === 'recollection') renderRecollection();
    else if (tab === 'bag') renderBag();
    else if (tab === 'base') renderBase();
    else renderSettings();
  }

  // ---- ステータス ----
  function renderStatus() {
    const hs = save.currentRun.hero;
    const cols = el('div', '', { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' });
    body.append(cols);
    const hero = card('主人公');
    const row = rowGrid(hero);
    row('レベル', `Lv${hs.level}`);
    row('HP', `${hs.hp} / ${hs.maxHp}（絶頂のときだけ減る）`);
    row('MP', `${hs.mp} / ${hs.maxMp}`);
    row('経験値', `${hs.exp}`);
    row('階', `${save.currentRun.floor}階`);
    row('所持金', `${save.currentRun.gold} G`, '#ffd36b');
    row('雪辱ポイント', `${p.rp ?? 0}`, '#9fe3ff');
    cols.append(hero);

    const res = card('チャームポイントへの耐性');
    res.append(el('div', 'マイナスほど、その部位の誘惑に弱くなっている（拘束からの脱出・吸われる量に影響）', { fontSize: '12px', color: '#cbbbd0', marginBottom: '8px' }));
    const rrow = rowGrid(res);
    for (const attr of ATTR_ORDER) {
      const v = o.resistanceOf ? o.resistanceOf(attr) : (p.resistances[attr] ?? 0);
      const item = p.equipment.slots[attr];
      const label = item ? `${ATTRS[attr].label}（${item.name}）` : ATTRS[attr].label;
      rrow(label, bar(v, B.resist.floor, 100, v < 0 ? ATTRS[attr].color : '#9fe3ff'));
    }
    cols.append(res);

    const deb = card('永続デバフ');
    const list = collectDebuffs(p, { ...B, debuffPanel: { ...B.debuffPanel, maxRows: 99 } });
    if (!list.length) deb.append(el('div', 'まだ何も刻まれていない', { color: '#cbbbd0' }));
    for (const item of list) {
      deb.append(el('div', `♡ ${item.label}`, { color: `rgba(255, ${Math.round(200 - 140 * item.strength)}, ${Math.round(225 - 90 * item.strength)}, 1)`, fontWeight: 'bold', margin: '2px 0' }));
    }
    deb.append(el('div', '敵ごとの負け癖は「図鑑」で確認できます', { fontSize: '12px', color: '#cbbbd0', marginTop: '8px' }));
    cols.append(deb);

    const rec = card('記録');
    const srow = rowGrid(rec);
    const st = p.stats;
    srow('絶頂した回数', `${st.climaxCount ?? 0} 回`, '#ff9fd0');
    srow('敗北した回数', `${st.defeatCount ?? 0} 回`, PINK);
    srow('誘惑を受け入れた', `${st.acceptCount ?? 0} 回`);
    srow('時間切れで受け入れた', `${st.timeoutCount ?? 0} 回`);
    srow('おねだりを受け入れた', `${st.requestAcceptCount ?? 0} 回`);
    srow('冒険の回数', `${p.runCount} 回`);
    cols.append(rec);
  }

  // ---- 図鑑 ----
  function discovered(id) {
    return showAll || p.codex.entries[id]?.seen === true;
  }

  function renderCodex() {
    const wrap = el('div', '', { display: 'grid', gridTemplateColumns: '240px 1fr', gap: '14px', height: '100%' });
    const list = el('div', '', { overflowY: 'auto', paddingRight: '6px' });
    const detail = el('div', '', { overflowY: 'auto' });
    wrap.append(list, detail);
    body.append(wrap);
    const toggle = el('label', '', { display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px', color: '#cbbbd0', marginBottom: '8px' });
    const cb = el('input');
    cb.type = 'checkbox';
    cb.checked = showAll;
    cb.addEventListener('change', () => { showAll = cb.checked; render(); });
    toggle.append(cb, el('span', '未遭遇も表示（デバッグ）'));
    list.append(toggle);
    for (const e of ENEMIES) {
      const found = discovered(e.id);
      const th = themeOf(e.id);
      const lose = p.debuffs.loseHabit.byRace[e.id] ?? 0;
      const b = el('button', '', {
        display: 'block', width: '100%', textAlign: 'left', padding: '7px 9px', marginBottom: '4px', cursor: 'pointer',
        color: '#fff', borderRadius: '8px', border: `1px solid ${e.id === selected ? th.main : '#4a3d52'}`,
        background: e.id === selected ? `${th.main}44` : '#221b2a'
      });
      b.type = 'button';
      b.append(el('div', found ? e.name : '？？？', { fontWeight: 'bold', fontSize: '13px' }));
      b.append(el('div', found ? `${RANK_NAMES[e.rank]}・${charmAttrsOf(e.id).map((a) => ATTRS[a].label).join('/')}${lose ? `　負け癖${lose}` : ''}` : '未遭遇',
        { fontSize: '11px', color: lose ? PINK : '#bba' }));
      b.addEventListener('click', () => { selected = e.id; render(); });
      list.append(b);
    }
    renderEntry(detail, selected);
  }

  function renderEntry(detail, id) {
    const def = ENEMIES_BY_ID[id];
    const th = themeOf(id);
    if (!discovered(id)) {
      detail.append(el('div', 'まだ出会っていない敵です', { color: '#cbbbd0', padding: '20px' }));
      return;
    }
    const entry = p.codex.entries[id] ?? {};
    const head = el('div', '', { display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap' });
    const art = el('canvas', '', { width: '200px', height: '260px', borderRadius: '12px', background: '#110c16', border: `2px solid ${th.main}` });
    art.width = 200;
    art.height = 260;
    void o.loadPortrait(id).then((img) => {
      if (!img) return;
      const g = art.getContext('2d');
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      const s = Math.max(200 / iw, 260 / ih);
      g.drawImage(img, (200 - iw * s) / 2, 0, iw * s, ih * s);
    }).catch(() => {});
    const info = el('div', '', { flex: '1', minWidth: '260px' });
    info.append(el('div', def.name, { fontSize: '22px', fontWeight: 'bold', color: th.main }));
    info.append(el('div', `${RANK_NAMES[def.rank]}　チャームポイント：${charmAttrsOf(id).map((a) => ATTRS[a].label).join('・')}`, { color: th.glow, marginBottom: '8px' }));
    const row = rowGrid(info);
    const score = getMarkScore(p, id);
    row('出会った回数', `${entry.encounters ?? 0} 回`);
    row('倒した回数', `${entry.kills ?? 0} 回`);
    row('負けた回数', `${entry.defeats ?? 0} 回`, PINK);
    row('種族のレベル上昇', `+${p.enemyLevels?.[id] ?? 0}`, '#ffd27a');
    row('カモ度', `${score}（${MARK_TIER_NAMES[markTier(score, B)]}）`, th.main);
    const lose = p.debuffs.loseHabit.byRace[id] ?? 0;
    const H = B.habit;
    row('負け癖', lose ? `${lose} / ${H.loseMax} 段（吸われる量 +${Math.round(lose * H.loseMpPerStage * 100)}%・攻撃 -${Math.round(Math.min(lose * H.loseAttackPerStage, H.loseAttackCap) * 100)}%）` : 'なし', lose ? PINK : '#fff0f7');
    const condId = Object.keys(CONDITIONS).find((c) => CONDITIONS[c].source === id);
    if (condId) {
      const stage = p.conditioning?.[condId]?.stage ?? 0;
      row('この子の蓄積デバフ', `${CONDITIONS[condId].name}${stage ? `（永続 ${PERMANENT_STAGE_NAMES[stage]}）` : ''}`, stage ? PINK : '#fff0f7');
    }
    for (const text of memoryLines(p, id)) row('この子が覚えていること', text, PINK);
    head.append(art, info);
    detail.append(head);

    // 技
    const skills = card('技');
    const all = [
      [def.normalSkill, '通常'], ...def.bindSkills.map((s) => [s, '拘束']), ...def.skills.map((s) => [s, '特殊']), [def.advancedSkill, '上位']
    ].filter(([s]) => s);
    const table = el('div', '', { display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: '4px 12px', fontSize: '13px', alignItems: 'center' });
    for (const [sid, kind] of all) {
      const seen = showAll || (entry.seenSkills ?? []).includes(sid) || kind === '通常';
      const evo = p.skillEvolution?.[id]?.[sid];
      const evolved = isEvolved(p, id, sid);
      const learned = kind === '上位' && hasLearned(p, id, sid);
      const lost = entry.defeatsBySkill?.[sid] ?? 0;
      table.append(el('span', kind, { color: '#bba' }));
      // 技名は、まだ受けていない・進化していない技も表示する（進化すると「・改」）
      const name = el('span', `${skillName(sid)}${evolved ? '・改' : ''}`, { fontWeight: 'bold', color: evolved ? PINK : seen ? '#fff' : '#bfb0c6' });
      table.append(name);
      const attr = SKILL_DEFS[sid]?.attr;
      table.append(el('span', attr ? ATTRS[attr]?.label ?? '' : '', { color: attr ? ATTRS[attr]?.color : '#fff' }));
      const status = [];
      if (kind === '上位') status.push(learned ? '習得済み' : '未習得');
      if (!seen) status.push('まだ受けていない');
      if (evolved) status.push('進化済み');
      else if (kind !== '上位' && SKILL_DEFS[sid]?.evolve) status.push('未進化');
      if (lost) status.push(`この技で ${lost} 回負けた`);
      table.append(el('span', status.join('・'), { color: lost ? PINK : '#cbbbd0', fontSize: '12px' }));
      const cond = el('div', '', { gridColumn: '2 / -1', fontSize: '12px', color: evolved || learned ? '#ffb9dc' : '#9fe3ff', marginBottom: '6px', lineHeight: '1.5' });
      for (const line of evolveConditionLines(p, B, id, sid, kind)) cond.append(el('div', `└ ${line}`));
      if (evolved) cond.append(el('div', `└ 進化後：「${skillName(sid)}・改」（吸う量 ×${B.skillEvolution.powerMul}）`, { color: PINK }));
      table.append(cond);
    }
    skills.append(table);
    detail.append(skills);

    // 絆
    const bonds = Object.entries(p.pairBonds ?? {}).filter(([key]) => key.split('|').includes(id));
    const bondCard = card('絆（チャームポイントのこすり合わせ）');
    if (!bonds.length) bondCard.append(el('div', 'まだ誰とも絆を結んでいない', { color: '#cbbbd0', fontSize: '13px' }));
    for (const [key, rec] of bonds) {
      const other = key.split('|').find((x) => x !== id) ?? id;
      const name = ENEMIES_BY_ID[other]?.name ?? other;
      bondCard.append(el('div', `♥ ${name}と ${rec.completed} 回　ユナイト「${uniteNameOf(rubAttrsOf(id, other))}」`, { color: themeOf(other).main, fontWeight: 'bold', fontSize: '13px' }));
    }
    detail.append(bondCard);

    // デバッグ（図鑑の操作でそのまま調整できる）
    const dbg = card('デバッグ');
    const line = el('div', '', { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' });
    const msg = el('div', '', { color: PINK, fontSize: '12px', marginTop: '6px', minHeight: '1em' });
    const after = (text) => { o.onSettings(); render(); setTimeout(() => { const m = body.querySelector('[data-msg]'); if (m) m.textContent = text; }, 0); };
    msg.dataset.msg = '1';
    line.append(
      button('負け癖 −', () => { p.debuffs.loseHabit.byRace[id] = Math.max(0, lose - 1); after('負け癖を下げた'); }, { small: true }),
      button('負け癖 ＋', () => { p.debuffs.loseHabit.byRace[id] = Math.min(H.loseMax, lose + 1); after('負け癖を上げた'); }, { small: true }),
      button('種族Lv −', () => { p.enemyLevels[id] = Math.max(0, (p.enemyLevels[id] ?? 0) - 1); after('種族のレベルを下げた'); }, { small: true }),
      button('種族Lv ＋', () => { p.enemyLevels[id] = (p.enemyLevels[id] ?? 0) + 1; after('種族のレベルを上げた'); }, { small: true }),
      button('全技を進化', () => { for (const [sid] of all) evoState(p, id, sid).evolved = true; after('すべての技を進化させた'); }, { small: true }),
      button('進化を戻す', () => { for (const [sid] of all) evoState(p, id, sid).evolved = false; after('進化を戻した'); }, { small: true }),
      button('上位技を習得', () => {
        p.learnedSkills[id] ??= [];
        if (def.advancedSkill && !p.learnedSkills[id].includes(def.advancedSkill)) p.learnedSkills[id].push(def.advancedSkill);
        after('上位技を習得させた');
      }, { small: true })
    );
    if (condId) {
      const stage = p.conditioning?.[condId]?.stage ?? 0;
      line.append(button('蓄積の永続段階 ＋', () => {
        p.conditioning ??= {};
        const st = (p.conditioning[condId] ??= { stage: 0, onsetKeys: [], recovery: 0 });
        st.stage = Math.min(B.conditioning.maxStage, stage + 1);
        after('永続段階を上げた');
      }, { small: true }), button('蓄積の永続段階 −', () => {
        const st = p.conditioning?.[condId];
        if (st) st.stage = Math.max(0, st.stage - 1);
        after('永続段階を下げた');
      }, { small: true }));
    }
    dbg.append(line, msg);
    detail.append(dbg);
  }

  // ---- 回想部屋 ----
  const arenaSpec = { enemies: [{ speciesId: 'kitten', level: 5 }, { speciesId: 'mikuGirl', level: 5 }], priest: false, preBond: false, startBond: false };
  function renderRecollection() {
    if (o.inSandbox()) {
      const now = card('回想中');
      now.append(el('div', '模擬戦の最中です。終わると、始める前の状態に戻ります。', { color: '#ffe3f2' }));
      now.append(button('回想を終える', () => { close(); o.endRecollection(); }, { primary: true }));
      body.append(now);
    }
    // 負けた技の回想
    const memo = card('敗北の回想（負けた技を、もう一度受ける）');
    memo.append(el('div', '結果は保存されません。何度でも、あの瞬間に戻れます。', { fontSize: '12px', color: '#cbbbd0', marginBottom: '8px' }));
    let any = false;
    for (const e of ENEMIES) {
      const entry = p.codex.entries[e.id];
      for (const [sid, n] of Object.entries(entry?.defeatsBySkill ?? {})) {
        any = true;
        const th = themeOf(e.id);
        const r = el('div', '', { display: 'flex', gap: '10px', alignItems: 'center', margin: '4px 0' });
        r.append(el('span', `${e.name}「${skillName(sid)}」`, { color: th.main, fontWeight: 'bold', flex: '1' }), el('span', `${n} 回`, { color: PINK }));
        r.append(button('回想する', () => start({ enemies: [{ speciesId: e.id, level: Math.max(1, save.currentRun.hero.level) }], replaySkill: sid }), { small: true, color: th.main }));
        memo.append(r);
      }
    }
    if (!any) memo.append(el('div', 'まだ、負けた記憶はない', { color: '#cbbbd0' }));
    body.append(memo);

    // 模擬戦
    const arena = card('模擬戦（敵を選んで戦う）');
    arena.append(el('div', 'ひと部屋だけのアリーナで戦います。左上の階段で終了。結果は保存されません。', { fontSize: '12px', color: '#cbbbd0', marginBottom: '8px' }));
    arenaSpec.enemies.forEach((slot, i) => {
      const r = el('div', '', { display: 'flex', gap: '8px', alignItems: 'center', margin: '4px 0' });
      const sel = el('select', '', { padding: '6px', flex: '1' });
      for (const e of ENEMIES) {
        const opt = el('option', e.name);
        opt.value = e.id;
        sel.append(opt);
      }
      sel.value = slot.speciesId;
      sel.addEventListener('change', () => { slot.speciesId = sel.value; });
      const lv = el('input', '', { width: '64px', padding: '6px' });
      lv.type = 'number';
      lv.min = '1';
      lv.max = String(B.battle.heroLevelMax);
      lv.value = String(slot.level);
      lv.addEventListener('change', () => { slot.level = Math.max(1, Math.min(B.battle.heroLevelMax, Math.round(Number(lv.value) || 1))); });
      r.append(el('span', `${i + 1}`, { width: '18px', color: '#bba' }), sel, el('span', 'Lv'), lv);
      r.append(button('×', () => { arenaSpec.enemies.splice(i, 1); render(); }, { small: true }));
      arena.append(r);
    });
    const ops = el('div', '', { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', margin: '8px 0' });
    if (arenaSpec.enemies.length < 6) ops.append(button('敵を追加', () => { arenaSpec.enemies.push({ speciesId: ENEMIES[arenaSpec.enemies.length % ENEMIES.length].id, level: 5 }); render(); }, { small: true }));
    const check = (label, key) => {
      const l = el('label', '', { display: 'flex', gap: '4px', alignItems: 'center', fontSize: '13px' });
      const c = el('input');
      c.type = 'checkbox';
      c.checked = arenaSpec[key];
      c.addEventListener('change', () => { arenaSpec[key] = c.checked; });
      l.append(c, el('span', label));
      ops.append(l);
    };
    check('僧侶を同行', 'priest');
    check('二人ずつ絆を結んだ状態で始める（ユナイト攻撃の確認）', 'preBond');
    check('すぐにこすり合わせを始める', 'startBond');
    arena.append(ops);
    arena.append(button('模擬戦を始める', () => start({ ...arenaSpec, enemies: arenaSpec.enemies.map((x) => ({ ...x })) }), { primary: true }));
    body.append(arena);

    // デバッグ操作
    const dbg = card('デバッグ操作');
    const raceSel = el('select', '', { padding: '6px', marginBottom: '8px' });
    for (const e of ENEMIES) {
      const opt = el('option', e.name);
      opt.value = e.id;
      raceSel.append(opt);
    }
    const msg = el('div', '', { color: PINK, fontSize: '13px', minHeight: '1.2em', marginTop: '6px' });
    dbg.append(el('div', '対象の敵（敵を選ぶ操作のみ）', { fontSize: '12px', color: '#cbbbd0' }), raceSel);
    const grid = el('div', '', { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '6px' });
    for (const action of DEBUG_ACTIONS) {
      const r = el('div', '', { display: 'flex', gap: '6px', alignItems: 'center' });
      let input = null;
      if (action.input) {
        input = el('input', '', { width: '70px', padding: '5px' });
        input.type = 'number';
        input.value = String(action.input.def(B));
        r.append(input);
      }
      r.append(button(action.label, () => {
        const res = o.runDebug(action.id, { value: input?.value ?? null, raceId: raceSel.value });
        msg.textContent = res.message;
      }, { small: true }));
      grid.append(r);
    }
    dbg.append(grid, msg);
    if (o.openDebugSettings) dbg.append(el('div', '', { height: '8px' }), button('デバッグ設定（レベル・同行者・出現頻度）', () => o.openDebugSettings(), { small: true }));
    body.append(dbg);
  }

  function start(spec) {
    close();
    o.startRecollection(spec);
  }

  // ---- 持ち物（アイテム・装備）----
  function renderBag() {
    const msg = el('div', '', { color: PINK, minHeight: '1.2em', marginBottom: '6px', fontWeight: 'bold' });
    body.append(msg);
    const items = card('アイテム');
    for (const [id, it] of Object.entries(ITEMS)) {
      const n = p.consumables[id] ?? 0;
      const r = el('div', '', { display: 'flex', gap: '10px', alignItems: 'center', margin: '4px 0' });
      const info = el('div', '', { flex: '1' });
      info.append(el('div', `${it.name} × ${n}`, { fontWeight: 'bold', color: n ? '#fff' : '#887' }), el('div', it.desc, { fontSize: '12px', color: '#cbbbd0' }));
      r.append(info);
      if (!it.passive) {
        const ok = n > 0 && o.canUseItem?.(id);
        r.append(button('使う（1ターン）', () => {
          const res = o.useItem(id);
          if (res.ok) close();
          else msg.textContent = res.message;
        }, { small: true, primary: ok }));
      } else {
        r.append(el('span', '持っているだけで効く', { fontSize: '12px', color: '#9fe3ff' }));
      }
      items.append(r);
    }
    body.append(items);

    const eq = card('装備（部位ごと）');
    eq.append(el('div', '装備は拘束されるたびに、その部位を責める子に溶かされていく。敵からの贈り物（呪いの装備）は、自分では外せない。',
      { fontSize: '12px', color: '#cbbbd0', marginBottom: '8px' }));
    const G = B.gifts;
    for (const slot of SLOTS) {
      const it = p.equipment.slots[slot];
      const r = el('div', '', { display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: '10px', alignItems: 'center', margin: '5px 0' });
      r.append(el('div', SLOT_NAMES[slot], { fontWeight: 'bold', color: ATTRS[slot].color, fontSize: '16px', textAlign: 'center' }));
      const info = el('div');
      if (!it) {
        info.append(el('div', 'なし', { color: '#887' }));
      } else if (it.kind === 'gift') {
        const lv = it.level;
        info.append(el('div', `♥ ${it.name}（${lv}段）`, { fontWeight: 'bold', color: themeOf(it.raceId).main }));
        info.append(el('div', `恩恵：倒した敵の経験値 +${Math.round(G.expBonusPerLevel * lv * 100)}%・拾うお金 +${Math.round(G.goldBonusPerLevel * lv * 100)}%`,
          { fontSize: '12px', color: '#9fe3ff' }));
        info.append(el('div', `呪い：${ENEMIES_BY_ID[it.raceId]?.name}に吸われる量 +${Math.round(G.drainPerLevel * lv * 100)}%・拘束から抜けにくい・${SLOT_NAMES[slot]}の耐性 -${G.resistDownPerLevel * lv}・匂いをたどって追ってくる・ときどき疼いて負け癖が進む`,
          { fontSize: '12px', color: PINK }));
      } else {
        info.append(el('div', `${it.name}　${SLOT_NAMES[slot]}耐性 +${it.resist}　耐久 ${it.dur}/${it.maxDur}`, { fontWeight: 'bold' }));
        info.append(bar(it.dur, 0, it.maxDur, '#9fe3ff'));
      }
      r.append(info);
      if (it?.kind === 'gear') {
        r.append(button('外す', () => {
          msg.textContent = o.unequip(slot).message;
          o.onSettings();
          render();
        }, { small: true }));
      } else {
        r.append(el('span'));
      }
      eq.append(r);
    }
    if (p.equipment.bag.length) {
      eq.append(el('div', '袋の中', { color: '#ffb9dc', fontWeight: 'bold', marginTop: '8px' }));
      p.equipment.bag.forEach((it, i) => {
        const r = el('div', '', { display: 'flex', gap: '10px', alignItems: 'center', margin: '3px 0' });
        const dur = it.kind === 'gear' ? `・耐久 ${it.dur}/${it.maxDur}` : '';
        r.append(el('span', `${it.name}（${SLOT_NAMES[it.slot]}${dur}）`, { flex: '1' }));
        if (it.kind === 'gear') {
          r.append(button('装備する', () => {
            msg.textContent = o.equipFromBag(i).message;
            o.onSettings();
            render();
          }, { small: true }));
        }
        eq.append(r);
      });
    }
    body.append(eq);

    // デバッグ：所持金・アイテム・装備を自由に変更（開いたまま操作できるよう、折りたたみ）
    const dbg = card('');
    const det = el('details');
    det.open = debugBagOpen;
    det.addEventListener('toggle', () => { debugBagOpen = det.open; });
    det.append(el('summary', 'デバッグ：所持金・アイテム・装備を変更する', { cursor: 'pointer', color: '#ffb9dc', fontWeight: 'bold' }));
    det.append(buildInventoryDebug(save, B, () => {
      o.onSettings();
      const top = body.scrollTop;
      render();
      body.scrollTop = top;
    }));
    dbg.append(det);
    body.append(dbg);
  }

  // ---- 拠点（雪辱ポイントで、次の冒険を少しだけ楽にする）----
  function renderBase() {
    const top = card('拠点');
    top.append(el('div', `雪辱ポイント：${p.rp ?? 0}`, { fontSize: '20px', fontWeight: 'bold', color: '#9fe3ff' }));
    top.append(el('div', '敗北・ダンジョンクリアでもらえる。最大MP・所持金・お守りは次の冒険から、耐性と値引きはすぐに効く。',
      { fontSize: '12px', color: '#cbbbd0', marginTop: '4px' }));
    body.append(top);
    const list = card('強化');
    const msg = el('div', '', { color: PINK, minHeight: '1.2em' });
    for (const [id, up] of Object.entries(BASE_UPGRADES)) {
      const lv = p.baseUpgrades[id] ?? 0;
      const maxed = lv >= up.max;
      const cost = up.cost(lv);
      const r = el('div', '', { display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '10px', alignItems: 'center', margin: '6px 0' });
      const info = el('div');
      info.append(el('div', `${up.name}　${'♥'.repeat(lv)}${'♡'.repeat(up.max - lv)}`, { fontWeight: 'bold' }),
        el('div', up.desc, { fontSize: '12px', color: '#cbbbd0' }));
      r.append(info, el('span', maxed ? '最大' : `${cost} pt`, { color: '#9fe3ff', fontWeight: 'bold' }));
      r.append(button('強化', () => {
        if (maxed || (p.rp ?? 0) < cost) {
          msg.textContent = maxed ? 'これ以上は強化できない' : '雪辱ポイントが足りない';
          return;
        }
        p.rp -= cost;
        p.baseUpgrades[id] = lv + 1;
        o.onSettings();
        render();
      }, { small: true, primary: !maxed && (p.rp ?? 0) >= cost }));
      list.append(r);
    }
    list.append(msg);
    body.append(list);
    const links = card('ほかの施設');
    links.append(el('div', '図鑑・回想部屋（模擬戦）は、上のタブから。', { color: '#ffe3f2' }));
    body.append(links);
  }

  // ---- 設定 ----
  function renderSettings() {
    const s = save.settings;
    const sound = card('音量');
    const row = rowGrid(sound);
    for (const [key, label] of [['master', '全体'], ['bgm', 'BGM'], ['se', '効果音']]) {
      const wrap = el('div', '', { display: 'grid', gridTemplateColumns: '1fr 48px auto', gap: '8px', alignItems: 'center' });
      const r = el('input', '', { width: '100%' });
      r.type = 'range';
      r.min = '0';
      r.max = '1';
      r.step = '0.05';
      r.value = String(s.volume[key] ?? 1);
      const out = el('span', `${Math.round((s.volume[key] ?? 1) * 100)}%`, { textAlign: 'right' });
      r.addEventListener('input', () => {
        s.volume[key] = Number(r.value);
        out.textContent = `${Math.round(s.volume[key] * 100)}%`;
        o.onVolume(s.volume);
      });
      r.addEventListener('change', () => {
        o.onSettings();
        if (key !== 'bgm') o.onTestSe?.();
      });
      wrap.append(r, out, key === 'bgm' ? el('span') : button('試聴', () => o.onTestSe?.(), { small: true }));
      row(label, wrap);
    }
    body.append(sound);

    const fx = card('演出');
    const frow = rowGrid(fx);
    const sel = el('select', '', { padding: '6px' });
    for (const [v, l] of [['full', 'すべて'], ['reduced', '控えめ'], ['off', 'なし']]) {
      const opt = el('option', l);
      opt.value = v;
      sel.append(opt);
    }
    sel.value = s.flashback;
    sel.addEventListener('change', () => { s.flashback = sel.value; o.onSettings(); });
    frow('フラッシュバック', sel);
    for (const [key, label] of [['screenShake', '画面の揺れ'], ['kissMarks', 'キスマーク'], ['spatialAudio', '立体音響'], ['showMinimap', 'ミニマップ'], ['lowMpHeartbeat', 'MPが少ないときの鼓動']]) {
      const c = el('input');
      c.type = 'checkbox';
      c.checked = s[key] !== false;
      c.addEventListener('change', () => { s[key] = c.checked; o.onSettings(); });
      frow(label, c);
    }
    body.append(fx);
  }

  function onKey(ev) {
    ev.stopPropagation();
    if (ev.key === 'Escape' || ev.code === 'KeyM' || ev.code === 'KeyI') {
      if (ev.target?.tagName === 'INPUT' && ev.key !== 'Escape') return;
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
    o.onClose?.();
  }

  render();
  document.body.append(root);
  return { close, isOpen: () => !closed };
}
