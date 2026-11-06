// File: tools/build-sprite.mjs
// 使い方:
//   npm run sprite -- list kitten              必要なファイルと、置いてあるかどうかを表示
//   npm run sprite -- prompt kitten walk_side  ChatGPT に貼る依頼文を表示
//   npm run sprite -- build kitten             work/kitten/ の画像から public/assets/sprites/kitten.png と kitten.json を作る
//   npm run sprite -- watch kitten             work/kitten/ を監視し、画像を入れるたびに自動で作り直す
// 背景は単色マゼンタ（#ff00ff）。透過PNGならそのまま使う。
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { MOTIONS_BY_ID, motionsFor } from '../src/data/motions.js';
import { DESIGNS, canvasSpec, FEET_LINE_PCT } from '../src/data/characterDesigns.js';

const FRAME_W = 64;
const FRAME_H = 96;
const FEET_TARGET = (FRAME_W - 1) / 2;   // 足元の中心を合わせるx座標
const IDLE_TARGET_H = 92;   // idle の高さ。手を上げるポーズでも収まるよう、少し余白を残す
const IDLE_MAX_W = 60;
const MAX_COLORS = 24;
const KEY_DISTANCE = 90;    // マゼンタとの色の距離がこれ未満なら背景とみなす
const ALPHA_CUT = 128;      // 縮小後の半透明をはっきり分ける境目
const FEET_ROWS_RATIO = 0.1;
const COLUMN_MIN_PIXELS = 3;   // コマの切り分けで、ノイズとみなす縦の画素数
const GROUP_MIN_WIDTH = 8;
const SIZE_CHECK_MOTIONS = ['walk_down', 'walk_up', 'walk_side'];   // idle と同じ高さになるはずのモーション
// 描いた絵の中のキャラの大きさは、モーションごとに違うことがある。
// 次のモーションは、描いたコマの高さの平均が idle と同じになるよう、縮尺を自動で決める。
// しゃがみ・倒れ・拘束・攻撃（武器で高さが変わる）は対象外。scale.json で手動調整する
const AUTO_NORMALIZE = new Set([
  'walk_down', 'walk_up', 'walk_side', 'hit', 'guard',
  'attack_down', 'attack_side', 'cast', 'flee',
  'skill_blowKiss', 'skill_pinkBreath', 'skill_sexyPose', 'panic', 'trance',
  'charm', 'bind_down', 'bind_side'
]);
const SIZE_TOLERANCE = 0.15;   // idle との高さの差がこの割合を超えたら警告
const IMAGE_EXTS = ['png', 'webp', 'jpg', 'jpeg'];
const COMMANDS = ['list', 'prompt', 'build', 'watch'];

const args = process.argv.slice(2);
const command = COMMANDS.includes(args[0]) ? args.shift() : 'build';
const [characterId, motionArg] = args;

const workDir = (id) => path.join('work', id);

function getMotion(motionId) {
  const m = MOTIONS_BY_ID[motionId];
  if (!m) throw new Error(`未定義のモーションです: ${motionId}（src/data/motions.js を確認してください）`);
  return m;
}

function findImage(dir, base) {
  for (const ext of IMAGE_EXTS) {
    const file = path.join(dir, `${base}.${ext}`);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

function readJson(file) {
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.warn(`${file} を読めませんでした: ${error.message}`);
    return {};
  }
}

function cutAlpha(data) {
  for (let i = 3; i < data.length; i += 4) data[i] = data[i] >= ALPHA_CUT ? 255 : 0;
}

// ---- 画像の読み込み ----
// 透過がなければ、マゼンタを背景として透過にする
async function readKeyed(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let clear = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) clear += 1;
  const hadAlpha = clear > width * height * 0.01;
  if (!hadAlpha) {
    for (let i = 0; i < data.length; i += 4) {
      const dist = Math.hypot(data[i] - 255, data[i + 1], data[i + 2] - 255);
      if (dist < KEY_DISTANCE) data[i + 3] = 0;
    }
  }
  return { data, width, height, hadAlpha };
}

