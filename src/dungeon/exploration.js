// File: src/dungeon/exploration.js
// 探索（TURN モード）の進行役。移動、ターン進行、戦闘への橋渡し、階の切り替えを受け持つ。画面には依存しない。
// 発行するイベント: floorStart / stairs / encounter / stunned / nothing / dungeonClear / turn / unitStep（足音）
//                   reinforce（敵が増えた） / lured（拘束の声を聞きつけて敵が来る）
//                   hallOmen（大広間の霧に気づいた） / ambush（大広間で待ち伏せされた）
import { Emitter, clamp } from '../core/util.js';
import { resetRun } from '../core/storage.js';
import { onDungeonClear, recordEncounter } from '../battle/learning.js';
import { enemyLevel, enemyMaxHp } from '../battle/enemyStats.js';
import { Combat } from '../battle/combat.js';
import { EnemyPhase } from '../battle/enemyPhase.js';
import { ENEMIES_BY_ID, ATTRS } from '../data/enemies.js';
import { generateFloor, generateArena, speciesPicker, TILE } from './generate.js';
import { hasLearned } from '../battle/skillEvolution.js';
import { FloorMap } from './floorMap.js';
import { Unit } from './unit.js';
import { Camera } from './camera.js';
import { ACTION_DIRS, DIRS8, canStep, bfsDistances, chebyshev, tileFeet } from './gridMath.js';

const ALLY_INFO = {
  priest: { name: '僧侶', color: '#f4f0ff' },
  mage: { name: '魔法使い', color: '#9d7bff' }
};

export class Exploration extends Emitter {
  constructor(B, save) {
    super();
    this.B = B;
    this.save = save;
    this.camera = new Camera(B);
    this.combat = new Combat(B, save, this);
    this.map = null;
    this.units = [];
    this.hero = null;
    this.heroDist = null;
    this.walk = () => false;
    this.nextUnitId = 1;
    this.time = 0;
    this.busySec = 0;        // 見た目が終わるまでの残り時間
    this.busyTotal = B.explore.moveSec;
    this.turnCount = 0;
    this.buffer = null;      // 押されたキーの一時保存
    this.travel = null;      // マウスでクリックした目的地へ、1ターンずつ歩く { tx, ty, seen: Set }
    this.holdSec = 0;
    this.bannerSec = 0;
    this.onStairs = false;
    this.enemyPhase = null;
    this.reinforceTurns = 0;
    // 拘束されると、声を聞きつけた敵が来る
    this.combat.on('boundStart', () => this.callToBind());
  }

  // イベントの受け取り側をつないだあとに呼ぶ
  start() {
    this.startFloor(this.save.currentRun.floor || 1);
  }

  // ---- 階の開始 ----
  startFloor(floor) {
    const { B, save } = this;
    const run = save.currentRun;
    if (!run.seed) run.seed = (Math.random() * 0xffffffff) >>> 0;
    run.floor = floor;
    this.enemyPhase = null;
    this.merchant = null;

    // 回想部屋の模擬戦は、ひと部屋のアリーナ
    const arena = this.arena;
    const gen = arena
      ? generateArena(arena.enemies.length)
      : generateFloor(run.seed, floor, B, save.persistent.debugSettings?.enemySpawnWeights);
    this.map = new FloorMap(gen);
    this.walk = (x, y) => this.map.isWalkable(x, y);
    this.units = [];
    this.combat.resetFloor();

    this.hero = this.spawn(
      { kind: 'hero', speciesId: 'hero', name: '主人公', spriteId: 'hero', color: '#4da3ff' },
      gen.start.x, gen.start.y
    );
    const party = B.dungeon.allies.filter((allyId) =>
      allyId !== 'priest' || save.persistent.debugSettings?.priestCompanion !== false
    );
    for (const allyId of party) {
      const info = ALLY_INFO[allyId];
      const spot = this.freeNear(gen.start.x, gen.start.y);
      this.spawn(
        { kind: 'ally', speciesId: allyId, name: info.name, spriteId: allyId, color: info.color },
        spot.x, spot.y
      );
    }
    if (arena) {
      gen.enemySpawns.forEach((s, i) => this.spawnEnemy(arena.enemies[i].speciesId, s.x, s.y, arena.enemies[i].level));
    } else {
      for (const s of gen.enemySpawns) this.spawnEnemy(s.species, s.x, s.y);
    }
    if (!arena) {
      this.spawnMerchant(gen);
      this.combat.eco.onFloorStart();   // 着けている贈り物が疼く
    }
    this.reinforceTurns = 0;
    this.traps = [];   // ずるっこ悪魔ちゃんの罠 { x, y, species, turns, color }
    // 大広間：桃色の霧が漏れていて、入ると甘い香りで MP が回復する代わりに、敵に囲まれる
    this.halls = (gen.rooms ?? []).filter((r) => r.hall).map((r) => {
      // 階の始まりが大広間の中なら、その広間では待ち伏せしない
      const startsInside = gen.start.x >= r.x && gen.start.x < r.x + r.w && gen.start.y >= r.y && gen.start.y < r.y + r.h;
      return { ...r, sprung: startsInside, noticed: startsInside };
    });

    this.buffer = null;
    this.busySec = 0;
    this.holdSec = 0;
    this.onStairs = false;
    this.bannerSec = B.explore.bannerSec;
    this.refresh();
    this.camera.snap(this.heroFeet(), this.map);
    this.emit('floorStart', { floor, total: B.dungeon.floorsPerDungeon });
  }

