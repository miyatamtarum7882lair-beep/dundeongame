// File: tools/test-flashback.mjs
import assert from 'node:assert/strict';
import { B } from '../src/data/balance.js';
import { FlashbackController } from '../src/battle/flashback.js';
import { flashEnvelope, invertPulse, charmTransform } from '../src/ui/flashbackFx.js';
import {
  normalizeAttr,
  flashbackSeFor,
  flashbackColorFor,
  joinEffectFor,
} from '../src/data/flashbackData.js';

function make({ mode = 'full', blocked = false } = {}) {
  const s = { mode, blocked, log: [] };
  const fb = new FlashbackController({
    getMode: () => s.mode,
    emit: (name, payload) => s.log.push([name, payload]),
    isBlocked: () => s.blocked,
  });
  return { fb, s };
}
const find = (s, name) => s.log.filter((e) => e[0] === name);
const touch = { kind: 'touch', enemyId: 'kitten', attr: 'mouth' };

// 1. 余韻中・絶頂中（blocked）は発生しない
{
  const { fb, s } = make({ blocked: true });
  assert.deepEqual(fb.request(touch), { fired: false, reason: 'blocked' });
  assert.equal(find(s, 'flashbackStart').length, 0);
  assert.equal(fb.isErect(), false);
}

// 2. 発生すると映像イベントと勃起状態が付く。durSec で終わり、erectSec で勃起が解ける
{
  const { fb, s } = make();
  const r = fb.request(touch);
  assert.equal(r.fired, true);
  assert.equal(r.erect, true);
  assert.equal(find(s, 'flashbackStart')[0][1].durSec, B.flashback.durSec);
  assert.equal(fb.isErect(), true);
  assert.equal(fb.actionDelaySec(), B.flashback.erectActionDelaySec);
  fb.update(B.flashback.erectSec + 0.01);
  assert.equal(fb.isErect(), false);
  assert.equal(fb.actionDelaySec(), 0);
  fb.update(B.flashback.durSec);
  assert.equal(find(s, 'flashbackEnd').length, 1);
}

// 3. 拘束開始では勃起状態を付けない
{
  const { fb } = make();
  const r = fb.request({ kind: 'bind', enemyId: 'kitten', attr: 'mouth' });
  assert.equal(r.fired, true);
  assert.equal(r.erect, false);
  assert.equal(fb.isErect(), false);
}

// 4. 発動中・クールダウン中は再発動しない。経過後は発動できる
{
  const { fb } = make();
  fb.request(touch);
  fb.update(1);
  assert.equal(fb.request(touch).reason, 'active');
  fb.update(B.flashback.durSec); // 映像は終了、クールダウンは残る
  assert.equal(fb.request(touch).reason, 'cooldown');
  fb.update(B.flashback.minIntervalSec);
  assert.equal(fb.request(touch).fired, true);
}

// 5. 強力な技・再遭遇は、同じ技・同じ敵で1フロアに1回
{
  const { fb } = make();
  const strong = { kind: 'strong', enemyId: 'blackRibbon', attr: 'mouth', skillId: 'deepDrainKiss' };
  assert.equal(fb.request(strong).fired, true);
  fb.update(B.flashback.minIntervalSec + B.flashback.durSec);
  assert.equal(fb.request(strong).reason, 'once');
  assert.equal(
    fb.request({ ...strong, skillId: 'levelDrainKiss' }).fired,
    true,
    'different skill is allowed'
  );
  fb.update(B.flashback.minIntervalSec + B.flashback.durSec);
  fb.resetFloor();
  assert.equal(fb.request(strong).fired, true, 'allowed again on a new floor');
}

// 6. off: 映像イベントは mode:'off' で出るが、勃起状態は付与される
{
  const { fb, s } = make({ mode: 'off' });
  assert.equal(fb.request(touch).fired, true);
  assert.equal(find(s, 'flashbackStart')[0][1].mode, 'off');
  assert.equal(fb.isErect(), true);
}

// 7. cancel は映像だけ止め、勃起状態は残す
{
  const { fb, s } = make();
  fb.request(touch);
  fb.cancel();
  assert.equal(find(s, 'flashbackEnd').length, 1);
  assert.equal(fb.isActive(), false);
  assert.equal(fb.isErect(), true);
}

// 8. 描画の純粋関数
{
  assert.equal(flashEnvelope(0), 0);
  assert.ok(flashEnvelope(0.3) > 0.99);
  assert.ok(flashEnvelope(0.9) < flashEnvelope(0.7));
  assert.equal(flashEnvelope(1), 0);
  assert.ok(invertPulse(0.01) > 0.8);
  assert.equal(invertPulse(0.15), 0);
  assert.ok(invertPulse(0.23) > 0);
  assert.equal(invertPulse(1), 0);

  // チャームポイントが pivot に一致する
  const pivot = { x: 640, y: 330 };
  const tr = charmTransform({ imgW: 800, imgH: 1000, cx: 0.3, cy: 0.7, zoom: 2, pivot });
  assert.ok(Math.abs(tr.x + 0.3 * tr.w - pivot.x) < 1e-9);
  assert.ok(Math.abs(tr.y + 0.7 * tr.h - pivot.y) < 1e-9);
  const z1 = charmTransform({ imgW: 800, imgH: 1000, cx: 0.5, cy: 0.5, zoom: 1, pivot });
  assert.ok(tr.h > z1.h, 'zoom enlarges');
}

// 9. 属性名の正規化（日本語・英語どちらも受け付ける）
{
  assert.equal(normalizeAttr('口'), 'mouth');
  assert.equal(normalizeAttr('mouth'), 'mouth');
  assert.equal(normalizeAttr('chest'), 'bust');
  assert.equal(normalizeAttr('尻'), 'hip');
  assert.equal(normalizeAttr('unknown'), null);
  assert.equal(flashbackSeFor('口'), 'kissDrain');
  assert.equal(flashbackSeFor('unknown'), null);
  assert.deepEqual(flashbackColorFor('unknown'), [255, 100, 170]);
  assert.equal(joinEffectFor('mouth').se, 'vacuumKiss');
  assert.equal(joinEffectFor('unknown'), null);
}

console.log('flashback: all checks passed');