// 列 x0〜x1 の中のキャラの外接矩形で切り出す。何もなければ null
function cropBox(raw, x0, x1) {
  const { data, width, height } = raw;
  let minX = x1 + 1;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = x0; x <= x1; x++) {
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const src = ((minY + y) * width + minX) * 4;
    data.copy(buf, y * w * 4, src, src + w * 4);
  }
  return { buf, width: w, height: h };
}

// 縦に何もない隙間で区切って、コマの範囲を求める
function columnGroups(raw) {
  const { data, width, height } = raw;
  const counts = new Uint32Array(width);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) counts[x] += 1;
    }
  }
  const minGap = Math.max(6, Math.round(width * 0.01));
  const groups = [];
  let start = -1;
  let last = -1;
  for (let x = 0; x <= width; x++) {
    const filled = x < width && counts[x] >= COLUMN_MIN_PIXELS;
    if (filled) {
      if (start < 0) start = x;
      last = x;
    } else if (start >= 0 && (x === width || x - last >= minGap)) {
      groups.push([start, last]);
      start = -1;
    }
  }
  return groups.filter(([a, b]) => b - a + 1 >= GROUP_MIN_WIDTH);
}

// 横一列の画像を count コマに切り分ける。見つけた数が合わないときは等分する
function splitStrip(raw, count, label) {
  if (count === 1) return [cropBox(raw, 0, raw.width - 1)];
  const groups = columnGroups(raw);
  let ranges = groups;
  if (groups.length !== count) {
    console.warn(`  注意: ${label} のコマを ${groups.length} 個見つけました（期待は ${count} 個）。等分で切り分けます。ずれるときは、コマの間隔を広げて作り直してください`);
    const w = raw.width / count;
    ranges = Array.from({ length: count }, (_, i) => [
      Math.floor(i * w),
      Math.max(Math.floor(i * w), Math.floor((i + 1) * w) - 1)
    ]);
  }
  return ranges.map(([a, b]) => cropBox(raw, a, b));
}

// ---- コマの加工 ----
function calcFeetX(data, w, h) {
  const rows = Math.max(1, Math.round(h * FEET_ROWS_RATIO));
  let sumX = 0;
  let count = 0;
  for (let y = h - rows; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] === 255) {
        sumX += x;
        count += 1;
      }
    }
  }
  return count ? sumX / count : (w - 1) / 2;
}

async function scaleFrame(frame, scale) {
  const w = Math.max(1, Math.round(frame.width * scale));
  const h = Math.max(1, Math.round(frame.height * scale));
  const data = await sharp(frame.buf, { raw: { width: frame.width, height: frame.height, channels: 4 } })
    .resize(w, h, { kernel: 'lanczos3' })
    .raw()
    .toBuffer();
  cutAlpha(data);
  return { data, w, h, feetX: calcFeetX(data, w, h), measured: true };
}

function flopFrame(f) {
  const data = Buffer.alloc(f.data.length);
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      const s = (y * f.w + x) * 4;
      const d = (y * f.w + (f.w - 1 - x)) * 4;
      f.data.copy(data, d, s, s + 4);
    }
  }
  return { ...f, data, feetX: f.w - 1 - f.feetX };
}

// <モーションID>_<番号>.png があれば、そのコマを優先する
async function loadOverride(dir, motionId, index) {
  const file = findImage(dir, `${motionId}_${index}`);
  if (!file) return null;
  const raw = await readKeyed(file);
  if (raw.width === FRAME_W && raw.height === FRAME_H && raw.hadAlpha) {
    cutAlpha(raw.data);
    return { kind: 'final', frame: { data: raw.data, w: FRAME_W, h: FRAME_H, feetX: FEET_TARGET } };
  }
  const crop = cropBox(raw, 0, raw.width - 1);
  return crop ? { kind: 'raw', frame: crop } : null;
}

