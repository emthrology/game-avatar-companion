# CLAUDE.md — game-avatar-companion

웹게임 위에 올라가는 VTuber 스타일 3D 아바타 컴패니언.
게임 이벤트에 반응하며 실시간 립싱크로 말함.

## 참고 레퍼런스

- https://github.com/met4citizen/TalkingHead — 렌더링 + 립싱크 엔진 (@1.3 태그 사용 중)

## 목표 동작

웹게임(급똥 어드벤처 등) 위에 CSS 오버레이로 3D 캐릭터가 떠서,
게임 이벤트(점프, 실패, 클리어 등)에 반응해 TTS + 립싱크로 말함.

```
웹게임 canvas/iframe
      +
React 오버레이 (position: fixed 또는 absolute)
  └── TalkingHead.js (Three.js WebGL canvas)
        └── GLB 아바타 (brunette.glb — TalkingHead 공식 예제)
              └── 게임 이벤트 → speakAudio() 호출
```

## 기술 스택

| 역할 | 도구 |
|------|------|
| 3D 렌더링 + 립싱크 | TalkingHead.js @1.3 (CDN ESM) |
| 아바타 포맷 | GLB (Mixamo 리그 + ARKit 52 + Oculus 15 blendshapes) |
| 현재 아바타 | `brunette.glb` (TalkingHead 공식 예제, 비압축) |
| 프레임워크 | React + Vite (ESM 전용이라 Vite 필수, CRA 금지) |
| TTS | Google Cloud Text-to-Speech REST API |
| 배포 | Vercel (Hobby 무료 플랜) |

## 현재 프로젝트 구조

```
game-avatar-companion/
├── public/
│   └── avatars/
│       └── companion.glb        # brunette.glb (TalkingHead 공식 예제)
├── src/
│   ├── components/
│   │   ├── AvatarOverlay.tsx    # TalkingHead 래핑 + Google TTS 연동, 언어별 lipsync 분기
│   │   └── DebugPanel.tsx       # 개발용 상태 UI (상태/대사/에러/이벤트 버튼/언어 토글)
│   ├── hooks/
│   │   └── useGameEvents.ts     # game:event CustomEvent 수신 훅 (lang 파라미터)
│   ├── locales.ts               # ko/en 반응 대사, TTS 음성, lipsync 모듈 설정
│   ├── vite-env.d.ts            # vite/client 타입 + TalkingHead CDN 모듈 선언
│   └── App.tsx                  # lang 상태 관리
├── index.html                   # importmap: three@0.180.0 CDN 매핑
├── vercel.json                  # SPA 라우팅 rewrite 설정
├── vite.config.ts
└── .env                         # VITE_GOOGLE_TTS_API_KEY
```

## i18n 구조 (locales.ts)

언어별 반응 대사, TTS 음성, lipsync 모드를 `locales.ts` 한 곳에서 관리.

```typescript
export type Lang = 'ko' | 'en'

// 반응 대사
REACTIONS[lang][eventType]  // 언어별 랜덤 선택

// TTS 음성
TTS_CONFIG = {
  ko: { languageCode: 'ko-KR', name: 'ko-KR-Wavenet-A' },
  en: { languageCode: 'en-US', name: 'en-US-Wavenet-F' },  // 여성 음성
}

// lipsync 모듈 (TalkingHead @1.3 지원: en, fi, lt만 존재 — ko 없음)
LIPSYNC_MODULE = {
  ko: null,   // 진폭 기반 입 움직임
  en: 'en',   // 단어 타이밍 기반 립싱크
}
```

## TalkingHead lipsync 언어별 동작 방식

| 언어 | lipsyncModules | speakAudio 방식 |
|------|---------------|-----------------|
| en | `['en']` | words/wtimes/wdurations 계산 → 단어 기반 립싱크 |
| ko | (없음) | audio만 전달 → 오디오 진폭 기반 입 움직임 |

**주의: TalkingHead @1.3~1.7 모두 한국어(ko) lipsync 모듈 없음.** `lipsyncModules: ['ko']` 지정 시 `preProcessText` TypeError 발생.

## TalkingHead 핵심 API (실제 사용 방식)

