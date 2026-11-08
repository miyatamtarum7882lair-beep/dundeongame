// File: src/data/motions.js
// ドット絵のモーションの登録表。
// モーションを増やすときは、MOTIONS に1つ足し、CHARACTER_MOTIONS のキャラに ID を足す。
//
// ファイル名の決まり:
//   work/<キャラID>/<モーションID>.png         そのモーションのコマを横一列に並べた1枚（draw が1なら1コマ）
//   work/<キャラID>/<モーションID>_<番号>.png  手直ししたコマだけを差し替えるとき（番号は layout の位置。1から）
//
// layout の書き方（シートに並ぶ順。左から）:
//   'd1' 'd2' …  このモーションの画像の、1コマ目・2コマ目…
//   'idle'       待機の1コマ目
//   '=2'         この layout の2番目と同じコマ（コピー）
//   '~2'         この layout の2番目を左右反転したコマ
//
// fps: 再生の速さ / loop: false は1回だけ再生（攻撃・特殊攻撃・被弾）/ optional: なくても警告しない
export const MOTIONS = [
  { id: 'idle', label: '待機', dir: '正面（下向き）', draw: 1, layout: ['d1', '=1'], fps: 2, loop: true,
    poses: ['まっすぐ立って、こちらを向く'] },
  { id: 'walk_down', label: '歩き（正面）', dir: '正面（下向き）', draw: 1, layout: ['idle', 'd1', '=1', '~2'], fps: 6, loop: true,
    poses: ['歩き。右足を前に出した瞬間'] },
  { id: 'walk_up', label: '歩き（背面）', dir: '背面（上向き）', draw: 2, layout: ['d1', 'd2', '=1', '~2'], fps: 6, loop: true,
    poses: ['背面の立ち姿', '背面で歩く。右足を前に出した瞬間'] },
  { id: 'walk_side', label: '歩き（横）', dir: '右向き', draw: 3, layout: ['d1', 'd2', '=1', 'd3'], fps: 6, loop: true,
    poses: ['横向きの立ち姿', '横向きで歩く。右足を前に出した瞬間', '横向きで歩く。左足を前に出した瞬間'] },
  { id: 'hit', label: '被弾', dir: '正面（下向き）', draw: 1, layout: ['d1'], fps: 8, loop: false,
    poses: ['のけぞって驚いた顔'] },

  { id: 'attack_down', label: '攻撃（正面）', dir: '正面（下向き）', draw: 2, layout: ['d1', 'd2'], fps: 8, loop: false,
    poses: ['右腕を後ろに引いて、拳を握って構える', '右腕を前へ振り抜く。拳は握ったまま、体を前へ傾ける'] },
  { id: 'attack_side', label: '攻撃（横）', dir: '右向き', draw: 2, layout: ['d1', 'd2'], fps: 8, loop: false,
    poses: ['右腕を後ろに引いて、拳を握って構える', '右腕を前へ振り抜く。拳は握ったまま、体を前へ傾ける'] },
  { id: 'guard', label: 'ガード', dir: '正面（下向き）', draw: 1, layout: ['d1'], fps: 8, loop: false,
    poses: ['両腕を前で交差させて身を守る'] },

  { id: 'skill_blowKiss', label: '特殊攻撃：投げキッス', dir: '正面（下向き）', draw: 2, layout: ['d1', 'd2'], fps: 6, loop: false,
    poses: ['片手を口元に当てる（構え）', '手を前へ送り出す（発動）'] },
  { id: 'skill_pinkBreath', label: '特殊攻撃：桃色の吐息', dir: '正面（下向き）', draw: 2, layout: ['d1', 'd2'], fps: 6, loop: false,
    poses: ['息を吸って胸を張る', '顔を前へ向けて息を吹く'] },
  { id: 'skill_sexyPose', label: '特殊攻撃：セクシーポーズ', dir: '正面（下向き）', draw: 2, layout: ['d1', 'd2'], fps: 6, loop: false,
    poses: ['腰に手を当てて振り返る', 'いたずらっぽく微笑んでウィンクする'] },

  { id: 'panic', label: '動揺', dir: '正面（下向き）', draw: 1, layout: ['d1'], fps: 6, loop: true, optional: true,
    poses: ['あたふたして両手を振る'] },
  { id: 'trance', label: '見入り', dir: '正面（下向き）', draw: 1, layout: ['d1'], fps: 6, loop: true, optional: true,
    poses: ['ぼうっと立ち尽くして見とれている'] },
  { id: 'flee', label: '逃走', dir: '右向き', draw: 1, layout: ['d1'], fps: 6, loop: true, optional: true,
    poses: ['怯えて走り出す'] },
  { id: 'cast', label: '魔法（回復・バフ）', dir: '正面（下向き）', draw: 2, layout: ['d1', 'd2'], fps: 6, loop: false, optional: true,
    poses: ['両手を胸の前で合わせる', '両手を前へ広げて差し出す'] },

  { id: 'charm', label: '誘惑（見とれ）', dir: '正面（下向き）', draw: 4, layout: ['d1', 'd2', 'd3', 'd4'], fps: 6, loop: true, optional: true,
    poses: ['こちらに目線を向ける', '片手で手招きする', '微笑む', '手招きを戻す'] },
  { id: 'beg', label: '命乞い誘惑', dir: '正面（下向き）', draw: 4, layout: ['d1', 'd2', 'd3', 'd4'], fps: 6, loop: false, optional: true,
    poses: ['その場にしゃがみ込む', '上目づかいで見上げる', '両手を前で合わせてお願いする', 'にやりと笑う'] },

  { id: 'bound', label: '拘束された姿（主人公）', dir: '正面（下向き）', draw: 1, layout: ['d1'], fps: 6, loop: true, optional: true,
    poses: ['体を縮めて動けず、顔を赤らめてうつむく'] },
  { id: 'down', label: '倒れ（敗北）', dir: '正面（下向き）', draw: 1, layout: ['d1'], fps: 6, loop: false, optional: true,
    poses: ['膝をついてうなだれる'] },
  { id: 'bind_down', label: '拘束中の敵（正面）', dir: '正面（下向き）', draw: 2, layout: ['d1', 'd2'], fps: 3, loop: true, optional: true,
    poses: ['両腕を前に伸ばして相手を抱き寄せる', 'さらに引き寄せて、顔を近づけて微笑む'] },
  { id: 'bind_side', label: '拘束中の敵（横）', dir: '右向き', draw: 2, layout: ['d1', 'd2'], fps: 3, loop: true, optional: true,
    poses: ['横向きで、両腕を前に伸ばして相手を抱き寄せる', '横向きで、さらに引き寄せて微笑む'] }
];

