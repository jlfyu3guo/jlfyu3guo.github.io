import './styles.css';
import { articles } from './articles-data.js';

// ---------- State ----------
const state = {
  view: 'home',       // 'home' | 'article'
  category: '全部',
  query: '',
  slug: null,
};

const categories = ['全部', ...new Set(articles.map((a) => a.category))];

// ---------- Utils ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (d) => (d ? d.replace(/-/g, '/') : '');

function filteredArticles() {
  const q = state.query.trim().toLowerCase();
  return articles.filter((a) => {
    if (state.category !== '全部' && a.category !== state.category) return false;
    if (!q) return true;
    const hay = `${a.title} ${a.summary} ${a.tags.join(' ')} ${a.category} ${a.source}`.toLowerCase();
    return hay.includes(q);
  });
}

// ---------- Render ----------
function renderHome() {
  const list = filteredArticles();
  const catChips = categories
    .map((c) => `<button class="chip ${c === state.category ? 'active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`)
    .join('');
  const cards = list.length
    ? list.map((a) => `
      <article class="card" data-slug="${esc(a.slug)}">
        <div class="card-meta">
          <span class="badge">${esc(a.category)}</span>
          <span class="date">${fmtDate(a.date)}</span>
        </div>
        <h2 class="card-title">${esc(a.title)}</h2>
        <p class="card-summary">${esc(a.summary)}</p>
        <div class="card-foot">
          ${a.tags.length ? `<div class="tags">${a.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}</div>` : '<span></span>'}
          <span class="read-more">阅读全文 →</span>
        </div>
      </article>`).join('')
    : `<div class="empty"><p>没有找到相关文章</p><p class="empty-sub">试试其他关键词或分类</p></div>`;

  document.getElementById('app').innerHTML = `
    <header class="site-header">
      <div class="header-inner">
        <button class="brand" data-nav="home">
          <span class="brand-mark">知</span>
          <span class="brand-text">知栈 <small>公众号知识库</small></span>
        </button>
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input id="search-input" type="search" placeholder="搜索标题、标签、内容…" value="${esc(state.query)}" />
        </div>
      </div>
    </header>
    <main class="container">
      <div class="chips">${catChips}</div>
      <div class="result-bar">共 <b>${list.length}</b> 篇文章</div>
      <div class="cards">${cards}</div>
    </main>
    <footer class="site-footer">知栈 · 微信公众号知识收藏与检索</footer>
  `;
}

function renderArticle() {
  const a = articles.find((x) => x.slug === state.slug);
  if (!a) { state.view = 'home'; return renderHome(); }
  document.getElementById('app').innerHTML = `
    <header class="site-header">
      <div class="header-inner">
        <button class="back-btn" data-back="1">← 返回列表</button>
        <span class="header-title">${esc(a.title)}</span>
      </div>
    </header>
    <main class="container article-wrap">
      <article class="article">
        <h1 class="article-title">${esc(a.title)}</h1>
        <div class="article-meta">
          <span class="badge">${esc(a.category)}</span>
          <span class="date">${fmtDate(a.date)}</span>
          ${a.source ? `<span class="source">来源：${esc(a.source)}</span>` : ''}
        </div>
        ${a.repo_url ? `
        <div class="repo-box">
          <div class="repo-head"><span class="repo-icon">📦</span><span class="repo-label">技能库地址</span></div>
          <a class="repo-link" href="${esc(a.repo_url)}" target="_blank" rel="noopener">${esc(a.repo_name || a.repo_url)}</a>
          ${a.skills_note ? `<div class="repo-note">${esc(a.skills_note)}</div>` : ''}
        </div>` : ''}
        <div class="article-body">${a.html}</div>
        ${a.tags.length ? `<div class="article-tags">${a.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}</div>` : ''}
        ${a.source_url ? `<div class="article-origin"><a href="${esc(a.source_url)}" target="_blank" rel="noopener">查看公众号原文 ↗</a></div>` : ''}
      </article>
    </main>
    <footer class="site-footer">知栈 · 微信公众号知识收藏与检索</footer>
  `;
}

function render() {
  if (state.view === 'article') renderArticle();
  else renderHome();
}

// ---------- Events ----------
document.addEventListener('click', (e) => {
  const card = e.target.closest('[data-slug]');
  if (card) {
    state.view = 'article';
    state.slug = card.dataset.slug;
    history.pushState(null, '', `#/article/${encodeURIComponent(state.slug)}`);
    window.scrollTo(0, 0);
    render();
    return;
  }
  const chip = e.target.closest('[data-cat]');
  if (chip) {
    state.category = chip.dataset.cat;
    render();
    return;
  }
  const nav = e.target.closest('[data-nav="home"]');
  if (nav) {
    state.view = 'home';
    state.slug = null;
    state.query = '';
    history.pushState(null, '', '#/');
    render();
    return;
  }
  const back = e.target.closest('[data-back]');
  if (back) {
    state.view = 'home';
    state.slug = null;
    history.pushState(null, '', '#/');
    window.scrollTo(0, 0);
    render();
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'search-input') {
    state.query = e.target.value;
    renderHome();
    // keep focus after re-render
    const inp = document.getElementById('search-input');
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  }
});

window.addEventListener('popstate', () => {
  const m = location.hash.match(/^#\/article\/(.+)$/);
  if (m) {
    state.view = 'article';
    state.slug = decodeURIComponent(m[1]);
  } else {
    state.view = 'home';
    state.slug = null;
  }
  render();
});

// ---------- Init ----------
const m = location.hash.match(/^#\/article\/(.+)$/);
if (m) {
  state.view = 'article';
  state.slug = decodeURIComponent(m[1]);
}
render();