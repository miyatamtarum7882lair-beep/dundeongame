// File: src/dungeon/exploration.js
// 探索（TURN モード）の進行役。移動、ターン進行、戦闘への橋渡し、階の切り替えを受け持つ。画面には依存しない。
// 発行するイベント: floorStart / stairs / encounter / stunned / nothing / dungeonClear / turn
import { Emitter, clamp } from '../core/util.js';
import { resetRun } from '../core/storage.js';
import { onDungeonClear, recordEncounter } from '../battle/learning.js';
import { enemyLevel, enemyMaxHp } from '../battle/enemyStats.js';
import { Combat } from '../battle/combat.js';
import { ENEMIES_BY_ID, ATTRS } from '../data/enemies.js';
import { generateFloor, TILE } from './generate.js';
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
    this.holdSec = 0;
    this.bannerSec = 0;
    this.onStairs = false;
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

    const gen = generateFloor(run.seed, floor, B);
    this.map = new FloorMap(gen);
    this.walk = (x, y) => this.map.isWalkable(x, y);
    this.units = [];
    this.combat.resetFloor();

    this.hero = this.spawn(
      { kind: 'hero', speciesId: 'hero', name: '主人公', spriteId: 'hero', color: '#4da3ff' },
      gen.start.x, gen.start.y
    );
    for (const allyId of B.dungeon.allies) {
      const info = ALLY_INFO[allyId];
      const spot = this.freeNear(gen.start.x, gen.start.y);
      this.spawn(
        { kind: 'ally', speciesId: allyId, name: info.name, spriteId: allyId, color: info.color },
        spot.x, spot.y
      );
    }
    for (const s of gen.enemySpawns) {
      const def = ENEMIES_BY_ID[s.species];
      if (!def) continue;
      const level = enemyLevel(def.id, floor, save.persistent, B);
      this.spawn(
        {
          kind: 'enemy', speciesId: def.id, name: def.name, spriteId: def.id,
          color: ATTRS[def.attr].color, level, maxHp: enemyMaxHp(level, B),
          advancedSkill: def.advancedSkill ?? null
        },
        s.x, s.y
      );
    }

    this.buffer = null;
    this.busySec = 0;
    this.holdSec = 0;
    this.onStairs = false;
    this.bannerSec = B.explore.bannerSec;
    this.refresh();
    this.camera.snap(this.heroFeet(), this.map);
    this.emit('floorStart', { floor, total: B.dungeon.floorsPerDungeon });
  }

  spawn(opts, tx, ty) {
    const unit = new Unit({ id: this.nextUnitId++, ...opts, tx, ty });
    this.units.push(unit);
    return unit;
  }

  removeUnit(unit) {
    this.units = this.units.filter((u) => u !== unit);
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
      }
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
    this.holdSec = held.dx || held.dy ? this.holdSec + dtSec : 0;

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
      return this.doMove(held.dx, held.dy, held.shift);
    }
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

  boundTick() {
    if (!this.combat.bound) return;
    for (const u of this.units) u.beginTurn();
    this.combat.beginTurn();
    this.alliesAct(null);
    this.enemiesAct(true);
    this.combat.endTurn();
    this.combat.boundTurnElapsed();
    this.emit('turn', this.turnCount);
  }

  beginTurn() {
    for (const u of this.units) u.beginTurn();
    this.combat.beginTurn();
  }

  // 主人公の行動のあと、仲間 → 敵の順に動く
  endHeroAction(swappedAlly) {
    this.turnCount += 1;
    this.refresh();
    this.alliesAct(swappedAlly);
    this.enemiesAct();
    this.combat.endTurn();

    this.busyTotal = this.combat.actedThisTurn ? this.B.explore.combatSec : this.B.explore.moveSec;
    this.busySec = this.busyTotal;
    this.emit('turn', this.turnCount);

    if (this.combat.defeated) this.handleDefeat();
  }

  // 歩数地図を使って、主人公へ1歩近づく。動けたら true
  stepToward(unit) {
    const w = this.map.w;
    let bestDist = this.heroDist[unit.ty * w + unit.tx];
    if (bestDist <= 0) return false;
    let best = null;
    for (const d of DIRS8) {
      const nx = unit.tx + d.dx;
      const ny = unit.ty + d.dy;
      if (!this.map.inBounds(nx, ny)) continue;
      const nd = this.heroDist[ny * w + nx];
      if (nd < 0 || nd >= bestDist) continue;
      if (!canStep(this.walk, unit.tx, unit.ty, d.dx, d.dy)) continue;
      if (this.unitAt(nx, ny)) continue;
      best = { x: nx, y: ny };
      bestDist = nd;
    }
    if (!best) return false;
    unit.moveTo(best.x, best.y);
    return true;
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

  // 敵から主人公までの距離。斜めの隣接は、壁の角を挟むと「届かない」ので 2 とする
  enemyDist(e) {
    const hero = this.hero;
    const d = chebyshev(e.tx, e.ty, hero.tx, hero.ty);
    if (d === 1 && !canStep(this.walk, e.tx, e.ty, hero.tx - e.tx, hero.ty - e.ty)) return 2;
    return d;
  }

  enemiesAct(boundPhase = false) {
    const D = this.B.dungeon;
    const w = this.map.w;
    for (const e of [...this.units]) {
      if (e.kind !== 'enemy') continue;
      if (this.combat.bound && !boundPhase) break;
      if (this.combat.bound?.binders.some((b) => b.unit === e)) continue;
      if (this.combat.defeated) break;   // 主人公が倒れたら、残りの敵は動かない

      const dist = this.enemyDist(e);
      const seen = this.map.isVisible(e.tx, e.ty);
      const pathDist = this.heroDist[e.ty * w + e.tx];
      const aware = seen && pathDist >= 0 && pathDist <= D.aggroRange;

      if (boundPhase && this.combat.bound) {
        if (dist <= 1) {
          this.combat.tryUnite(e);
        } else if (aware) {
          this.stepToward(e);
        } else if (Math.random() < D.wanderChance) {
          const d = DIRS8[Math.floor(Math.random() * DIRS8.length)];
          const nx = e.tx + d.dx;
          const ny = e.ty + d.dy;
          if (canStep(this.walk, e.tx, e.ty, d.dx, d.dy) && !this.unitAt(nx, ny)) e.moveTo(nx, ny);
        }
        continue;
      }

      if (aware || dist <= 1) {
        if (this.combat.enemyDecide(e, { dist, sees: seen }) === 'move') this.stepToward(e);
        continue;
      }
      if (Math.random() < D.wanderChance) {
        const d = DIRS8[Math.floor(Math.random() * DIRS8.length)];
        const nx = e.tx + d.dx;
        const ny = e.ty + d.dy;
        if (canStep(this.walk, e.tx, e.ty, d.dx, d.dy) && !this.unitAt(nx, ny)) e.moveTo(nx, ny);
      }
    }
  }

  // ---- 敗北 ----
  // ステップ2では、学習を記録して、新しいランを1階から始める（リザルトは後のステップ）
  handleDefeat() {
    this.combat.finalizeDefeat();
    resetRun(this.save);
    this.startFloor(1);
  }

  // ---- 階段 ----
  descend() {
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
    this.emit('dungeonClear');
    resetRun(this.save);
    this.startFloor(1);
  }
}