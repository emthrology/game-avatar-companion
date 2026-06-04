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
        └── GLB 아바타 (CDN 또는 public/avatars/)
              └── 게임 이벤트 → speakAudio() 호출
```

## 기술 스택

| 역할 | 도구 |
|------|------|
| 3D 렌더링 + 립싱크 | TalkingHead.js @1.3 (CDN ESM) |
| 아바타 포맷 | GLB (Mixamo 리그 + ARKit 52 + Oculus 15 blendshapes) |
| 프레임워크 | React + Vite (ESM 전용이라 Vite 필수, CRA 금지) |
| TTS | Google Cloud Text-to-Speech REST API |
| 배포 | Vercel (Hobby 무료 플랜) |

## 현재 프로젝트 구조

```
game-avatar-companion/
├── public/
│   └── avatars/
│       ├── vroid-custom.glb     # 커스텀 VRoid (my_avatar.vrm → 변환)
│       ├── avatar-sample-m.glb  # AvatarSample_M.vrm → 변환
│       ├── sample-b.glb         # sample_b.vrm → 변환
│       ├── sample-c.glb         # sample_c.vrm → 변환
│       └── sample-d.glb         # sample_d.vrm → 변환
├── src/
│   ├── components/
│   │   ├── AvatarOverlay.tsx    # TalkingHead 래핑 + Google TTS 연동, 광원 설정 포함
│   │   └── DebugPanel.tsx       # 개발용 상태 UI (상태/대사/에러/이벤트/언어/아바타 선택)
│   ├── hooks/
│   │   └── useGameEvents.ts     # game:event CustomEvent 수신 훅 (lang 파라미터)
│   ├── locales.ts               # ko/en 반응 대사, TTS 음성, lipsync 모듈 설정
│   ├── avatars.ts               # 아바타 목록 (로컬 VRoid + CDN 아바타)
│   ├── vite-env.d.ts            # vite/client 타입 + TalkingHead CDN 모듈 선언
│   └── App.tsx                  # lang/avatar 상태 관리
├── index.html                   # importmap: three@0.180.0 CDN 매핑
├── vercel.json                  # SPA 라우팅 rewrite 설정
├── vite.config.ts
└── .env                         # VITE_GOOGLE_TTS_API_KEY
```

## i18n 구조 (locales.ts)

언어별 반응 대사, TTS 음성, lipsync 모드를 `locales.ts` 한 곳에서 관리.

```typescript
export type Lang = 'ko' | 'en'

export interface Reaction {
  text: string    // 화면 표시 + TTS 입력 (한국어 그대로)
  roman?: string  // ko 전용: fi lipsync 모듈에 전달할 로마자 발음 표기
}

// 반응 대사 — ko는 text+roman 쌍, en은 text만
REACTIONS[lang][eventType]  // 언어별 랜덤 Reaction 선택

TTS_CONFIG = {
  ko: { languageCode: 'ko-KR', name: 'ko-KR-Wavenet-A' },
  en: { languageCode: 'en-US', name: 'en-US-Wavenet-F' },  // 여성 음성
}

// ko → fi(핀란드어) 모듈로 로마자 발음 기반 lipsync
LIPSYNC_MODULE = {
  ko: 'fi',   // roman 필드를 fi 모듈에 전달 → 진폭 기반보다 정밀한 입 움직임
  en: 'en',   // text를 en 모듈에 전달 → 단어 타이밍 기반 립싱크
}
```

## 아바타 구조 (avatars.ts)

아바타 목록과 URL을 `avatars.ts`에서 관리. 로컬 VRoid 변환 아바타와 CDN 아바타 혼합.

```typescript
const CDN = 'https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@main/avatars'

