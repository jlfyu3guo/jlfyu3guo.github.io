// Virtual portfolio — three isolated accounts (大A/美股/数字资产), 500k each
// Persisted to localStorage, no server-side component

const STORAGE_KEY = 'jstock-paper-v2';

const ACCOUNT_CONFIG = {
  cn:   { name: '大A账户',   currency: 'CNY', initial: 500000, symbol: '¥' },
  us:   { name: '美股账户',   currency: 'USD', initial: 500000, symbol: '$' },
  crypto: { name: '数字资产', currency: 'USD', initial: 500000, symbol: '$' }
};

const ACCOUNT_GROUPS = { cn: 'cn', us: 'us', crypto: 'crypto' };

function freshAccounts() {
  const a = {};
  for (const [k, v] of Object.entries(ACCOUNT_CONFIG))
    a[k] = { ...v, cash: v.initial, holdings: [] };
  return a;
}

export function loadAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshAccounts();
    const d = JSON.parse(raw);
    // Validate shape
    for (const k of Object.keys(ACCOUNT_CONFIG))
      if (!d[k] || typeof d[k].cash !== 'number' || !Array.isArray(d[k].holdings))
        return freshAccounts();
    return d;
  } catch { return freshAccounts(); }
}

export function saveAccounts(accounts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function resetAccounts() {
  const a = freshAccounts();
  saveAccounts(a);
  return a;
}

// Which account a symbol belongs to
window.__stockGroupMap = ACCOUNT_GROUPS;
export function stockAccount(symbol) {
  // Match via data.js group field
  const s = window.__stocks?.find(x => x.symbol === symbol);
  if (!s) return null;
  if (s.group === 'cn') return 'cn';
  if (s.group === 'us') return 'us';
  if (s.group === 'crypto') return 'crypto';
  return null;
}

export function buy(accounts, symbol, shares, price) {
  const key = stockAccount(symbol);
  if (!key) return { ok: false, error: '该标的暂不支持模拟交易' };
  const acct = accounts[key];
  const cost = shares * price;
  if (cost > acct.cash)
    return { ok: false, error: `可用资金不足。需要 ${fmt$(cost, acct.currency)}，可用 ${fmt$(acct.cash, acct.currency)}` };
  const h = acct.holdings.find(x => x.symbol === symbol);
  if (h) {
    h.avgCost = (h.avgCost * h.shares + cost) / (h.shares + shares);
    h.shares += shares;
  } else {
    acct.holdings.push({ symbol, shares, avgCost: price });
  }
  acct.cash -= cost;
  saveAccounts(accounts);
  return { ok: true };
}

export function sell(accounts, symbol, shares, price) {
  const key = stockAccount(symbol);
  if (!key) return { ok: false, error: '该标的暂不支持模拟交易' };
  const acct = accounts[key];
  const h = acct.holdings.find(x => x.symbol === symbol);
  if (!h) return { ok: false, error: '未持有该标的' };
  if (shares > h.shares)
    return { ok: false, error: `可卖数量不足。持有 ${h.shares} 股，最多可卖 ${h.shares} 股` };
  const proceeds = shares * price;
  h.shares -= shares;
  if (h.shares === 0) acct.holdings = acct.holdings.filter(x => x.symbol !== symbol);
  acct.cash += proceeds;
  saveAccounts(accounts);
  return { ok: true };
}

// Calculate account summary with live prices
export function calcAccount(acct, stocks) {
  let marketValue = 0, cost = 0;
  const rows = acct.holdings.map(h => {
    const s = stocks.find(x => x.symbol === h.symbol);
    const price = s?.price > 0 ? s.price : 0;
    const mv = price * h.shares;
    const c = h.avgCost * h.shares;
    marketValue += mv; cost += c;
    return {
      symbol: h.symbol, shares: h.shares, avgCost: h.avgCost,
      name: s?.name || h.symbol, price,
      marketValue: mv, profit: mv - c,
      rate: c > 0 ? (mv / c - 1) * 100 : 0
    };
  });
  return {
    rows, cash: acct.cash, marketValue, cost,
    totalAssets: acct.cash + marketValue,
    totalProfit: marketValue - cost,
    totalRate: cost > 0 ? (marketValue / cost - 1) * 100 : 0,
    currency: acct.currency, symbol: acct.symbol, name: acct.name
  };
}

export function fmt$(value, currency) {
  const sym = currency === 'CNY' ? '¥' : '$';
  return `${sym}${Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
