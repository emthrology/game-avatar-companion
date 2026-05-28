import { useEffect } from 'react'
import { type Lang, type GameEventType, REACTIONS } from '../locales'

interface GameEventDetail {
  type: GameEventType
  score?: number
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function useGameEvents(onSpeak: (text: string) => void, lang: Lang) {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<GameEventDetail>).detail
      const lines = REACTIONS[lang][detail.type]
      if (lines) onSpeak(pick(lines))
    }

    window.addEventListener('game:event', handler)
    return () => window.removeEventListener('game:event', handler)
  }, [onSpeak, lang])
}
