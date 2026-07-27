import './styles.css';
import { createIcons, Search, Star, Plus, ArrowUpRight, ArrowDownRight, BriefcaseBusiness, ChartNoAxesCombined, LayoutDashboard, WalletCards, X, RefreshCw, TrendingUp, RotateCcw } from 'lucide';
import { marketIndexes, stocks, defaultHoldings } from './data.js';
import { fetchAllMarkets } from './quote-api.js';
import { loadAccounts, saveAccounts, resetAccounts, buy, sell, calcAccount, fmt$, stockAccount } from './paper-trading.js';

const quoteState = {
  status: 'loading',
  source: null,
  endpoint: null,
  session: null,
  updatedAt: null,
  error: null,
  warnings: [],
  coverage: 0
};
const quoteSymbols = [...marketIndexes.map((item) => item.symbol), ...stocks.map((item) => item.symbol)];

const STORAGE = { watchlist: 'jstock-watchlist-v2', holdings: 'jstock-holdings-v1' };
const legacyWatchlist = load('jstock-watchlist-v1', []);
const defaultWatchlist = [...new Set([...stocks.map((stock) => stock.symbol), ...legacyWatchlist])];
const state = {
  selected: '600519',
  sort: 'default',
  group: 'all',
  query: '',
  mobileView: 'market',
  view: 'market',
  paperTab: 'cn',
  paperBuyStock: null,
  watchlist: load(STORAGE.watchlist, defaultWatchlist),
  holdings: load(STORAGE.holdings, defaultHoldings)
};
let paperAccounts = loadAccounts();
// Expose stocks for paper-trading module
window.__stocks = stocks;

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function persist() {
  localStorage.setItem(STORAGE.watchlist, JSON.stringify(state.watchlist));
  localStorage.setItem(STORAGE.holdings, JSON.stringify(state.holdings));
}
const fmt = (value, digits = 2) => Number(value).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const currencySymbol = (currency) => ({ CNY: '¥', HKD: 'HK$', USD: '$', JPY: '¥', KRW: '₩' }[currency] || '');
const quotePrice = (item) => `${currencySymbol(item.currency)}${fmt(currentPrice(item))}`;
const currentPrice = (item) => Number('value' in item ? item.value : item.price);
const money = (value) => `¥${fmt(value)}`;
const signedMoney = (value) => `${value >= 0 ? '+' : '-'}¥${fmt(Math.abs(value))}`;
const signClass = (value) => value >= 0 ? 'up' : 'down';
const sign = (value) => `${value >= 0 ? '+' : ''}${fmt(value)}%`;
const selectedStock = () => stocks.find((stock) => stock.symbol === state.selected) || marketIndexes.find((item) => item.symbol === state.selected) || stocks[0];
const sourceName = (source) => ({ tencent: '腾讯行情', sina: '新浪行情', xueqiu: '雪球行情' }[source] || '边缘行情');
const sessionName = (session) => {
  if (String(session).startsWith('open')) return '交易中';
  if (session === 'weekend') return '周末休市';
  if (session === 'closed') return '已收市';
  return '行情快照';
};
const quoteTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '--' : new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date);
};
const volumeText = (item) => {
  const value = Number(item.volumeHands);
  if (!value) return '--';
  if (item.group === 'crypto') {
    if (value >= 1e9) return `$${fmt(value / 1e9, 2)}B`;
    if (value >= 1e6) return `$${fmt(value / 1e6, 2)}M`;
    return `$${fmt(value, 0)}`;
  }
  return `${fmt(value / 10000, 1)}万手`;
};

