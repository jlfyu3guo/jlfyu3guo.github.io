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
  AAPL: 'AAPL.US'
};

function canonicalSymbol(quote) {
  const raw = String(quote?.symbol || quote?.sec_code || '').toUpperCase();
  const secCode = String(quote?.sec_code || '').toUpperCase();
  if (raw.includes('AAPL') || secCode.includes('AAPL')) return 'AAPL';
  if (raw === 'HSI' || secCode.includes('HKHSI')) return 'HSI';
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
  const unique = [...new Set(symbols.filter(Boolean))].slice(0, 50);
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