  // 行商ちゃん（商人）：始まりの部屋と大広間以外の部屋の真ん中あたりに、ときどき店を開いている
  spawnMerchant(gen) {
    if (Math.random() >= this.B.merchant.floorChance) return null;
    const rooms = (gen.rooms ?? []).filter((r) => !r.hall
      && !(gen.start.x >= r.x && gen.start.x < r.x + r.w && gen.start.y >= r.y && gen.start.y < r.y + r.h));
    for (const r of rooms.sort(() => Math.random() - 0.5)) {
      const x = r.x + Math.floor(r.w / 2);
      const y = r.y + Math.floor(r.h / 2);
      if (!this.map.isWalkable(x, y) || this.unitAt(x, y)) continue;
      this.merchant = this.spawn({ kind: 'npc', speciesId: 'merchant', name: '行商ちゃん', spriteId: 'gyousyoumaid', color: '#ffd36b' }, x, y);
      return this.merchant;
    }
    return null;
  }

  spawnEnemy(speciesId, x, y, levelOverride = null) {
    const { B, save } = this;
    const def = ENEMIES_BY_ID[speciesId];
    if (!def) return null;
    const level = levelOverride ?? enemyLevel(def.id, save.currentRun.floor, save.persistent, B);
    const enemy = this.spawn(
      {
        kind: 'enemy', speciesId: def.id, name: def.name, spriteId: def.id,
        color: ATTRS[def.attr].color, level, maxHp: enemyMaxHp(level, B),
        advancedSkill: def.advancedSkill ?? null
      },
      x, y
    );
    // 贈り物を着けていると、その子の種族は匂いをたどって追ってくる
    if (this.combat.eco.luresRace(def.id)) enemy.lured = true;
    // 逃げたことを覚えているヤンデレちゃんは、最初から居場所を知っている
    if ((save.persistent.enemyMemory?.[def.id]?.escapes ?? 0) > 0) enemy.lured = true;
    // 指定技のフィニッシュで覚えた上位技は、次に出会った個体も使える
    enemy.advancedSkillUnlocked = hasLearned(save.persistent, def.id, def.advancedSkill);
    return enemy;
  }

  // 主人公から見えない、歩いて minDist〜maxDist マスの空いた床をひとつ選ぶ
  hiddenSpawnCell(minDist, maxDist = Infinity) {
    const w = this.map.w;
    const cells = [];
    for (let y = 0; y < this.map.h; y++) {
      for (let x = 0; x < w; x++) {
        const d = this.heroDist[y * w + x];
        if (d < minDist || d > maxDist) continue;
        if (this.map.tileAt(x, y) !== TILE.FLOOR || this.map.isVisible(x, y) || this.unitAt(x, y)) continue;
        cells.push({ x, y });
      }
    }
    return cells.length ? cells[Math.floor(Math.random() * cells.length)] : null;
  }

  enemyCount() {
    return this.units.filter((u) => u.kind === 'enemy').length;
  }

  randomSpecies() {
    const run = this.save.currentRun;
    return speciesPicker(run.floor, this.B, this.save.persistent.debugSettings?.enemySpawnWeights).pick(Math.random);
  }

