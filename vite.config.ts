import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'app',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/worker/**'],
        },
      },
      './vitest.worker.config.ts',
    ],
  },
})
