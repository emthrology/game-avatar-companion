import { useEffect, useRef, useCallback, useState } from 'react'
import { useGameEvents } from '../hooks/useGameEvents'
import { type Lang, type Reaction, TTS_CONFIG, LIPSYNC_MODULE } from '../locales'
import { type AvatarOption } from '../avatars'

const GOOGLE_TTS_API_KEY = import.meta.env.VITE_GOOGLE_TTS_API_KEY as string

export type AvatarStatus = 'loading' | 'ready' | 'speaking' | 'error'

interface SpeakAudioPayload {
  audio: AudioBuffer
  words?: string[]
  wtimes?: number[]
  wdurations?: number[]
}

// AudioContext 싱글턴 — 매 발화마다 생성 시 브라우저 한도 초과 가능
let sharedAudioCtx: AudioContext | null = null
function getAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioContext()
  }
  return sharedAudioCtx
}

async function googleTTS(reaction: Reaction, lang: Lang): Promise<SpeakAudioPayload> {
  const voice = TTS_CONFIG[lang]
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: reaction.text },
        voice,
        audioConfig: { audioEncoding: 'MP3' },
      }),
    }
  )
  const json = await res.json()
  if (json.error) {
    throw new Error(`Google TTS error: ${json.error.code} ${json.error.message}`)
  }
  if (!json.audioContent) {
    throw new Error(`Google TTS: no audioContent — ${JSON.stringify(json)}`)
  }

  const binary = atob(json.audioContent)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  const audioCtx = getAudioContext()
  if (audioCtx.state === 'suspended') await audioCtx.resume()
  const audio = await audioCtx.decodeAudioData(bytes.buffer.slice(0))

  const lipsyncModule = LIPSYNC_MODULE[lang]
  if (lipsyncModule) {
    // ko: roman 발음 표기로 words 계산 → fi 모듈이 로마자 파싱
    // en: text 그대로 words 계산
    const wordSource = reaction.roman ?? reaction.text
    const words = wordSource.split(/\s+/).filter(Boolean)
    const totalMs = audio.duration * 1000
    const perWord = totalMs / Math.max(words.length, 1)
    return {
      audio,
      words,
      wtimes: words.map((_, i) => i * perWord),
      wdurations: words.map(() => perWord * 0.85),
    }
  }

  return { audio }
}

interface Props {
  lang: Lang
  avatar: AvatarOption
  onStatus: (s: AvatarStatus) => void
  onSpeak: (reaction: Reaction) => void
  onError: (msg: string) => void
}

export default function AvatarOverlay({ lang, avatar, onStatus, onSpeak, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headRef = useRef<any>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    async function init() {
      const { TalkingHead } = await import(
        'https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.3/modules/talkinghead.mjs'
      )
      if (cancelled || !containerRef.current) return

      const lipsyncModule = LIPSYNC_MODULE[lang]
      const head = new TalkingHead(containerRef.current, {
        ttsEndpoint: `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
        ...(lipsyncModule ? { lipsyncModules: [lipsyncModule] } : {}),
        cameraView: 'upper',
      })

      await head.showAvatar({
        url: avatar.url,
        body: 'F',
        avatarMood: 'neutral',
        ttsLang: TTS_CONFIG[lang].languageCode,
      })

      headRef.current = head
      setReady(true)
      onStatus('ready')
    }

    init().catch((err) => {
      onStatus('error')
      onError(String(err))
    })
    return () => { cancelled = true }
  }, [lang, avatar, onStatus, onError])

  const speak = useCallback(async (reaction: Reaction) => {
    const head = headRef.current
    if (!head) return

    onSpeak(reaction)
    onStatus('speaking')
    try {
      const payload = await googleTTS(reaction, lang)
      const lipsyncLang = LIPSYNC_MODULE[lang]
      head.speakAudio(payload, lipsyncLang ? { lipsyncLang } : {})
      setTimeout(() => onStatus('ready'), payload.audio.duration * 1000 + 500)
    } catch (err) {
      onStatus('error')
      onError(String(err))
    }
  }, [lang, onStatus, onSpeak, onError])

  useGameEvents(speak, lang)

  useEffect(() => {
    if (!ready) return
    const handler = (e: Event) => {
      const text = (e as CustomEvent<{ text: string }>).detail.text
      speak({ text })
    }
    window.addEventListener('avatar:speak', handler)
    return () => window.removeEventListener('avatar:speak', handler)
  }, [ready, speak])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: 300,
        height: 400,
        pointerEvents: 'none',
      }}
    />
  )
}
