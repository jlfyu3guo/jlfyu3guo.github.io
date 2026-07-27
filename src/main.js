import './styles.css';
import { createIcons, Search, Star, Plus, ArrowUpRight, ArrowDownRight, BriefcaseBusiness, ChartNoAxesCombined, LayoutDashboard, WalletCards, X, RefreshCw } from 'lucide';
import { marketIndexes, stocks, defaultHoldings } from './data.js';

const STORAGE = { watchlist: 'jstock-watchlist-v1', holdings: 'jstock-holdings-v1' };
const state = {
  selected: '600519',
  range: '1M',
  sort: 'default',
  query: '',
  mobileView: 'market',
  watchlist: load(STORAGE.watchlist, stocks.map((stock) => stock.symbol)),
  holdings: load(STORAGE.holdings, defaultHoldings)
};

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function persist() {
  localStorage.setItem(STORAGE.watchlist, JSON.stringify(state.watchlist));
  localStorage.setItem(STORAGE.holdings, JSON.stringify(state.holdings));
}
const fmt = (value, digits = 2) => Number(value).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const money = (value) => `¥${fmt(value)}`;
const signClass = (value) => value >= 0 ? 'up' : 'down';
const sign = (value) => `${value >= 0 ? '+' : ''}${fmt(value)}%`;
const selectedStock = () => stocks.find((stock) => stock.symbol === state.selected) || stocks[0];
const RANGE_POINTS = { '1D': 8, '1W': 12, '1M': 31, '3M': 24, '1Y': 18 };

function rangeValues(values) {
  const count = RANGE_POINTS[state.range] || values.length;
  if (state.range === '1M') return values;
  const sampled = Array.from({ length: count }, (_, index) => {
    const position = index / (count - 1) * (values.length - 1);
    const left = Math.floor(position), right = Math.min(values.length - 1, Math.ceil(position));
    const blend = position - left;
    const base = values[left] * (1 - blend) + values[right] * blend;
    const amplitude = state.range === '1Y' ? .035 : state.range === '3M' ? .018 : .004;
    return base * (1 + Math.sin(index * 1.73 + count) * amplitude);
  });
  sampled[sampled.length - 1] = values.at(-1);
  return sampled;
}

function sparkline(values, width = 120, height = 38) {
  const min = Math.min(...values), max = Math.max(...values), spread = max - min || 1;
  return values.map((value, index) => `${(index / (values.length - 1)) * width},${height - ((value - min) / spread) * (height - 4) - 2}`).join(' ');
}

