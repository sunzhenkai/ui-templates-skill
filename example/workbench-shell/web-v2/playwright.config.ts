import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/test/browser',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:5175', trace: 'on-first-retry' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'compact', use: { ...devices['Desktop Chrome'], viewport: { width: 900, height: 800 } } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 760 } } }
  ],
  webServer: { command: 'pnpm exec vite --host 127.0.0.1 --port 5175 --strictPort', url: 'http://127.0.0.1:5175', reuseExistingServer: true }
})
