import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/tts': {
        target: 'https://texttospeech.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tts/, '/v1/text:synthesize'),
      },
    },
  },
  optimizeDeps: {
    exclude: ['talkinghead'],
  },
})
