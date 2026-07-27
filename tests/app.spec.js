import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('renders market workspace and changes selected stock', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '贵州茅台' })).toBeVisible();
  await page.getByRole('button', { name: '查看 宁德时代', exact: true }).click();
  await expect(page.getByRole('heading', { name: '宁德时代' })).toBeVisible();
  await page.getByRole('button', { name: '1Y' }).click();
  await expect(page.locator('#priceChart')).toHaveAttribute('aria-label', /1Y/);
  const lastPoint = await page.locator('#priceChart polyline').getAttribute('points');
  expect(lastPoint).toBeTruthy();
});

test('filters watchlist and toggles favorite persistently', async ({ page }) => {
  const search = page.getByPlaceholder('搜索股票代码或名称');
  await search.fill('腾讯');
  await expect(page.getByRole('button', { name: '查看 腾讯控股', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '查看 贵州茅台', exact: true })).toHaveCount(0);
  await search.fill('');
  await page.getByRole('button', { name: '移除 贵州茅台 自选' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: '查看 贵州茅台', exact: true })).toHaveCount(0);
});

test('adds holding and updates portfolio totals', async ({ page }) => {
  await page.getByRole('button', { name: '添加持仓' }).click();
  await page.getByLabel('股票').selectOption('000858');
  await page.getByLabel('持有数量').fill('200');
  await page.getByLabel('成本价').fill('150');
  await page.getByRole('button', { name: '确认添加' }).click();
  await expect(page.getByRole('cell', { name: '五粮液' })).toBeVisible();
  await expect(page.getByText('4 项资产')).toBeVisible();
});

test('mobile layout has no horizontal overflow and switches sections', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await page.getByRole('button', { name: '组合' }).click();
  await expect(page.getByRole('heading', { name: '投资组合' })).toBeVisible();
});
