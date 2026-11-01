import { defineConfig } from '@playwright/test';

// 手元に別の Chromium がある時は PW_CHROMIUM=（実行ファイルの場所）で差し替えられる
const executablePath = process.env.PW_CHROMIUM || undefined;

export default defineConfig({
  testDir: './tests',
  use: { headless: true, launchOptions: executablePath ? { executablePath } : {} },
});
