import { type Lang } from '../locales'

interface Props {
  status: 'loading' | 'ready' | 'speaking' | 'error'
  lastText: string
  lastError: string
  lang: Lang
  onEvent: (type: string) => void
  onLangChange: (lang: Lang) => void
}

const EVENTS = ['level_clear', 'player_die', 'near_miss', 'jump', 'start'] as const

const STATUS_COLOR: Record<Props['status'], string> = {
  loading:  '#f59e0b',
  ready:    '#22c55e',
  speaking: '#3b82f6',
  error:    '#ef4444',
}

const LANGS: Lang[] = ['en', 'ko']

export default function DebugPanel({ status, lastText, lastError, lang, onEvent, onLangChange }: Props) {
  return (
    <div style={{
      position: 'fixed', top: 16, left: 16,
      background: 'rgba(0,0,0,0.75)', color: '#fff',
      borderRadius: 10, padding: '12px 16px',
      fontFamily: 'monospace', fontSize: 13, minWidth: 220,
      backdropFilter: 'blur(6px)',
      zIndex: 9999,
    }}>
      {/* 상태 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: STATUS_COLOR[status],
          boxShadow: `0 0 6px ${STATUS_COLOR[status]}`,
        }} />
        <span style={{ color: STATUS_COLOR[status], fontWeight: 'bold' }}>{status.toUpperCase()}</span>
      </div>

      {/* 발화 텍스트 */}
      {lastText && (
        <div style={{ marginBottom: 10, color: '#a5f3fc', wordBreak: 'keep-all' }}>
          💬 {lastText}
        </div>
      )}

      {/* 에러 */}
      {lastError && (
        <div style={{ marginBottom: 10, color: '#fca5a5', fontSize: 11, wordBreak: 'break-all' }}>
          ⚠️ {lastError}
        </div>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid #333', margin: '8px 0' }} />

      {/* 언어 토글 */}
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>Language</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {LANGS.map(l => (
          <button
            key={l}
            onClick={() => onLangChange(l)}
            style={{
              background: lang === l ? '#6366f1' : '#1e293b',
              color: lang === l ? '#fff' : '#94a3b8',
              border: `1px solid ${lang === l ? '#6366f1' : '#334155'}`,
              borderRadius: 6,
              padding: '4px 10px', cursor: 'pointer', fontSize: 11,
              fontWeight: lang === l ? 'bold' : 'normal',
            }}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #333', margin: '8px 0' }} />

      {/* 이벤트 버튼 */}
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>Game Events</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {EVENTS.map(type => (
          <button
            key={type}
            onClick={() => onEvent(type)}
            style={{
              background: '#1e293b', color: '#e2e8f0',
              border: '1px solid #334155', borderRadius: 6,
              padding: '4px 8px', cursor: 'pointer', fontSize: 11,
            }}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  )
}
