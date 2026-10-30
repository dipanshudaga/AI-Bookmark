// AI Bookmarks popup. Talks to background.js over runtime messages; renders one screen at a time.

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const IN_EXT = typeof chrome !== 'undefined' && !!chrome.runtime?.id;

const GEAR = [0, 45, 90, 135, 180, 225, 270, 315].map(k => `<rect fill="currentColor" stroke="none" x="10.4" y="2" width="3.2" height="4.4" rx="1" transform="rotate(${k} 12 12)"/>`).join('')
  + '<path fill="currentColor" stroke="none" fill-rule="evenodd" d="M12 5.2a6.8 6.8 0 1 0 0 13.6 6.8 6.8 0 0 0 0-13.6zm0 4a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6z"/>';
const P = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>', gear: GEAR,
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  open: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  back: '<path d="m15 5-7 7 7 7"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>', download: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', chev: '<path d="m9 5 7 7-7 7"/>', down: '<path d="m6 9 6 6 6-6"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4"/>', play: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11"/>',
  bag: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/>', box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2-.6-1.2.2-2.5 1.6-2.5H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'
};
const ic = (n, c = '') => `<svg class="i ${c}" viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`;
const ribbon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h5.2L12 5.8 13.8 3H19v18l-7-4.8L5 21z"/></svg>';
const CAT_ICON = { 'Design': 'palette', 'AI Tools': 'spark', 'AI Agents': 'spark', 'Development': 'code', 'Video & Media': 'play', 'Prompts & Resources': 'book', 'Productivity': 'bag', 'Archives & Museums': 'box', 'Data Visualization': 'grid', 'Inspiration': 'bulb', 'Reading': 'book', 'Work': 'bag', 'Archived': 'box' };
const ENGINES = [['auto', 'Auto'], ['embeddings', 'Meaning (embeddings)'], ['generative', 'Gemini'], ['local', 'Keyword only']];
const STOP = new Set('a an the of for to in on and or with about how what is are my that'.split(' '));
const LIST_CAP = 200;

// ── data layer ─────────────────────────────────────────────────────────────
const send = msg => new Promise(res => chrome.runtime.sendMessage(msg, r =>
  res(chrome.runtime.lastError ? { success: false, error: chrome.runtime.lastError.message } : (r || { success: false, error: 'No response' }))));
let api = send;
const store = {
  update: (id, patch) => IN_EXT ? chrome.bookmarks.update(id, patch) : api({ type: 'DEV_UPDATE', id, patch }),
  remove: id => IN_EXT ? chrome.bookmarks.remove(id) : api({ type: 'DEV_REMOVE', id })
};

let BOOKMARKS = [], CATS = {}, META = {};
const S = {
  screen: 'home', from: 'home', q: '', draft: '', filter: 'All', colOnly: null, lastCol: null, sort: 'relevance', sel: 0, results: [],
  bm: null, loading: true, error: null, confirm: false, confirmClear: false, editing: false, adding: false, addTag: false, copied: null,
  engine: 'auto', settings: {}, hasKey: false, embedded: 0, rebuilding: false, idxError: false, keyNote: '', flat: false, noFav: false,
  theme: 'dark', tag: null, tagTimer: null
};
const themeQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
function applyTheme() { document.documentElement.dataset.theme = S.theme === 'system' ? (themeQuery?.matches ? 'light' : 'dark') : S.theme; }
try { S.theme = localStorage.getItem('theme') || 'dark'; } catch { /* storage unavailable */ }
applyTheme();
themeQuery?.addEventListener?.('change', applyTheme);
let seq = 0, focusSearch = false, say = () => {};