export const MOTIONS_BY_ID = Object.fromEntries(MOTIONS.map((m) => [m.id, m]));

// キャラごとに作るモーション。書かれていないキャラは DEFAULT_MOTIONS
export const CHARACTER_MOTIONS = {
  hero: ['idle', 'walk_down', 'walk_up', 'walk_side', 'attack_down', 'attack_side', 'guard', 'hit',
         'bound', 'down'],
  priest: ['idle', 'walk_down', 'walk_up', 'walk_side', 'hit', 'panic', 'trance', 'flee',
           'cast', 'down'],
  kitten: ['idle', 'walk_down', 'walk_up', 'walk_side', 'hit',
           'skill_blowKiss', 'skill_pinkBreath', 'skill_sexyPose',
           'beg', 'bind_down', 'bind_side'],
  dancer: ['idle', 'walk_down', 'walk_up', 'walk_side', 'hit', 'skill_sexyPose',
           'beg', 'bind_down', 'bind_side']
};

export const DEFAULT_MOTIONS = ['idle', 'walk_down', 'walk_up', 'walk_side', 'hit',
                                'skill_blowKiss', 'skill_pinkBreath', 'skill_sexyPose',
                                'beg', 'bind_down', 'bind_side'];

export function motionsFor(characterId) {
  return CHARACTER_MOTIONS[characterId] ?? DEFAULT_MOTIONS;
}
