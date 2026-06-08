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
        lightAmbientColor: 0xffffff,
        lightAmbientIntensity: 3,
        lightDirectColor: 0xfff5e0,  // 따뜻한 흰색 (기본 파란빛 회색 0x8888aa 대비)
        lightDirectIntensity: 25,
        lightSpotColor: 0xffffff,
        lightSpotIntensity: 15,      // Head 본 타겟 스팟 활성화
        lightSpotPhi: 0.5,           // 정면 위쪽에서 비춤
        lightSpotTheta: 3.14,        // 카메라 방향 (정면)
        lightSpotDispersion: 0.8,
      })

      await head.showAvatar({
        url: avatar.url,
        body: 'F',
        avatarMood: 'neutral',
        ttsLang: TTS_CONFIG[lang].languageCode,
      })

      if (avatar.url.startsWith('/avatars/') || avatar.url.startsWith('blob:')) {
        const THREE = await import('three')

        // 2단계 그라디언트: shadow를 밝게 유지 → 인위적 명암 경계 최소화
        const gradData = new Uint8Array([160, 255])
        const gradientMap = new THREE.DataTexture(gradData, 2, 1, THREE.RedFormat)
        gradientMap.minFilter = THREE.NearestFilter
        gradientMap.magFilter = THREE.NearestFilter
        gradientMap.needsUpdate = true

        ;(head as any).renderer.toneMappingExposure = 0.65
        ;(head as any).scene.environmentIntensity = 0.0
        ;(head as any).setLighting({
          lightAmbientIntensity: 2.5,
          lightDirectColor: 0xffffff,
          lightDirectIntensity: 3,
          lightDirectPhi: 0.3,
          lightDirectTheta: 3.14,
          lightSpotIntensity: 0,
        })

        const replaceMat = (mat: any): any => {
          if (!mat?.isMeshStandardMaterial) return mat
          const toon = new THREE.MeshToonMaterial({
            map:         mat.map,
            color:       mat.color.clone(),
            gradientMap,
            alphaMap:    mat.alphaMap,
            transparent: mat.transparent,
            opacity:     mat.opacity,
            alphaTest:   mat.alphaTest,
            side:        mat.side,
            depthWrite:  mat.depthWrite,
          })
          mat.dispose()
          return toon
        }

        ;(head as any).scene.traverse((obj: any) => {
          if (!obj.isMesh) return
          if (Array.isArray(obj.material)) {
            obj.material = obj.material.map(replaceMat)
          } else {
            obj.material = replaceMat(obj.material)
          }
        })
      }

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
