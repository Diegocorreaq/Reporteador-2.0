import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/legacy-api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core — needs to be one chunk (hooks share a single React instance)
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/scheduler')) {
            return 'vendor-react'
          }
          // Router
          if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run')) {
            return 'vendor-router'
          }
          // ECharts — large charting library, only needed on chart pages
          if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender') || id.includes('node_modules/echarts-for-react')) {
            return 'vendor-echarts'
          }
          // Excel export — only needed when user triggers export
          if (id.includes('node_modules/exceljs')) {
            return 'vendor-exceljs'
          }
          // TanStack Table — used in DataTable component
          if (id.includes('node_modules/@tanstack')) {
            return 'vendor-tanstack'
          }
          // Radix UI + form libs
          if (id.includes('node_modules/@radix-ui') || id.includes('node_modules/react-hook-form') || id.includes('node_modules/@hookform') || id.includes('node_modules/zod')) {
            return 'vendor-ui'
          }
          // Remaining node_modules
          if (id.includes('node_modules')) {
            return 'vendor-misc'
          }
        },
      },
    },
  },
})
