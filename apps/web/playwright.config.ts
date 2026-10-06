import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(__dirname, '../../.cache/playwright');
export default defineConfig({
  testDir: './tests/ui', workers: 1, timeout: 60000, expect: { timeout: 15000 },
  use: { baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1050 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