AVATAR_OPTIONS = [
  // 로컬 VRoid 변환 아바타 (public/avatars/)
  { id: 'sample-b',        url: '/avatars/sample-b.glb'        },
  { id: 'sample-c',        url: '/avatars/sample-c.glb'        },
  { id: 'sample-d',        url: '/avatars/sample-d.glb'        },
  { id: 'vroid-custom',    url: '/avatars/vroid-custom.glb'    },
  { id: 'avatar-sample-m', url: '/avatars/avatar-sample-m.glb' },
  // CDN 아바타 (TalkingHead @main)
  { id: 'brunette',   url: `${CDN}/brunette.glb`   },  // 4.7MB  ✅
  { id: 'brunette-t', url: `${CDN}/brunette-t.glb` },  // 2.9MB  ✅
  { id: 'avaturn',    url: `${CDN}/avaturn.glb`    },  // 13.8MB ✅
  { id: 'avatarsdk',  url: `${CDN}/avatarsdk.glb`  },  // 12.3MB ✅
  { id: 'vroid',      url: `${CDN}/vroid.glb`      },  // meshopt 압축 → 로드 실패 가능
]
```

DebugPanel 드롭다운에서 실시간 아바타 전환 가능. 언어 또는 아바타 변경 시 `key={lang}-{avatar.id}`로 AvatarOverlay 리마운트.

## TalkingHead lipsync 언어별 동작 방식

| 언어 | lipsyncModules | words 입력 | speakAudio 방식 |
|------|---------------|-----------|-----------------|
| en | `['en']` | `reaction.text` | 단어 타이밍 기반 립싱크 |
| ko | `['fi']` | `reaction.roman` (로마자) | 로마자 → fi 모듈 → viseme 시퀀스 |

**ko lipsync 흐름:**
```
reaction.text  '아이고~!'  → Google TTS → 한국어 음성 (AudioBuffer)
reaction.roman 'aigo'     → fi 모듈   → viseme 시퀀스 (입 모양)
```
TTS 음성은 한국어 그대로, 입 움직임 계산만 로마자로 처리.

**주의: TalkingHead @1.3~1.7 모두 한국어(ko) lipsync 모듈 없음.** `lipsyncModules: ['ko']` 지정 시 `preProcessText` TypeError 발생.

## TalkingHead 핵심 API (실제 사용 방식)

```javascript
// 초기화 — ttsEndpoint는 필수 (null 불가, @1.3에서 throw)
const head = new TalkingHead(domNode, {
  ttsEndpoint: `https://texttospeech.googleapis.com/v1/text:synthesize?key=${KEY}`,
  lipsyncModules: ['en'],   // en만 사용. ko 없음
  cameraView: 'upper',
  // 기본 광원 (CDN 아바타 기준)
  lightAmbientColor: 0xffffff,
  lightAmbientIntensity: 3,
  lightDirectColor: 0xfff5e0,
  lightDirectIntensity: 25,
  lightSpotColor: 0xffffff,
  lightSpotIntensity: 15,
  lightSpotPhi: 0.5,
  lightSpotTheta: 3.14,
  lightSpotDispersion: 0.8,
});

// 아바타 로드
await head.showAvatar({ url: avatarOption.url, body: 'F', avatarMood: 'neutral' });

// ── VRoid 아바타 전용: MeshToonMaterial + 툰 조명 ─────────────────────────────
// 로컬 아바타(/avatars/)에만 적용. CDN 아바타는 PBR 그대로 유지.
// head.renderer, head.scene, head.setLighting() 모두 public API.
if (avatarOption.url.startsWith('/avatars/')) {
  // 2단계 그라디언트: shadow(160) 밝게 유지 → 인위적 명암 경계 최소화
  const gradData = new Uint8Array([160, 255]);
  const gradientMap = new THREE.DataTexture(gradData, 2, 1, THREE.RedFormat);
  gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.needsUpdate = true;

  head.renderer.toneMappingExposure = 0.65;   // 전체 톤다운
  head.scene.environmentIntensity = 0.0;       // PBR ambient 제거
  head.setLighting({
    lightAmbientIntensity: 2.5,
    lightDirectColor: 0xffffff,
    lightDirectIntensity: 3,
    lightDirectPhi: 0.3,     // 수평에 가깝게 (top-shadow 제거)
    lightDirectTheta: 3.14,  // 카메라 정면 방향
    lightSpotIntensity: 0,   // 스팟 끔
  });

  head.scene.traverse(obj => {
    if (!obj.isMesh) return;
    const replaceMat = mat => {
      if (!mat?.isMeshStandardMaterial) return mat;
      const toon = new THREE.MeshToonMaterial({
        map: mat.map, color: mat.color.clone(), gradientMap,
        alphaMap: mat.alphaMap, transparent: mat.transparent,
        opacity: mat.opacity, alphaTest: mat.alphaTest,
        side: mat.side, depthWrite: mat.depthWrite,
      });
      mat.dispose();
      return toon;
    };
    obj.material = Array.isArray(obj.material)
      ? obj.material.map(replaceMat)
      : replaceMat(obj.material);
  });
}

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
window.dispatchEvent(new CustomEvent('game:event', {
  detail: { type: 'player_die' }
}));

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
- [x] locales.ts / avatars.ts 분리 리팩토링
- [x] DebugPanel 아바타 선택 드롭다운 추가
- [x] 아바타 CDN @1.3 → @main 수정 (404 버그 해결)
- [x] ko lipsync: roman 발음 표기 도입 → fi 모듈 기반 입 움직임 적용
- [x] VRoid → TalkingHead 자동 변환 파이프라인 구축 (avatar-pipeline/scripts/vroid_to_glb.py)
- [x] 커스텀 아바타 변환 — sample-b, sample-c, sample-d, vroid-custom, avatar-sample-m (총 5종)
- [x] VRoid 툰 렌더링 — MeshToonMaterial + 2단계 그라디언트 + 정면 조명 + exposure 0.65
- [x] Shade Smooth — Blender 변환 시 적용, 폴리곤 경계선 제거
- [ ] Google TTS API 키 리퍼러 제한 해제 확인
- [ ] TTS + 립싱크 동작 최종 확인 (en 기준)
- [ ] 실제 게임 iframe 위 오버레이 연동

