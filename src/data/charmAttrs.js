// File: src/data/charmAttrs.js
// 敵ごとの「チャームポイント」（属性）の一覧。
//   sourceAttrs があればそれ（魔性のチャイナ娘の 胸 / 手 など）
//   主属性が「全」の敵は、実際に使う技の属性をすべて
//   それ以外は主属性ひとつ
import { ENEMIES_BY_ID } from './enemies.js';
import { SKILL_DEFS } from './skills.js';

export const ATTR_ORDER = ['mouth', 'bust', 'hand', 'hip', 'foot'];

const cache = new Map();

export function charmAttrsOf(raceId) {
  if (cache.has(raceId)) return cache.get(raceId);
  const def = ENEMIES_BY_ID[raceId];
  let attrs;
  if (!def) attrs = ['mouth'];
  else if (def.sourceAttrs?.length) attrs = [...def.sourceAttrs];
  else if (def.attr !== 'all') attrs = [def.attr];
  else {
    const ids = [def.normalSkill, ...(def.bindSkills ?? []), ...(def.skills ?? []), def.advancedSkill].filter(Boolean);
    const used = new Set(ids.map((id) => SKILL_DEFS[id]?.attr).filter((a) => a && a !== 'all'));
    attrs = ATTR_ORDER.filter((a) => used.has(a));
    if (!attrs.length) attrs = ['mouth'];
  }
  cache.set(raceId, attrs);
  return attrs;
}

/** 敵がその属性のチャームポイントを持つか */
export function hasCharmAttr(raceId, attr) {
  return charmAttrsOf(raceId).includes(attr);
}
