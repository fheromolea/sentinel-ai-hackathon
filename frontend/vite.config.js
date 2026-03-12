import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/videos': 'http://localhost:8001',
      '/analyze': 'http://localhost:8001',
      '/reports': 'http://localhost:8001',
      '/real_videos': 'http://localhost:8001',
      '/ai_videos': 'http://localhost:8001'
    }
  }
})
