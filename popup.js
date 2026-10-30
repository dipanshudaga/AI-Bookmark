// AI Bookmarks popup. Talks to background.js over runtime messages; renders one screen at a time.

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const IN_EXT = typeof chrome !== 'undefined' && !!chrome.runtime?.id;

const GEAR = (() => {   // outline cog: 8 trapezoid teeth around a ring, plus the hub circle
  const pts = [], rad = d => d * Math.PI / 180;
  for (let i = 0; i < 8; i++) for (const [deg, r] of [[-13, 7.3], [-8, 9.7], [8, 9.7], [13, 7.3]]) { const a = i * Math.PI / 4 + rad(deg); pts.push([12 + r * Math.cos(a), 12 + r * Math.sin(a)]); }
  return `<path d="M${pts.map(p => p.map(v => v.toFixed(2)).join(' ')).join('L')}Z"/><circle cx="12" cy="12" r="3"/>`;
})();
const P = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>', gear: GEAR,
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 12.5 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  open: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  back: '<path d="m15 5-7 7 7 7"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>', download: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 9.2-9.2M16 7l3 3M14 9l2 2"/>', plus: '<path d="M12 5v14M5 12h14"/>', chev: '<path d="m9 5 7 7-7 7"/>', down: '<path d="m6 9 6 6 6-6"/>',
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
const BADGES = [
  [/^all bookmarks$/i, 'all'], [/^archived$/i, 'archived'], [/prompt|resource|template|guide|\bdocs?\b|document/i, 'docs'],
  [/agent|automation|workflow/i, 'ai-agents'], [/\bai\b|\bllm|gpt|gemini|claude|openai/i, 'ai-tools'], [/inspir|\bideas?\b|moodboard/i, 'inspiration'],
  [/design|\bui\b|\bux\b|creative|illustrat|graphic|colou?r/i, 'design'], [/\bdev|code|program|github|\bapi\b|software|engineer|\bcss\b/i, 'development'],
  [/video|film|movie|youtube|stream|media|animation|motion/i, 'video'], [/music|audio|podcast|sound|song/i, 'music'],
  [/read|article|news|blog|magazine|essay/i, 'reading'], [/shop|store|\bbuy|deal|market/i, 'shopping'], [/cloth|fashion|wear|apparel|outfit|shoe/i, 'fashion'],
  [/travel|\bmaps?\b|places?|trip|hotel|city/i, 'travel'], [/social|communit|chat|forum|reddit|twitter/i, 'social'],
  [/product|task|todo|notion|calendar|project|\bwork\b|office/i, 'productivity'], [/data|chart|analytic|research|stat|visuali/i, 'data'],
  [/learn|course|educat|tutorial|school|study|academ/i, 'learning'], [/photo|camera|picture|\bimages?\b/i, 'photography'],
  [/\bgames?\b|gaming/i, 'games'], [/financ|money|invest|crypto|bank|econom|stock/i, 'finance'], [/food|recipe|cook|coffee|restaurant|drink/i, 'food'],
  [/font|\btype|typo|letter|foundry/i, 'fonts'], [/tool|util|\bapps?\b/i, 'tools'], [/archive|museum|histor|librar/i, 'archives']
];
const badgeFor = name => `assets/badges/${(BADGES.find(([re]) => re.test(name)) || [0, 'folder'])[1]}.webp`;
const badge = (name, cls = '') => `<img class="badge ${cls}" src="${badgeFor(name)}" alt="" width="36" height="36">`;
const ART = { home: ['banner-home', 298], results: ['strip-search', 216], collections: ['strip-collections', 194], details: ['strip-details', 172], settings: ['strip-settings', 208] };
const artBand = () => { const [name, h] = ART[S.screen === 'results' && !S.q ? 'collections' : S.screen]; return `<div class="art" aria-hidden="true"><img src="assets/img/${name}.webp" alt="" width="880" height="${h}"></div>`; };
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
  screen: 'home', from: 'home', q: '', draft: '', filter: 'All', colOnly: null, lastCol: null, sort: 'relevance', sel: -1, results: [],
  bm: null, loading: true, error: null, confirm: false, confirmClear: false, keyDialog: false, editing: false, adding: false, addTag: false, copied: null,
  engine: 'auto', settings: {}, hasKey: false, embedded: 0, rebuilding: false, idxError: false, keyNote: '',
  tag: null, tagTimer: null
};
let seq = 0, focusSearch = false, say = () => {};

