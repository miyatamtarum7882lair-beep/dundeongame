import { ENEMIES } from '../data/enemies.js';
import { saveSchema } from '../data/saveSchema.js';

const make = (tag, text = '') => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
};

function ensureDebugOptions(run) {
  run.debugOptions ??= {};
  run.debugOptions.priestCompanion ??= true;
  run.debugOptions.enemySpawnWeights ??= {};
  return run.debugOptions;
}

function repairHeroStats(hero, levelMax) {
  const defaults = saveSchema.currentRun.hero;
  const integer = (value, fallback) => Number.isFinite(value) ? Math.round(value) : fallback;
  hero.level = Math.max(1, Math.min(levelMax, integer(hero.level, defaults.level)));
  hero.maxHp = Math.max(1, Math.min(99999, integer(hero.maxHp, defaults.maxHp)));
  hero.maxMp = Math.max(0, Math.min(99999, integer(hero.maxMp, defaults.maxMp)));
  hero.hp = Math.max(0, Math.min(hero.maxHp, integer(hero.hp, defaults.hp)));
  hero.mp = Math.max(0, Math.min(hero.maxMp, integer(hero.mp, defaults.mp)));
}

function addRow(parent, labelText, control) {
  const row = make('label');
  Object.assign(row.style, {
    display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) minmax(150px, 1.2fr)',
    gap: '12px', alignItems: 'center', padding: '7px 0', color: '#f5eafa'
  });
  row.append(make('span', labelText), control);
  parent.append(row);
}

function numberControl(value, min, max, onChange) {
  const input = make('input');
  input.type = 'number';
  input.min = String(min);
  input.max = String(max);
  input.step = '1';
  input.value = String(value);
  Object.assign(input.style, { width: '100%', boxSizing: 'border-box', padding: '7px' });
  input.addEventListener('change', () => {
    const next = Math.max(min, Math.min(max, Math.round(Number(input.value) || 0)));
    input.value = String(next);
    onChange(next);
  });
  return input;
}