async function load() {
  const [res, meta] = await Promise.all([api({ type: 'GET_CATEGORIES' }), api({ type: 'GET_META' })]);
  S.loading = false;
  if (meta.success) META = meta.meta || {};
  if (!res.success) { S.error = res.error || 'Could not read your bookmarks.'; return; }
  S.error = null;
  CATS = res.categories || {};
  const seen = new Map();
  Object.values(CATS).forEach(list => list.forEach(b => seen.set(b.id, b)));
  BOOKMARKS = [...seen.values()];
}
async function loadStatus() {
  const [st, se, k, tg] = await Promise.all([api({ type: 'GET_EMBEDDINGS_STATUS' }), api({ type: 'GET_SETTINGS' }), api({ type: 'GET_API_KEY' }), api({ type: 'GET_TAG_STATUS' })]);
  if (tg.success) S.tag = tg;
  if (st.success) S.embedded = st.embedded;
  if (se.success) { S.settings = se.settings || {}; S.engine = S.settings.searchEngine || 'auto'; }
  S.hasKey = !!(k.success && k.apiKey);
}
const tagRunning = () => !!(S.tag?.job?.running && Date.now() - (S.tag.job.updatedAt || 0) < 120000);
function pollTags() {
  clearInterval(S.tagTimer);
  S.tagTimer = setInterval(async () => {
    const tg = await api({ type: 'GET_TAG_STATUS' });
    if (tg.success) S.tag = tg;
    if (!tagRunning()) { clearInterval(S.tagTimer); await load(); await loadStatus(); say('Tagging finished'); }
    render();
  }, 2000);
}
const setMeta = (id, patch) => { META[id] = { ...(META[id] || {}), ...patch }; return api({ type: 'SET_META', id, patch }); };
const saveSettings = patch => { S.settings = { autoEmbedNew: true, ...S.settings, ...patch }; return api({ type: 'SAVE_SETTINGS', settings: S.settings }); };

// ── helpers ────────────────────────────────────────────────────────────────
const num = n => n.toLocaleString();
const plural = (n, w) => `${num(n)} ${w}${n === 1 ? '' : 's'}`;
const initial = t => { const g = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter().segment(t)][0]?.segment : Array.from(t)[0]; return (g || '?').toUpperCase(); };
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const safeUrl = u => { try { return /^https?:$/.test(new URL(u).protocol); } catch { return false; } };
const fmt = ms => ms ? new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Never';
const counts = list => list.reduce((m, b) => ((b.categories || []).forEach(c => m[c] = (m[c] || 0) + 1), m), {});
const topCols = (list, n) => Object.entries(counts(list)).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
const hl = (text, q) => {
  let out = esc(text);
  q.toLowerCase().split(/\s+/).filter(t => t.length > 1 && !STOP.has(t)).forEach(t => {
    out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![^<]*>)', 'ig'), '<mark>$1</mark>');
  });
  return out;
};
const favSrc = u => IN_EXT ? `${chrome.runtime.getURL('/_favicon/')}?pageUrl=${encodeURIComponent(u)}&size=32` : '';
const fav = b => `<span class="fav" aria-hidden="true">${IN_EXT && !S.noFav ? `<img data-fav src="${esc(favSrc(b.url))}" alt="">` : ''}<span>${esc(initial(b.title || host(b.url)))}</span></span>`;
const base = () => S.q ? S.results : S.colOnly ? (CATS[S.colOnly] || []) : BOOKMARKS;
const shown = () => {
  let r = base();
  if (S.filter !== 'All') r = r.filter(b => b.categories?.includes(S.filter));
  if (S.sort === 'recent') r = [...r].sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
  if (S.sort === 'accessed') r = [...r].sort((a, b) => (META[b.id]?.lastAccessed || 0) - (META[a.id]?.lastAccessed || 0));
  if (S.sort === 'title') r = [...r].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  return r;
};
const idxState = () => S.rebuilding ? 'indexing' : S.idxError ? 'error'
  : (S.engine !== 'local' && BOOKMARKS.length && S.embedded < BOOKMARKS.length) ? 'partial' : 'ready';

// ── views ──────────────────────────────────────────────────────────────────
const statusFooter = () => {
  const n = BOOKMARKS.length, st = idxState();
  const L = {
    ready: [`${plural(n, 'bookmark')} indexed`, 'All systems ready'],
    indexing: ['Indexing…', 'Keep this open'],
    partial: [`${plural(n, 'bookmark')} indexed`, `Meaning ${num(S.embedded)}/${num(n)}<button data-a="rebuild">Build</button>`],
    error: [`${plural(n, 'bookmark')} indexed`, 'Indexing failed<button data-a="rebuild">Retry</button>']
  }[st];
  return `<footer class="foot" data-s="${st}"><span class="st"><i class="dot"></i>${L[0]}</span><span>${L[1]}</span></footer>`;
};
const hintFooter = () => `<footer class="foot hint"><span>Use <kbd>↑</kbd> <kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> Open · <kbd>⌘C</kbd> Copy link</span></footer>`;
const header = () => `<header class="hdr">
  <button class="brand" data-a="home" aria-label="AI Bookmarks, go to home"><span class="circle raised">${ribbon}</span>
    <span><span class="wm">AI BOOKMARKS</span><span class="sub">PERSONAL INTERNET ARCHIVE</span></span></button>
  <button class="circle" data-a="cols" aria-label="Collections" ${S.screen === 'collections' ? 'aria-current="page"' : ''}>${ic('grid')}</button>
  <button class="circle" data-a="settings" aria-label="Settings" ${S.screen === 'settings' ? 'aria-current="page"' : ''}>${ic('gear')}</button></header>`;
