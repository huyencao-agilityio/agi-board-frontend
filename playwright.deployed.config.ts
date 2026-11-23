import { defineConfig, devices } from '@playwright/test'

// Post-deploy smoke test: `DEPLOYED_URL=https://... pnpm e2e:deployed`. No local server, no API mocks.
const baseURL = process.env.DEPLOYED_URL
if (!baseURL) throw new Error('Set DEPLOYED_URL to the deployed frontend URL.')

export default defineConfig({
  testDir: './e2e-deployed',
  retries: 2, // a fresh Worker deploy can take a few seconds to propagate
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
