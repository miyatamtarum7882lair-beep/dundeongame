import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ENEMIES, ENEMIES_BY_ID } from '../src/data/enemies.js';
import { SKILL_DEFS } from '../src/data/skills.js';
import { B } from '../src/data/balance.js';
import { generateFloor } from '../src/dungeon/generate.js';

const root = path.resolve(import.meta.dirname, '..');
const rosterCsv = fs.readFileSync(path.join(root, 'mdungeon_pack', 'PROTOTYPE_ID_LIST_V6.csv'), 'utf8')
  .replace(/^\uFEFF/, '')
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((line) => {
    const [id, name, rank, attr] = line.split(',');
    return { id, name, rank, attr };
  });
const attrIds = { '口': 'mouth', '胸': 'bust', '尻': 'hip', '足': 'foot', '全': 'all' };

assert.equal(ENEMIES.length, 21);
assert.equal(new Set(ENEMIES.map((enemy) => enemy.id)).size, 21);
assert.deepEqual(new Set(B.dungeon.enemySpecies), new Set(ENEMIES.map((enemy) => enemy.id)));
for (const row of rosterCsv) {
  const enemy = ENEMIES_BY_ID[row.id];
  assert.ok(enemy, `${row.id}: ロスターにいない`);
  assert.equal(enemy.name, row.name);
  assert.equal(enemy.rank, row.rank);
  if (row.attr === '胸 / 手') assert.deepEqual(enemy.sourceAttrs, ['bust', 'hand']);
  else assert.equal(enemy.attr, attrIds[row.attr]);
  const portraitDir = path.join(root, 'public', 'assets', 'portraits');
  assert.ok(['png', 'jpg', 'jpeg', 'webp'].some((ext) =>
    fs.existsSync(path.join(portraitDir, `${row.id}.${ext}`))), `${row.id}: 一枚絵がない`);
  const sheetDir = path.join(root, 'public', 'assets', 'sprites');
  assert.ok(fs.existsSync(path.join(sheetDir, `${row.id}.png`)), `${row.id}: スプライトPNGがない`);
  const sheet = JSON.parse(fs.readFileSync(path.join(sheetDir, `${row.id}.json`), 'utf8'));
  assert.ok(sheet.tags.idle && sheet.tags.walk_down && sheet.tags.walk_up && sheet.tags.walk_side,
    `${row.id}: 基本モーションが足りない`);
  for (const skillId of [enemy.normalSkill, ...enemy.bindSkills, ...enemy.skills]) {
    assert.ok(SKILL_DEFS[skillId] && B.skills[skillId], `${row.id}: 技 ${skillId} が未定義`);
  }
}

for (let floor = 1; floor <= 3; floor++) {
  for (let seed = 1; seed <= 20; seed++) {
    const generated = generateFloor(seed, floor, B);
    for (const spawn of generated.enemySpawns) {
      const rank = ENEMIES_BY_ID[spawn.species].rank;
      if (floor === 1) assert.equal(rank, 'basic');
      if (floor === 2) assert.notEqual(rank, 'elite');
    }
  }
}
const onlyAngel = Object.fromEntries(ENEMIES.map((enemy) => [enemy.id, enemy.id === 'angelGirl' ? 1 : 0]));
assert.ok(generateFloor(1, 1, B, onlyAngel).enemySpawns.every((spawn) => spawn.species === 'angelGirl'));

console.log('enemy registry: 21 characters, assets, skills, and floor weights verified');