const searchBox = () => `<form class="cons" data-form="search" role="search"><div class="search well">${ic('search')}
  <input type="text" name="q" value="${esc(S.draft)}" placeholder="Search your bookmarks..." aria-label="Search your bookmarks" autocomplete="off" spellcheck="false">
  <button type="button" class="clr raised" data-a="clear" aria-label="Clear search" ${S.draft ? '' : 'hidden'}>${ic('x')}</button></div></form>`;
const rowTags = b => {
  const m = META[b.id] || {};
  const tags = [...new Set([...(m.tags || []), ...(m.aiTags || []), ...(b.tags || [])])];
  const terms = S.q.toLowerCase().split(/\s+/).filter(t => t.length > 1 && !STOP.has(t));
  const hit = t => terms.some(x => t.includes(x));
  return tags.map(t => [t, hit(t)]).sort((a, c) => c[1] - a[1]).slice(0, 3);
};
const row = (b, o = {}) => {
  const name = b.title || host(b.url), tags = rowTags(b);
  return `<li class="row ${o.sel ? 'sel' : ''}">
  <button class="main" data-a="open" data-id="${esc(b.id)}" title="${esc(name + ' — ' + b.url)}">${fav(b)}<span class="txt"><span class="t">${o.q ? hl(name, o.q) : esc(name)}</span><span class="d">${esc(host(b.url))}</span>${tags.length ? `<span class="rt">${tags.map(([t, m]) => `<i${m ? ' class="m"' : ''}>${o.q ? hl(t, o.q) : esc(t)}</i>`).join('')}</span>` : ''}</span></button>
  <button class="more-btn" data-a="detail" data-id="${esc(b.id)}" aria-label="Details for ${esc(name)}" title="Details">${ic('chev', 'arrow')}</button></li>`;
};
const message = (title, text, btn) => `<div class="empty"><b>${esc(title)}</b>${esc(text)}${btn ? `<button class="raised" data-a="${btn[0]}">${btn[1]}</button>` : ''}</div>`;
const skeleton = () => `<div class="list" aria-busy="true">${'<div class="skel"></div>'.repeat(4)}</div>`;

const home = () => {
  if (S.loading) return `<main>${searchBox()}${skeleton()}</main>`;
  if (S.error) return `<main>${message('Couldn’t load bookmarks', S.error, ['retry', 'Try again'])}</main>`;
  if (!BOOKMARKS.length) return `<main>${searchBox()}${message('No bookmarks yet', 'Save a page in Chrome, or import bookmarks from Chrome’s bookmark manager, and they appear here.', ['import', 'Open bookmark manager'])}</main>`;
  const recent = [...BOOKMARKS].sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0)).slice(0, 4);
  return `<main>${searchBox()}
    <div class="sec"><h2>Recently saved</h2><button data-a="all">See all ${ic('arrow')}</button></div>
    <ul class="list">${recent.map(b => row(b)).join('')}</ul></main>`;
};

const browse = () => {
  const r = shown(), name = S.colOnly || 'All bookmarks';
  const body = S.loading ? skeleton() : r.length
    ? `<ul class="list" role="list">${r.slice(0, LIST_CAP).map(x => row(x)).join('')}</ul>${r.length > LIST_CAP ? `<p class="more">Showing ${LIST_CAP} of ${num(r.length)}.</p>` : ''}`
    : message(`${name} is empty`, 'Open a bookmark and move it here from its details.', ['browseback', 'Go back']);
  return `<main><div class="ttl"><button class="sq raised" data-a="browseback" aria-label="Back">${ic('back')}</button><h2>${esc(name)}</h2><span class="cnt" aria-label="${plural(r.length, 'bookmark')}">${num(r.length)}</span></div><div class="scroll">${body}</div></main>`;
};