  // 大広間の霧に気づく・中に入ると待ち伏せ
  checkHalls() {
    const h = this.hero;
    const A = this.B.dungeon.ambush;
    for (const hall of this.halls ?? []) {
      if (hall.sprung) continue;
      const inside = h.tx >= hall.x + 1 && h.tx < hall.x + hall.w - 1 && h.ty >= hall.y + 1 && h.ty < hall.y + hall.h - 1;
      if (!inside) {
        if (!hall.noticed && this.map.isVisible(hall.x + Math.floor(hall.w / 2), hall.y + Math.floor(hall.h / 2))) {
          hall.noticed = true;
          this.emit('hallOmen', hall);
        }
        continue;
      }
      hall.sprung = true;
      // 甘い香り：MP が少し戻る（誘いの餌）
      const hs = this.save.currentRun.hero;
      const gain = Math.min(hs.maxMp - hs.mp, Math.round(hs.maxMp * A.mpRestore));
      hs.mp += gain;
      // 広間の縁、主人公から離れた所に敵が姿を現す
      const cells = [];
      for (let y = hall.y; y < hall.y + hall.h; y++) {
        for (let x = hall.x; x < hall.x + hall.w; x++) {
          const edge = x === hall.x || y === hall.y || x === hall.x + hall.w - 1 || y === hall.y + hall.h - 1;
          if (!edge || !this.walk(x, y) || this.unitAt(x, y)) continue;
          if (Math.max(Math.abs(x - h.tx), Math.abs(y - h.ty)) < A.minDistance) continue;
          cells.push({ x, y });
        }
      }
      const n = Math.min(cells.length, A.min + Math.floor(Math.random() * (A.max - A.min + 1)));
      const spawned = [];
      for (let i = 0; i < n; i++) {
        const c = cells.splice(Math.floor(Math.random() * cells.length), 1)[0];
        const e = this.spawnEnemy(this.randomSpecies(), c.x, c.y);
        if (e) {
          e.lured = true;
          spawned.push(e);
        }
      }
      this.emit('ambush', { hall, enemies: spawned, mpGain: gain });
    }
  }

  // 時間がたつと、見えない所から敵が増える
  tickReinforce() {
    if (this.arena) return;
    const R = this.B.dungeon.reinforce;
    this.reinforceTurns += 1;
    if (this.reinforceTurns < R.everyTurns || this.enemyCount() >= R.maxEnemies) return;
    this.reinforceTurns = 0;
    const cell = this.hiddenSpawnCell(R.minPathDist);
    const species = this.randomSpecies();
    if (!cell || !species) return;
    this.spawnEnemy(species, cell.x, cell.y);
    this.emit('reinforce');
  }

  // 拘束されたとき：声を聞きつけた敵が、見えない所から近づいてくる
  callToBind() {
    const C = this.B.dungeon.bindCall;
    const n = C.min + Math.floor(Math.random() * (C.max - C.min + 1));
    let came = 0;
    for (let i = 0; i < n && this.enemyCount() < this.B.dungeon.reinforce.maxEnemies; i++) {
      const cell = this.hiddenSpawnCell(C.minPathDist, C.maxPathDist);
      const species = this.randomSpecies();
      if (!cell || !species) break;
      const e = this.spawnEnemy(species, cell.x, cell.y);
      if (e) {
        e.lured = true;
        came += 1;
      }
    }
    if (came > 0) this.emit('lured', { count: came });
  }

  spawn(opts, tx, ty) {
    const unit = new Unit({ id: this.nextUnitId++, ...opts, tx, ty });
    this.units.push(unit);
    return unit;
  }

  removeUnit(unit) {
    this.units = this.units.filter((u) => u !== unit);
    // 模擬戦で敵を全員倒したら、回想を終える
    if (this.arena && unit.kind === 'enemy' && this.enemyCount() === 0) this.emit('arenaExit', { reason: 'clear' });
  }

  unitAt(x, y) {
    return this.units.find((u) => u.tx === x && u.ty === y) ?? null;
  }