async function load() {
  const [res, meta] = await Promise.all([api({ type: 'GET_CATEGORIES' }), api({ type: 'GET_META' })]);
  S.loading = false;
  if (meta.success) META = meta.meta || {};
  if (!res.success) { S.error = res.error || 'Could not read your bookmarks.'; return; }
  S.error = null;
  CATS = res.categories || {}; CUSTOM = res.custom || [];
  const seen = new Map();
  Object.values(CATS).forEach(list => list.forEach(b => seen.set(b.id, b)));
  BOOKMARKS = [...seen.values()];
}
async function loadStatus() {
  const [st, se, k, tg] = await Promise.all([api({ type: 'GET_EMBEDDINGS_STATUS' }), api({ type: 'GET_SETTINGS' }), api({ type: 'GET_API_KEY' }), api({ type: 'GET_TAG_STATUS' })]);
  if (tg.success) S.tag = tg;
  if (st.success) S.embedded = st.embedded;
  if (se.success) { S.settings = se.settings || {}; S.engine = 'auto'; }
  S.hasKey = !!(k.success && k.apiKey); S.keyTail = S.hasKey ? k.apiKey.slice(-4) : '';
}
const tagRunning = () => !!(S.tag?.job?.running && Date.now() - (S.tag.job.updatedAt || 0) < 120000);
function pollTags() {
  clearInterval(S.tagTimer);
  S.tagTimer = setInterval(async () => {
    const tg = await api({ type: 'GET_TAG_STATUS' });
    if (tg.success) S.tag = tg;
    const mm = await api({ type: 'GET_META' }); if (mm.success) META = mm.meta || META;   // so the filing bar fills as bookmarks are tagged
    if (!tagRunning()) {
      clearInterval(S.tagTimer); await load(); await loadStatus(); say('Organising finished');
      try { const prev = Number(localStorage.getItem('last_n')) || BOOKMARKS.length; S.checkNew = Math.max(0, BOOKMARKS.length - prev); localStorage.setItem('last_n', String(BOOKMARKS.length)); } catch { S.checkNew = 0; }   // so a check can say how many new bookmarks it picked up
    }
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
// Some sites serve an all-white favicon meant for dark backgrounds (GitHub does). It vanishes on our light tile,
// so icons that are almost entirely white get a dark tile instead.
const FAV_LIGHT = new Map();
function isLightIcon(img) {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 16;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, 16, 16);
    const d = x.getImageData(0, 0, 16, 16).data;
    let n = 0, sum = 0, dark = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 40) continue;
      const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      n++; sum += l; if (l < 0.55) dark++;
    }
    return n > 8 && sum / n > 0.8 && dark / n < 0.06;
  } catch { return false; }
}
function checkFavicons(root) {
  root.querySelectorAll('img[data-fav]').forEach(img => {
    const mark = () => {
      const light = FAV_LIGHT.has(img.src) ? FAV_LIGHT.get(img.src) : isLightIcon(img);
      FAV_LIGHT.set(img.src, light);
      img.parentElement.classList.toggle('inv', light);
    };
    if (img.complete && img.naturalWidth) mark(); else img.addEventListener('load', mark, { once: true });
  });
}
const favSrc = u => IN_EXT ? `${chrome.runtime.getURL('/_favicon/')}?pageUrl=${encodeURIComponent(u)}&size=32` : '';
const fav = b => `<span class="fav${FAV_LIGHT.get(favSrc(b.url)) ? ' inv' : ''}" aria-hidden="true">${IN_EXT ? `<img data-fav src="${esc(favSrc(b.url))}" alt="">` : ''}<span>${esc(initial(b.title || host(b.url)))}</span></span>`;
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
  <button class="brand" data-a="home" aria-label="AI Bookmarks, go to home"><img class="logo" src="assets/img/logo.webp" alt="" width="28" height="28">
    <span><span class="wm">AI BOOKMARKS</span><span class="sub">Personal internet archive</span></span></button>
  <button class="circle" data-a="find" aria-label="Search" ${S.screen === 'home' || S.screen === 'results' && !S.colOnly ? 'aria-current="page"' : ''}>${ic('search')}</button>
  <button class="circle" data-a="cols" aria-label="Collections" ${S.screen === 'collections' ? 'aria-current="page"' : ''}>${ic('layers')}</button>
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
  <button class="main" data-a="open" data-id="${esc(b.id)}" title="${esc(name + ' — ' + b.url)}">${fav(b)}<span class="txt"><span class="t">${esc(name)}</span><span class="d">${esc(host(b.url))}</span>${tags.length ? `<span class="rt">${tags.map(([t]) => `<i>${esc(t)}</i>`).join('')}</span>` : ''}</span></button>
  <button class="more-btn" data-a="detail" data-id="${esc(b.id)}" aria-label="Details for ${esc(name)}" title="Details">${ic('chev', 'arrow')}</button></li>`;
};
const message = (title, text, btn, art = false) => `<div class="empty">${art ? '<img class="spot" src="assets/img/empty-search.webp" alt="">' : ''}<b>${esc(title)}</b>${esc(text)}${btn ? `<button class="raised" data-a="${btn[0]}">${btn[1]}</button>` : ''}</div>`;
const SKW = [[62, 34], [48, 28], [70, 38], [55, 30], [66, 32]];
const skeleton = () => `<div class="list" aria-busy="true" aria-label="Loading">${SKW.map(([a, b], i) => `<div class="skrow" style="--d:${i * 0.12}s"><i class="skb tile"></i><div class="sktx"><i class="skb" style="width:${a}%"></i><i class="skb sm" style="width:${b}%"></i><div class="skpills"><i class="skb pill"></i><i class="skb pill"></i><i class="skb pill"></i></div></div></div>`).join('')}</div>`;

const obSeen = () => { try { return localStorage.getItem('ob_skip') === '1'; } catch { return false; } };
const onboard = () => {
  const tagged = S.tag?.tagged || 0, running = tagRunning();
  if (obSeen() || tagged || S.loading) return '';
  if (running) return `<section class="ob"><h3>Indexing your bookmarks…</h3><p>You can keep searching.</p></section>`;
  return S.hasKey
    ? `<section class="ob"><h3>Key saved</h3><p>Next, Gemini indexes your bookmarks.</p><button class="primary" data-a="tagnow">${ic('spark')} Get started</button></section>`
    : `<section class="ob"><button class="obx" data-a="obskip" aria-label="Dismiss">×</button><h3>Make search smarter</h3><p>Add a free Gemini key to index your bookmarks.</p>
      <form class="keyline" data-form="key"><input class="well" type="password" name="k" placeholder="Paste Gemini key" aria-label="Gemini API key" autocomplete="off"><button class="primary sm">Save</button></form>
      <a class="link keylink" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Get a free key ↗</a></section>`;
};
const home = () => {
  if (S.loading) return `<main>${searchBox()}${skeleton()}</main>`;
  if (S.error) return `<main>${message('Couldn’t load bookmarks', S.error, ['retry', 'Try again'])}</main>`;
  if (!BOOKMARKS.length) return `<main>${searchBox()}${message('No bookmarks yet', 'Save a page in Chrome, or import bookmarks from Chrome’s bookmark manager, and they appear here.', ['import', 'Open bookmark manager'])}</main>`;
  const recent = [...BOOKMARKS].sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0)).slice(0, 8);
  return `<main>${searchBox()}${onboard()}
    <div class="sec"><h2>Recently saved</h2><button data-a="all">See all ${ic('arrow')}</button></div>
    <div class="scroll"><ul class="list">${recent.map(b => row(b)).join('')}</ul>${artBand()}</div></main>`;
};

const browse = () => {
  const r = shown(), name = S.colOnly || 'All bookmarks';
  const body = S.loading ? skeleton() : r.length
    ? `<ul class="list" role="list">${r.slice(0, LIST_CAP).map(x => row(x)).join('')}</ul>${r.length > LIST_CAP ? `<p class="more">Showing ${LIST_CAP} of ${num(r.length)}.</p>` : ''}`
    : message(`${name} is empty`, 'Open a bookmark and move it here from its details.', ['browseback', 'Go back']);
  return `<main><div class="ttl"><button class="sq raised" data-a="browseback" aria-label="Back">${ic('back')}</button><h2>${esc(name)}</h2><span class="cnt" aria-label="${plural(r.length, 'bookmark')}">${num(r.length)}</span></div><div class="scroll">${body}${artBand()}</div></main>`;
};

const resultsScreen = () => {
  if (!S.q) return browse();
  const r = shown(), vis = r.slice(0, LIST_CAP);
  const label = S.q ? plural(r.length, 'result') : `${plural(r.length, 'bookmark')}${S.colOnly ? ' in ' + esc(S.colOnly) : ''}`;
  let body;
  if (S.loading) body = skeleton();
  else if (S.error) body = message('Search failed', S.error, ['retry-search', 'Try again']);
  else if (!r.length) body = S.q ? message(`No matches for “${S.q}”`, 'Try fewer words, or describe what the page was about instead of its title.', ['clear', 'Clear search'], true)
    : S.colOnly ? message(`${S.colOnly} is empty`, 'Open a bookmark and move it here from its details.', ['cols', 'Back to collections'])
    : message('No bookmarks yet', 'Save a page in Chrome and it appears here.');
  else body = `<ul class="list" role="list">${vis.map((x, i) => row(x, { q: S.q, sel: i === S.sel })).join('')}</ul>${r.length > LIST_CAP ? `<p class="more">Showing ${LIST_CAP} of ${r.length}. Search to narrow down.</p>` : ''}`;
  const sorts = [['relevance', 'Relevance'], ['recent', 'Recently saved'], ['accessed', 'Recently accessed'], ['title', 'Title']].filter(o => S.q || o[0] !== 'relevance');
  return `<main>${searchBox()}
    <div class="sec"><span class="count">${S.loading ? 'Searching your bookmarks…' : label}</span>${S.loading ? '' : `<label class="sort"><span class="sv" aria-hidden="true">${(sorts.find(o => o[0] === S.sort) || sorts[0])[1]}</span>${ic('down')}<select data-a="sort" aria-label="Sort by">${sorts.map(o => `<option value="${o[0]}" ${S.sort === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></label>`}</div>
    <div class="scroll">${body}${S.loading ? '' : artBand()}</div></main>`;
};

let CUSTOM = [];
const collections = () => {
  const rows = [{ name: 'All Bookmarks', n: BOOKMARKS.length, key: null },
    ...Object.entries(CATS).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).map(([name, l]) => ({ name, n: l.length, key: name }))];
  return `<main><div class="ttl"><h2>Collections</h2></div>
        <div class="scroll"><ul class="list">${rows.map(r => `<li class="row crow ${r.key && S.lastCol === r.key ? 'cur' : ''}"><button class="main" data-a="opencol" data-k="${esc(r.key || '')}">${badge(r.name)}<span class="txt"><span class="t">${esc(r.name)}</span></span><span class="n">${num(r.n)}</span>${ic('chev', 'arrow')}</button>${r.key && CUSTOM.includes(r.key) ? `<button class="rmcol" data-a="rmcol" data-k="${esc(r.key)}" aria-label="Delete collection ${esc(r.key)}">${ic('trash')}</button>` : ''}</li>`).join('')}</ul>${artBand()}</div></main>`;
};

