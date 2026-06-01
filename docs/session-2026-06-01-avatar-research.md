# 세션 기록 — 아바타 소스 조사 (2026-06-01)

## 세션 목적

다른 작업장에서 미커밋 상태로 작업 중인 상황을 피해 `dev` 브랜치를 새로 파고,
로컬 실행 환경 세팅 + TalkingHead 호환 커스텀 아바타 확보 방법 조사.

---

## 1. 로컬 환경 세팅 결과

| 항목 | 결과 |
|------|------|
| Node.js | v22.14.0 ✅ |
| npm | 11.2.0 ✅ |
| node_modules | `npm install` 완료 ✅ |
| `.env` | **미생성** — `VITE_GOOGLE_TTS_API_KEY` 직접 입력 필요 |
| Vercel CLI | 미설치 (배포 시 `npm i -g vercel`) |

```
# 개발 서버 실행
npm install
echo "VITE_GOOGLE_TTS_API_KEY=your_key" > .env
npm run dev
```

---

## 2. 브라우저 오류 진단

개발 서버(`localhost:5174`) 실행 후 Playwright로 확인한 오류:

```
Error: Blend shapes not found
```

- 원인: TalkingHead.js가 GLB 로드 시 ARKit 52 blendshape 없으면 초기화 실패
- 조건: Mixamo 스켈레톤 + ARKit 52 blendshape + Oculus 15 viseme 동시 필요

---

## 3. 아바타 소스별 조사 결과

### 3-1. Avaturn

| 항목 | 내용 |
|------|------|
| 운영사 | Avaturn (SF 스타트업, 2019) |
| 웹 에디터 무료 | T1만 가능 (ARKit blendshape **없음**) |
| T2 (ARKit 포함) | PRO 플랜 **$800/월** 이상 |
| 결론 | **사용 불가** — 무료 웹 에디터 = T1 전용 |

**직접 확인한 GLB 구조 (fullbody_avaturn.glb, 3.9MB):**
```
mesh: avaturn_body   | morph targets: 0
mesh: avaturn_hair_0 | morph targets: 0
mesh: avaturn_look_0 | morph targets: 0
→ 얼굴 메시 없음, ARKit blendshape 0개
```

Avaturn 다운로드 화면의 세 옵션(Avatar T-Pose / Body Only / Avatar with animation) 모두 T1 기반이면 동일하게 blendshape 없음.

### 3-2. AvatarSDK (MetaPerson Creator)

| 항목 | 내용 |
|------|------|
| 운영사 | **Itseez3D** (OpenCV 개발자 창업, 인텔 인수 후 분사) |
| Avaturn과 관계 | **완전 별개 회사** |
| ARKit blendshape | ✅ 51개 포함 |
| 무료 티어 | **없음** (1주일 트라이얼, 신용카드 필요) |
| Pro 플랜 | **$800/월** (6,000 아바타) |
| 공개 CDN | **없음** — TalkingHead의 `avatarsdk.glb`은 팀이 계정으로 만들어 직접 업로드한 것 |
| 결론 | **사용 불가** — 무료 경로 없음 |

### 3-3. MPFB (MakeHuman Plugin For Blender)

| 항목 | 내용 |
|------|------|
| 정체 | Blender 4.2+ 전용 오픈소스 인간 캐릭터 생성기 |
| 라이선스 | GPLv3 무료, 에셋 CC0/CC-BY |
| ARKit blendshape | **MPFB 자체는 미포함** → Faceit 애드온 추가 필요 |
| Faceit 비용 | **$58~$217** (Superhive Market, 일회성) |
| 총 파이프라인 | Blender + MPFB + Mixamo + Faceit + GLB 내보내기 |
| 러닝커브 | 10~20시간 (3D 비전문가 기준) |
| 프론트엔드 개발자 평가 | **비권장** — 완전히 다른 도메인, 비효율 |

**전체 파이프라인:**
```
MPFB 캐릭터 생성
→ Mixamo 자동 리깅 (무료)
→ Faceit으로 ARKit 52 + Oculus 15 블렌드쉐이프 생성 (유료 $58+)
→ TalkingHead Python 스크립트로 Oculus viseme 변환
→ Blender GLB 내보내기
→ glTF-Transform 최적화 (선택)
```

### 3-4. 기타 소스

| 소스 | 상태 | 비고 |
|------|------|------|
| Ready Player Me | ❌ **2026.01.31 서비스 종료** | CDN 완전 불가 |
| Microsoft RocketBox | ⚠️ 조건부 가능 | MIT, 115개, FBX→GLB 변환 필요, Oculus viseme 미확인 |
| Sketchfab | ⚠️ 수동 선별 | ARKit+Mixamo 조합 검색 가능, 다운로드 로그인 필요 |
| arkit-blendshape-tool | 🔧 도구 | GLB에 ARKit blendshape 이식 (Python 서버 필요) |

---

## 4. TalkingHead CDN 현황 (현재 등록된 아바타)

`src/avatars.ts` 기준:

| id | label | URL | 크기 | 상태 |
|----|-------|-----|------|------|
| brunette | Brunette | @main CDN | 4.7MB | ✅ |
| brunette-t | Brunette T | @main CDN | 2.9MB | ✅ |
| avaturn | Avaturn | @main CDN | 13.8MB | ✅ |
| avatarsdk | AvatarSDK | @main CDN | 12.3MB | ✅ |
| vroid | VRoid | @main CDN | ⚠️ meshopt 압축 | 로드 실패 가능 |

CDN: `https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@main/avatars`

---

## 5. 결론 및 다음 액션

### 아바타 전략

| 우선순위 | 방법 | 이유 |
|----------|------|------|
| 1 | **TalkingHead CDN 아바타로 TTS·립싱크 기능 완성** | 즉시 가능, 검증된 호환성 |
| 2 | Microsoft RocketBox 탐색 (MIT 115개) | FBX→GLB 변환 후 자체 호스팅 가능, 무료 |
| 3 | 커스텀 아바타는 별도 외주 또는 Faceit 학습 | 기능 완성 후 |

### 남은 개발 태스크 (CLAUDE.md 기준)

- [ ] `.env` 파일 생성 (`VITE_GOOGLE_TTS_API_KEY` 입력)
- [ ] TTS + 립싱크 동작 최종 확인 (EN 기준)
- [ ] Google TTS API 키 리퍼러 제한 해제 확인
- [ ] 실제 게임 iframe 위 오버레이 연동

---

## 6. 참고 링크

- [TalkingHead GitHub](https://github.com/met4citizen/TalkingHead)
- [TalkingHead FACEIT.md](https://github.com/met4citizen/TalkingHead/blob/main/blender/Faceit/FACEIT.md)
- [Avaturn 가격](https://avaturn.me/pricing/)
- [AvatarSDK 가격](https://avatarsdk.com/pricing-cloud/)
- [MPFB2 GitHub](https://github.com/makehumancommunity/mpfb2)
- [Faceit on Superhive](https://superhivemarket.com/products/faceit)
- [Microsoft RocketBox](https://github.com/microsoft/Microsoft-Rocketbox)
- [arkit-blendshape-tool](https://github.com/digitalp/arkit-blendshape-tool)