// ---- 組み立て ----
async function build(id) {
  const dir = workDir(id);
  if (!fs.existsSync(dir)) {
    throw new Error(`${dir} がありません。npm run sprite -- list ${id} で作れます`);
  }
  const scaleOverrides = readJson(path.join(dir, 'scale.json'));   // 例: { "skill_blowKiss": 0.9 }
  const motionIds = ['idle', ...motionsFor(id).filter((m) => m !== 'idle')];

  // 1. 各モーションの画像を読み、コマに切り分ける
  const drawn = new Map();
  for (const mid of motionIds) {
    const m = getMotion(mid);
    const file = findImage(dir, mid);
    if (!file) continue;
    drawn.set(mid, splitStrip(await readKeyed(file), m.draw, `${mid}.png`));
  }

  // 2. 縮尺の基準は idle の1コマ目
  const idleOverride = await loadOverride(dir, 'idle', 1);
  const idleRaw = idleOverride?.kind === 'raw' ? idleOverride.frame : drawn.get('idle')?.[0];
  if (!idleRaw && idleOverride?.kind !== 'final') {
    throw new Error(`idle の画像がありません（縮尺の基準です）。${dir}/idle.png を置いてください`);
  }
  const baseScale = idleRaw ? Math.min(IDLE_TARGET_H / idleRaw.height, IDLE_MAX_W / idleRaw.width) : 1;
  const normalizeScale = (mid) => {
    if (!idleRaw || !AUTO_NORMALIZE.has(mid)) return 1;
    const heights = (drawn.get(mid) ?? []).filter(Boolean).map((f) => f.height);
    if (heights.length === 0) return 1;
    const avg = heights.reduce((sum, h) => sum + h, 0) / heights.length;
    return idleRaw.height / avg;
  };

  // 3. シートに並べるコマを作る
  const frames = [];
  const tags = {};
  const missing = [];
  const measuredHeights = new Map();   // モーションID → 縮小後のコマの高さの平均（idle との比較用）
  let idleFrame = null;

  for (const mid of motionIds) {
    const m = getMotion(mid);
    const scale = baseScale * normalizeScale(mid) * (scaleOverrides[mid] ?? 1);
    const local = [];
    let ok = true;

    for (let i = 0; i < m.layout.length && ok; i++) {
      const label = `${mid} の${i + 1}コマ目`;
      let frame = null;
      const override = await loadOverride(dir, mid, i + 1);

      if (override) {
        frame = override.kind === 'final'
          ? { ...override.frame, label }
          : { ...(await scaleFrame(override.frame, scale)), label };
      } else {
        const token = m.layout[i];
        let match = null;
        if (token === 'idle') {
          frame = idleFrame ? { ...idleFrame, measured: false } : null;
        } else if ((match = token.match(/^d(\d+)$/))) {
          const src = drawn.get(mid)?.[Number(match[1]) - 1];
          if (src) frame = { ...(await scaleFrame(src, scale)), label };
        } else if ((match = token.match(/^=(\d+)$/))) {
          frame = local[Number(match[1]) - 1] ?? null;
        } else if ((match = token.match(/^~(\d+)$/))) {
          const src = local[Number(match[1]) - 1];
          if (src) frame = flopFrame(src);
        } else {
          throw new Error(`layout の書き方が不正です: ${mid} → ${token}`);
        }
      }
      if (frame) local.push(frame);
      else ok = false;
    }

    if (!ok) {
      if (mid === 'idle') throw new Error('idle を作れませんでした。画像の背景がマゼンタか確認してください');
      missing.push(mid);
      continue;
    }
    if (mid === 'idle') idleFrame = local[0];

    const measured = local.filter((f) => f.measured);
    if (measured.length) {
      measuredHeights.set(mid, measured.reduce((sum, f) => sum + f.h, 0) / measured.length);
    }
    tags[mid] = { from: frames.length, to: frames.length + local.length - 1, fps: m.fps, loop: m.loop };
    frames.push(...local);
  }

  // 4. 全コマを横一列に並べ、足元の中心をコマの下端中央に合わせる
  const sheetW = FRAME_W * frames.length;
  const sheet = Buffer.alloc(sheetW * FRAME_H * 4);   // 0 埋め = 完全な透明
  const warned = new Set();
  frames.forEach((f, index) => {
    const dx = Math.round(FEET_TARGET - f.feetX);
    const dy = FRAME_H - f.h;
    if ((f.h > FRAME_H || dx < 0 || dx + f.w > FRAME_W) && !warned.has(f.label)) {
      warned.add(f.label);
      console.warn(`  注意: ${f.label} がコマからはみ出して切れます（${f.w}×${f.h}）。${dir}/scale.json でそのモーションの縮尺を下げてください`);
    }
    for (let y = 0; y < f.h; y++) {
      for (let x = 0; x < f.w; x++) {
        const px = dx + x;
        const py = dy + y;
        if (px < 0 || px >= FRAME_W || py < 0 || py >= FRAME_H) continue;
        const src = (y * f.w + x) * 4;
        if (f.data[src + 3] === 0) continue;
        const dst = (py * sheetW + index * FRAME_W + px) * 4;
        sheet[dst] = f.data[src];
        sheet[dst + 1] = f.data[src + 1];
        sheet[dst + 2] = f.data[src + 2];
        sheet[dst + 3] = 255;
      }
    }
  });

  const outDir = path.join('public', 'assets', 'sprites');
  fs.mkdirSync(outDir, { recursive: true });
  await sharp(sheet, { raw: { width: sheetW, height: FRAME_H, channels: 4 } })
    .png({ palette: true, colours: MAX_COLORS, dither: 0 })   // シート全体で1回だけ減色
    .toFile(path.join(outDir, `${id}.png`));
  fs.writeFileSync(
    path.join(outDir, `${id}.json`),
    JSON.stringify({ frameW: FRAME_W, frameH: FRAME_H, frameCount: frames.length, tags }, null, 2)
  );

  console.log(`出力しました: ${outDir}/${id}.png / ${id}.json（${frames.length}コマ、${sheetW}×${FRAME_H}）`);
  console.table(Object.entries(tags).map(([tag, t]) => ({ モーション: tag, コマ: `${t.from}〜${t.to}` })));
  if (missing.length) console.log(`未作成（ゲームでは idle で代用されます）: ${missing.join(', ')}`);

  checkSizes(dir, measuredHeights, idleFrame, scaleOverrides);
}

