// File: src/core/storage.js
import { saveSchema, SAVE_VERSION, createDefaultSave } from '../data/saveSchema.js';
import { ENEMIES } from '../data/enemies.js';
import { RACE_ABILITIES, isAbilityAvailable } from '../data/raceAbilities.js';

const SAVE_KEY = 'dungeonGame.save';
const BROKEN_KEY = 'dungeonGame.save.broken';
const CHARM_POINTS_KEY = 'dungeonGame.charmPoints.v1';
const DEBOUNCE_MS = 500;

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function migrateRaceAbilities(data) {
  const old = data.persistent?.raceAbilities;
  if (!isPlainObject(old)) return;
  const isOldShape = Object.values(old).some((value) =>
    isPlainObject(value) && typeof value.level === 'number'
  );
  if (!isOldShape) return;

  const next = {};
  for (const enemy of ENEMIES) {
    next[enemy.id] = {};
    for (const ability of RACE_ABILITIES) {
      const previous = old[ability.id];
      if (previous && isAbilityAvailable(ability, enemy)) {
        next[enemy.id][ability.id] = {
          level: previous.level ?? 0,
          progress: previous.progress ?? 0
        };
      }
    }
  }
  data.persistent.raceAbilities = next;
}

// 保存データの上に、足りない初期値だけを補う。
// 保存側にしかないキー（辞書型の中身など）は、そのまま残す。
export function deepMerge(defaults, saved) {
  if (Array.isArray(defaults)) {
    return Array.isArray(saved) ? saved : structuredClone(defaults);
  }
  if (isPlainObject(defaults)) {
    if (!isPlainObject(saved)) return structuredClone(defaults);
    const out = {};
    for (const key of Object.keys(defaults)) {
      out[key] = deepMerge(defaults[key], saved[key]);
    }
    for (const key of Object.keys(saved)) {
      if (!(key in out)) out[key] = saved[key];
    }
    return out;
  }
  if (saved === undefined) return defaults;
  if (defaults !== null && typeof saved !== typeof defaults) return defaults;
  return saved;
}

// 将来のバージョン変換はここに足す
export function migrate(data) {
  if (!isPlainObject(data)) throw new Error('セーブデータの形式が不正です');
  if (typeof data.version === 'number' && data.version > SAVE_VERSION) {
    throw new Error('新しい版のセーブデータです。ゲームを更新してください');
  }
  const previousVersion = data.version ?? 0;
  if (previousVersion < 8) migrateRaceAbilities(data);
  if (previousVersion < 9 && isPlainObject(data.currentRun?.hero)) {
    const hero = data.currentRun.hero;
    const bonus = 140;
    hero.maxMp = (typeof hero.maxMp === 'number' ? hero.maxMp : 160) + bonus;
    hero.mp = Math.min(hero.maxMp, (typeof hero.mp === 'number' ? hero.mp : 160) + bonus);
  }
  if (previousVersion < 11 && data.currentRun?.hero?.level === 1) {
    data.currentRun.hero.level = 20;
  }
  data.version = SAVE_VERSION;
  return data;
}

function storedCharmPoints() {
  try {
    const raw = localStorage.getItem(CHARM_POINTS_KEY);
    if (raw === null) return null;
    const points = JSON.parse(raw);
    return isPlainObject(points) ? points : null;
  } catch {
    return null;
  }
}

function charmPointsFromBackup() {
  try {
    const raw = localStorage.getItem(BROKEN_KEY);
    const data = raw ? JSON.parse(raw) : null;
    return isPlainObject(data?.persistent?.charmPoints) ? data.persistent.charmPoints : null;
  } catch {
    return null;
  }
}

export function saveCharmPointsNow(charmPoints) {
  try {
    localStorage.setItem(CHARM_POINTS_KEY, JSON.stringify(charmPoints ?? {}));
    return true;
  } catch (error) {
    console.error('チャームポイント設定の保存に失敗しました', error);
    return false;
  }
}

function restoreCharmPoints(save) {
  const standalone = storedCharmPoints();
  if (standalone !== null) {
    save.persistent.charmPoints = standalone;
    return;
  }
  const inSave = save.persistent.charmPoints;
  const recovered = Object.keys(inSave).length ? inSave : charmPointsFromBackup() ?? {};
  save.persistent.charmPoints = recovered;
  saveCharmPointsNow(recovered);
}

export function loadSave() {
  let raw = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch (error) {
    console.warn('保存領域を読めません。保存なしで開始します', error);
    return createDefaultSave();
  }
  if (!raw) {
    const save = createDefaultSave();
    restoreCharmPoints(save);
    return save;
  }

  try {
    const parsed = JSON.parse(raw);
    const previousVersion = parsed.version ?? 0;
    const migrated = migrate(parsed);
    const save = deepMerge(saveSchema, migrated);
    restoreCharmPoints(save);
    if (previousVersion < SAVE_VERSION) saveNow(save);
    return save;
  } catch (error) {
    console.error('セーブデータを読めなかったため、退避して新規で開始します', error);
    try {
      localStorage.setItem(BROKEN_KEY, raw);
    } catch (backupError) {
      console.error('退避にも失敗しました', backupError);
    }
    const save = createDefaultSave();
    restoreCharmPoints(save);
    return save;
  }
}

export function saveNow(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch (error) {
    console.error('セーブに失敗しました（容量不足の可能性）', error);
    return false;
  }
}

let timerId = null;

// 変更のたびに呼んでよい。最後の変更から 0.5 秒後に保存する
export function scheduleSave(save) {
  if (timerId !== null) clearTimeout(timerId);
  timerId = setTimeout(() => {
    timerId = null;
    saveNow(save);
  }, DEBOUNCE_MS);
}

export function flushSave(save) {
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
  return saveNow(save);
}

// 新しいランの開始時に呼ぶ
export function resetRun(save) {
  save.currentRun = structuredClone(saveSchema.currentRun);
}

// バックアップ用
export function exportSaveText(save) {
  return JSON.stringify(save, null, 2);
}

export function importSaveText(text) {
  return deepMerge(saveSchema, migrate(JSON.parse(text)));
}
