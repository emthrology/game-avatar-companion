export interface AvatarOption {
  id: string
  label: string
  url: string
  note?: string
}

// 아바타 파일은 @1.3 태그에 없음 → main 브랜치 CDN 사용
// mpfb.glb(36.8MB)는 jsDelivr 파일 크기 제한(50MB) 초과로 403 → 목록에서 제외
const CDN = 'https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@main/avatars'

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'brunette',   label: 'Brunette',   url: `${CDN}/brunette.glb`,   note: '4.7MB' },
  { id: 'brunette-t', label: 'Brunette T', url: `${CDN}/brunette-t.glb`, note: '2.9MB' },
  { id: 'avaturn',    label: 'Avaturn',    url: `${CDN}/avaturn.glb`,    note: '13.8MB' },
  { id: 'avatarsdk',  label: 'AvatarSDK',  url: `${CDN}/avatarsdk.glb`,  note: '12.3MB' },
  { id: 'vroid',      label: 'VRoid',      url: `${CDN}/vroid.glb`,      note: '⚠️ meshopt' },
]

export const DEFAULT_AVATAR = AVATAR_OPTIONS[0]