// 歩きのキャラの高さが idle と大きく違うときに、scale.json に書く倍率を案内する
function checkSizes(dir, measuredHeights, idleFrame, scaleOverrides) {
  if (!idleFrame) return;
  const idleH = idleFrame.h;
  const problems = [];
  for (const mid of SIZE_CHECK_MOTIONS) {
    const h = measuredHeights.get(mid);
    if (!h) continue;
    const ratio = h / idleH;
    if (Math.abs(ratio - 1) <= SIZE_TOLERANCE) continue;
    const current = scaleOverrides[mid] ?? 1;
    problems.push({
      モーション: mid,
      idleとの高さ比: ratio.toFixed(2),
      scale_jsonに書く値: Number((current / ratio).toFixed(2))
    });
  }
  if (problems.length === 0) return;
  console.warn(`\n  注意: 次のモーションは idle と高さが ${Math.round(SIZE_TOLERANCE * 100)}% 以上ずれています。`);
  console.warn(`  ${dir}/scale.json に下の値を書くと揃います（例: { "walk_side": 1.15 }）`);
  console.table(problems);
}

// ---- 一覧 ----
function list(id) {
  const dir = workDir(id);
  fs.mkdirSync(dir, { recursive: true });
  const ids = motionsFor(id);
  let total = 0;
  const rows = ids.map((mid) => {
    const m = getMotion(mid);
    total += m.draw;
    const done = Boolean(findImage(dir, mid));
    return {
      モーション: m.label,
      ファイル名: `${mid}.png`,
      コマ数: m.draw,
      向き: m.dir,
      状態: done ? '済' : m.optional ? '未（任意）' : '未'
    };
  });
  console.log(`■ ${id}: ${dir}/ に入れるファイル（描くのは合計 ${total} コマ）`);
  console.table(rows);

  const overrides = fs.readdirSync(dir).filter((n) => /^.+_\d+\.(png|webp|jpg|jpeg)$/.test(n));
  if (overrides.length) console.log(`手直しコマ（優先して使われます）: ${overrides.join(', ')}`);
}

