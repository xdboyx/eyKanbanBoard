import { mkdirSync } from 'node:fs'
import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

// wrangler.jsonc 的靜態檔案目錄（前端建置產物）必須存在才能啟動 Worker；
// 測試只呼叫 /api/*，用不到前端，還沒建置過時先建立空目錄
mkdirSync('dist', { recursive: true })

/** Worker 的測試在 Workers runtime 中執行（vitest-pool-workers） */
export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' } })],
  test: {
    name: 'worker',
    include: ['tests/worker/**/*.test.ts'],
  },
})
