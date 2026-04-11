import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/legacy-api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