```javascript
// 초기화 — ttsEndpoint는 필수 (null 불가, @1.3에서 throw)
const head = new TalkingHead(domNode, {
  ttsEndpoint: `https://texttospeech.googleapis.com/v1/text:synthesize?key=${KEY}`,
  lipsyncModules: ['en'],   // en만 사용. ko 없음
  cameraView: 'upper',
});

// 아바타 로드
await head.showAvatar({ url: '/avatars/companion.glb', body: 'F', avatarMood: 'neutral' });

// 영어: 단어 타이밍 기반 립싱크
head.speakAudio({ audio: AudioBuffer, words, wtimes, wdurations }, { lipsyncLang: 'en' });

// 한국어: 진폭 기반 (words 없이)
head.speakAudio({ audio: AudioBuffer });

// 감정 변경
head.setMood('happy');   // neutral | happy | angry | sad | fear | love
```

## Google TTS 연동 구조

```
브라우저 → Google TTS REST API → base64 MP3
        → atob → Uint8Array → AudioContext.decodeAudioData → AudioBuffer
        → speakAudio(payload, options)
```

- Google TTS는 word timing을 제공하지 않으므로 오디오 길이를 단어 수로 균등 분배해 wtimes/wdurations 추정
- AudioContext는 싱글턴(`sharedAudioCtx`) 재사용 — 매 발화마다 생성 시 브라우저 한도 초과 가능
- `suspended` 상태면 user gesture 이후 `resume()` 필요

## 게임 이벤트 연동

```typescript
// 게임에서 이벤트 발생
window.dispatchEvent(new CustomEvent('game:event', {
  detail: { type: 'player_die' }
}));

// 지원 이벤트 타입
type GameEventType = 'player_die' | 'level_clear' | 'near_miss' | 'jump' | 'start'
```

## 작업 상태

- [x] React + Vite 프로젝트 초기화
- [x] TalkingHead.js @1.3 CDN ESM 통합
- [x] index.html importmap으로 three@0.180.0 CDN 매핑
- [x] brunette.glb 로드 및 오버레이 렌더링 확인
- [x] 게임 이벤트 훅 작성 (useGameEvents.ts)
- [x] Google TTS REST API 연동 코드 완성
- [x] DebugPanel (상태/대사/에러/이벤트 버튼) 추가
- [x] TypeScript 타입 오류 수정 (vite-env.d.ts, CDN 모듈 선언)
- [x] AudioContext 싱글턴화 (브라우저 한도 대응)
- [x] ko lipsync 모듈 부재 디버그 → 진폭 기반으로 전환
- [x] i18n 구조 도입 (locales.ts) — ko/en 대사, TTS 음성, lipsync 분기
- [x] DebugPanel 언어 토글 (EN/KO 버튼)
- [x] Vercel 배포 (Hobby 무료 플랜)
- [ ] Google TTS API 키 리퍼러 제한 해제 확인
- [ ] TTS + 립싱크 동작 최종 확인 (en 기준)
- [ ] 커스텀 아바타 교체 (Avaturn 등)
- [ ] 실제 게임 iframe 위 오버레이 연동

## 주의사항 / 트러블슈팅

- **TalkingHead @1.3은 ttsEndpoint 필수** — `null` 전달 시 생성자에서 throw
- **ko lipsync 모듈 없음** — `lipsyncModules: ['ko']` 지정 시 `preProcessText` TypeError. v1.7까지 미지원
- **importmap 필수** — TalkingHead CDN ESM이 `import "three"` bare specifier 사용
- **GLB meshopt 압축 주의** — `vroid.glb`는 meshopt 압축됨 → TalkingHead @1.3 미지원 → `brunette.glb`(비압축) 사용
- **Ready Player Me 서비스 종료** — 2026년 1월 Netflix 인수 후 종료. 대안: Avaturn
- Three.js 버전 고정: `three@0.180.0`
- GLB CORS → `public/` 폴더에 위치시켜 same-origin 서빙

## 환경변수

```
VITE_GOOGLE_TTS_API_KEY=...   # Google Cloud TTS API 키
                               # API 키 HTTP 리퍼러 제한 없어야 브라우저에서 직접 호출 가능
```

## 배포

- Vercel Hobby (무료): `vercel --prod`
- 환경변수: Vercel 대시보드 또는 `vercel env add VITE_GOOGLE_TTS_API_KEY`
- `vercel.json`의 rewrite로 SPA 라우팅 처리
