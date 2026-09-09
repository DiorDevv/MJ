/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Pinned so date/timezone tests are deterministic regardless of the host
    // machine's TZ, matching the app's actual deployed timezone (see docker-compose.yml).
    env: { TZ: 'Asia/Tashkent' },
    // e2e/ is Playwright's — it drives a real running stack, not jsdom.
    exclude: ['node_modules', 'dist', 'e2e/**'],
  },
})
