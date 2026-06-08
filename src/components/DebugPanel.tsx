import { useRef, useState } from 'react'
import { type Lang } from '../locales'
import { type AvatarOption, AVATAR_OPTIONS } from '../avatars'

const PIPELINE_URL = import.meta.env.VITE_PIPELINE_URL

interface Props {
  status: 'loading' | 'ready' | 'speaking' | 'error'
  lastText: string
  lastError: string
  lang: Lang
  avatar: AvatarOption
  customAvatars: AvatarOption[]
  onEvent: (type: string) => void
  onLangChange: (lang: Lang) => void
  onAvatarChange: (avatar: AvatarOption) => void
  onAddCustomAvatar: (avatar: AvatarOption) => void
}

const EVENTS = ['level_clear', 'player_die', 'near_miss', 'jump', 'start'] as const

const STATUS_COLOR: Record<Props['status'], string> = {
  loading:  '#f59e0b',
  ready:    '#22c55e',
  speaking: '#3b82f6',
  error:    '#ef4444',
}

const LANGS: Lang[] = ['en', 'ko']

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

const TOOLTIP_TEXT = [
  '1. VRoid Studio에서 아바타 제작',
  '2. [VRM 내보내기] → 폴리곤 감소 활성화',
  '3. 목표 크기: 9MB 이하',
  '4. .vrm 파일 선택 후 업로드',
  '5. 변환 완료 후 자동 적용 (20~30초)',
].join('\n')

function Tooltip() {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block', marginLeft: 6 }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          cursor: 'help', color: '#64748b', fontSize: 11,
          border: '1px solid #334155', borderRadius: '50%',
          width: 15, height: 15, display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', lineHeight: 1,
        }}
      >
        ?
      </span>
      {show && (
        <div style={{
          position: 'absolute', left: 20, top: -4, zIndex: 99999,
          background: '#0f172a', border: '1px solid #334155',
          borderRadius: 8, padding: '8px 10px',
          fontSize: 11, color: '#cbd5e1', whiteSpace: 'pre',
          lineHeight: 1.7, width: 210, pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}>
          {TOOLTIP_TEXT}
        </div>
      )}
    </span>
  )
}

export default function DebugPanel({ status, lastText, lastError, lang, avatar, customAvatars, onEvent, onLangChange, onAvatarChange, onAddCustomAvatar }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadError, setUploadError] = useState('')

  const allAvatars = [...AVATAR_OPTIONS, ...customAvatars]

  async function handleUpload(file: File) {
    setUploadState('uploading')
    setUploadError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${PIPELINE_URL}/convert`, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const newAvatar: AvatarOption = {
        id: `upload-${Date.now()}`,
        label: file.name.replace(/\.vrm$/i, ''),
        url,
        note: 'uploaded',
      }
      setUploadState('done')
      onAddCustomAvatar(newAvatar)
    } catch (e) {
      setUploadError(String(e))
      setUploadState('error')
    }
  }

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

      {/* 아바타 선택 */}
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>Avatar</div>
      <select
        value={avatar.id}
        onChange={e => {
          const found = allAvatars.find(a => a.id === e.target.value)
          if (found) onAvatarChange(found)
        }}
        style={{
          width: '100%', background: '#1e293b', color: '#e2e8f0',
          border: '1px solid #334155', borderRadius: 6,
          padding: '4px 8px', fontSize: 11, marginBottom: 10, cursor: 'pointer',
        }}
      >
        {allAvatars.map(a => (
          <option key={a.id} value={a.id}>
            {a.label} {a.note ? `(${a.note})` : ''}
          </option>
        ))}
      </select>

      {/* VRM 업로드 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>Upload VRM</span>
        <Tooltip />
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".vrm"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleUpload(file)
          e.target.value = ''
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploadState === 'uploading'}
        style={{
          width: '100%',
          background: uploadState === 'uploading' ? '#1e293b' : '#0f172a',
          color: uploadState === 'uploading' ? '#64748b' : '#94a3b8',
          border: '1px solid #334155', borderRadius: 6,
          padding: '5px 8px', cursor: uploadState === 'uploading' ? 'not-allowed' : 'pointer',
          fontSize: 11, marginBottom: 4, textAlign: 'left',
        }}
      >
        {uploadState === 'uploading' ? '⏳ 변환 중 (20~30초)...' :
         uploadState === 'done'      ? '✅ .vrm 파일 선택' :
                                       '📁 .vrm 파일 선택'}
      </button>
      {uploadState === 'error' && (
        <div style={{ color: '#fca5a5', fontSize: 10, marginBottom: 4, wordBreak: 'break-all' }}>
          {uploadError}
        </div>
      )}

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
