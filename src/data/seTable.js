// File: src/data/seTable.js
// synth は audio.js の合成音の名前。assets/se/<ID>.ogg などを置くと、そちらが優先される。
export const SE_TABLE = {
  kissDrain: { synth: 'kiss', gain: 0.9, spatial: true },
  kissAir: { synth: 'kiss', gain: 0.7, spatial: true },
  bustRub: { synth: 'rub', gain: 0.9, spatial: true },
  hipStroke: { synth: 'stroke', gain: 0.9, spatial: true },
  footPress: { synth: 'press', gain: 0.9, spatial: true },
  breath: { synth: 'breath', gain: 0.8, spatial: true },
  debuffDown: { synth: 'down', gain: 0.9, spatial: false },
  enemyGrow: { synth: 'grow', gain: 0.8, spatial: false },
  learn: { synth: 'learn', gain: 0.8, spatial: false },
  flashback: { synth: 'swell', gain: 0.9, spatial: false },
  tick: { synth: 'tick', gain: 0.6, spatial: false },
  slash: { synth: 'slash', gain: 0.8, spatial: true },
  thud: { synth: 'thud', gain: 0.9, spatial: true },
  warning: { synth: 'warning', gain: 0.65, spatial: true },
  bind: { synth: 'bind', gain: 0.8, spatial: true },
  unite: { synth: 'unite', gain: 0.8, spatial: true }
};