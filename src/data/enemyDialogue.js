// An enemy has at most one interactive skill. Other skills can still speak through battle logs.
export const ENEMY_DIALOGUE = {
  kitten: {
    choice: {
      skillId: 'blowKiss',
      intro: 'ねえ、こっちを見て。私のキス、避けられる？',
      resistLabel: 'よける',
      acceptLabel: 'よけられない',
      resistLine: 'ふふ、逃げてみて！',
      acceptLine: 'いい子。受け止めてね。',
      timeoutLine: 'もう目を離せないよね？'
    },
    speech: '私のこと、ちゃんと見ていてね。'
  },
  blackRibbon: {
    choice: {
      skillId: 'levelDrainKiss',
      intro: '逃げないで。あなたの力を、少し分けて？',
      resistLabel: 'ふりきる',
      acceptLabel: '受け入れる',
      resistLine: 'ふりきれるかしら？',
      acceptLine: 'ありがとう。大切にいただくわ。',
      timeoutLine: '返事がないなら、いただくわね。'
    },
    speech: 'まだ逃がしてあげない。'
  },
  pinkFox: {
    choice: {
      skillId: 'sexyPose',
      intro: 'この姿から、目をそらせる？',
      resistLabel: '目をそらす',
      acceptLabel: '見とれる',
      resistLine: 'あら、照れちゃった？',
      acceptLine: 'そう、もっと見て。',
      timeoutLine: 'もう夢中みたいね。'
    },
    speech: 'ふふ、いい顔。'
  }
};

const GENERIC_SPEECH = {
  mouth: 'こちらを向いて。',
  bust: '少し力を抜いてね。',
  hip: '私から逃げられる？',
  foot: '動かないでね。',
  all: 'さあ、私の番よ。'
};

export function choiceFor(speciesId, skillId) {
  const choice = ENEMY_DIALOGUE[speciesId]?.choice;
  return choice?.skillId === skillId ? choice : null;
}

export function speechFor(speciesId, attr) {
  return ENEMY_DIALOGUE[speciesId]?.speech ?? GENERIC_SPEECH[attr] ?? GENERIC_SPEECH.all;
}