// ---- ChatGPT に貼る依頼文 ----
function printPrompt(id, motionId) {
  const m = getMotion(motionId);
  const design = DESIGNS[id];
  const spec = canvasSpec(m.draw);
  const isIdle = motionId === 'idle';
  const L = [];

  L.push(
    isIdle
      ? '添付の参考画像のキャラクターを、ドット絵スタイルの「正面の立ち姿」1体にしてください。'
      : '添付の2枚（参考画像と、確定済みの立ち姿のドット絵）と、まったく同じキャラクター・同じ配色・同じドットの粗さで、次のポーズのドット絵を作ってください。',
    '',
    '【出力】',
    '- 画像生成機能で、画像を1枚だけ出力する。表・Excel・CSV・スプレッドシート・コード・文字での出力は禁止。説明文や感想も不要。',
    `- 画像サイズ: ${spec.shape}。`,
    '',
    '【レイアウト】'
  );
  if (m.draw === 1) {
    L.push('- キャラは1体だけ。画像の左右の中央に置く。');
  } else {
    L.push(`- 同じキャラ1体を、${m.draw} 回、横一列に等間隔で並べる（左から順）。`);
  }
  L.push(
    `- 立っている場合の身長が、画像の高さの ${spec.heightPct}% になる大きさにする。頭の大きさと肩幅は、全コマで添付の立ち姿と同じ。`,
    `- 足元（地面に接する位置）は、画像の下端から ${FEET_LINE_PCT}% の高さの同じ水平線上に、全コマで揃える。`,
    '- キャラは画像の端に触れない。'
  );
  if (m.draw > 1) {
    L.push('- コマとコマの間に、キャラの幅の半分以上の何もない余白を空ける。キャラどうしを重ねない。');
  }

  L.push(
    '',
    '【背景】',
    '- 背景は単色のマゼンタ（#ff00ff）だけ。影・床・地面の線・模様・グラデーション・エフェクト・文字は描かない。',
    '- グリッド線・マス目・枠・区切り線・番号・ラベルは描かない。スプライトシートや表の形にしない。',
    '',
    '【絵柄】',
    '- ドット絵。ドットの大きさは画像全体で均一で、ひとつひとつがはっきり見える粗さ（身長に縦約96個のドットが並ぶ程度）。',
    '- アンチエイリアス・ぼかし・グラデーション・半透明は使わない。輪郭は暗い色の1ドットの線。',
    '- 色は24色以内。配色は添付と同じ。',
    '',
    '【キャラクター】'
  );
  if (design) {
    L.push(`- ${design.who}`);
    for (const line of design.look) L.push(`- ${line}`);
    L.push(`- 描かない物: ${design.none.join('、')}`);
  } else {
    L.push('- 添付の参考画像と同じ服装・髪型・配色。成人で、服をきちんと着ている。');
  }
  L.push('- 左右対称に近いデザインにする（反転して使うため）。', '', '【ポーズ】', `- 向き: ${m.dir}。体を斜めにせず、指定の向きにそろえる。`);
  if (m.draw === 1) {
    L.push(`- ポーズ: ${m.poses[0]}`);
  } else {
    L.push('- ポーズ（コマの順）:');
    m.poses.forEach((p, i) => L.push(`  ${i + 1}コマ目: ${p}`));
  }

  console.log(L.join('\n'));
  console.log(`\n→ できた画像は ${workDir(id)}/${motionId}.png として保存してください`);
  console.log(isIdle ? '→ 添付: 参考画像のみ' : `→ 添付: 参考画像 と ${workDir(id)}/idle.png`);
}

// ---- 監視 ----
async function watch(id) {
  const dir = workDir(id);
  fs.mkdirSync(dir, { recursive: true });
  let running = false;
  let again = false;
  let timer = null;
  const run = async () => {
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      await build(id);
    } catch (error) {
      console.error(error.message);
    }
    running = false;
    if (again) {
      again = false;
      run();
    }
  };
  await run();
  console.log(`${dir}/ を監視しています（Ctrl+C で終了）`);
  fs.watch(dir, () => {
    clearTimeout(timer);
    timer = setTimeout(run, 800);
  });
}

async function main() {
  if (!characterId) {
    console.error('使い方: npm run sprite -- <list|prompt|build|watch> <キャラID> [モーションID]');
    process.exit(1);
  }
  if (command === 'list') list(characterId);
  else if (command === 'prompt') {
    if (!motionArg) throw new Error('モーションIDを指定してください（例: npm run sprite -- prompt kitten walk_side）');
    printPrompt(characterId, motionArg);
  } else if (command === 'watch') await watch(characterId);
  else await build(characterId);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});