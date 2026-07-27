const PRIMARY_ENDPOINT = 'https://etf.peekabo.cc/api/public/v1/quote';
const FALLBACK_ENDPOINT = 'https://edge-quote-api.brucelau1987.workers.dev/api/public/v1/quote';

export const QUOTE_ENDPOINTS = [PRIMARY_ENDPOINT, FALLBACK_ENDPOINT];

const SYMBOLS = {
  '000001': '000001.SH',
  '399001': '399001.SZ',
  '399006': '399006.SZ',
  HSI: 'HSI.HK',
  '600519': '600519.SH',
  '300750': '300750.SZ',
  '601318': '601318.SH',
  '000858': '000858.SZ',
  '0700': '00700.HK',
  AAPL: 'AAPL.US',
  MSFT: 'MSFT.US',
  NVDA: 'NVDA.US',
  TSLA: 'TSLA.US',
  GOOGL: 'GOOGL.US',
  AMZN: 'AMZN.US'
};

function canonicalSymbol(quote) {
  const raw = String(quote?.symbol || quote?.sec_code || '').toUpperCase();
  const secCode = String(quote?.sec_code || '').toUpperCase();
  if (raw === 'HSI' || secCode.includes('HKHSI')) return 'HSI';
  const usSymbol = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'AMZN'].find((symbol) => raw.includes(symbol) || secCode.includes(symbol));
  if (usSymbol) return usSymbol;
  const digits = raw.match(/\d{4,6}/)?.[0] || secCode.match(/\d{4,6}/)?.[0];
  if (digits === '00700') return '0700';
  return digits || raw.replace(/\.(SH|SZ|HK|US|OQ)$/i, '');
}

function normalizePayload(payload) {
  if (!payload || payload.status !== 'ok' || !payload.quotes || typeof payload.quotes !== 'object') {
    throw new Error('INVALID_QUOTE_PAYLOAD');
  }
  const items = Object.values(payload.quotes)
    .filter((quote) => quote?.status === 'ok' && Number(quote.price) > 0)
    .map((quote) => ({
      symbol: canonicalSymbol(quote),
      name: String(quote.name || '').replace(/\s+/g, ''),
      market: quote.market,
      price: Number(quote.price),
      prevClose: Number(quote.prev_close) || null,
      open: Number(quote.open) || null,
      high: Number(quote.high) || null,
      low: Number(quote.low) || null,
      changeAmount: Number(quote.change_amount) || 0,
      change: Number(quote.change_percent) || 0,
      volumeHands: Number(quote.volume_hands) || null,
      quoteTime: quote.quote_time || null,
      source: quote.source || payload.source || 'unknown'
    }));
  if (!items.length) throw new Error('EMPTY_QUOTE_PAYLOAD');
  return { items, source: payload.source || items[0].source || 'unknown' };
}