function chart(stock) {
  const width = 760, height = 210, leftPad = 72, rightPad = 28;
  const prices = {
    prevClose: Number(stock.prevClose),
    open: Number(stock.open),
    low: Number(stock.low),
    high: Number(stock.high),
    current: currentPrice(stock)
  };
  if (Object.values(prices).some((value) => !(value > 0))) {
    return '<div class="chart-empty">当前行情未提供完整的当日价格区间</div>';
  }
  const min = Math.min(...Object.values(prices)) * .998;
  const max = Math.max(...Object.values(prices)) * 1.002;
  const scale = (value) => leftPad + (value - min) / (max - min || 1) * (width - leftPad - rightPad);
  const lowX = scale(prices.low), highX = scale(prices.high);
  const markers = [
    { label: '昨收', value: prices.prevClose, y: 50, color: '#697586' },
    { label: '今开', value: prices.open, y: 92, color: '#e3a338' },
    { label: '现价', value: prices.current, y: 134, color: prices.current >= prices.prevClose ? '#d94d4d' : '#0f9f6e' }
  ].map((item) => { const x = scale(item.value); return `<g><line x1="${x}" y1="${item.y-10}" x2="${x}" y2="${item.y+10}" stroke="${item.color}" stroke-width="3"/><circle cx="${x}" cy="${item.y}" r="4" fill="#fff" stroke="${item.color}" stroke-width="2.5"/><text x="${x}" y="${item.y-16}" text-anchor="middle" fill="${item.color}">${item.label} ${fmt(item.value)}</text></g>`; }).join('');
  return `<svg id="priceChart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${stock.name}当日价格区间：最低${fmt(prices.low)}，最高${fmt(prices.high)}，昨收${fmt(prices.prevClose)}，今开${fmt(prices.open)}，现价${fmt(prices.current)}"><line x1="${lowX}" y1="176" x2="${highX}" y2="176" stroke="#bdc6ca" stroke-width="8" stroke-linecap="round"/><circle cx="${lowX}" cy="176" r="6" fill="#0f9f6e"/><circle cx="${highX}" cy="176" r="6" fill="#d94d4d"/><text x="${lowX}" y="200" text-anchor="middle">最低 ${fmt(prices.low)}</text><text x="${highX}" y="200" text-anchor="middle">最高 ${fmt(prices.high)}</text>${markers}</svg>`;
}

function applyQuotes(items) {
  for (const quote of items) {
    const target = stocks.find((item) => item.symbol === quote.symbol) || marketIndexes.find((item) => item.symbol === quote.symbol);
    if (!target) continue;
    if ('value' in target) {
      target.value = quote.price;
      target.change = quote.change;
      target.prevClose = quote.prevClose;
      target.open = quote.open;
      target.high = quote.high;
      target.low = quote.low;
      target.quoteTime = quote.quoteTime;
      target.source = quote.source;
      if (quote.currency) target.currency = quote.currency;
      continue;
    }
    if (target.history?.length) {
      const last = target.history.at(-1) || quote.price;
      const scale = quote.price / last;
      target.history = target.history.map((value) => value * scale);
    }
    Object.assign(target, {
      price: quote.price,
      change: quote.change,
      prevClose: quote.prevClose,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      volumeHands: quote.volumeHands,
      quoteTime: quote.quoteTime,
      dataSource: quote.source,
      liveName: quote.name || target.name
    });
  }
}

async function refreshQuotes({ force = false } = {}) {
  if (quoteState.status === 'loading' && quoteState.updatedAt && !force) return;
  quoteState.status = 'loading';
  quoteState.error = null;
  render();
  try {
    const result = await fetchAllMarkets(quoteSymbols, { refresh: force });
    applyQuotes(result.items);
    const stockResult = result.stock.status === 'fulfilled' ? result.stock.value : null;
    const warnings = [
      result.stock.status === 'rejected' ? '股票行情' : null,
      result.indices.status === 'rejected' ? '日韩指数' : null,
      result.crypto.status === 'rejected' ? '虚拟币' : null
    ].filter(Boolean);
    Object.assign(quoteState, {
      status: 'ready',
      source: stockResult?.source || 'multi',
      endpoint: stockResult?.endpoint || 'partial',
      session: stockResult?.session || 'unknown',
      updatedAt: new Date(),
      error: null,
      warnings,
      coverage: result.items.length
    });
  } catch (error) {
    quoteState.status = 'error';
    quoteState.error = error?.message || '行情服务暂时不可用';
  }
  render();
}

