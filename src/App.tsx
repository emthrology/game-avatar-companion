import { useState, useCallback } from 'react'
import AvatarOverlay, { AvatarStatus } from './components/AvatarOverlay'
import DebugPanel from './components/DebugPanel'
import { type Lang, type Reaction } from './locales'
import { type AvatarOption, DEFAULT_AVATAR } from './avatars'

export default function App() {
  const [status, setStatus] = useState<AvatarStatus>('loading')
  const [lastText, setLastText] = useState('')
  const [lastError, setLastError] = useState('')
  const [lang, setLang] = useState<Lang>('en')
  const [avatar, setAvatar] = useState<AvatarOption>(DEFAULT_AVATAR)

  const handleEvent = useCallback((type: string) => {
    window.dispatchEvent(new CustomEvent('game:event', { detail: { type } }))
  }, [])

  const handleLangChange = useCallback((l: Lang) => {
    setLang(l)
    setStatus('loading')
    setLastText('')
    setLastError('')
  }, [])

  const handleAvatarChange = useCallback((a: AvatarOption) => {
    setAvatar(a)
    setStatus('loading')
    setLastText('')
    setLastError('')
  }, [])

  const handleStatus = useCallback((s: AvatarStatus) => setStatus(s), [])
  const handleSpeak = useCallback((r: Reaction) => { setLastText(r.text); setLastError('') }, [])
  const handleError = useCallback((e: string) => setLastError(e), [])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#444', fontSize: 24,
      }}>
        Game Area
      </div>

      <DebugPanel
        status={status}
        lastText={lastText}
        lastError={lastError}
        lang={lang}
        avatar={avatar}
        onEvent={handleEvent}
        onLangChange={handleLangChange}
        onAvatarChange={handleAvatarChange}
      />

      <AvatarOverlay
        key={`${lang}-${avatar.id}`}
        lang={lang}
        avatar={avatar}
        onStatus={handleStatus}
        onSpeak={handleSpeak}
        onError={handleError}
      />
    </div>
  )
}
