# game-avatar-companion

웹게임 위에 올라가는 VTuber 스타일 3D 아바타 컴패니언.
게임 이벤트에 반응하며 실시간 립싱크로 말합니다.

```
웹게임 canvas / iframe
      +
React 오버레이 (position: fixed)
  └── TalkingHead.js (Three.js WebGL)
        └── VRoid GLB 아바타
              └── 게임 이벤트 → Google TTS + 립싱크
```

## 데모

아바타가 게임 이벤트(점프, 실패, 클리어 등)를 감지해 한국어 또는 영어로 반응합니다.

## 기술 스택

| 역할 | 도구 |
|------|------|
| 3D 렌더링 + 립싱크 | [TalkingHead.js @1.3](https://github.com/met4citizen/TalkingHead) |
| 아바타 포맷 | GLB (Mixamo 리그 + ARKit 52 + Oculus 15 blendshapes) |
| 프레임워크 | React + Vite |
| TTS | Google Cloud Text-to-Speech REST API |
| 배포 | Vercel |

## 시작하기

### 환경변수 설정

```bash
cp .env.example .env
# VITE_GOOGLE_TTS_API_KEY=your_google_tts_api_key
```

Google Cloud Console에서 Text-to-Speech API 키를 발급받아 입력하세요.
HTTP 리퍼러 제한 없이 설정해야 브라우저에서 직접 호출 가능합니다.

### 실행

```bash
npm install
npm run dev
```

`http://localhost:5173` 에서 확인합니다.

### 빌드 및 배포

```bash
npm run build
vercel --prod
```

## 게임 이벤트 연동

게임에서 아바타에게 이벤트를 전달하는 방법:

```javascript
// 지원 이벤트 타입: player_die | level_clear | near_miss | jump | start
window.dispatchEvent(new CustomEvent('game:event', {
  detail: { type: 'level_clear' }
}));

// 직접 대사 지정
window.dispatchEvent(new CustomEvent('avatar:speak', {
  detail: { text: '잘했어요!' }
}));
```

## 아바타

VRoid Studio에서 만든 커스텀 아바타 및 TalkingHead CDN 아바타를 지원합니다.
DebugPanel 드롭다운에서 실시간으로 아바타를 전환할 수 있습니다.

커스텀 아바타 추가 방법: [avatar-pipeline](../avatar-pipeline) 참고

## 지원 언어

- 한국어 (`ko`): Google TTS ko-KR-Wavenet-A + fi 모듈 기반 립싱크
- 영어 (`en`): Google TTS en-US-Wavenet-F + 단어 타이밍 기반 립싱크
