// 画面が開き、API を呼ばずに済む範囲の動きを確かめる最小のテスト。
// 使い方: npm test（playwright が入っている環境で）
import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const page_url = 'file://' + path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../index.html');

test('画面が開き、主要な部品がある', async ({ page }) => {
  await page.goto(page_url);
  await expect(page).toHaveTitle(/Barthel Index/);
  await expect(page.locator('#api-key')).toBeVisible();
  await expect(page.locator('#patient-info')).toBeVisible();
  await expect(page.locator('#score-btn')).toBeVisible();
});

test('API キーが空なら、通信せずにエラー表示', async ({ page }) => {
  let called = false;
  await page.route('https://api.anthropic.com/**', (route) => { called = true; route.abort(); });
  await page.goto(page_url);
  await page.click('#patient-info'); // readonly（Safari の自動入力よけ）は最初のクリックで外れる
  await page.fill('#patient-info', 'テスト');
  await page.click('#score-btn');
  await expect(page.locator('#score-status')).toContainText('APIキー');
  expect(called).toBe(false);
});

test('AI の返答に HTML が混ざっても文字として表示される（XSS 対策）', async ({ page }) => {
  await page.route('https://api.anthropic.com/**', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ items: [
      { id: 'feeding', name: '<img src=x onerror="window.__xss=1">食事', score: 10, maxScore: 10, judgment: '自立', estimated: false, rationale: '<b>x</b>' },
    ] }) }] }),
  }));
  await page.goto(page_url);
  await page.fill('#api-key', 'dummy');
  await page.click('#patient-info'); // readonly（Safari の自動入力よけ）は最初のクリックで外れる
  await page.fill('#patient-info', 'テスト');
  await page.click('#score-btn');
  await expect(page.locator('#result-section')).toBeVisible();
  await expect(page.locator('#result-tbody')).toContainText('<img src=x');
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  await expect(page.locator('#total-score')).toHaveText('10');
});

test('「保存する」を外すとキーは localStorage に残らない', async ({ page }) => {
  await page.goto(page_url);
  await page.fill('#api-key', 'dummy');
  await page.uncheck('#save-key');
  await page.click('#patient-info'); // readonly（Safari の自動入力よけ）は最初のクリックで外れる
  await page.fill('#patient-info', 'テスト');
  await page.route('https://api.anthropic.com/**', (route) => route.fulfill({ status: 500, body: '{}' }));
  await page.click('#score-btn');
  expect(await page.evaluate(() => localStorage.getItem('bi_tool_api_key'))).toBeNull();
});