function portfolio() {
  const rows = state.holdings.map((holding) => {
    const stock = stocks.find((item) => item.symbol === holding.symbol);
    if (!stock) return null;
    const marketValue = stock.price * holding.shares;
    const profit = (stock.price - holding.cost) * holding.shares;
    return { ...holding, stock, marketValue, profit, rate: (stock.price / holding.cost - 1) * 100 };
  }).filter(Boolean);
  const marketValue = rows.reduce((sum, item) => sum + item.marketValue, 0);
  const profit = rows.reduce((sum, item) => sum + item.profit, 0);
  return { rows, marketValue, profit, rate: marketValue - profit ? profit / (marketValue - profit) * 100 : 0 };
}

function filteredWatchlist() {
  let list = stocks.filter(stock => state.watchlist.includes(stock.symbol) && (state.group === 'all' || stock.group === state.group) && `${stock.symbol}${stock.name}${stock.sector}`.toLowerCase().includes(state.query.toLowerCase()));
  if (state.sort === 'gain') list.sort((a,b) => b.change - a.change);
  if (state.sort === 'loss') list.sort((a,b) => a.change - b.change);
  return list;
}

function render() {
  const stock = selectedStock();
  const p = portfolio();
  const watchlist = filteredWatchlist();
  document.querySelector('#app').innerHTML = `
    <header class="app-header">
      <a class="brand" href="#" aria-label="JStock 首页"><span class="brand-mark">J</span><strong>JStock</strong></a>
      <nav aria-label="主导航"><button class="nav-item active"><i data-lucide="layout-dashboard"></i>行情工作台</button><button class="nav-item" data-view="portfolio"><i data-lucide="wallet-cards"></i>我的组合</button><button class="nav-item" data-view="paper"><i data-lucide="trending-up"></i>模拟盘</button></nav>
      <div class="snapshot ${quoteState.status}"><span class="status-dot"></span><span>${quoteState.status === 'ready' ? `${sourceName(quoteState.source)} · ${sessionName(quoteState.session)} · ${quoteState.endpoint === 'fallback' ? '备用线路' : quoteState.endpoint === 'partial' ? '部分线路' : '主线路'}` : quoteState.status === 'loading' ? '正在更新行情' : '行情连接异常'}</span><button id="refreshQuotes" class="refresh-button" aria-label="刷新实时行情" title="刷新实时行情" ${quoteState.status === 'loading' ? 'disabled' : ''}><i data-lucide="refresh-cw"></i></button></div>
    </header>
    <main class="${state.view === 'paper' ? 'view-paper' : ''}">
      <section class="market-strip" aria-label="全球市场指数">
        <div class="strip-title"><span>全球指数</span><small>中国 · 香港 · 日韩</small></div>
        ${marketIndexes.map(index => `<button class="index-card" data-index="${index.symbol}" aria-label="查看 ${index.name}"><span><strong>${index.name}</strong><small>${index.symbol} · ${index.currency}</small></span><span class="index-value"><b>${index.value > 0 ? fmt(index.value) : '--'}</b><i class="${signClass(index.change)}">${index.value > 0 ? sign(index.change) : '等待行情'}</i></span></button>`).join('')}
      </section>
      <div class="mobile-tabs" role="tablist"><button class="${state.mobileView === 'market' ? 'active' : ''}" data-mobile="market">行情</button><button class="${state.mobileView === 'portfolio' ? 'active' : ''}" data-mobile="portfolio">组合</button></div>
      <div class="workspace ${state.mobileView === 'portfolio' ? 'show-portfolio' : ''}">
        <aside class="watch-panel panel">
          <div class="panel-heading"><div><p class="eyebrow">WATCHLIST</p><h2>自选股</h2></div><button class="icon-button" id="addWatch" title="添加自选股" aria-label="添加自选股"><i data-lucide="plus"></i></button></div>
          <label class="search"><i data-lucide="search"></i><input id="search" value="${state.query}" placeholder="搜索股票或虚拟币" /></label>
          <div class="market-groups" role="tablist" aria-label="行情市场筛选">${[['all','全部'],['cn','A股'],['hk','港股'],['us','美股'],['crypto','虚拟币']].map(([value,label]) => `<button class="${state.group === value ? 'active' : ''}" data-group="${value}">${label}</button>`).join('')}</div>
          <div class="sort-row"><span>${watchlist.length} 个标的</span><select id="sort" aria-label="自选行情排序"><option value="default" ${state.sort==='default'?'selected':''}>默认排序</option><option value="gain" ${state.sort==='gain'?'selected':''}>涨幅优先</option><option value="loss" ${state.sort==='loss'?'selected':''}>跌幅优先</option></select></div>
          <div class="watch-list">${watchlist.length ? watchlist.map(item => `<div class="watch-wrap"><button class="watch-item ${item.symbol===stock.symbol?'selected':''}" data-stock="${item.symbol}" aria-label="查看 ${item.name}"><div class="stock-id"><strong>${item.name}</strong><span>${item.symbol} · ${item.currency}</span></div><div class="quote"><strong>${item.price > 0 ? quotePrice(item) : '--'}</strong><span class="${signClass(item.change)}">${item.price > 0 ? sign(item.change) : '等待行情'}</span></div></button><button class="star-button" data-remove="${item.symbol}" aria-label="移除 ${item.name} 自选" title="移除自选"><i data-lucide="star"></i></button></div>`).join('') : `<div class="empty-state">没有匹配的行情</div>`}</div>
        </aside>
        <section class="market-main">
          <article class="quote-card panel">
            <div class="quote-header"><div><p class="eyebrow">${stock.symbol}.${stock.market} · ${stock.sector || '市场指数'} · ${stock.currency}</p><h1>${stock.name}</h1></div>${'value' in stock ? '<span class="asset-count">指数</span>' : `<button class="favorite active" data-remove="${stock.symbol}" aria-label="从自选列表移除 ${stock.name}"><i data-lucide="star"></i><span>已自选</span></button>`}</div>
            <div class="hero-quote"><strong>${currentPrice(stock) > 0 ? quotePrice(stock) : '--'}</strong><div class="${signClass(stock.change)}"><i data-lucide="${stock.change>=0?'arrow-up-right':'arrow-down-right'}"></i><span>${currentPrice(stock) > 0 ? sign(stock.change) : '等待行情'}</span></div></div>
            <div class="chart-toolbar"><strong>${stock.group === 'crypto' ? '24小时价格区间' : '当日价格区间'}</strong><span>${stock.dataSource ? `${stock.dataSource} · ` : ''}行情时间 ${quoteTime(stock.quoteTime)}</span></div>
            <div class="chart-wrap">${chart(stock)}</div>
            <dl class="quote-stats"><div><dt>${stock.group === 'crypto' ? '24h成交额' : '成交量'}</dt><dd>${volumeText(stock)}</dd></div><div><dt>今开</dt><dd>${stock.open ? fmt(stock.open) : '--'}</dd></div><div><dt>最高 / 最低</dt><dd>${stock.high && stock.low ? `${fmt(stock.high)} / ${fmt(stock.low)}` : '--'}</dd></div><div><dt>昨收</dt><dd>${stock.prevClose ? fmt(stock.prevClose) : '--'}</dd></div></dl>
          </article>
          <section class="holdings panel">
            <div class="panel-heading"><div><p class="eyebrow">POSITIONS</p><h2>持仓明细</h2></div><button class="command" id="addHolding"><i data-lucide="plus"></i>添加持仓</button></div>
            <div class="table-scroll"><table><thead><tr><th>股票</th><th>持有 / 成本</th><th>现价</th><th>市值</th><th>盈亏</th></tr></thead><tbody>${p.rows.map(item => `<tr><td><strong>${item.stock.name}</strong><span>${item.stock.symbol}.${item.stock.market}</span></td><td>${fmt(item.shares,0)} 股<span>${money(item.cost)}</span></td><td>${money(item.stock.price)}</td><td>${money(item.marketValue)}</td><td class="${signClass(item.profit)}"><strong>${signedMoney(item.profit)}</strong><span>${sign(item.rate)}</span></td></tr>`).join('')}</tbody></table></div>
          </section>
        </section>
        <aside class="portfolio-panel panel">
          <div class="panel-heading"><div><p class="eyebrow">PORTFOLIO</p><h2>投资组合</h2></div><span class="asset-count">${p.rows.length} 项资产</span></div>
          <div class="total-value"><span>总市值</span><strong>${money(p.marketValue)}</strong><div class="${signClass(p.profit)}"><span>累计盈亏</span><b>${signedMoney(p.profit)} · ${sign(p.rate)}</b></div></div>
          <div class="allocation"><div class="section-label"><span>资产配置</span><small>按当前市值</small></div><div class="allocation-bar">${p.rows.map((item,i)=>`<span style="width:${item.marketValue/p.marketValue*100}%;--c:${['#0f9f6e','#1c73d1','#e3a338','#697586'][i%4]}"></span>`).join('')}</div>${p.rows.map((item,i)=>`<div class="allocation-row"><span><i style="--c:${['#0f9f6e','#1c73d1','#e3a338','#697586'][i%4]}"></i>${item.stock.name}</span><strong>${fmt(item.marketValue/p.marketValue*100,1)}%</strong></div>`).join('')}</div>
          <div class="insight"><i data-lucide="chart-no-axes-combined"></i><div><strong>组合观察</strong><p>持仓市值按最新有效行情自动更新。行情可能存在网络与交易所延迟，不构成投资建议。</p></div></div>
        </aside>
      </div>
      ${state.view === 'paper' ? `
      <div class="paper-panel">
        <div class="paper-header">
          <div><p class="eyebrow">PAPER TRADING</p><h2>模拟盘</h2></div>
          <button class="icon-button" id="paperReset" title="重置所有模拟账户" aria-label="重置模拟盘"><i data-lucide="rotate-ccw"></i></button>
        </div>
        <div class="paper-account-tabs" role="tablist">${['cn','us','crypto'].map(k => {
          const cfg = { cn: '大A账户', us: '美股账户', crypto: '数字资产' };
          return `<button class="${state.paperTab === k ? 'active' : ''}" data-paper-tab="${k}">${cfg[k]}</button>`;
        }).join('')}</div>
        ${(() => {
          const acct = paperAccounts[state.paperTab];
          const calc = calcAccount(acct, stocks);
          return `
          <div class="paper-summary">
            <div class="paper-stat"><span>可用资金</span><strong>${fmt$(calc.cash, calc.currency)}</strong></div>
            <div class="paper-stat"><span>持仓市值</span><strong>${fmt$(calc.marketValue, calc.currency)}</strong></div>
            <div class="paper-stat"><span>总资产</span><strong>${fmt$(calc.totalAssets, calc.currency)}</strong></div>
            <div class="paper-stat ${signClass(calc.totalProfit)}"><span>总盈亏</span><strong>${calc.totalProfit >= 0 ? '+' : ''}${fmt$(calc.totalProfit, calc.currency)} · ${calc.totalRate >= 0 ? '+' : ''}${fmt(calc.totalRate, 2)}%</strong></div>
          </div>`;
        })()}
        <div class="paper-toolbar">
          <span class="paper-count">${calcAccount(paperAccounts[state.paperTab], stocks).rows.length} 项持仓</span>
          <button class="command" id="paperBuy"><i data-lucide="plus"></i>买入</button>
        </div>
        <div class="table-scroll"><table class="paper-table">
          <thead><tr><th>股票</th><th>持有数量</th><th>均价</th><th>现价</th><th>市值</th><th>盈亏</th><th>操作</th></tr></thead>
          <tbody>${(() => {
            const calc = calcAccount(paperAccounts[state.paperTab], stocks);
            if (!calc.rows.length) return '<tr><td colspan="7" class="empty-state">暂无持仓。点击"买入"开始模拟交易。</td></tr>';
            return calc.rows.map(r => `<tr>
              <td><strong>${r.name}</strong><span>${r.symbol}</span></td>
              <td>${r.shares} 股</td>
              <td>${fmt$(r.avgCost, calc.currency)}</td>
              <td>${r.price > 0 ? fmt$(r.price, calc.currency) : '--'}</td>
              <td>${fmt$(r.marketValue, calc.currency)}</td>
              <td class="${signClass(r.profit)}"><strong>${r.profit >= 0 ? '+' : ''}${fmt$(r.profit, calc.currency)}</strong><span>${r.rate >= 0 ? '+' : ''}${fmt(r.rate, 2)}%</span></td>
              <td><button class="paper-sell-btn" data-paper-sell="${r.symbol}" ${r.price > 0 ? '' : 'disabled'}>卖出</button></td>
            </tr>`).join('');
          })()}</tbody>
        </table></div>
      </div>` : ''}
    </main>
    ${quoteState.warnings.length ? `<div class="quote-warning" role="status">部分行情暂不可用：${quoteState.warnings.join('、')}。其他市场数据已正常更新。</div>` : ''}
    ${quoteState.status === 'error' ? `<div class="quote-alert" role="alert"><strong>实时行情暂不可用</strong><span>已保留最后一份有效数据，请稍后刷新。</span></div>` : ''}
    <footer><span>JStock 数据工作台</span><span>${quoteState.status === 'ready' ? `${sourceName(quoteState.source)} · 更新 ${quoteTime([...stocks].sort((a,b) => new Date(b.quoteTime || 0) - new Date(a.quoteTime || 0))[0]?.quoteTime)}` : '行情连接中'} · 数据可能延迟 · 不构成投资建议</span></footer>
    <dialog id="holdingDialog"><form method="dialog"><div class="dialog-head"><div><p class="eyebrow">NEW POSITION</p><h2>添加持仓</h2></div><button value="cancel" class="icon-button" aria-label="关闭"><i data-lucide="x"></i></button></div><label>股票<select id="holdingStock">${stocks.filter(item => item.portfolioEligible).map(item=>`<option value="${item.symbol}">${item.name} ${item.symbol}</option>`).join('')}</select></label><div class="form-grid"><label>持有数量<input id="holdingShares" type="number" min="1" step="1" required placeholder="100" /></label><label>成本价<input id="holdingCost" type="number" min="0.01" step="0.01" required placeholder="0.00" /></label></div><button class="primary" id="confirmHolding" value="default">确认添加</button></form></dialog>
    <dialog id="watchDialog"><form method="dialog"><div class="dialog-head"><div><p class="eyebrow">WATCHLIST</p><h2>添加自选股</h2></div><button value="cancel" class="icon-button" aria-label="关闭"><i data-lucide="x"></i></button></div><div class="stock-picker">${stocks.filter(item=>!state.watchlist.includes(item.symbol)).map(item=>`<button value="default" data-add-watch="${item.symbol}"><span><strong>${item.name}</strong><small>${item.symbol}.${item.market}</small></span><i data-lucide="plus"></i></button>`).join('') || '<p class="empty-state">全部股票已在自选列表</p>'}</div></form></dialog>
    <dialog id="paperBuyDialog"><form method="dialog"><div class="dialog-head"><div><p class="eyebrow">PAPER TRADE</p><h2>模拟买入</h2></div><button value="cancel" class="icon-button" aria-label="关闭"><i data-lucide="x"></i></button></div>
      <p class="dialog-sub">账户：${paperAccounts[state.paperTab]?.name} · 可用 ${fmt$(paperAccounts[state.paperTab]?.cash || 0, paperAccounts[state.paperTab]?.currency || 'CNY')}</p>
      <label>标的<select id="paperBuyStock">${stocks.filter(s => stockAccount(s.symbol) === state.paperTab && s.price > 0).map(s => `<option value="${s.symbol}">${s.name} ${s.symbol} · ${fmt$(s.price, s.currency)}</option>`).join('')}</select></label>
      <div class="form-grid"><label>数量（股）<input id="paperBuyShares" type="number" min="1" step="1" required placeholder="100" /></label><label>预估金额<span id="paperBuyTotal" class="paper-total-hint">--</span></label></div>
      <div class="dialog-actions"><button class="primary" id="confirmPaperBuy" value="default">确认买入</button></div>
    </form></dialog>
    <dialog id="paperSellDialog"><form method="dialog"><div class="dialog-head"><div><p class="eyebrow">PAPER TRADE</p><h2>模拟卖出</h2></div><button value="cancel" class="icon-button" aria-label="关闭"><i data-lucide="x"></i></button></div>
      <p class="dialog-sub" id="paperSellInfo">选择要卖出的标的和数量</p>
      <label>标的<select id="paperSellStock">${(() => {
        const calc = calcAccount(paperAccounts[state.paperTab], stocks);
        return calc.rows.map(r => `<option value="${r.symbol}" data-shares="${r.shares}" data-price="${r.price}" data-name="${r.name}">${r.name} ${r.symbol} · 持有 ${r.shares} 股 · 现价 ${fmt$(r.price, calc.currency)}</option>`).join('');
      })()}</select></label>
      <div class="form-grid"><label>卖出数量<input id="paperSellShares" type="number" min="1" step="1" required placeholder="100" /></label><label>最大可卖<span id="paperSellMax" class="paper-total-hint">--</span></label></div>
      <div class="dialog-actions"><button class="primary danger" id="confirmPaperSell" value="default">确认卖出</button></div>
    </form></dialog>`;
  createIcons({ icons: { Search, Star, Plus, ArrowUpRight, ArrowDownRight, BriefcaseBusiness, ChartNoAxesCombined, LayoutDashboard, WalletCards, X, RefreshCw, TrendingUp, RotateCcw } });
  bind();
}

