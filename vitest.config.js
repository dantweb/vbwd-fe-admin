import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'url'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vue/tests/setup.ts'],
    include: [
      'vue/tests/unit/**/*.spec.{js,ts}',
      'vue/tests/integration/**/*.spec.{js,ts}',
      'plugins/*/tests/unit/**/*.spec.{js,ts}',
      'plugins/*/tests/integration/**/*.spec.{js,ts}',
    ],
    exclude: ['tests/e2e/**', 'vue/tests/e2e/**'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'tests/']
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./vue/src', import.meta.url)),
      '@plugins': fileURLToPath(new URL('./plugins', import.meta.url))
    },
    dedupe: ['pinia', 'vue']
  }
})
