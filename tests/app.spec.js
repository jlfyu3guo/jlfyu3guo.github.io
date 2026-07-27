import { test, expect } from '@playwright/test';

const quotePayload = {
  status: 'ok',
  source: 'tencent',
  session: 'closed',
  count: 10,
  quotes: {
    '000001': { symbol: '000001', name: '上证指数', market: 'A-SHARE', price: 3858.25, prev_close: 3814.2, open: 3808.9, high: 3858.31, low: 3793.45, change_percent: 1.15, quote_time: '2026-07-27T16:14:20+08:00', status: 'ok' },
    '399001': { symbol: '399001', name: '深证成指', market: 'A-SHARE', price: 14148.73, prev_close: 13774.68, open: 13768.6, high: 14148.73, low: 13689.01, change_percent: 2.72, quote_time: '2026-07-27T16:14:06+08:00', status: 'ok' },
    '399006': { symbol: '399006', name: '创业板指', market: 'A-SHARE', price: 3590.79, prev_close: 3480.87, open: 3482.04, high: 3592.1, low: 3449.21, change_percent: 3.16, quote_time: '2026-07-27T16:14:21+08:00', status: 'ok' },
    HSI: { symbol: 'HSI', name: '恒生指数', market: 'HK-SHARE', price: 25207.18, prev_close: 24963.23, open: 24993.77, high: 25276.96, low: 24938.34, change_percent: 0.98, quote_time: '2026-07-27T09:40:38.937Z', status: 'ok' },
    '600519': { symbol: '600519', name: '贵州茅台', market: 'A-SHARE', price: 1289.5, prev_close: 1297.41, open: 1292, high: 1301.5, low: 1282.3, change_percent: -0.61, volume_hands: 182340, quote_time: '2026-07-27T16:14:56+08:00', status: 'ok' },
    '300750': { symbol: '300750', name: '宁德时代', market: 'A-SHARE', price: 400, prev_close: 383.01, open: 386.8, high: 402.1, low: 384.2, change_percent: 4.44, volume_hands: 312500, quote_time: '2026-07-27T16:14:48+08:00', status: 'ok' },
    '601318': { symbol: '601318', name: '中国平安', market: 'A-SHARE', price: 53.41, prev_close: 54.02, open: 53.9, high: 54.1, low: 53.2, change_percent: -1.13, volume_hands: 486200, quote_time: '2026-07-27T16:14:46+08:00', status: 'ok' },
    '000858': { symbol: '000858', name: '五粮液', market: 'A-SHARE', price: 73.9, prev_close: 73.57, open: 73.6, high: 74.2, low: 73.1, change_percent: 0.45, volume_hands: 221900, quote_time: '2026-07-27T16:14:21+08:00', status: 'ok' },
    '00700': { symbol: '00700', name: '腾讯控股', market: 'HK-SHARE', price: 443, prev_close: 434.6, open: 437, high: 445, low: 435.2, change_percent: 1.93, volume_hands: 188400, quote_time: '2026-07-27T09:40:06.020Z', status: 'ok' },
    'AAPL.OQ': { symbol: 'AAPL.OQ', name: '苹果', market: 'US-SHARE', price: 333.02, prev_close: 321.66, open: 324, high: 334, low: 322, change_percent: 3.53, volume_hands: 634000, quote_time: '2026-07-27T09:40:06.020Z', status: 'ok' }
  }
};

async function mockQuotes(page) {
  await page.route('**/api/public/v1/quote?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*', 'x-quote-cache': 'HIT', 'x-quote-cache-session': 'closed' },
      body: JSON.stringify(quotePayload)
    });
  });
}

async function resetPage(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText('腾讯行情 · 已收市 · 主线路')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await mockQuotes(page);
  await resetPage(page);
});

test('loads real-time quote contract and changes selected stock', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '贵州茅台' })).toBeVisible();
  await expect(page.getByText('1,289.50', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('18.2万手')).toBeVisible();
  await expect(page.getByText('1,301.50 / 1,282.30')).toBeVisible();
  await page.getByRole('button', { name: '查看 宁德时代', exact: true }).click();
  await expect(page.getByRole('heading', { name: '宁德时代' })).toBeVisible();
  await expect(page.getByText('400.00', { exact: true }).first()).toBeVisible();
  await expect(page.locator('#priceChart')).toHaveAttribute('aria-label', /宁德时代当日价格区间/);
});

test('manual refresh requests nocache-compatible refresh parameter', async ({ page }) => {
  const requestPromise = page.waitForRequest((request) => request.url().includes('refresh=1'));
  await page.getByRole('button', { name: '刷新实时行情' }).click();
  const request = await requestPromise;
  expect(request.url()).toContain('symbols=');
  await expect(page.getByText('腾讯行情 · 已收市 · 主线路')).toBeVisible();
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

test('adds holding and updates portfolio totals from quote prices', async ({ page }) => {
  await expect(page.getByRole('cell', { name: '¥1,289.50' })).toBeVisible();
  await page.getByRole('button', { name: '添加持仓' }).click();
  await page.getByLabel('股票').selectOption('000858');
  await page.getByLabel('持有数量').fill('200');
  await page.getByLabel('成本价').fill('70');
  await page.getByRole('button', { name: '确认添加' }).click();
  await expect(page.getByRole('cell', { name: '五粮液' })).toBeVisible();
  await expect(page.getByText('4 项资产')).toBeVisible();
});

test('falls back to worker when primary endpoint fails', async ({ page }) => {
  await page.unroute('**/api/public/v1/quote?**');
  await page.route('https://etf.peekabo.cc/**', (route) => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.route('https://edge-quote-api.brucelau1987.workers.dev/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'x-quote-cache-session': 'closed' }, body: JSON.stringify(quotePayload) }));
  await page.reload();
  await expect(page.getByText('腾讯行情 · 已收市 · 备用线路')).toBeVisible();
  await expect(page.getByText('1,289.50', { exact: true }).first()).toBeVisible();
});

test('keeps fallback values and shows error when both endpoints fail', async ({ page }) => {
  await page.unroute('**/api/public/v1/quote?**');
  await page.route('**/api/public/v1/quote?**', (route) => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('实时行情暂不可用');
  await expect(page.getByText('行情连接异常')).toBeVisible();
  await expect(page.getByRole('heading', { name: '贵州茅台' })).toBeVisible();
});

test('mobile layout has no horizontal overflow and keeps refresh control', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole('button', { name: '刷新实时行情' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await page.getByRole('button', { name: '组合' }).click();
  await expect(page.getByRole('heading', { name: '投资组合' })).toBeVisible();
});