function bind() {
  const refreshButton = document.querySelector('#refreshQuotes');
  if (refreshButton) refreshButton.onclick = () => refreshQuotes({ force: true });
  document.querySelectorAll('[data-stock]').forEach(el => el.onclick = () => { state.selected = el.dataset.stock; render(); });
  document.querySelectorAll('[data-index]').forEach(el => el.onclick = () => { state.selected = el.dataset.index; render(); document.querySelector('.quote-card').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  document.querySelectorAll('[data-remove]').forEach(el => el.onclick = (event) => { event.stopPropagation(); state.watchlist = state.watchlist.filter(s => s !== el.dataset.remove); persist(); render(); });
  document.querySelectorAll('[data-group]').forEach(el => el.onclick = () => { state.group = el.dataset.group; render(); });
  document.querySelectorAll('[data-mobile]').forEach(el => el.onclick = () => { state.mobileView = el.dataset.mobile; render(); });
  document.querySelectorAll('[data-view]').forEach(el => el.onclick = () => {
    const view = el.dataset.view;
    state.view = view;
    if (view === 'portfolio') state.mobileView = 'portfolio';
    else if (view === 'market') state.mobileView = 'market';
    render();
    if (view === 'portfolio') document.querySelector('.portfolio-panel')?.scrollIntoView({ behavior: 'smooth' });
  });
  // Paper trading account tabs
  document.querySelectorAll('[data-paper-tab]').forEach(el => el.onclick = () => { state.paperTab = el.dataset.paperTab; render(); });
  // Paper reset
  const paperReset = document.querySelector('#paperReset');
  if (paperReset) paperReset.onclick = () => {
    if (!confirm('确定重置所有模拟账户？三个账户将回到各 ¥$500,000 初始资金。')) return;
    paperAccounts = resetAccounts();
    render();
  };
  // Paper buy dialog
  const paperBuyDialog = document.querySelector('#paperBuyDialog');
  document.querySelector('#paperBuy')?.addEventListener('click', () => paperBuyDialog?.showModal());
  const paperBuyStock = document.querySelector('#paperBuyStock');
  const paperBuyShares = document.querySelector('#paperBuyShares');
  const paperBuyTotal = document.querySelector('#paperBuyTotal');
  function updateBuyTotal() {
    if (!paperBuyStock || !paperBuyShares || !paperBuyTotal) return;
    const symbol = paperBuyStock.value;
    const stock = stocks.find(s => s.symbol === symbol);
    const shares = Number(paperBuyShares.value);
    if (stock && stock.price > 0 && shares > 0) {
      const total = shares * stock.price;
      const acct = paperAccounts[state.paperTab];
      paperBuyTotal.textContent = `${fmt$(total, acct.currency)} (${fmt$(stock.price, acct.currency)} × ${shares})`;
    } else {
      paperBuyTotal.textContent = '--';
    }
  }
  if (paperBuyStock) paperBuyStock.onchange = updateBuyTotal;
  if (paperBuyShares) paperBuyShares.oninput = updateBuyTotal;
  document.querySelector('#confirmPaperBuy')?.addEventListener('click', e => {
    const symbol = document.querySelector('#paperBuyStock')?.value;
    const shares = Number(document.querySelector('#paperBuyShares')?.value);
    const stock = stocks.find(s => s.symbol === symbol);
    if (!symbol || !shares || !stock || !(stock.price > 0)) return;
    e.preventDefault();
    const result = buy(paperAccounts, symbol, shares, stock.price);
    if (!result.ok) { alert(result.error); return; }
    paperAccounts = loadAccounts();
    paperBuyDialog?.close();
    render();
  });
  // Paper sell dialog
  const paperSellDialog = document.querySelector('#paperSellDialog');
  document.querySelectorAll('[data-paper-sell]').forEach(el => el.onclick = () => {
    state.paperBuyStock = el.dataset.paperSell;
    render();
    const dialog = document.querySelector('#paperSellDialog');
    if (dialog) {
      dialog.showModal();
      const sel = document.querySelector('#paperSellStock');
      if (sel) { sel.value = state.paperBuyStock; updateSellInfo(); }
    }
  });
  const paperSellStock = document.querySelector('#paperSellStock');
  const paperSellShares = document.querySelector('#paperSellShares');
  const paperSellMax = document.querySelector('#paperSellMax');
  const paperSellInfo = document.querySelector('#paperSellInfo');
  function updateSellInfo() {
    if (!paperSellStock || !paperSellMax || !paperSellInfo) return;
    const opt = paperSellStock.options[paperSellStock.selectedIndex];
    const shares = opt?.dataset?.shares || 0;
    const price = opt?.dataset?.price || 0;
    const name = opt?.dataset?.name || '';
    paperSellMax.textContent = `${shares} 股`;
    const acct = paperAccounts[state.paperTab];
    paperSellInfo.textContent = `${name} · 持有 ${shares} 股 · 现价 ${fmt$(Number(price), acct.currency)}`;
    if (paperSellShares) paperSellShares.max = shares;
  }
  if (paperSellStock) paperSellStock.onchange = updateSellInfo;
  document.querySelector('#confirmPaperSell')?.addEventListener('click', e => {
    const symbol = document.querySelector('#paperSellStock')?.value;
    const shares = Number(document.querySelector('#paperSellShares')?.value);
    const stock = stocks.find(s => s.symbol === symbol);
    if (!symbol || !shares || !stock || !(stock.price > 0)) return;
    e.preventDefault();
    const result = sell(paperAccounts, symbol, shares, stock.price);
    if (!result.ok) { alert(result.error); return; }
    paperAccounts = loadAccounts();
    paperSellDialog?.close();
    render();
  });
  const search = document.querySelector('#search');
  search.oninput = () => { state.query = search.value; const pos = search.selectionStart; render(); const next = document.querySelector('#search'); next.focus(); next.setSelectionRange(pos,pos); };
  document.querySelector('#sort').onchange = e => { state.sort = e.target.value; render(); };
  const holdingDialog = document.querySelector('#holdingDialog');
  document.querySelector('#addHolding').onclick = () => holdingDialog.showModal();
  document.querySelector('#confirmHolding').onclick = e => {
    const symbol = document.querySelector('#holdingStock').value;
    const shares = Number(document.querySelector('#holdingShares').value);
    const cost = Number(document.querySelector('#holdingCost').value);
    if (!shares || !cost) return;
    e.preventDefault();
    const existing = state.holdings.find(item => item.symbol === symbol);
    if (existing) { const total = existing.shares + shares; existing.cost = (existing.cost*existing.shares + cost*shares)/total; existing.shares = total; }
    else state.holdings.push({ symbol, shares, cost });
    persist(); holdingDialog.close(); render();
  };
  const watchDialog = document.querySelector('#watchDialog');
  document.querySelector('#addWatch').onclick = () => watchDialog.showModal();
  document.querySelectorAll('[data-add-watch]').forEach(el => el.onclick = e => { e.preventDefault(); state.watchlist.push(el.dataset.addWatch); persist(); watchDialog.close(); render(); });
}

render();
refreshQuotes();
const quoteTimer = window.setInterval(() => refreshQuotes(), 30_000);
window.addEventListener('pagehide', () => window.clearInterval(quoteTimer), { once: true });