const resultsScreen = () => {
  if (!S.q) return browse();
  const r = shown(), vis = r.slice(0, LIST_CAP);
  const label = S.q ? plural(r.length, 'result') : `${plural(r.length, 'bookmark')}${S.colOnly ? ' in ' + esc(S.colOnly) : ''}`;
  let body;
  if (S.loading) body = skeleton();
  else if (S.error) body = message('Search failed', S.error, ['retry-search', 'Try again']);
  else if (!r.length) body = S.q ? message(`No matches for “${S.q}”`, 'Try fewer words, or describe what the page was about instead of its title.', ['clear', 'Clear search'])
    : S.colOnly ? message(`${S.colOnly} is empty`, 'Open a bookmark and move it here from its details.', ['cols', 'Back to collections'])
    : message('No bookmarks yet', 'Save a page in Chrome and it appears here.');
  else body = `<ul class="list" role="list">${vis.map((x, i) => row(x, { q: S.q, sel: i === S.sel })).join('')}</ul>${r.length > LIST_CAP ? `<p class="more">Showing ${LIST_CAP} of ${r.length}. Search to narrow down.</p>` : ''}`;
  const sorts = [['relevance', 'Relevance'], ['recent', 'Recently saved'], ['accessed', 'Recently accessed'], ['title', 'Title']].filter(o => S.q || o[0] !== 'relevance');
  return `<main>${searchBox()}
    <div class="sec"><span class="count">${S.loading ? 'Searching…' : label}</span><label class="sort"><span class="sv" aria-hidden="true">${(sorts.find(o => o[0] === S.sort) || sorts[0])[1]}</span>${ic('down')}<select data-a="sort" aria-label="Sort by">${sorts.map(o => `<option value="${o[0]}" ${S.sort === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></label></div>
    <div class="scroll">${body}</div></main>`;
};

const collections = () => {
  const rows = [{ name: 'All Bookmarks', icon: 'grid', n: BOOKMARKS.length, key: null },
    ...Object.entries(CATS).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).map(([name, l]) => ({ name, icon: CAT_ICON[name] || 'folder', n: l.length, key: name }))];
  return `<main><div class="ttl"><h2>Your collections</h2><button class="plus circle primary" data-a="newc" aria-label="Create collection" aria-expanded="${S.adding}">${ic('plus')}</button></div>
    ${S.adding ? `<form class="newc" data-form="newc"><input class="well" name="n" placeholder="Collection name" aria-label="Collection name" maxlength="28" autocomplete="off"><button class="primary">Create</button></form>` : ''}
    <div class="scroll"><ul class="list">${rows.map(r => `<li class="row crow ${S.lastCol === r.key ? 'cur' : ''}"><button class="main" data-a="opencol" data-k="${esc(r.key || '')}"><span class="fav">${ic(r.icon)}</span><span class="txt"><span class="t">${esc(r.name)}</span></span><span class="n">${num(r.n)}</span>${ic('chev', 'arrow')}</button></li>`).join('')}</ul></div></main>`;
};

const details = () => {
  const b = BOOKMARKS.find(x => x.id === S.bm);
  if (!b) return `<main>${message('Bookmark not found', 'It may have been deleted.', ['home', 'Back to home'])}</main>`;
  const m = META[b.id] || {}, tags = m.tags || [], aiTags = (m.aiTags || []).filter(t => !tags.includes(t)), cur = b.categories?.[0] || '', names = Object.keys(CATS);
  const aiSum = !m.summary && m.aiSummary;
  return `<main><div class="scroll"><div class="stack">
    <div class="top"><button class="sq raised" data-a="back" aria-label="Back">${ic('back')}</button>
      <div class="tools"><button class="sq raised" data-a="open" data-id="${esc(b.id)}" aria-label="Open in new tab">${ic('open')}</button>
      <button class="sq raised del" data-a="del" aria-label="Delete bookmark" aria-expanded="${S.confirm}">${ic('trash')}</button></div></div>
    ${S.confirm ? `<div class="confirm raised" role="alertdialog" aria-label="Confirm delete"><span>Delete this bookmark from Chrome? This can’t be undone.</span><button class="raised" data-a="del">Cancel</button><button class="raised yes" data-a="delyes">Delete</button></div>` : ''}
    ${S.editing ? `<form class="edit" data-form="edit"><label class="lbl" for="et">Title</label><input class="well" id="et" name="t" value="${esc(b.title)}"><label class="lbl" for="eu">URL</label><input class="well" id="eu" name="u" value="${esc(b.url)}" type="url"><label class="lbl" for="es">Summary</label><textarea class="well" id="es" name="s" rows="3" maxlength="400">${esc(m.summary || '')}</textarea><div class="btns"><button type="button" class="raised" data-a="edit">Cancel</button><button class="primary">Save</button></div></form>` : `
    <div class="ident">${fav(b)}<div><h2>${esc(b.title || host(b.url))}</h2><span class="d">${esc(host(b.url))}</span></div></div>
    <div class="btns"><button class="primary" data-a="open" data-id="${esc(b.id)}">Open link ${ic('open')}</button>
      <button class="raised" data-a="copy" data-id="${esc(b.id)}">${ic(S.copied === b.id ? 'check' : 'copy')} ${S.copied === b.id ? 'Copied' : 'Copy link'}</button></div>
    <section><h3 class="lbl">Summary</h3><p class="sum">${esc(m.summary || m.aiSummary || 'No summary yet.')} <button class="link" data-a="edit">${m.summary || m.aiSummary ? 'Edit' : 'Add one'}</button>${aiSum ? '<small>Summary by Gemini</small>' : ''}</p></section>
    <div class="field"><label class="lbl" for="colsel">Collection</label><div class="sel-wrap">${ic(CAT_ICON[cur] || 'folder', 'lead')}<select id="colsel" class="raised" data-a="setcol">${names.map(n => `<option ${n === cur ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>${ic('down', 'tail')}</div></div>
    <div class="field tags"><span class="lbl" id="tg">Tags</span><div class="chips" role="list" aria-labelledby="tg">${tags.map(t => `<span class="chip" role="listitem">${esc(t)}<button data-a="tagdel" data-t="${esc(t)}" aria-label="Remove tag ${esc(t)}">${ic('x')}</button></span>`).join('')}${aiTags.map(t => `<span class="chip ai" role="listitem" title="Added by Gemini">${ic('spark', 'spark')}${esc(t)}<button data-a="tagdel" data-k="ai" data-t="${esc(t)}" aria-label="Remove tag ${esc(t)}">${ic('x')}</button></span>`).join('')}
      ${S.addTag ? `<form data-form="tag"><input class="tagin well" name="t" aria-label="New tag" maxlength="20" autocomplete="off"></form>` : `<button class="chip add raised" data-a="addtag" aria-label="Add tag">${ic('plus')}</button>`}</div></div>
    <dl class="meta"><div><dt>Saved</dt><dd>${fmt(b.dateAdded)}</dd></div><div><dt>Last accessed</dt><dd>${fmt(m.lastAccessed)}</dd></div><div><dt>URL</dt><dd title="${esc(b.url)}">${esc(b.url)}</dd></div></dl>`}
  </div></div></main>`;
};

const sw = (a, on, label) => `<button class="sw" role="switch" aria-checked="${on}" aria-label="${label}" data-a="${a}"><i></i></button>`;
const settings = () => {
  const ver = IN_EXT ? chrome.runtime.getManifest().version : '1.0.0', st = idxState(), n = BOOKMARKS.length;
  const pct = n ? Math.min(100, Math.round(S.embedded / n * 100)) : 0, local = S.engine === 'local';
  const job = S.tag?.job || {}, tagged = S.tag?.tagged || 0;
  const tagPct = tagRunning() && job.total ? Math.round(((job.done || 0) + (job.failed || 0)) / job.total * 100) : (n ? Math.round(tagged / n * 100) : 0);
  const tagNote = tagRunning() ? `Tagging ${num(job.done || 0)} of ${num(job.total || 0)}. You can close this popup.` : job.error ? `Last run: ${job.error}` : tagged ? 'Tags and summaries are used by every search mode.' : 'Not tagged yet. Takes about a minute per 60 bookmarks.';
  const note = { ready: 'Meaning index is complete.', indexing: 'Indexing… keep this open.', partial: `Meaning index ${num(S.embedded)} of ${num(n)} (${pct}%).`, error: 'The last indexing run failed.' }[st];
  return `<main><div class="ttl"><button class="sq raised" data-a="home" aria-label="Back">${ic('back')}</button><h2>Settings</h2><span class="sp"></span></div><div class="scroll"><div class="sets">
  <section class="status well" aria-label="Index status">
    <div class="line"><b>${num(n)}<small>${n === 1 ? 'bookmark' : 'bookmarks'}</small></b><button class="raised sm" data-a="rebuild" ${S.rebuilding ? 'disabled' : ''}>${S.rebuilding ? 'Working…' : 'Reindex'}</button></div>
    ${local ? '' : `<div class="bar" role="progressbar" aria-label="Meaning index" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>`}
    <p class="note ${st === 'error' ? 'err' : ''}">${local ? 'Keyword search only. No meaning index needed.' : note}</p>
  </section>
  <section class="sgroup"><h3>AI tags</h3>
    <div class="status well" aria-label="AI tagging">
      <div class="line"><b>${num(S.tag?.tagged || 0)}<small>of ${num(n)} tagged</small></b><button class="primary sm" data-a="tagnow" ${tagRunning() || !n ? 'disabled' : ''}>${tagRunning() ? 'Tagging…' : (S.tag?.tagged ? 'Tag new' : 'Tag with Gemini')}</button></div>
      <div class="bar" role="progressbar" aria-label="Tagging progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${tagPct}"><i style="width:${tagPct}%"></i></div>
      <p class="note ${S.tag?.job?.error && !tagRunning() ? 'err' : ''}">${esc(tagNote)}</p>
    </div>
    <div class="srow"><span>Auto-tag new bookmarks<small>Tags new saves after your first run</small></span>${sw('autotag', S.settings.autoTagNew !== false, 'Auto-tag new bookmarks')}</div>
    <p class="note2">Gemini reads each site to write tags and a one-line summary. Titles and links are sent to Google.</p>
  </section>
  <section class="sgroup"><h3>Search</h3>
    <div class="srow"><span>Search engine<small>How your queries are matched</small></span><select class="well" data-a="engine" aria-label="Search engine">${ENGINES.map(([v, l]) => `<option value="${v}" ${S.engine === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="srow"><span>Auto index new bookmarks<small>Index new saves as they happen</small></span>${sw('autoindex', S.settings.autoEmbedNew !== false, 'Auto index new bookmarks')}</div>
    <form class="srow col" data-form="key"><span>Gemini API key<small>${esc(S.keyNote || (S.hasKey ? 'A key is saved on this device.' : 'No key saved.'))}</small></span><div class="keyline"><input class="well" type="password" name="k" placeholder="Paste a new key" aria-label="Gemini API key" autocomplete="off"><button class="raised sm">Save</button></div></form>
  </section>
  <section class="sgroup"><h3>Appearance</h3>
    <div class="srow"><span>Theme<small>Dark, light or follow the system</small></span><div class="seg well" role="group" aria-label="Theme">${[['dark', 'Dark'], ['light', 'Light'], ['system', 'System']].map(([v, l]) => `<button data-a="theme" data-k="${v}" aria-pressed="${S.theme === v}">${l}</button>`).join('')}</div></div>
    <div class="srow"><span>Show favicons<small>Site icons next to each bookmark</small></span>${sw('favicons', !S.noFav, 'Show favicons')}</div>
    <div class="srow"><span>Reduce effects<small>Turns off grain, depth and glow</small></span>${sw('flat', S.flat, 'Reduce effects')}</div>
  </section>
  <section class="sgroup"><h3>Data &amp; privacy</h3>
    <button class="srow" data-a="export"><span>Export bookmarks<small>Save a JSON copy with tags and notes</small></span>${ic('upload')}</button>
    <button class="srow" data-a="import"><span>Import bookmarks<small>Opens Chrome’s bookmark manager</small></span>${ic('download')}</button>
    ${S.confirmClear ? `<div class="confirm raised" role="alertdialog" aria-label="Confirm clear data"><span>Clear the index, tags, summaries and custom collections? Your Chrome bookmarks stay.</span><button class="raised" data-a="clearask">Cancel</button><button class="raised yes" data-a="clearyes">Clear</button></div>`
      : `<button class="srow danger" data-a="clearask"><span>Clear all data<small>Everything stays on this device until you do</small></span>${ic('trash')}</button>`}
  </section>
  <p class="about">AI Bookmarks v${esc(ver)}</p>
  </div></div></main>`;
};

const SCREENS = { home, results: resultsScreen, collections, details, settings };
const app = $('#app');

function render() {
  const active = document.activeElement, hadSearch = app.contains(active) && active.name === 'q';
  app.classList.toggle('flat', S.flat);
  app.dataset.screen = S.screen;
  const foot = S.screen === 'results' ? (S.q && shown().length ? hintFooter() : statusFooter()) : ['details', 'settings'].includes(S.screen) ? '' : statusFooter();
  app.innerHTML = header() + SCREENS[S.screen]() + foot;
  app.querySelectorAll('img[data-fav]').forEach(i => i.addEventListener('error', () => i.remove(), { once: true }));
  const inp = $('input[name=q]', app);
  if (inp && (hadSearch || focusSearch)) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  focusSearch = false;
  $('.row.sel', app)?.scrollIntoView({ block: 'nearest' });
}
const go = (screen, patch = {}) => { Object.assign(S, { screen, confirm: false, confirmClear: false, editing: false, adding: false, addTag: false }, patch); render(); };

// ── actions ────────────────────────────────────────────────────────────────
const find = id => BOOKMARKS.find(b => b.id === id);
async function runSearch(q) {
  const my = ++seq;
  go('results', { q, draft: q, filter: 'All', sort: 'relevance', sel: 0, colOnly: null, loading: true, error: null });
  const res = await api({ type: 'SEARCH', query: q, engine: S.engine });
  if (my !== seq) return;
  S.loading = false;
  if (res.success) { S.results = res.results || []; say(plural(S.results.length, 'result')); } else { S.results = []; S.error = res.error || 'Search is unavailable.'; }
  render();
}
async function copy(b) {
  try { await navigator.clipboard.writeText(b.url); say('Link copied'); } catch { say('Could not copy the link'); return; }
  S.copied = b.id; render();
  setTimeout(() => { if (S.copied === b.id) { S.copied = null; render(); } }, 1500);
}
const openUrl = b => {
  if (!safeUrl(b.url)) return;
  IN_EXT ? chrome.tabs.create({ url: b.url, active: true }) : window.open(b.url, '_blank', 'noopener');
  setMeta(b.id, { lastAccessed: Date.now() });
};
async function refresh() { await api({ type: 'INDEX' }); await load(); await loadStatus(); render(); }
async function rebuild() {
  S.rebuilding = true; S.idxError = false; render();
  const idx = await api({ type: 'INDEX' });
  const emb = idx.success && S.engine !== 'local' ? await api({ type: 'GENERATE_EMBEDDINGS' }) : idx;
  S.rebuilding = false; S.idxError = !idx.success || !emb.success;
  await load(); await loadStatus();
  say(S.idxError ? 'Indexing failed' : 'Index rebuilt'); render();
}
function exportJson() {
  const data = BOOKMARKS.map(b => ({ title: b.title, url: b.url, folder: b.folderPath, collections: b.categories, saved: b.dateAdded ? new Date(b.dateAdded).toISOString() : null, ...META[b.id] }));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = 'ai-bookmarks.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000); say('Bookmarks exported');
}

app.addEventListener('click', async e => {
  const el = e.target.closest('[data-a]'); if (!el || el.tagName === 'SELECT') return;
  const a = el.dataset.a, k = el.dataset.k;
  const resultsPatch = (p) => go('results', { q: '', draft: '', filter: 'All', sort: 'recent', sel: 0, loading: false, error: null, ...p });
  switch (a) {
    case 'home': return go('home', { q: '', draft: '', filter: 'All', colOnly: null });
    case 'cols': return go('collections');
    case 'settings': return go(S.screen === 'settings' ? 'home' : 'settings');
    case 'clear': S.q = ''; S.draft = ''; focusSearch = true; return S.colOnly ? render() : go('home', { filter: 'All' });
    case 'filter': return S.screen === 'home' ? (S.lastCol = k === 'All' ? null : k, resultsPatch({ colOnly: k === 'All' ? null : k })) : (S.filter = k, S.sel = 0, render());
    case 'all': return resultsPatch({ colOnly: null, browseBack: 'home' });
    case 'opencol': S.lastCol = k || null; return resultsPatch({ colOnly: k || null, browseBack: 'collections' });
    case 'browseback': return go(S.browseBack || 'home', { colOnly: null });
    case 'detail': return go('details', { bm: el.dataset.id, from: S.screen });
    case 'back': return go(S.from === 'details' ? 'home' : S.from);
    case 'open': return openUrl(find(el.dataset.id));
    case 'copy': return copy(find(el.dataset.id));
    case 'del': S.confirm = !S.confirm; return render();
    case 'edit': S.editing = !S.editing; return render();
    case 'delyes': { const b = find(S.bm); await store.remove(b.id); say('Bookmark deleted'); S.results = S.results.filter(x => x.id !== b.id); go(S.from === 'details' ? 'home' : S.from); return refresh(); }
    case 'addtag': S.addTag = true; render(); return $('.tagin', app)?.focus();
    case 'tagdel': { const m = META[S.bm] || {}; await setMeta(S.bm, k === 'ai' ? { aiTags: (m.aiTags || []).filter(t => t !== el.dataset.t) } : { tags: (m.tags || []).filter(t => t !== el.dataset.t) }); return render(); }
    case 'tagnow': { const total = BOOKMARKS.length; await api({ type: 'START_TAGGING' }); S.tag = { ...(S.tag || {}), job: { running: true, total, done: 0, failed: 0, updatedAt: Date.now() } }; render(); return pollTags(); }
    case 'autotag': await saveSettings({ autoTagNew: S.settings.autoTagNew === false }); return render();
    case 'theme': S.theme = k; try { localStorage.setItem('theme', k); } catch { /* storage unavailable */ } applyTheme(); return render();
    case 'newc': S.adding = !S.adding; render(); return $('[name=n]', app)?.focus();
    case 'rebuild': return rebuild();
    case 'retry': S.loading = true; S.error = null; render(); await refresh(); return;
    case 'retry-search': return runSearch(S.q);
    case 'import': return IN_EXT ? chrome.tabs.create({ url: 'chrome://bookmarks' }) : refresh();
    case 'export': return exportJson();
    case 'clearask': S.confirmClear = !S.confirmClear; return render();
    case 'clearyes': { await api({ type: 'CLEAR_DATA' }); S.confirmClear = false; META = {}; say('Local data cleared'); await refresh(); return; }
    case 'autoindex': await saveSettings({ autoEmbedNew: S.settings.autoEmbedNew === false }); return render();
    case 'favicons': S.noFav = !S.noFav; try { localStorage.setItem('nofav', S.noFav ? '1' : ''); } catch { /* storage unavailable */ } return render();
    case 'flat': S.flat = !S.flat; try { localStorage.setItem('flat', S.flat ? '1' : ''); } catch { /* storage unavailable */ } return render();
  }
});
app.addEventListener('change', async e => {
  const a = e.target.dataset.a;
  if (a === 'sort') { S.sort = e.target.value; S.sel = 0; render(); }
  if (a === 'setcol') { const r = await api({ type: 'SET_CATEGORY', id: S.bm, category: e.target.value }); say(r.success ? 'Moved to ' + e.target.value : 'Could not move bookmark'); await load(); render(); }
  if (a === 'engine') { S.engine = e.target.value; await saveSettings({ searchEngine: S.engine }); say('Search engine saved'); render(); }
});
app.addEventListener('input', e => {
  if (e.target.name !== 'q') return;
  S.draft = e.target.value; $('.clr', app).hidden = !S.draft;
});
app.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target.dataset.form, d = new FormData(e.target);
  if (f === 'search') { const q = String(d.get('q')).trim(); if (q) runSearch(q); }
  if (f === 'newc') { const n = String(d.get('n')).trim(); if (n && !(n in CATS)) { await api({ type: 'ADD_CATEGORY', name: n }); S.adding = false; await load(); say('Collection created'); render(); } }
  if (f === 'edit') {
    const t = String(d.get('t')).trim(), u = String(d.get('u')).trim();
    if (!safeUrl(u)) { say('Enter a web address starting with http or https'); return; }
    await store.update(S.bm, { title: t || host(u), url: u }); await setMeta(S.bm, { summary: String(d.get('s')).trim() });
    S.editing = false; say('Bookmark updated'); await refresh();
  }
  if (f === 'tag') {
    const t = String(d.get('t')).trim().toLowerCase(), m = META[S.bm] || {};
    if (t && !(m.tags || []).includes(t)) await setMeta(S.bm, { tags: [...(m.tags || []), t] });
    S.addTag = false; render();
  }
  if (f === 'key') {
    const k = String(d.get('k')).trim(); if (!k) return;
    const r = await api({ type: 'SAVE_API_KEY', apiKey: k }); S.hasKey = r.success; S.keyNote = r.success ? 'Key saved.' : 'Could not save the key.'; render();
  }
});
app.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('input[name=q]', app)?.focus(); return; }
  if (e.key === 'Escape') { if (S.confirm || S.confirmClear || S.editing || S.adding || S.addTag) { S.confirm = S.confirmClear = S.editing = S.adding = S.addTag = false; render(); } return; }
  if (S.screen !== 'results' || S.loading) return;
  const r = shown().slice(0, LIST_CAP);
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); S.sel = Math.max(0, Math.min(r.length - 1, S.sel + (e.key === 'ArrowDown' ? 1 : -1))); render(); }
  else if (e.key === 'Enter' && e.target.name === 'q' && S.draft.trim() === S.q && r[S.sel]) { e.preventDefault(); openUrl(r[S.sel]); }
  else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c' && r[S.sel] && !String(getSelection())) { e.preventDefault(); copy(r[S.sel]); }
});

// ── boot ───────────────────────────────────────────────────────────────────
(async () => {
  const live = $('#live');
  say = m => { live.textContent = ''; setTimeout(() => live.textContent = m, 30); };
  try { S.flat = !!localStorage.getItem('flat'); S.noFav = !!localStorage.getItem('nofav'); } catch { /* storage unavailable */ }
  if (!IN_EXT) api = (await import('./dev-fixtures.js')).devApi;
  render();
  await Promise.all([load(), loadStatus()]);
  render();
  if (tagRunning()) pollTags();
  $('input[name=q]', app)?.focus();
})();