const details = () => {
  const b = BOOKMARKS.find(x => x.id === S.bm);
  if (!b) return `<main>${message('Bookmark not found', 'It may have been deleted.', ['home', 'Back to home'])}</main>`;
  const m = META[b.id] || {}, tags = m.tags || [], aiTags = (m.aiTags || []).filter(t => !tags.includes(t)), cur = b.categories?.[0] || '', names = Object.keys(CATS);
  const aiSum = !m.summary && m.aiSummary;
  return `<main><div class="scroll"><div class="stack">
    <div class="top"><button class="sq raised" data-a="back" aria-label="Back">${ic('back')}</button>
      <div class="tools"><button class="sq raised" data-a="open" data-id="${esc(b.id)}" aria-label="Open in new tab">${ic('open')}</button>
      <button class="sq raised del" data-a="del" aria-label="Delete bookmark">${ic('trash')}</button></div></div>
    ${S.editing ? `<form class="edit" data-form="edit"><label class="lbl" for="et">Title</label><input class="well" id="et" name="t" value="${esc(b.title)}"><label class="lbl" for="eu">URL</label><input class="well" id="eu" name="u" value="${esc(b.url)}" type="url"><label class="lbl" for="es">Summary</label><textarea class="well" id="es" name="s" rows="3" maxlength="400">${esc(m.summary || '')}</textarea><div class="btns"><button type="button" class="raised" data-a="edit">Cancel</button><button class="primary">Save</button></div></form>` : `
    <div class="ident">${fav(b)}<div><h2>${esc(b.title || host(b.url))}</h2><span class="d">${esc(host(b.url))}</span></div></div>
    <div class="btns"><button class="primary" data-a="open" data-id="${esc(b.id)}">Open link ${ic('open')}</button>
      <button class="raised" data-a="copy" data-id="${esc(b.id)}">${ic(S.copied === b.id ? 'check' : 'copy')} ${S.copied === b.id ? 'Copied' : 'Copy link'}</button></div>
    <section><div class="sumh"><h3 class="lbl">Summary</h3>${aiSum ? '<small>Summary by Gemini</small>' : ''}</div><p class="sum">${esc(m.summary || m.aiSummary || 'No summary yet.')} <button class="link" data-a="edit">${m.summary || m.aiSummary ? 'Edit' : 'Add one'}</button></p></section>
    <div class="field"><label class="lbl" for="colsel">Collection</label><div class="sel-wrap">${badge(cur || 'Folder', 'lead')}<select id="colsel" class="raised" data-a="setcol">${names.map(n => `<option ${n === cur ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>${ic('down', 'tail')}</div></div>
    <div class="field tags"><span class="lbl" id="tg">Tags</span><div class="chips" role="list" aria-labelledby="tg">${tags.map(t => `<span class="chip" role="listitem">${esc(t)}<button data-a="tagdel" data-t="${esc(t)}" aria-label="Remove tag ${esc(t)}">${ic('x')}</button></span>`).join('')}${aiTags.map(t => `<span class="chip" role="listitem">${esc(t)}<button data-a="tagdel" data-k="ai" data-t="${esc(t)}" aria-label="Remove tag ${esc(t)}">${ic('x')}</button></span>`).join('')}
      ${S.addTag ? `<form data-form="tag"><input class="tagin well" name="t" aria-label="New tag" maxlength="20" autocomplete="off"></form>` : `<button class="chip add raised" data-a="addtag" aria-label="Add tag">${ic('plus')}</button>`}</div></div>
    <dl class="meta"><div><dt>Saved</dt><dd>${fmt(b.dateAdded)}</dd></div><div><dt>Last accessed</dt><dd>${fmt(m.lastAccessed)}</dd></div><div><dt>URL</dt><dd title="${esc(b.url)}">${esc(b.url)}</dd></div></dl>`}
  </div>${artBand()}</div></main>`;
};

const sw = (a, on, label) => `<button class="sw" role="switch" aria-checked="${on}" aria-label="${label}" data-a="${a}"><i></i></button>`;
const WORDS = ['Indexing', 'Reading', 'Tagging', 'Categorising', 'Pondering', 'Cross-referencing', 'Noodling', 'Filing', 'Getting smarter'];
const settings = () => {
  const ver = IN_EXT ? chrome.runtime.getManifest().version : '1.0.0', n = BOOKMARKS.length, st = idxState();
  const job = S.tag?.job || {}, tagged = S.tag?.tagged || 0, running = tagRunning(), local = S.engine === 'local';
  const done = (a, b) => b ? Math.min(100, Math.round(a / b * 100)) : 0;
  const tagPct = running && job.total ? done((job.done || 0) + (job.failed || 0), job.total) : done(tagged, n);
  const all = n && tagged >= n;
  const pct = n ? Math.min(100, Math.round(tagged / n * 100)) : 0;   // always out of every bookmark, not just this run's remainder
  const fresh = tagged > 0 && job.total > 0 && job.total < n;
  const caughtUp = all && !running && job.total === 0 && Date.now() - (job.updatedAt || 0) < 20000;
  const statusText = !S.hasKey ? 'Make search smarter'
    : running && !job.total ? 'Looking for new bookmarks…'
    : running ? `${WORDS[Math.floor(Date.now() / 2600) % WORDS.length]}…`
    : job.error ? 'Stopped before finishing'
    : caughtUp ? (S.checkNew ? `${num(S.checkNew)} new ${S.checkNew === 1 ? 'bookmark' : 'bookmarks'} indexed` : 'Nothing new to index')
    : all ? 'All caught up'
    : tagged ? `${num(tagged)} of ${num(n)} indexed` : 'Ready when you are';
  const art = !S.hasKey || (job.error && !running) ? 'state-error' : all && !running ? 'state-done' : 'state-working';
  const cnt = !all && (running || tagged) ? `${num(tagged)} of ${num(n)}${running ? '' : ' indexed'}` : '';
  const cells = 20, filled = n ? Math.floor(tagged / n * cells) : 0;   // twenty boxes, each a twentieth of your bookmarks
  const mosaic = `<div class="mosaic" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">${Array.from({ length: cells }, (_, i) => `<i${i < filled ? ' class="on"' : i === filled && running ? ' class="hd"' : ''}></i>`).join('')}</div>`;
  const bar = `${mosaic}<div class="fkeys fmeta"><span>${cnt}</span><span>${pct}%</span></div>`;
  const act = S.hasKey ? 'tagnow' : 'keyfocus', busy = S.hasKey && (running || S.rebuilding) || !n;
  const label = !S.hasKey ? 'Add a Gemini key' : running ? (job.total ? 'Working on it…' : 'Checking…') : S.rebuilding ? 'Working on it…' : job.error ? 'Try again' : all ? 'Check for new bookmarks' : 'Get everything ready';
  return `<main><div class="ttl"><button class="sq raised" data-a="home" aria-label="Back">${ic('back')}</button><h2>Settings</h2><span class="sp"></span></div><div class="scroll"><div class="sets">
  <section class="hero">
    <div class="hero-top"><div class="hero-l"><div class="hero-n"><b>${num(n)}</b><span>${n === 1 ? 'bookmark' : 'bookmarks'}</span></div><p class="hst">${esc(statusText)}</p></div>
      <img class="hero-art" src="assets/img/${art}.webp" alt="" aria-hidden="true"></div>
    ${S.hasKey && !(all && !running) ? bar : ''}
    <button class="${all && !running && S.hasKey ? 'raised' : 'primary'} wide${S.hasKey && (running || S.rebuilding) ? ' busy' : ''}" data-a="${act}" ${!n ? 'disabled' : S.hasKey && (running || S.rebuilding) ? 'aria-busy="true"' : ''}>${S.hasKey ? ic('spark') + ' ' : ''}${label}</button>
  </section>
  <section class="sgroup">
    <div class="srow"><span class="withicon">${ic('spark')}<span class="tx">Get new bookmarks ready<small>Index new saves automatically</small></span></span>${sw('auto', S.settings.autoEmbedNew !== false && S.settings.autoTagNew !== false, 'Get new bookmarks ready automatically')}</div>
<button class="drow" data-a="keydlg">${ic('key')}<span><b>API key</b><small${S.hasKey ? ' class="keymask"' : ''}>${S.hasKey ? '••••••••••••' + esc(S.keyTail) : 'Not connected yet'}</small></span>${ic('chev', 'go')}</button>
  </section>
  <section class="sgroup"><h3>Your data</h3>
    <button class="drow" data-a="export">${ic('upload')}<span><b>Export bookmarks</b><small>HTML file, opens in any browser</small></span>${ic('chev', 'go')}</button>
    <button class="drow" data-a="import">${ic('download')}<span><b>Import bookmarks</b><small>From a bookmarks file</small></span>${ic('chev', 'go')}</button>
    <button class="drow bad" data-a="clearask">${ic('trash')}<span><b>Clear the index</b><small>Your bookmarks stay</small></span></button>
  </section>
  </div><div class="foot-text"><p class="note2">Titles and links are sent to Google when you use Gemini.</p><p class="about">v${esc(ver)} · AI Bookmarks</p></div>${artBand()}</div></main>`;
};

const SCREENS = { home, results: resultsScreen, collections, details, settings };
const app = $('#app');

let dlgOpener = null;
function render() {
  const active = document.activeElement, hadSearch = app.contains(active) && active.name === 'q';
  const hadDlg = !!$('.dlg', app), opener = hadDlg ? null : active?.dataset?.a;
  app.dataset.screen = S.screen;
  const foot = S.screen === 'results' && S.q && shown().length ? hintFooter() : '';
  app.innerHTML = header() + SCREENS[S.screen]() + foot + (S.toast ? `<div class="toast" role="status"><span>${esc(S.toast.msg)}</span>${S.toast.undo ? '<button data-a="undo">Undo</button>' : ''}</div>` : '') + (S.confirmClear ? clearDialog() : '') + (S.keyDialog ? keyDialog() : '');
  app.querySelectorAll('img[data-fav]').forEach(i => i.addEventListener('error', () => i.remove(), { once: true }));
  checkFavicons(app);
  const hasDlg = !!$('.dlg', app);
  if (hasDlg && !hadDlg) dlgOpener = opener;
  if (!hasDlg && hadDlg && dlgOpener) { $(`[data-a="${dlgOpener}"]`, app)?.focus(); dlgOpener = null; }
  $('.dlg [autofocus]', app)?.focus();
  const inp = $('input[name=q]', app);
  if (inp && (hadSearch || focusSearch)) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  focusSearch = false;
  $('.row.sel', app)?.scrollIntoView({ block: 'nearest' });
}
const clearDialog = () => `<div class="scrim" data-a="clearask"><div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="dt" data-stop>
  <h3 id="dt">Clear the index?</h3><p>This removes the tags and summaries Gemini made. Your bookmarks aren’t touched, and you can index them again any time.</p>
  <div class="dact"><button class="raised" data-a="clearask" autofocus>Cancel</button><button class="danger-solid" data-a="clearyes">Clear</button></div></div></div>`;
const keyDialog = () => `<div class="scrim" data-a="keycancel"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="kt">
  <h3 id="kt">Gemini API key</h3>
  <p>${S.hasKey ? `Connected: <span class="keymask">••••••••••••${esc(S.keyTail)}</span>` : 'A free key lets Gemini index your bookmarks.'}</p>
  ${S.hasKey && tagRunning() ? '<p class="warn">Removing the key stops indexing.</p>' : ''}
  <form data-form="key" class="kform"><input class="well" type="password" name="k" placeholder="${S.hasKey ? 'Paste a new key to replace it' : 'Paste your Gemini key'}" aria-label="Gemini API key" autocomplete="off" autofocus>
  ${S.keyNote ? `<p class="hint">${esc(S.keyNote)}</p>` : ''}
  <a class="link keylink" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Get a free key ↗</a>
  <div class="dact"><button type="button" class="raised" data-a="keycancel">Cancel</button><button class="primary">Save</button></div></form>
  ${S.hasKey ? '<button class="clearlink" data-a="keyremove">Remove key</button>' : ''}</div></div>`;
let toastTimer;
const toast = (msg, undo) => { clearTimeout(toastTimer); S.toast = { msg, undo }; render(); toastTimer = setTimeout(() => { S.toast = null; render(); }, 7000); };
const go = (screen, patch = {}) => { Object.assign(S, { screen, confirm: false, confirmClear: false, editing: false, adding: false, addTag: false }, patch); render(); };

// ── actions ────────────────────────────────────────────────────────────────
const find = id => BOOKMARKS.find(b => b.id === id);
async function runSearch(q) {
  const my = ++seq;
  go('results', { q, draft: q, filter: 'All', sort: 'relevance', sel: -1, colOnly: null, loading: true, error: null });
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
function exportHtml() {   // the standard bookmarks file every browser can import, keeping your folders; tags and summaries ride along
  const tree = { kids: {}, items: [] };
  BOOKMARKS.forEach(b => {
    let node = tree;
    (b.folderPath || '').split(' / ').filter(Boolean).forEach(p => { node = node.kids[p] ||= { kids: {}, items: [] }; });
    node.items.push(b);
  });
  const secs = ms => ms ? Math.floor(ms / 1000) : '';
  const walk = (node, pad) => Object.entries(node.kids).map(([name, k]) => `${pad}<DT><H3>${esc(name)}</H3>\n${pad}<DL><p>\n${walk(k, pad + '    ')}${pad}</DL><p>\n`).join('')
    + node.items.map(b => { const m = META[b.id] || {}, tags = [...new Set([...(m.tags || []), ...(m.aiTags || [])])].join(',');
      return `${pad}<DT><A HREF="${esc(b.url)}" ADD_DATE="${secs(b.dateAdded)}"${tags ? ` TAGS="${esc(tags)}"` : ''}>${esc(b.title || host(b.url))}</A>\n${m.aiSummary || m.summary ? `${pad}<DD>${esc(m.summary || m.aiSummary)}\n` : ''}`; }).join('');
  const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n${walk(tree, '    ')}</DL><p>\n`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  a.download = 'ai-bookmarks.html'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000); say('Bookmarks exported');
}

app.addEventListener('click', async e => {
  const el = e.target.closest('[data-a]'); if (!el || el.tagName === 'SELECT') return;
  if (el.classList.contains('scrim') && e.target.closest('.dlg')) return;
  const a = el.dataset.a, k = el.dataset.k;
  const resultsPatch = (p) => go('results', { q: '', draft: '', filter: 'All', sort: 'recent', sel: -1, loading: false, error: null, ...p });
  switch (a) {
    case 'home': return go('home', { q: '', draft: '', filter: 'All', colOnly: null });
    case 'cols': return go('collections');
    case 'find': focusSearch = true; return S.screen === 'home' || S.screen === 'results' ? render() : go('home', { q: '', draft: '', filter: 'All', colOnly: null });
    case 'settings': return go(S.screen === 'settings' ? 'home' : 'settings');
    case 'clear': S.q = ''; S.draft = ''; focusSearch = true; return S.colOnly ? render() : go('home', { filter: 'All' });
    case 'filter': return S.screen === 'home' ? (S.lastCol = k === 'All' ? null : k, resultsPatch({ colOnly: k === 'All' ? null : k })) : (S.filter = k, S.sel = -1, render());
    case 'all': return resultsPatch({ colOnly: null, browseBack: 'home' });
    case 'opencol': S.lastCol = k || null; return resultsPatch({ colOnly: k || null, browseBack: 'collections' });
    case 'browseback': return go(S.browseBack || 'home', { colOnly: null });
    case 'detail': return go('details', { bm: el.dataset.id, from: S.screen });
    case 'back': return go(S.from === 'details' ? 'home' : S.from);
    case 'open': return openUrl(find(el.dataset.id));
    case 'copy': return copy(find(el.dataset.id));
    case 'del': {
      const b = find(S.bm); if (!b) return;
      const snap = IN_EXT ? (await chrome.bookmarks.get(b.id).catch(() => []))[0] : null;
      await store.remove(b.id); S.results = S.results.filter(x => x.id !== b.id);
      go(S.from === 'details' ? 'home' : S.from);
      toast('Bookmark deleted', snap ? () => chrome.bookmarks.create({ parentId: snap.parentId, index: snap.index, title: snap.title, url: snap.url }).then(refresh) : null);
      return refresh();
    }
    case 'undo': { const f = S.toast?.undo; clearTimeout(toastTimer); S.toast = null; render(); return f?.(); }
    case 'edit': S.editing = !S.editing; return render();
    case 'addtag': S.addTag = true; render(); return $('.tagin', app)?.focus();
    case 'tagdel': { const m = META[S.bm] || {}; await setMeta(S.bm, k === 'ai' ? { aiTags: (m.aiTags || []).filter(t => t !== el.dataset.t) } : { tags: (m.tags || []).filter(t => t !== el.dataset.t) }); return render(); }
    case 'tagnow': { if (tagRunning()) return; const total = BOOKMARKS.length; await api({ type: 'START_TAGGING' }); S.tag = { ...(S.tag || {}), job: { running: true, total: 0, done: 0, failed: 0, updatedAt: Date.now() } }; render(); return pollTags(); }
    case 'auto': { const on = S.settings.autoEmbedNew !== false && S.settings.autoTagNew !== false; await saveSettings({ autoEmbedNew: !on, autoTagNew: !on }); return render(); }
    case 'rmcol': { const r = await api({ type: 'REMOVE_CATEGORY', category: k }); say(r.success ? 'Collection deleted' : 'Could not delete'); await load(); return render(); }
    case 'keydlg': S.keyDialog = true; S.keyNote = ''; return render();
    case 'keycancel': S.keyDialog = false; return render();
    case 'keyremove': { const wasRunning = tagRunning(); await api({ type: 'SAVE_API_KEY', apiKey: '' }); S.hasKey = false; S.keyTail = ''; S.keyDialog = false; if (S.tag?.job) S.tag.job.running = false; say('Key removed'); toast(wasRunning ? 'Key removed. Indexing stopped.' : 'Key removed'); return; }
    case 'keyfocus': S.keyDialog = true; S.keyNote = ''; return render();
    case 'obskip': try { localStorage.setItem('ob_skip', '1'); } catch { /* storage unavailable */ } return render();
    case 'moreopen': S.moreOpen = !S.moreOpen; S.confirmClear = false; return render();
    case 'rebuild': return rebuild();
    case 'retry': S.loading = true; S.error = null; render(); await refresh(); return;
    case 'retry-search': return runSearch(S.q);
    case 'import': return IN_EXT ? chrome.tabs.create({ url: 'chrome://bookmarks' }) : refresh();
    case 'export': return exportHtml();
    case 'clearask': S.confirmClear = !S.confirmClear; return render();
    case 'clearyes': { await api({ type: 'CLEAR_DATA' }); S.confirmClear = false; META = {}; say('Local data cleared'); await refresh(); return; }
  }
});
app.addEventListener('change', async e => {
  const a = e.target.dataset.a;
  if (a === 'sort') { S.sort = e.target.value; S.sel = -1; render(); }
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
    const r = await api({ type: 'SAVE_API_KEY', apiKey: k }); S.hasKey = r.success; S.keyTail = r.success ? k.slice(-4) : ''; S.keyDialog = !r.success && !!$('.dlg', app); S.keyNote = r.success ? '' : 'Could not save the key.'; render();
  }
});
app.addEventListener('keydown', e => {
  if (e.key === 'Tab' && $('.dlg', app)) {   // keep keyboard focus inside an open dialog
    const f = [...app.querySelectorAll('.dlg input, .dlg button, .dlg a[href]')];
    if (f.length) { const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && (i === -1 || i === f.length - 1)) { e.preventDefault(); f[0].focus(); } }
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('input[name=q]', app)?.focus(); return; }
  if (e.key === 'Escape') { if (S.confirm || S.confirmClear || S.keyDialog || S.editing || S.adding || S.addTag) { S.confirm = S.confirmClear = S.keyDialog = S.editing = S.adding = S.addTag = false; render(); } return; }
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
  try { localStorage.removeItem('nofav'); } catch { /* storage unavailable */ }   // the favicon switch is gone; clear any old choice
  if (!IN_EXT) api = (await import('./dev-fixtures.js')).devApi;
  render();
  await Promise.all([load(), loadStatus()]);
  render();
  if (tagRunning()) pollTags();
  else if (S.tag?.job?.running && S.hasKey) { await api({ type: 'START_TAGGING' }); S.tag.job.updatedAt = Date.now(); pollTags(); }   // a run was cut short (browser closed, worker stopped): pick up where it left off
  else if (S.hasKey && BOOKMARKS.length && S.embedded < BOOKMARKS.length && !S.rebuilding) api({ type: 'GENERATE_EMBEDDINGS' }).then(() => loadStatus()).then(render);   // finish the meaning index in the background
  if (IN_EXT) {   // the panel stays open, so follow bookmark changes made elsewhere (after the background re-index)
    let t;
    const soon = () => { clearTimeout(t); t = setTimeout(async () => { if (S.editing || S.adding || S.addTag || S.screen === 'settings') return; await load(); await loadStatus(); render(); }, 4000); };
    ['onCreated', 'onRemoved', 'onChanged', 'onMoved', 'onImportEnded'].forEach(ev => chrome.bookmarks[ev]?.addListener(soon));
  }
  $('input[name=q]', app)?.focus();
})();
