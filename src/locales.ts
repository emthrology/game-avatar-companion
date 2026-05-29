export type Lang = 'ko' | 'en'

export type GameEventType = 'player_die' | 'level_clear' | 'near_miss' | 'jump' | 'start'

export const REACTIONS: Record<Lang, Record<GameEventType, string[]>> = {
  ko: {
    player_die:  ['아이고~!', '다시 해봐요!', '괜찮아요, 할 수 있어요!'],
    level_clear: ['우와! 대단해요!', '클리어! 최고예요!', '완벽해요!'],
    near_miss:   ['위험했다!', '아슬아슬~!'],
    jump:        ['점프!', '날아올라요!'],
    start:       ['시작해볼까요?', '파이팅!'],
  },
  en: {
    player_die:  ['Oh no!', 'Try again, you got this!', "Don't give up!"],
    level_clear: ['Amazing! You cleared it!', 'Woohoo! Perfect run!', 'Incredible!'],
    near_miss:   ['That was close!', 'Whoa, barely made it!'],
    jump:        ['Jump!', 'Nice jump!'],
    start:       ["Let's go!", 'Good luck!'],
  },
}

export const TTS_CONFIG: Record<Lang, { languageCode: string; name: string }> = {
  ko: { languageCode: 'ko-KR', name: 'ko-KR-Wavenet-A' },
  en: { languageCode: 'en-US', name: 'en-US-Wavenet-F' },
}

// en만 TalkingHead lipsync 모듈 존재
export const LIPSYNC_MODULE: Record<Lang, string | null> = {
  ko: null,
  en: 'en',
}