function rangeControl(value, min, max, onChange) {
  const wrap = make('div');
  Object.assign(wrap.style, { display: 'grid', gridTemplateColumns: '1fr 48px', gap: '8px', alignItems: 'center' });
  const input = make('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = '10';
  input.value = String(value);
  const output = make('span', `${value}%`);
  output.style.textAlign = 'right';
  input.addEventListener('input', () => {
    output.textContent = `${input.value}%`;
    onChange(Number(input.value));
  });
  wrap.append(input, output);
  return wrap;
}

function section(parent, title) {
  const block = make('section');
  Object.assign(block.style, { borderTop: '1px solid #59435e', paddingTop: '12px', marginTop: '12px' });
  const heading = make('h3', title);
  Object.assign(heading.style, { margin: '0 0 7px', fontSize: '16px', color: '#ffb9dc' });
  block.append(heading);
  parent.append(block);
  return block;
}

/** Build a title-screen debug editor. Changes are written into the active save immediately. */
export function openTitleDebugPanel({ save, B, onClose }) {
  const run = save.currentRun;
  const options = ensureDebugOptions(run);
  repairHeroStats(run.hero, B.debug.heroLevelMax);
  const overlay = make('div');
  Object.assign(overlay.style, {
    position: 'absolute', inset: '0', display: 'grid', placeItems: 'center', padding: '16px',
    boxSizing: 'border-box', background: 'rgba(4, 3, 8, .86)', zIndex: '2'
  });
  const panel = make('section');
  Object.assign(panel.style, {
    width: 'min(680px, 100%)', maxHeight: 'min(88vh, 850px)', overflowY: 'auto',
    padding: '22px', boxSizing: 'border-box', borderRadius: '12px', color: '#fff',
    background: '#17111f', border: '1px solid #9d668d', textAlign: 'left'
  });
  const heading = make('h2', 'デバッグ設定');
  Object.assign(heading.style, { margin: '0 0 4px', textAlign: 'center' });
  const note = make('p', '設定はこのセーブデータに保存され、冒険開始時に反映されます。');
  Object.assign(note.style, { margin: '0 0 12px', color: '#cbbbd0', fontSize: '13px', textAlign: 'center' });
  panel.append(heading, note);

  const party = section(panel, '同行者');
  const priest = make('input');
  priest.type = 'checkbox';
  priest.checked = options.priestCompanion !== false;
  priest.addEventListener('change', () => { options.priestCompanion = priest.checked; });
  addRow(party, '僧侶を同行させる', priest);

  const hero = section(panel, '主人公');
  const baseLevel = run.hero.level;
  const baseMaxHp = run.hero.maxHp;
  const baseMaxMp = run.hero.maxMp;
  let maxHpBonus = 0;
  let maxMpBonus = 0;
  const statOutputs = {};
  const setLevel = (level) => {
    const state = run.hero;
    level = Math.max(1, Math.min(B.debug.heroLevelMax, Math.round(level)));
    const hpRatio = state.maxHp > 0 ? state.hp / state.maxHp : 1;
    const mpRatio = state.maxMp > 0 ? state.mp / state.maxMp : 1;
    const delta = level - baseLevel;
    state.level = level;
    state.exp = 0;
    state.maxHp = Math.min(99999, Math.max(1, baseMaxHp + delta * B.battle.levelUp.hp + maxHpBonus));
    state.maxMp = Math.min(99999, Math.max(0, baseMaxMp + delta * B.battle.levelUp.mp + maxMpBonus));
    state.hp = Math.max(1, Math.min(state.maxHp, Math.round(state.maxHp * hpRatio)));
    state.mp = Math.max(0, Math.min(state.maxMp, Math.round(state.maxMp * mpRatio)));
    if (statOutputs.maxHp) statOutputs.maxHp.textContent = String(state.maxHp);
    if (statOutputs.maxMp) statOutputs.maxMp.textContent = String(state.maxMp);
  };
  const levelInput = numberControl(run.hero.level, 1, B.debug.heroLevelMax, setLevel);
  const levelControls = make('div');
  Object.assign(levelControls.style, { display: 'grid', gridTemplateColumns: '38px 1fr 38px', gap: '6px' });
  for (const [label, delta] of [['−', -1], ['+', 1]]) {
    const button = make('button', label);
    button.type = 'button';
    button.addEventListener('click', () => {
      const next = Math.max(1, Math.min(B.debug.heroLevelMax, run.hero.level + delta));
      levelInput.value = String(next);
      setLevel(next);
    });
    levelControls.append(button);
    if (delta < 0) levelControls.append(levelInput);
  }
  addRow(hero, 'レベル（− / ＋で増減）', levelControls);

  const makeMaxStatButtons = (field, step, lowerBound, setBonus) => {
    const controls = make('div');
    const value = make('span', String(run.hero[field]));
    statOutputs[field] = value;
    Object.assign(controls.style, { display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '6px', alignItems: 'center' });
    for (const [label, delta] of [[`−${step}`, -step], [`＋${step}`, step]]) {
      const button = make('button', label);
      button.type = 'button';
      button.addEventListener('click', () => {
        const next = Math.max(lowerBound, Math.min(99999, run.hero[field] + delta));
        setBonus(next - run.hero[field]);
        setLevel(run.hero.level);
        value.textContent = String(run.hero[field]);
      });
      controls.append(button);
    }
    controls.append(value);
    return controls;
  };
  addRow(hero, '最大HP', makeMaxStatButtons('maxHp', 10, 1, (delta) => { maxHpBonus += delta; }));
  addRow(hero, '最大MP', makeMaxStatButtons('maxMp', 10, 0, (delta) => { maxMpBonus += delta; }));

  const habits = section(panel, '永続デバフ');
  const d = save.persistent.debuffs;
  addRow(habits, '転倒癖', numberControl(d.fallHabit.stage, 0, B.habit.fallMax, (n) => { d.fallHabit.stage = n; }));
  addRow(habits, '接触癖', numberControl(d.touchHabit.stage, 0, B.habit.touchMax, (n) => {
    d.touchHabit.stage = n;
    d.touchHabit.count = n * B.habit.touchPerStage;
  }));
  addRow(habits, '懇願癖', numberControl(d.beggingHabit.stage, 0, B.habit.beggingMax, (n) => { d.beggingHabit.stage = n; }));
  addRow(habits, '僧侶狙いの癖', numberControl(d.allyTarget.priest, 0, B.habit.allyTargetMax, (n) => { d.allyTarget.priest = n; }));
  addRow(habits, '魔法使い狙いの癖', numberControl(d.allyTarget.mage, 0, B.habit.allyTargetMax, (n) => { d.allyTarget.mage = n; }));
  for (const [attr, label] of [['mouth', '口'], ['bust', '胸'], ['hip', '尻'], ['foot', '足']]) {
    addRow(habits, `${label}の耐性`, numberControl(save.persistent.resistances[attr], B.resist.floor, 100, (n) => {
      save.persistent.resistances[attr] = n;
    }));
  }

  const defeat = section(panel, '負け癖（敵ごと）');
  const selector = make('select');
  Object.assign(selector.style, { width: '100%', padding: '7px' });
  for (const enemy of ENEMIES) {
    const option = make('option', enemy.name);
    option.value = enemy.id;
    selector.append(option);
  }
  const loseInput = numberControl(0, 0, B.habit.loseMax, () => {});
  const syncLose = () => {
    const stage = d.loseHabit.byRace[selector.value] ?? 0;
    loseInput.value = String(stage);
  };
  selector.addEventListener('change', syncLose);
  loseInput.addEventListener('change', () => {
    const stage = Math.max(0, Math.min(B.habit.loseMax, Math.round(Number(loseInput.value) || 0)));
    d.loseHabit.byRace[selector.value] = stage;
    loseInput.value = String(stage);
  });
  addRow(defeat, '対象の敵', selector);
  addRow(defeat, '負け癖の段階', loseInput);
  syncLose();

  const frequency = section(panel, '敵ごとの出現頻度');
  const description = make('p', '未調整の敵は階層別の標準頻度です。調整するとその階でも指定値で出現し、0%で停止します。');
  Object.assign(description.style, { margin: '0 0 6px', color: '#cbbbd0', fontSize: '13px' });
  frequency.append(description);
  for (const enemyId of B.dungeon.enemySpecies) {
    const enemy = ENEMIES.find((entry) => entry.id === enemyId);
    if (!enemy) continue;
    const rankWeights = B.dungeon.enemyRankWeightByFloor[Math.min(Math.max(1, run.floor), B.dungeon.floorsPerDungeon)];
    const defaultWeight = rankWeights[enemy.rank] ?? 0;
    const weight = Math.round((options.enemySpawnWeights[enemyId] ?? defaultWeight) * 100);
    addRow(frequency, enemy.name, rangeControl(weight, 0, 300, (percent) => {
      options.enemySpawnWeights[enemyId] = percent / 100;
    }));
  }

  const footer = make('div');
  Object.assign(footer.style, { display: 'flex', gap: '10px', marginTop: '18px' });
  const back = make('button', '保存して戻る');
  back.type = 'button';
  Object.assign(back.style, {
    flex: '1', padding: '11px', cursor: 'pointer', color: '#fff', background: '#713d76',
    border: '1px solid #d88db8', borderRadius: '7px', font: `600 15px ${B.ui.fontFamily}`
  });
  back.addEventListener('click', onClose);
  footer.append(back);
  panel.append(footer);
  overlay.append(panel);
  return overlay;
}