async function fetchEndpoint(endpoint, symbols, refresh, fetchImpl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const query = new URLSearchParams({ symbols: symbols.map((symbol) => SYMBOLS[symbol] || symbol).join(',') });
  if (refresh) query.set('refresh', '1');
  try {
    const response = await fetchImpl(`${endpoint}?${query}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`QUOTE_HTTP_${response.status}`);
    const payload = await response.json();
    const normalized = normalizePayload(payload);
    return {
      ...normalized,
      endpoint: endpoint === PRIMARY_ENDPOINT ? 'primary' : 'fallback',
      cache: response.headers.get('x-quote-cache') || 'UNKNOWN',
      session: response.headers.get('x-quote-cache-session') || payload.session || 'unknown'
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchQuotes(symbols, { refresh = false, fetchImpl = fetch } = {}) {
  const unique = [...new Set(symbols.filter((symbol) => SYMBOLS[symbol]))].slice(0, 50);
  if (!unique.length) throw new Error('NO_QUOTE_SYMBOLS');
  const errors = [];
  for (const endpoint of QUOTE_ENDPOINTS) {
    try {
      return await fetchEndpoint(endpoint, unique, refresh, fetchImpl);
    } catch (error) {
      errors.push(error?.message || 'QUOTE_REQUEST_FAILED');
    }
  }
  throw new Error(`ALL_QUOTE_ENDPOINTS_FAILED:${errors.join('|')}`);
}

const TRADINGVIEW_ENDPOINT = 'https://scanner.tradingview.com/global/scan';
const COINGECKO_ENDPOINT = 'https://api.coingecko.com/api/v3/coins/markets';
const BINANCE_ENDPOINT = 'https://api.binance.com/api/v3/ticker/24hr';

async function fetchJsonWithTimeout(url, options, fetchImpl, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...options, signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchGlobalIndices({ fetchImpl = fetch } = {}) {
  const payload = await fetchJsonWithTimeout(TRADINGVIEW_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({
      symbols: { tickers: ['TVC:NI225', 'KRX:KOSPI'], query: { types: [] } },
      columns: ['name', 'description', 'close', 'change', 'open', 'high', 'low', 'currency', 'update_mode', 'pricescale']
    })
  }, fetchImpl);
  const items = (payload?.data || []).map((row) => {
    const [name, description, close, change, open, high, low, currency] = row.d || [];
    return {
      symbol: row.s === 'TVC:NI225' || name === 'NI225' ? 'NI225' : 'KOSPI',
      name: description || name,
      price: Number(close),
      change: Number(change) || 0,
      prevClose: Number(close) / (1 + (Number(change) || 0) / 100),
      open: Number(open),
      high: Number(high),
      low: Number(low),
      currency: currency || (row.s === 'TVC:NI225' ? 'JPY' : 'KRW'),
      quoteTime: new Date().toISOString(),
      source: 'tradingview'
    };
  }).filter((item) => item.price > 0);
  if (items.length !== 2) throw new Error('INCOMPLETE_GLOBAL_INDEX_PAYLOAD');
  return { items, source: 'tradingview' };
}

function normalizeCoinGecko(items) {
  const symbols = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL' };
  return items.map((coin) => ({
    symbol: symbols[coin.id],
    name: coin.name,
    price: Number(coin.current_price),
    change: Number(coin.price_change_percentage_24h) || 0,
    prevClose: Number(coin.current_price) / (1 + (Number(coin.price_change_percentage_24h) || 0) / 100),
    open: Number(coin.current_price) - Number(coin.price_change_24h || 0),
    high: Number(coin.high_24h),
    low: Number(coin.low_24h),
    volumeHands: Number(coin.total_volume),
    currency: 'USD',
    quoteTime: coin.last_updated,
    source: 'coingecko'
  })).filter((item) => item.symbol && item.price > 0);
}

function normalizeBinance(items) {
  return items.map((coin) => ({
    symbol: coin.symbol.replace('USDT', ''),
    price: Number(coin.lastPrice),
    change: Number(coin.priceChangePercent) || 0,
    prevClose: Number(coin.prevClosePrice),
    open: Number(coin.openPrice),
    high: Number(coin.highPrice),
    low: Number(coin.lowPrice),
    volumeHands: Number(coin.quoteVolume),
    currency: 'USD',
    quoteTime: new Date(Number(coin.closeTime)).toISOString(),
    source: 'binance'
  })).filter((item) => item.price > 0);
}

export async function fetchCryptoQuotes({ fetchImpl = fetch } = {}) {
  const query = new URLSearchParams({
    vs_currency: 'usd',
    ids: 'bitcoin,ethereum,solana',
    order: 'market_cap_desc',
    sparkline: 'false',
    price_change_percentage: '24h'
  });
  try {
    const payload = await fetchJsonWithTimeout(`${COINGECKO_ENDPOINT}?${query}`, {}, fetchImpl);
    const items = normalizeCoinGecko(payload);
    if (items.length !== 3) throw new Error('INCOMPLETE_COINGECKO_PAYLOAD');
    return { items, source: 'coingecko', endpoint: 'primary' };
  } catch (primaryError) {
    const symbols = encodeURIComponent(JSON.stringify(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']));
    const payload = await fetchJsonWithTimeout(`${BINANCE_ENDPOINT}?symbols=${symbols}`, {}, fetchImpl);
    const items = normalizeBinance(payload);
    if (items.length !== 3) throw new Error('INCOMPLETE_BINANCE_PAYLOAD');
    return { items, source: 'binance', endpoint: 'fallback' };
  }
}

export async function fetchAllMarkets(symbols, options = {}) {
  const results = await Promise.allSettled([
    fetchQuotes(symbols, options),
    fetchGlobalIndices(options),
    fetchCryptoQuotes(options)
  ]);
  const fulfilled = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
  if (!fulfilled.length) throw new Error('ALL_MARKET_SOURCES_FAILED');
  return {
    items: fulfilled.flatMap((result) => result.items),
    stock: results[0],
    indices: results[1],
    crypto: results[2]
  };
}