## VRoid → GLB 변환 파이프라인

`avatar-pipeline/scripts/vroid_to_glb.py` — Blender 헤드리스 자동 변환 스크립트

```bash
/Applications/Blender.app/Contents/MacOS/Blender \
  --background --python avatar-pipeline/scripts/vroid_to_glb.py \
  -- input.vrm public/avatars/output.glb
```

**처리 순서:** VRM import → Colliders 삭제 → 본 이름 변환(VRoid→Mixamo) → Root 본 제거 →
눈 움직임 shape key 생성 → ARKit 52 + Oculus viseme 15 생성 →
**양측성 키 추가(eyesClosed/eyesLookDown/eyesLookUp/mouthSmile/mouthOpen)** →
bone axes 수정(T-pose) → Metallic=0 → GLB export

**VRoid export 주의:** 파일 크기 9MB 이하가 목표. VRoid Studio에서 **폴리곤 감소(Reduce Polygons)** 옵션 활성화 필수.
15MB 이상이면 Three.js 렌더링 프레임 드랍 발생.

**양측성 키:** TalkingHead가 애니메이션 구동에 필수로 사용. 없으면 eyeBlinkLeft.limit TypeError 발생.

## 주의사항 / 트러블슈팅

- **TalkingHead @1.3은 ttsEndpoint 필수** — `null` 전달 시 생성자에서 throw
- **ko lipsync 모듈 없음** — `lipsyncModules: ['ko']` 지정 시 `preProcessText` TypeError. v1.7까지 미지원
- **아바타 CDN은 @main 사용** — `@1.3` 태그에는 `avatars/` 폴더가 `brunette.glb` 하나만 존재
- **mpfb.glb CDN 불가** — 36.8MB, jsDelivr 제한으로 403. 직접 호스팅 시만 사용 가능
- **importmap 필수** — TalkingHead CDN ESM이 `import "three"` bare specifier 사용
- **GLB meshopt 압축 주의** — `vroid.glb`는 meshopt 압축됨 → TalkingHead @1.3 미지원 → 로드 실패 가능
- **Ready Player Me 서비스 종료** — 2026년 1월 Netflix 인수 후 종료. 대안: Avaturn
- Three.js 버전 고정: `three@0.180.0`
- GLB CORS → `public/` 폴더에 위치시켜 same-origin 서빙

## 호환 아바타 소스

| 소스 | 무료 | ARKit blendshape | 비고 |
|------|------|-----------------|------|
| TalkingHead @main CDN | ✅ | ✅ | CDN 직접 참조 가능 |
| **VRoid Studio** | ✅ | ✅ (변환 파이프라인으로) | **현재 주력 소스** |
| Avaturn T2 | ❌ (유료) | ✅ | 무료 플랜은 T1만 (ARKit 없음) |
| AvatarSDK | 일부 무료 | ✅ 51개 | 직접 호스팅 필요 |
| Ready Player Me | 종료 | — | 2026-01 Netflix 인수 후 종료 |

## 환경변수

```
VITE_GOOGLE_TTS_API_KEY=...   # Google Cloud TTS API 키
                               # API 키 HTTP 리퍼러 제한 없어야 브라우저에서 직접 호출 가능
```

## 배포

- Vercel Hobby (무료): `vercel --prod`
- 환경변수: Vercel 대시보드 또는 `vercel env add VITE_GOOGLE_TTS_API_KEY`
- `vercel.json`의 rewrite로 SPA 라우팅 처리
