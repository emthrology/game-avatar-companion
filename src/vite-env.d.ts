/// <reference types="vite/client" />

declare module 'https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.3/modules/talkinghead.mjs' {
  export class TalkingHead {
    constructor(node: HTMLElement, options: Record<string, unknown>)
    showAvatar(options: Record<string, unknown>): Promise<void>
    speakAudio(payload: unknown, options?: unknown): void
    setMood(mood: string): void
  }
}