function chart(stock) {
  const width = 760, height = 310, leftPad = 54, rightPad = 18, topPad = 20, priceBottom = 226, volumeTop = 248, volumeBottom = 286;
  const values = rangeValues(stock.history);
  const min = Math.min(...values) * .992, max = Math.max(...values) * 1.008;
  const points = values.map((value, index) => ({ x: leftPad + index / (values.length - 1) * (width - leftPad - rightPad), y: topPad + (max - value) / (max - min) * (priceBottom - topPad) }));
  const line = points.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `${leftPad},${priceBottom} ${line} ${width - rightPad},${priceBottom}`;
  const gridRows = [0, 1, 2, 3];
  const grids = gridRows.map(i => { const y = topPad + i * (priceBottom-topPad)/3; return `<line x1="${leftPad}" y1="${y}" x2="${width-rightPad}" y2="${y}"/><text x="${leftPad-9}" y="${y+4}" text-anchor="end">${fmt(max-(max-min)*i/3)}</text>`; }).join('');
  const volumes = values.map((value,index) => 24 + Math.abs(Math.sin(index * 1.37 + stock.price)) * 72);
  const bars = volumes.map((value,index) => { const barWidth = Math.max(3,(width-leftPad-rightPad)/values.length*.58); const x = points[index].x-barWidth/2; const h = value/100*(volumeBottom-volumeTop); const rising = index===0 || values[index]>=values[index-1]; return `<rect x="${x}" y="${volumeBottom-h}" width="${barWidth}" height="${h}" fill="${rising?'#dc4d4d':'#10966a'}" opacity=".42"/>`; }).join('');
  const labels = state.range === '1D' ? ['09:30','11:30','13:00','15:00'] : state.range === '1W' ? ['周一','周二','周三','周四','周五'] : state.range === '1Y' ? ['2025-08','2025-12','2026-04','2026-07'] : ['06-24','07-04','07-14','07-24'];
  const xLabels = labels.map((label,index) => `<text x="${leftPad+index/(labels.length-1)*(width-leftPad-rightPad)}" y="305" text-anchor="${index===0?'start':index===labels.length-1?'end':'middle'}">${label}</text>`).join('');
  return `<svg id="priceChart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${stock.name}${state.range}价格与成交量走势"><defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d94d4d" stop-opacity=".17"/><stop offset="1" stop-color="#d94d4d" stop-opacity="0"/></linearGradient></defs><g class="chart-grid">${grids}</g><polygon points="${area}" fill="url(#areaFill)"/><polyline points="${line}" fill="none" stroke="#d94d4d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${points.at(-1).x}" cy="${points.at(-1).y}" r="4" fill="#fff" stroke="#d94d4d" stroke-width="3"/><g class="volume-bars">${bars}</g><g class="chart-labels">${xLabels}<text x="${leftPad}" y="243">成交量</text></g></svg>`;
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
  let list = stocks.filter(stock => state.watchlist.includes(stock.symbol) && `${stock.symbol}${stock.name}${stock.sector}`.toLowerCase().includes(state.query.toLowerCase()));
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
      <nav aria-label="主导航"><button class="nav-item active"><i data-lucide="layout-dashboard"></i>行情工作台</button><button class="nav-item" data-view="portfolio"><i data-lucide="wallet-cards"></i>我的组合</button></nav>
      <div class="snapshot"><span class="status-dot"></span>演示快照 · 15:00</div>
    </header>
    <main>
      <section class="market-strip" aria-label="市场指数">
        <div class="strip-title"><span>市场概览</span><small>中国 · 香港</small></div>
        ${marketIndexes.map(index => `<article><div><strong>${index.name}</strong><small>${index.symbol}</small></div><div class="index-value"><b>${fmt(index.value)}</b><span class="${signClass(index.change)}">${sign(index.change)}</span></div></article>`).join('')}
      </section>
      <div class="mobile-tabs" role="tablist"><button class="${state.mobileView === 'market' ? 'active' : ''}" data-mobile="market">行情</button><button class="${state.mobileView === 'portfolio' ? 'active' : ''}" data-mobile="portfolio">组合</button></div>
      <div class="workspace ${state.mobileView === 'portfolio' ? 'show-portfolio' : ''}">
        <aside class="watch-panel panel">
          <div class="panel-heading"><div><p class="eyebrow">WATCHLIST</p><h2>自选股</h2></div><button class="icon-button" id="addWatch" title="添加自选股" aria-label="添加自选股"><i data-lucide="plus"></i></button></div>
          <label class="search"><i data-lucide="search"></i><input id="search" value="${state.query}" placeholder="搜索股票代码或名称" /></label>
          <div class="sort-row"><span>${watchlist.length} 支股票</span><select id="sort" aria-label="自选股排序"><option value="default" ${state.sort==='default'?'selected':''}>默认排序</option><option value="gain" ${state.sort==='gain'?'selected':''}>涨幅优先</option><option value="loss" ${state.sort==='loss'?'selected':''}>跌幅优先</option></select></div>
          <div class="watch-list">${watchlist.length ? watchlist.map(item => `<div class="watch-wrap"><button class="watch-item ${item.symbol===stock.symbol?'selected':''}" data-stock="${item.symbol}" aria-label="查看 ${item.name}"><div class="stock-id"><strong>${item.name}</strong><span>${item.symbol}.${item.market}</span></div><svg viewBox="0 0 120 38" aria-hidden="true"><polyline points="${sparkline(item.history)}" fill="none" stroke="${item.change >= 0 ? '#d94d4d' : '#0f9f6e'}" stroke-width="2"/></svg><div class="quote"><strong>${fmt(item.price)}</strong><span class="${signClass(item.change)}">${sign(item.change)}</span></div></button><button class="star-button" data-remove="${item.symbol}" aria-label="移除 ${item.name} 自选" title="移除自选"><i data-lucide="star"></i></button></div>`).join('') : `<div class="empty-state">没有匹配的自选股</div>`}</div>
        </aside>
        <section class="market-main">
          <article class="quote-card panel">
            <div class="quote-header"><div><p class="eyebrow">${stock.symbol}.${stock.market} · ${stock.sector}</p><h1>${stock.name}</h1></div><button class="favorite active" data-remove="${stock.symbol}" aria-label="从自选列表移除 ${stock.name}"><i data-lucide="star"></i><span>已自选</span></button></div>
            <div class="hero-quote"><strong>${fmt(stock.price)}</strong><div class="${signClass(stock.change)}"><i data-lucide="${stock.change>=0?'arrow-up-right':'arrow-down-right'}"></i><span>${sign(stock.change)}</span></div></div>
            <div class="chart-toolbar"><div class="ranges">${['1D','1W','1M','3M','1Y'].map(range => `<button class="${state.range===range?'active':''}" data-range="${range}">${range}</button>`).join('')}</div><span>截至 2026-07-24 收盘</span></div>
            <div class="chart-wrap">${chart(stock)}</div>
            <dl class="quote-stats"><div><dt>成交额</dt><dd>${stock.volume}</dd></div><div><dt>市盈率</dt><dd>${stock.pe}</dd></div><div><dt>今开</dt><dd>${fmt(stock.price*(1-stock.change/200))}</dd></div><div><dt>昨收</dt><dd>${fmt(stock.price/(1+stock.change/100))}</dd></div></dl>
          </article>
          <section class="holdings panel">
            <div class="panel-heading"><div><p class="eyebrow">POSITIONS</p><h2>持仓明细</h2></div><button class="command" id="addHolding"><i data-lucide="plus"></i>添加持仓</button></div>
            <div class="table-scroll"><table><thead><tr><th>股票</th><th>持有 / 成本</th><th>现价</th><th>市值</th><th>盈亏</th></tr></thead><tbody>${p.rows.map(item => `<tr><td><strong>${item.stock.name}</strong><span>${item.stock.symbol}.${item.stock.market}</span></td><td>${fmt(item.shares,0)} 股<span>${money(item.cost)}</span></td><td>${money(item.stock.price)}</td><td>${money(item.marketValue)}</td><td class="${signClass(item.profit)}"><strong>${item.profit>=0?'+':''}${money(item.profit)}</strong><span>${sign(item.rate)}</span></td></tr>`).join('')}</tbody></table></div>
          </section>
        </section>
        <aside class="portfolio-panel panel">
          <div class="panel-heading"><div><p class="eyebrow">PORTFOLIO</p><h2>投资组合</h2></div><span class="asset-count">${p.rows.length} 项资产</span></div>
          <div class="total-value"><span>总市值</span><strong>${money(p.marketValue)}</strong><div class="${signClass(p.profit)}"><span>累计盈亏</span><b>${p.profit>=0?'+':''}${money(p.profit)} · ${sign(p.rate)}</b></div></div>
          <div class="allocation"><div class="section-label"><span>资产配置</span><small>按当前市值</small></div><div class="allocation-bar">${p.rows.map((item,i)=>`<span style="width:${item.marketValue/p.marketValue*100}%;--c:${['#0f9f6e','#1c73d1','#e3a338','#697586'][i%4]}"></span>`).join('')}</div>${p.rows.map((item,i)=>`<div class="allocation-row"><span><i style="--c:${['#0f9f6e','#1c73d1','#e3a338','#697586'][i%4]}"></i>${item.stock.name}</span><strong>${fmt(item.marketValue/p.marketValue*100,1)}%</strong></div>`).join('')}</div>
          <div class="insight"><i data-lucide="chart-no-axes-combined"></i><div><strong>组合观察</strong><p>当前组合集中于消费、新能源和金融板块。数据仅供产品演示，不构成投资建议。</p></div></div>
        </aside>
      </div>
    </main>
    <footer><span>JStock 数据工作台</span><span>演示数据 · 非实时行情 · 不构成投资建议</span></footer>
    <dialog id="holdingDialog"><form method="dialog"><div class="dialog-head"><div><p class="eyebrow">NEW POSITION</p><h2>添加持仓</h2></div><button value="cancel" class="icon-button" aria-label="关闭"><i data-lucide="x"></i></button></div><label>股票<select id="holdingStock">${stocks.map(item=>`<option value="${item.symbol}">${item.name} ${item.symbol}</option>`).join('')}</select></label><div class="form-grid"><label>持有数量<input id="holdingShares" type="number" min="1" step="1" required placeholder="100" /></label><label>成本价<input id="holdingCost" type="number" min="0.01" step="0.01" required placeholder="0.00" /></label></div><button class="primary" id="confirmHolding" value="default">确认添加</button></form></dialog>
    <dialog id="watchDialog"><form method="dialog"><div class="dialog-head"><div><p class="eyebrow">WATCHLIST</p><h2>添加自选股</h2></div><button value="cancel" class="icon-button" aria-label="关闭"><i data-lucide="x"></i></button></div><div class="stock-picker">${stocks.filter(item=>!state.watchlist.includes(item.symbol)).map(item=>`<button value="default" data-add-watch="${item.symbol}"><span><strong>${item.name}</strong><small>${item.symbol}.${item.market}</small></span><i data-lucide="plus"></i></button>`).join('') || '<p class="empty-state">全部股票已在自选列表</p>'}</div></form></dialog>`;
  createIcons({ icons: { Search, Star, Plus, ArrowUpRight, ArrowDownRight, BriefcaseBusiness, ChartNoAxesCombined, LayoutDashboard, WalletCards, X, RefreshCw } });
  bind();
}

function bind() {
  document.querySelectorAll('[data-stock]').forEach(el => el.onclick = () => { state.selected = el.dataset.stock; render(); });
  document.querySelectorAll('[data-remove]').forEach(el => el.onclick = (event) => { event.stopPropagation(); state.watchlist = state.watchlist.filter(s => s !== el.dataset.remove); persist(); render(); });
  document.querySelectorAll('[data-range]').forEach(el => el.onclick = () => { state.range = el.dataset.range; render(); });
  document.querySelectorAll('[data-mobile]').forEach(el => el.onclick = () => { state.mobileView = el.dataset.mobile; render(); });
  document.querySelector('[data-view="portfolio"]').onclick = () => { state.mobileView = 'portfolio'; document.querySelector('.portfolio-panel').scrollIntoView({ behavior: 'smooth' }); };
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