  freeNear(x, y) {
    for (let r = 1; r <= 3; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (this.map.tileAt(nx, ny) === TILE.FLOOR && !this.unitAt(nx, ny)) return { x: nx, y: ny };
        }
      }
    }
    return { x, y };
  }

  // 主人公が動いたあとに呼ぶ。視界・歩数地図・階段の判定・図鑑への登録を更新する
  refresh() {
    const h = this.hero;
    const p = this.save.persistent;
    this.map.updateVisibility(h.tx, h.ty, this.B);
    this.heroDist = bfsDistances(this.map.w, this.map.h, this.walk, h.tx, h.ty);

    for (const u of this.units) {
      if (u.kind === 'enemy' && !u.encountered && this.map.isVisible(u.tx, u.ty)) {
        u.encountered = true;
        recordEncounter(p, u.speciesId, p.runCount);
        this.emit('encounter', u);
      }
    }

    this.checkHalls();

    const on = this.map.tileAt(h.tx, h.ty) === TILE.STAIRS;
    if (on && !this.onStairs) {
      this.emit('stairs', { isExit: this.save.currentRun.floor >= this.B.dungeon.floorsPerDungeon });
    }
    this.onStairs = on;
  }

  // 見た目の進み具合（0〜1）
  progress() {
    const t = this.busyTotal;
    return t > 0 ? clamp(1 - this.busySec / t, 0, 1) : 1;
  }

  heroFeet() {
    const r = this.hero.renderTile(this.progress());
    return tileFeet(r.x, r.y, this.B.tile.size);
  }

  // ---- 入力 ----
  // events: input.drain() の結果のうち、探索用のもの。enabled が false のときは捨てる
  handleEvents(events, enabled) {
    if (!enabled) {
      this.buffer = null;
      return;
    }
    for (const ev of events) {
      const vec = ACTION_DIRS[ev.action];
      if (vec) {
        if (!ev.repeat) this.pushMove(vec, ev.shift);
      } else if (ev.action === 'wait') {
        this.buffer = { kind: 'wait', age: 0 };
      } else if (ev.action === 'guard') {
        this.buffer = { kind: 'guard', age: 0 };
      } else if (ev.action === 'interact') {
        this.buffer = { kind: 'interact', age: 0 };
      } else if (ev.action === 'weaponSwitch') {
        this.combat.toggleWeapon();   // ターンは消費しない
      } else if (ev.action === 'clickTile') {
        this.clickTile(ev.tx, ev.ty);
      } else if (ev.action === 'faceTile') {
        this.travel = null;
        const dx = Math.sign(ev.tx - this.hero.tx);
        const dy = Math.sign(ev.ty - this.hero.ty);
        if (dx || dy) this.hero.setDir(dx, dy);   // 向きだけ変える。ターンは進まない
      }
      if (ev.source === 'key') this.travel = null;   // キーを押したら、自動の歩きは止める
    }
  }

  // 短い間隔で押された2つの方向キーは、斜め1つにまとめる
  pushMove(vec, shift) {
    const b = this.buffer;
    if (b && b.kind === 'move' && b.age < this.B.explore.mergeSec) {
      b.dx = clamp(b.dx + vec[0], -1, 1);
      b.dy = clamp(b.dy + vec[1], -1, 1);
      b.shift = b.shift || shift;
    } else {
      this.buffer = { kind: 'move', dx: vec[0], dy: vec[1], shift, age: 0 };
    }
  }

  heldVector(input) {
    let dx = 0;
    let dy = 0;
    for (const [action, [ax, ay]] of Object.entries(ACTION_DIRS)) {
      if (input.isDown(action)) {
        dx += ax;
        dy += ay;
      }
    }
    return {
      dx: clamp(dx, -1, 1),
      dy: clamp(dy, -1, 1),
      shift: input.heldCodes.has('ShiftLeft') || input.heldCodes.has('ShiftRight')
    };
  }

  // dtSec は共通タイマーの値（ポーズ中は 0）。enabled: TURN モードで、大イベント中でないとき
  update(dtSec, input, enabled) {
    const E = this.B.explore;
    this.time += dtSec;
    this.busySec = Math.max(0, this.busySec - dtSec);
    this.bannerSec = Math.max(0, this.bannerSec - dtSec);
    for (const u of this.units) u.walkLinger = Math.max(0, u.walkLinger - dtSec);

    if (this.buffer) {
      this.buffer.age += dtSec;
      if (this.buffer.age > E.tapWindowSec) this.buffer = null;
    }

    const held = this.heldVector(input);
    this.holdSec = enabled && (held.dx || held.dy) ? this.holdSec + dtSec : 0;

    if (enabled && this.busySec <= 0) this.tryAct(held);
    this.camera.update(dtSec, this.heroFeet(), this.map);
  }

  tryAct(held) {
    // 行動不能（拳の接触ペナルティ）。次の1ターンを自動で消費する
    if (this.combat.stunTurns > 0) {
      this.combat.stunTurns -= 1;
      this.buffer = null;
      this.emit('stunned');
      return this.doWait();
    }

    const grace = this.B.explore.diagonalGraceSec;
    const b = this.buffer;
    if (b && (b.kind !== 'move' || b.age >= grace)) {
      this.buffer = null;
      if (b.kind === 'wait') return this.doWait();
      if (b.kind === 'guard') return this.doGuard();
      if (b.kind === 'interact') return this.doInteract();
      const vec = held.dx || held.dy ? held : b;   // 押したままなら、いまの押下状態を優先
      return this.doMove(vec.dx, vec.dy, held.shift || b.shift);
    }
    if ((held.dx || held.dy) && this.holdSec >= grace) {
      this.travel = null;
      return this.doMove(held.dx, held.dy, held.shift);
    }
    if (this.travel) return this.travelStep();
    return false;
  }

  // ---- マウス操作 ----
  // クリックしたマス：自分 → 足踏み（階段の上なら降りる）、隣 → 1歩（敵なら攻撃・行商ちゃんなら話す）、遠く → そこまで歩く
  clickTile(tx, ty) {
    const hero = this.hero;
    this.travel = null;
    if (tx < 0 || ty < 0 || tx >= this.map.w || ty >= this.map.h) return;
    if (tx === hero.tx && ty === hero.ty) {
      this.buffer = { kind: this.onStairs ? 'interact' : 'wait', age: 0 };
      return;
    }
    const d = chebyshev(tx, ty, hero.tx, hero.ty);
    if (d === 1) {
      this.buffer = { kind: 'move', dx: tx - hero.tx, dy: ty - hero.ty, shift: false, age: this.B.explore.diagonalGraceSec };
      return;
    }
    if (!this.map.explored[ty * this.map.w + tx] || !this.walk(tx, ty)) return;
    this.travel = { tx, ty, seen: new Set(this.visibleEnemyIds()), steps: 0 };
  }

  visibleEnemyIds() {
    return this.units.filter((u) => u.kind === 'enemy' && this.map.isVisible(u.tx, u.ty)).map((u) => u.id);
  }

  // 目的地へ1歩。新しい敵が見えた・敵がすぐ近くにいる・道がふさがれたら止まる
  travelStep() {
    const t = this.travel;
    const hero = this.hero;
    const c = this.combat;
    if (c.bound || c.choice || c.defeated) return this.stopTravel();
    const newEnemy = this.visibleEnemyIds().some((id) => !t.seen.has(id));
    const near = this.units.some((u) => u.kind === 'enemy' && chebyshev(u.tx, u.ty, hero.tx, hero.ty) <= 1);
    if (t.steps > 0 && (newEnemy || near)) return this.stopTravel('enemy');
    const targetUnit = this.unitAt(t.tx, t.ty);
    const w = this.map.w;
    const pass = (x, y) => {
      if (!this.walk(x, y) || !this.map.explored[y * w + x]) return false;
      if (x === t.tx && y === t.ty) return true;
      const u = this.unitAt(x, y);
      return !u || u.kind === 'ally' || u === hero;
    };
    const dist = bfsDistances(w, this.map.h, pass, t.tx, t.ty);
    let best = null;
    for (const dir of DIRS8) {
      const nx = hero.tx + dir.dx;
      const ny = hero.ty + dir.dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= this.map.h) continue;
      const dv = dist[ny * w + nx];
      if (dv < 0 || !canStep(this.walk, hero.tx, hero.ty, dir.dx, dir.dy)) continue;
      if (!best || dv < best.dv) best = { dx: dir.dx, dy: dir.dy, dv };
    }
    if (!best) return this.stopTravel('blocked');
    const arriving = hero.tx + best.dx === t.tx && hero.ty + best.dy === t.ty;
    // 目的地に誰かいる（敵・行商ちゃん）なら、隣まで来たところで止まる（もう一度クリックで攻撃・話す）
    if (arriving && targetUnit && targetUnit.kind !== 'ally') {
      hero.setDir(best.dx, best.dy);
      return this.stopTravel();
    }
    t.steps += 1;
    const moved = this.doMove(best.dx, best.dy, false);
    if (!moved || arriving) this.travel = null;
    return moved;
  }

  stopTravel(reason = null) {
    this.travel = null;
    if (reason) this.emit('travelStop', reason);
    return false;
  }

  // ---- 主人公の行動 ----
  doMove(dx, dy, shift) {
    if (!dx && !dy) return false;
    const hero = this.hero;
    hero.setDir(dx, dy);
    if (shift) return false;   // 向きだけ変える。ターンは進まない

    if (!canStep(this.walk, hero.tx, hero.ty, dx, dy)) return false;   // 壁。ターンは進まない
    const nx = hero.tx + dx;
    const ny = hero.ty + dy;
    const other = this.unitAt(nx, ny);

    // 行商ちゃんに話しかける（ターンは進まない）
    if (other && other.kind === 'npc') {
      this.emit('merchant', other);
      return false;
    }
    if (other && other.kind === 'enemy') {
      this.beginTurn();
      this.combat.heroAttack(other);
      this.endHeroAction(null);
      return true;
    }

    this.beginTurn();
    let swapped = null;
    if (other && other.kind === 'ally') {
      swapped = other;
      other.moveTo(hero.tx, hero.ty);   // 位置を入れ替える
    }
    hero.moveTo(nx, ny);
    this.emit('unitStep', hero);
    const trap = this.traps?.find((t) => t.x === nx && t.y === ny);
    if (trap) {
      this.traps = this.traps.filter((t) => t !== trap);
      this.combat.triggerTrap(trap);
    }
    this.endHeroAction(swapped);
    return true;
  }

  doWait() {
    this.beginTurn();
    this.endHeroAction(null);
    return true;
  }

  doGuard() {
    this.beginTurn();
    this.combat.heroGuard();
    this.endHeroAction(null);
    return true;
  }

  doInteract() {
    if (this.onStairs) this.descend();
    else this.emit('nothing');
    return true;
  }

  // 拘束中の1ターン（B.bound.tickSec ごと）。仲間が動き、状態異常やバフのターンが進む。
  // 敵の移動は boundMove が、もっと短い間隔で受け持つ
  boundTick() {
    if (!this.combat.bound || this.enemyPhase) return;
    for (const u of this.units) if (u.kind !== 'enemy') u.beginTurn();
    this.combat.beginTurn();
    this.alliesAct(null);
    this.combat.endTurn();
    this.combat.boundTurnElapsed();
    if (this.combat.defeated) this.handleDefeat();
    this.emit('turn', this.turnCount);
  }

  // 拘束中、まわりの敵が近づいて拘束に加わる（B.bound.moveSec ごと）
  boundMove() {
    if (!this.combat.bound || this.enemyPhase || this.combat.defeated) return;
    for (const u of this.units) if (u.kind === 'enemy') u.beginTurn();
    // 移動の見た目が、次の移動までに補間されるようにする
    this.busyTotal = this.B.bound.moveSec * 0.9;
    this.busySec = this.busyTotal;
    this.enemiesAct(true, null);
    // 拘束に加われない敵どうしが、そのあいだに絆を深める
    this.combat.bonds.tryStart(this.B.bound.moveSec);
  }

  beginTurn() {
    for (const u of this.units) u.beginTurn();
    this.combat.beginTurn();
  }

  // 主人公の行動のあと、仲間 → 敵の順に動く
  endHeroAction(swappedAlly) {
    if (this.enemyPhase) return;
    this.turnCount += 1;
    this.refresh();
    this.busyTotal = this.combat.actedThisTurn ? this.B.explore.combatSec : this.B.explore.moveSec;
    this.busySec = this.busyTotal;
    this.alliesAct(swappedAlly);
    this.enemiesAct(false, () => this.finishHeroTurn());
  }

  finishHeroTurn() {
    this.combat.endTurn();
    this.tickReinforce();
    this.combat.bonds.tryStart(1);
    this.emit('turn', this.turnCount);

    if (this.combat.defeated) this.handleDefeat();
    this.emit('heroTurnDone');
  }

  // 歩数地図を使って、主人公へ1歩近づく。動けたら true
  stepToward(unit) {
    const w = this.map.w;
    const walkable = (x, y) => {
      if (!this.walk(x, y)) return false;
      const other = this.unitAt(x, y);
      return !other || other === unit || other === this.hero;
    };
    const dist = bfsDistances(w, this.map.h, walkable, this.hero.tx, this.hero.ty);
    const currentDist = dist[unit.ty * w + unit.tx];
    if (currentDist <= 0) return false;
    let best = null;
    let bestDist = currentDist;
    for (const d of DIRS8) {
      const nx = unit.tx + d.dx;
      const ny = unit.ty + d.dy;
      if (!this.map.inBounds(nx, ny)) continue;
      const nd = dist[ny * w + nx];
      if (nd < 0 || nd >= bestDist) continue;
      if (!canStep(walkable, unit.tx, unit.ty, d.dx, d.dy)) continue;
      best = { x: nx, y: ny };
      bestDist = nd;
    }
    if (!best) return false;
    unit.moveTo(best.x, best.y);
    this.emit('unitStep', unit);
    return true;
  }

  // 拘束を仕掛けられる前後左右のマスへ、壁と他ユニットを避けて近づく。
  stepTowardBindPosition(unit) {
    const hero = this.hero;
    const w = this.map.w;
    const h = this.map.h;
    const occupied = (x, y) => {
      const other = this.unitAt(x, y);
      return other && other !== unit;
    };
    const walkable = (x, y) => this.walk(x, y) && !occupied(x, y);
    let best = null;

    for (const d of [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }]) {
      const tx = hero.tx + d.dx;
      const ty = hero.ty + d.dy;
      if (!this.map.inBounds(tx, ty) || !this.walk(tx, ty) || occupied(tx, ty)) continue;

      const dist = bfsDistances(w, h, walkable, tx, ty);
      const currentDist = dist[unit.ty * w + unit.tx];
      if (currentDist <= 0) continue;
      if (!best || currentDist < best.distance) best = { dist, distance: currentDist };
    }
    if (!best) return false;

    for (const d of DIRS8) {
      const nx = unit.tx + d.dx;
      const ny = unit.ty + d.dy;
      if (!this.map.inBounds(nx, ny) || occupied(nx, ny)) continue;
      if (!canStep(walkable, unit.tx, unit.ty, d.dx, d.dy)) continue;
      if (best.dist[ny * w + nx] !== best.distance - 1) continue;
      unit.moveTo(nx, ny);
      this.emit('unitStep', unit);
      return true;
    }
    return false;
  }

  alliesAct(skip) {
    const hero = this.hero;
    for (const u of this.units) {
      if (u.kind !== 'ally') continue;
      if (this.combat.allyAct(u)) continue;
      if (u === skip) continue;
      if (chebyshev(u.tx, u.ty, hero.tx, hero.ty) >= 2) this.stepToward(u);
      else u.setDir(hero.tx - u.tx, hero.ty - u.ty);
    }
  }

  // 拘束と近接攻撃は前後左右の隣接だけを届く距離とする。
  enemyDist(e) {
    const hero = this.hero;
    const dx = Math.abs(e.tx - hero.tx);
    const dy = Math.abs(e.ty - hero.ty);
    if (dx === 1 && dy === 1) return 1;
    if (dx + dy === 1) return canStep(this.walk, e.tx, e.ty, hero.tx - e.tx, hero.ty - e.ty) ? 1 : 2;
    return Math.max(dx, dy);
  }

  enemiesAct(boundPhase = false, onDone = null) {
    const list = this.units.filter((u) => u.kind === 'enemy');
    this.enemyPhase = new EnemyPhase({
      units: list,
      isPresent: (enemy) => this.units.includes(enemy),
      act: (enemy) => this.actEnemy(enemy, boundPhase),
      shouldStop: () => Boolean(this.combat.defeated) || (!boundPhase && Boolean(this.combat.bound)),
      isBusy: () => this.combat.director.busy() || Boolean(this.combat.choice),
      onDone: () => {
        this.enemyPhase = null;
        onDone?.();
      }
    });
    this.enemyPhase.pump();
  }

  phaseBusy() {
    return Boolean(this.enemyPhase) || Boolean(this.defeatSeq) || Boolean(this.combat.rangedPull);
  }

  updatePhase() {
    this.enemyPhase?.pump();
  }

  wanderStep(e) {
    const d = DIRS8[Math.floor(Math.random() * DIRS8.length)];
    const nx = e.tx + d.dx;
    const ny = e.ty + d.dy;
    if (canStep(this.walk, e.tx, e.ty, d.dx, d.dy) && !this.unitAt(nx, ny)) {
      e.moveTo(nx, ny);
      this.emit('unitStep', e);
    }
  }

  actEnemy(e, boundPhase) {
    const D = this.B.dungeon;
    const w = this.map.w;
    if (this.combat.bound?.binders.some((b) => b.unit === e) || this.combat.defeated) return;
    // 相方とチャームポイントをこすり合わせている間は、動かない
    if (e.bonding) return;
    if (e.stunTurns > 0) {
      e.stunTurns -= 1;   // ひるみ中は動かない
      return;
    }
    const dist = this.enemyDist(e);
    const seen = this.map.isVisible(e.tx, e.ty);
    const pathDist = this.heroDist[e.ty * w + e.tx];
    // 見えていて近い敵に加え、声を聞きつけた敵と、拘束中に近くにいる敵も、主人公へ向かってくる
    const aware = (seen && pathDist >= 0 && pathDist <= D.aggroRange)
      || (e.lured && pathDist >= 0)
      || (boundPhase && pathDist >= 0 && pathDist <= D.bindAggroRange);

    if (boundPhase && this.combat.bound) {
      const diagonal = Math.abs(e.tx - this.hero.tx) === 1 && Math.abs(e.ty - this.hero.ty) === 1;
      if (diagonal && this.stepTowardBindPosition(e)) {
        // 拘束位置へ移動して同じ行動内で演出に入るため、移動前座標への補間を止める。
        e.fromX = e.tx;
        e.fromY = e.ty;
        this.combat.tryUnite(e);
      }
      else if (dist <= 1) this.combat.tryUnite(e);
      else if (aware) {
        if (chebyshev(e.tx, e.ty, this.hero.tx, this.hero.ty) === 1) this.stepTowardBindPosition(e);
        else this.stepToward(e);
      } else if (Math.random() < D.wanderChance) this.wanderStep(e);
      return;
    }

    if (aware || dist <= 1) {
      const diagonal = Math.abs(e.tx - this.hero.tx) === 1 && Math.abs(e.ty - this.hero.ty) === 1;
      if (diagonal && this.stepTowardBindPosition(e)) {
        // 同じ行動で技を始めるので、技の演出中は到着位置に固定する。
        e.fromX = e.tx;
        e.fromY = e.ty;
        this.combat.enemyDecide(e, { dist: 1, sees: seen, bindImmediately: true });
        return;
      }
      if (this.combat.enemyDecide(e, { dist, sees: seen, bindImmediately: diagonal }) === 'move') {
        this.stepToward(e);
      }
      return;
    }
    if (Math.random() < D.wanderChance) this.wanderStep(e);
  }
  // ---- 敗北 ----
  // ステップ2では、学習を記録して、新しいランを1階から始める（リザルトは後のステップ）
  // 倒れたあと、敵が経験値を吸い尽くす演出を見せてから、新しいランを始める
  handleDefeat() {
    if (this.defeatSeq) return;
    this.defeatSeq = true;
    const sec = this.combat.defeatHarvest();
    this.combat.later(sec, () => {
      this.combat.finalizeDefeat();
      this.defeatSeq = false;
      if (this.arena) {
        this.emit('arenaExit', { reason: 'defeat' });
        return;
      }
      resetRun(this.save);
      this.combat.eco.applyNewRun();
      this.emit('runReset');
      this.startFloor(1);
    });
  }

  // ---- 階段 ----
  descend() {
    if (this.arena) {
      this.emit('arenaExit', { reason: 'exit' });
      return;
    }
    const run = this.save.currentRun;
    if (run.floor >= this.B.dungeon.floorsPerDungeon) this.clearDungeon();
    else this.startFloor(run.floor + 1);
  }

  // ステップ2では、クリア後に最初からやり直す（リザルトや拠点は後のステップ）
  clearDungeon() {
    const p = this.save.persistent;
    onDungeonClear(p, this.B);
    p.clearCount += 1;
    p.runCount += 1;
    p.rp = (p.rp ?? 0) + this.B.baseCamp.rpOnClear;
    this.emit('dungeonClear');
    resetRun(this.save);
    this.combat.eco.applyNewRun();
    this.startFloor(1);
  }
}
