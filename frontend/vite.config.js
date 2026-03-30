import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Redireciona /api para o backend local em dev
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Redireciona uploads de imagens para o backend
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    }
  }
})
