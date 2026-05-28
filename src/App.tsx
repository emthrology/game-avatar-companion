import { useState, useCallback } from 'react'
import AvatarOverlay, { AvatarStatus } from './components/AvatarOverlay'
import DebugPanel from './components/DebugPanel'
import { type Lang } from './locales'

export default function App() {
  const [status, setStatus] = useState<AvatarStatus>('loading')
  const [lastText, setLastText] = useState('')
  const [lastError, setLastError] = useState('')
  const [lang, setLang] = useState<Lang>('en')

  const handleEvent = useCallback((type: string) => {
    window.dispatchEvent(new CustomEvent('game:event', { detail: { type } }))
  }, [])

  const handleLangChange = useCallback((l: Lang) => {
    setLang(l)
    setStatus('loading')
    setLastText('')
    setLastError('')
  }, [])

  const handleStatus = useCallback((s: AvatarStatus) => setStatus(s), [])
  const handleSpeak = useCallback((t: string) => { setLastText(t); setLastError('') }, [])
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
        onEvent={handleEvent}
        onLangChange={handleLangChange}
      />

      <AvatarOverlay
        key={lang}
        lang={lang}
        onStatus={handleStatus}
        onSpeak={handleSpeak}
        onError={handleError}
      />
    </div>
  )
}
