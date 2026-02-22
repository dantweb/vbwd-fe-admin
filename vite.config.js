import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  root: './vue',
  envDir: resolve(__dirname),
  plugins: [vue()],
  base: '/admin/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'vue/src'),
      '@plugins': resolve(__dirname, 'plugins')
    },
    // Ensure single instances of vue and pinia across all packages
    dedupe: ['vue', 'pinia', 'vue-router']
  },
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  // Optimize deps to ensure proper module resolution
  optimizeDeps: {
    include: ['pinia', 'vue', 'vue-router', 'vbwd-view-component']
  }
})
