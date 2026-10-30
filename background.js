// ─── AI Bookmark Search — Background Service Worker ─────────────────────────
// Multi-Engine: Google Embeddings (text-embedding-004), Gemini Flash, Chrome Built-in AI, & Local

const STORAGE_KEY = 'ai_bookmark_data';
const EMBEDDINGS_KEY = 'ai_bookmark_embeddings';
const API_KEY_STORAGE = 'gemini_api_key';
const SETTINGS_KEY = 'ai_bookmark_settings';
const OVERRIDES_KEY = 'ai_bookmark_category_overrides'; // { bookmarkId: category }
const CUSTOM_CATS_KEY = 'ai_bookmark_custom_categories'; // [name]
const TAGJOB_KEY = 'ai_bookmark_tagjob'; // { running, total, done, failed, error, updatedAt }
const STOPWORDS = new Set('a an the of for to in on and or with about how what is are my that'.split(' '));
const LOCAL_CONFIDENT = 5;   // a single title, tag or category hit is enough to trust the instant local match
// Gemini picks ONE broad category per bookmark from this fixed list, so related topics stay together
// (typography, fonts, illustration, branding, 3D art and inspiration all belong to Design) and the list never sprawls.
const AI_CATEGORIES = ['Design', 'AI Tools', 'Development', 'Video & Media', 'Productivity', 'Reading & News', 'Shopping & Fashion', 'Travel & Maps',
  'Data & Research', 'Learning', 'Archives & Museums', 'Social & Community', 'Tools & Utilities', 'Finance', 'Food & Drink', 'Games', 'Health & Fitness', 'Others'];
const normalizeCategory = c => AI_CATEGORIES.find(x => x.toLowerCase() === String(c || '').trim().toLowerCase()) || 'Others';
const GEMINI_MODEL = 'gemini-3.1-flash-lite'; // fast, can read pages through the url_context tool
const META_KEY = 'ai_bookmark_meta'; // { bookmarkId: { tags: [], summary, lastAccessed } }

// Default settings
const DEFAULT_SETTINGS = {
  searchEngine: 'auto', // 'auto' | 'embeddings' | 'generative' | 'local' | 'nano'
  autoEmbedNew: true,
};

// ─── Bookmark Tree Traversal ────────────────────────────────────────────────
function flattenBookmarks(nodes, path = '') {
  let results = [];
  for (const node of nodes) {
    const currentPath = path ? `${path} / ${node.title}` : node.title;
    if (node.url) {
      results.push({
        id: node.id,
        title: node.title || '',
        url: node.url,
        folderPath: path,
        dateAdded: node.dateAdded || 0,
      });
    }
    if (node.children) {
      results = results.concat(flattenBookmarks(node.children, currentPath));
    }
  }
  return results;
}

// ─── Auto-Categorization Rules ──────────────────────────────────────────────
// A trailing "!" means the keyword must match as a whole word (short words like "ai" would otherwise match inside "email").
// A leading "*" means it may appear anywhere, even glued to another word ("interactiondesign"). Other keywords match at the start of a word.
// Keep generic words (collection, gallery, tool, guide, library...) out of this list: one weak word must not decide a category.
const CATEGORY_KEYWORDS = {
  'Design': ['*design', 'font', 'texture', 'hdri', 'framer', 'webflow', 'canva', 'adobe', 'pinterest', 'mobbin', 'figma', 'dribbble', 'behance', 'ux!', 'ui design', 'ui kit', 'icons', 'typography', 'typeface', 'palette', 'gradient', 'shader', 'illustration', 'poster', 'packaging', 'landing page', 'aesthetic', 'branding', 'moodboard', 'awwwards', 'webgl', 'three.js', 'paper.design', 'pen.dev', 'threeui', 'landdding', 'recraft', 'inspora', 'recent.design', 'collectui', 'screensdesign', 'deck.gallery', 'inspiration'],
  'AI Tools': ['ai!', 'gpt!', 'llm!', 'openai', 'claude', 'gemini', 'midjourney', 'stable diffusion', 'dall-e', 'image generat', 'krea!', 'reve!', 'meigen', 'imageory', 'quiver', 'anthropic', 'mistral', 'huggingface', 'agent', 'automation', 'manus!', 'hermes', 'langchain', 'autogen', 'crew!', 'browser-use', 'agentic', 'prompt', 'skills.sh', 'skillry', 'youmind', 'skill'],
  'Development': ['github', 'code!', 'programming', 'developer', 'react', 'javascript', 'python', 'api!', 'sdk!', 'npm!', 'framework', 'codepen', 'markdown', 'markitdown', 'vite!', 'next.js', 'typescript', 'rust!', 'golang', 'docker', 'css!'],
  'Video & Media': ['video', 'youtube', 'vimeo', 'stream', 'movie', 'film', 'stop motion', 'tavus', 'ltx!', 'decart', 'cardboard', 'sound', 'audio', 'music', 'podcast', 'muesli'],
  'Data & Research': ['data viz', 'chart', 'visualization', 'infographic', 'pudding', 'information is beautiful', 'ourworldindata', 'diagram', 'observable', 'd3!', 'research', 'dataset'],
  'Archives & Museums': ['museum', 'smithsonian', 'cooper hewitt', 'poster house', 'letterform archive', 'internet archive', 'archive.org', 'archives', 'heritage'],
  'Productivity': ['productivity', 'notion', 'calendar', 'todo', 'kanban', 'delphi', 'ascii!', 'lummi', 'grainrad', 'playgrnd', 'linear.app', 'raycast'],
  'Learning': ['tutorial', 'course', 'lesson', 'academy', 'learn'],
};
const escapeRe = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CATEGORY_MATCHERS = Object.entries(CATEGORY_KEYWORDS).map(([cat, kws]) => [cat, kws.map(kw => {
  const exact = kw.endsWith('!'), anywhere = kw.startsWith('*');
  const word = escapeRe(kw.replace(/^\*|!$/g, '').toLowerCase());
  return new RegExp((anywhere ? '' : '(^|[^a-z0-9])') + word + (exact ? '($|[^a-z0-9])' : ''));
})]);
const MIN_SCORE = 3;          // one hit in the title or the URL is enough; a folder name alone is not
const MAX_CATEGORIES = 2;

function categorizeBookmark(bookmark) {
  const title = (bookmark.title || '').toLowerCase();
  let url = (bookmark.url || '').toLowerCase();
  try { const u = new URL(bookmark.url); url = (u.hostname + u.pathname).toLowerCase(); } catch { /* keep raw url */ }
  const folder = (bookmark.folderPath || '').toLowerCase();

  const scored = [];
  for (const [category, matchers] of CATEGORY_MATCHERS) {
    let score = 0;
    for (const re of matchers) {
      if (re.test(title)) score += 3;
      if (re.test(url)) score += 3;
      if (re.test(folder)) score += 1;
    }
    if (score >= MIN_SCORE) scored.push([category, score]);
  }
  scored.sort((a, b) => b[1] - a[1]);
  if (scored.length) {
    const cutoff = Math.max(MIN_SCORE, scored[0][1] * 0.6);
    return scored.filter(([, sc]) => sc >= cutoff).slice(0, MAX_CATEGORIES).map(([c]) => c);
  }

  // No confident match: "Others". Never force-fit a bookmark into a category.
  return ['Others'];
}

// ─── Index all bookmarks ────────────────────────────────────────────────────
async function indexBookmarks() {
  const tree = await chrome.bookmarks.getTree();
  const flat = flattenBookmarks(tree);

  const extra = await chrome.storage.local.get([OVERRIDES_KEY, META_KEY]);
  const overrides = extra[OVERRIDES_KEY] || {};
  const meta = extra[META_KEY] || {};
  const indexed = flat.map(bm => {
    const m = meta[bm.id] || {};
    // a page Gemini could not read keeps the keyword-based collection
    const categories = overrides[bm.id] ? [overrides[bm.id]] : m.aiCategory && !(m.aiRead === false && m.aiCategory === 'Others') ? [m.aiCategory] : categorizeBookmark(bm);
    const tags = [...new Set([...(m.tags || []), ...(m.aiTags || [])])];
    const summary = m.summary || m.aiSummary || '';
    return {
      ...bm,
      categories,
      tags,
      summary,
      searchText: `${bm.title} ${bm.url} ${bm.folderPath} ${categories.join(' ')} ${tags.join(' ')} ${summary}`.toLowerCase(),
    };
  });

  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      bookmarks: indexed,
      lastIndexed: Date.now(),
      count: indexed.length,
    }
  });

  return indexed;
}

// ─── Format text for embedding ──────────────────────────────────────────────
function getBookmarkEmbeddingText(bm) {
  return `Title: ${bm.title} | Category: ${bm.categories.join(', ')} | Tags: ${(bm.tags || []).join(', ')} | About: ${bm.summary || ''} | Folder: ${bm.folderPath} | URL: ${bm.url}`;
}

// ─── Google Embeddings API (gemini-embedding-001) ───────────────────────────
// Search speed: parsing ~10MB of vectors out of storage on every search cost ~90ms, so keep them in memory
// (dropped whenever storage changes), and remember recent query vectors so a repeated or pre-typed query needs no network.
let embCache = null;
const getEmbeddings = async () => embCache ||= ((await chrome.storage.local.get(EMBEDDINGS_KEY))[EMBEDDINGS_KEY] || {});
chrome.storage.onChanged.addListener(ch => { if (ch[EMBEDDINGS_KEY]) embCache = null; });
const qCache = new Map();
async function embedQuery(text, apiKey) {
  const k = text.trim().toLowerCase();
  if (qCache.has(k)) return qCache.get(k);
  const p = embedText(text, apiKey).catch(e => { qCache.delete(k); throw e; });
  qCache.set(k, p);
  if (qCache.size > 40) qCache.delete(qCache.keys().next().value);
  return p;
}

async function embedText(text, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/gemini-embedding-001',
      content: { parts: [{ text }] }
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Embedding error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.embedding?.values || null;
}

async function batchEmbedBookmarks(bookmarks, apiKey) {
  const stored = await chrome.storage.local.get(EMBEDDINGS_KEY);
  const embeddingsMap = stored[EMBEDDINGS_KEY] || {};

  const missing = bookmarks.filter(b => !embeddingsMap[b.id]);
  if (missing.length === 0) {
    return { total: bookmarks.length, embedded: Object.keys(embeddingsMap).length };
  }

  const BATCH_SIZE = 50;
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    const requests = batch.map(b => ({
      model: 'models/gemini-embedding-001',
      content: { parts: [{ text: getBookmarkEmbeddingText(b) }] }
    }));

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests })
      });

      if (!response.ok) {
        // Fallback: embed individually if batch endpoint throttles
        for (const item of batch) {
          try {
            const vec = await embedText(getBookmarkEmbeddingText(item), apiKey);
            if (vec) embeddingsMap[item.id] = vec;
          } catch (e) {
            console.warn(`Failed embedding bookmark ${item.id}`, e);
          }
        }
      } else {
        const data = await response.json();
        const results = data.embeddings || [];
        results.forEach((emb, idx) => {
          if (emb?.values && batch[idx]) {
            embeddingsMap[batch[idx].id] = emb.values;
          }
        });
      }

      // Save progressive checkpoints
      await chrome.storage.local.set({ [EMBEDDINGS_KEY]: embeddingsMap });
    } catch (e) {
      console.error('Batch embedding failure:', e);
      break;
    }
  }

  return { total: bookmarks.length, embedded: Object.keys(embeddingsMap).length };
}

// ─── Vector Cosine Similarity ───────────────────────────────────────────────
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─── Semantic Search via Google Embeddings ─────────────────────────────────
async function searchWithEmbeddings(query, bookmarks, apiKey) {
  const [queryVector, embeddingsMap] = await Promise.all([embedQuery(query, apiKey), getEmbeddings()]);
  if (!queryVector) throw new Error('Could not compute query embedding');

  const terms = String(query).toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter(t => t.length > 1 && !STOPWORDS.has(t)) || [];
  const all = [];
  for (const bm of bookmarks) {
    const v = embeddingsMap[bm.id];
    let sim = v ? cosineSimilarity(queryVector, v) : 0;
    const hits = terms.filter(t => bm.searchText.includes(t)).length;
    sim += terms.length ? 0.08 * hits / terms.length : 0;   // words found in the title, tags or summary lift a result
    all.push({ bm, sim });
  }
  all.sort((a, b) => b.sim - a.sim);
  const top = all[0]?.sim || 0, floor = Math.max(0.5, top - 0.08);   // keep only results close to the best one
  const scored = all.filter(x => x.sim >= floor).map(({ bm, sim }) => ({ ...bm, matchScore: Math.min(99, Math.round(sim * 100)), engineUsed: 'Meaning' }));
  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored.slice(0, 20);
}

// ─── Generative AI Search (Gemini 3.8 Flash) ────────────────────────────────
async function searchWithAI(query, bookmarks, apiKey) {
  const sample = bookmarks.slice(0, 500);
  const bookmarkList = sample.map((b, i) =>
    `[${i}] "${b.title}" | ${b.url} | Tags: ${(b.tags || []).join(', ') || '-'} | About: ${b.summary || '-'} | Categories: ${b.categories.join(', ')} | Folder: ${b.folderPath}`
  ).join('\n');

  const prompt = `You are a bookmark search assistant. The user saved these bookmarks. Each line has the title, URL, tags and a short description of what the site is.

${bookmarkList}

The user asks: "${query}"

Return a JSON array of the bookmark indices (the numbers in brackets) that best answer the question, using the tags and descriptions as well as the titles. Return at most 12, most relevant first. Include a bookmark ONLY if the site genuinely answers the question or offers what is asked for; a different topic that merely shares a word does not count. If nothing is a good match, return []. Only return the JSON array of numbers, nothing else.

Example response: [3, 7, 12, 0]`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 256 }
      }),
      signal: AbortSignal.timeout(25000)
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

  const match = text.match(/\[[\d\s,]*\]/);
  if (!match) return [];

  const indices = JSON.parse(match[0]);
  return indices
    .filter(i => i >= 0 && i < sample.length)
    .map((i, rank) => ({
      ...sample[i],
      matchScore: Math.max(70, 98 - (rank * 3)),
      engineUsed: 'Gemini'
    }));
}

// ─── AI tagging: Gemini reads each page and returns tags + a one-line summary ───
const TAG_BATCH = 10;
let tagging = false;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function cleanTags(tags) {
  return [...new Set((Array.isArray(tags) ? tags : []).map(t => String(t).toLowerCase().trim().slice(0, 24)).filter(Boolean))].slice(0, 6);
}

async function tagBatch(batch, apiKey) {
  const items = batch.map((b, i) => `[${i}] "${b.title}" | ${b.url} | folder: ${b.folderPath}`).join('\n');
  const prompt = `You tag a person's saved web bookmarks so they are easy to find later with natural-language search.
Read each page. Many pages are web apps that show no text, or sit behind a login. Never guess what such a page does.
For each bookmark, set "read" to true only if you saw real page text that describes the site. Set "read" to false if the page was empty, a login wall, an error, or you only had its title and address.
When "read" is false: "summary" must be "" (empty), and "tags" may only use words that appear in the title or the address (2 to 4 tags). Do not add a purpose, a topic or synonyms that are not in those words.
Return ONLY a JSON array with one object per bookmark: {"i": <index>, "read": true or false, "category": "<exactly one of: ${AI_CATEGORIES.join(' | ')}>", "tags": [3 to 6 short lowercase tags when read is true: what it is, what it is for, the topic, and synonyms someone might search for], "summary": "<when read is true: one plain sentence, at most 25 words, what the site offers>"}.
Category rules: choose the single best BROAD category. Group related topics under one broad category: typography, fonts, illustration, graphics, branding, 3D art, textures and design inspiration all belong to "Design"; sound effects, music, film and streaming belong to "Video & Media". If nothing clearly fits, or the page was not read, use "Others". Never invent a category and never use any value that is not in the list.

Bookmarks:
${items}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    let res;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], tools: [{ url_context: {} }], generationConfig: { temperature: 0.2 } }),
        signal: AbortSignal.timeout(60000)   // a stuck page read must not hang the whole run
      });
    } catch (e) {
      if (attempt === 2) throw new Error('Gemini took too long, try again');
      continue;
    }
    if (res.ok) {
      const data = await res.json();
      const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
      const m = text.match(/\[[\s\S]*\]/);
      if (!m) throw new Error('Gemini returned no JSON');
      const parsed = JSON.parse(m[0]);
      // Gemini also reports, per address, whether it could fetch the page. A failed fetch on this site means no summary.
      const um = data.candidates?.[0]?.urlContextMetadata?.urlMetadata || data.candidates?.[0]?.url_context_metadata?.url_metadata || [];
      const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
      for (const o of parsed) {
        const bm = batch[o.i]; if (!bm) continue;
        const mine = um.filter(x => hostOf(x.retrievedUrl || x.retrieved_url) === hostOf(bm.url));
        o.fetchFailed = mine.length > 0 && !mine.some(x => /SUCCESS/.test(String(x.urlRetrievalStatus || x.url_retrieval_status || '')));
      }
      return parsed;
    }
    if (![429, 500, 503].includes(res.status)) throw new Error(`Gemini error ${res.status}`);
    await sleep(2000 * (attempt + 1));
  }
  throw new Error('Gemini is busy, try again in a minute');
}

async function writeJob(patch) {
  const cur = (await chrome.storage.local.get(TAGJOB_KEY))[TAGJOB_KEY] || {};
  await chrome.storage.local.set({ [TAGJOB_KEY]: { ...cur, ...patch, updatedAt: Date.now() } });
}

async function tagBookmarks({ force = false } = {}) {
  if (tagging) return;
  tagging = true;
  const keepAlive = setInterval(() => chrome.runtime.getPlatformInfo(() => {}), 20000);   // stop Chrome from stopping the worker mid-run
  try {
    const stored = await chrome.storage.local.get([STORAGE_KEY, API_KEY_STORAGE, META_KEY]);
    const apiKey = stored[API_KEY_STORAGE];
    if (!apiKey) throw new Error('Add a Gemini API key in Settings first.');
    const bookmarks = stored[STORAGE_KEY]?.bookmarks || (await indexBookmarks());
    let meta = stored[META_KEY] || {};
    const todo = bookmarks.filter(b => b.url && /^https?:/.test(b.url) && (force || !meta[b.id]?.aiAt || !meta[b.id]?.aiCategory));
    await writeJob({ running: true, total: todo.length, done: 0, failed: 0, error: null });
    let done = 0, failed = 0, lastError = null;
    for (let i = 0; i < todo.length; i += TAG_BATCH) {
      const batch = todo.slice(i, i + TAG_BATCH);
      const liveKey = (await chrome.storage.local.get(API_KEY_STORAGE))[API_KEY_STORAGE];
      if (!liveKey) { lastError = 'Gemini key removed'; break; }   // the key was deleted mid-run: stop cleanly
      try {
        const out = await tagBatch(batch, liveKey);
        meta = (await chrome.storage.local.get(META_KEY))[META_KEY] || meta;
        for (const o of out) {
          const b = batch[o.i];
          if (!b) continue;
          const read = o.read !== false && !o.fetchFailed;
          meta[b.id] = { ...(meta[b.id] || {}), aiCategory: normalizeCategory(read ? o.category : 'Others'), aiTags: cleanTags(o.tags).slice(0, read ? 6 : 4), aiSummary: read ? String(o.summary || '').slice(0, 220) : '', aiRead: read, aiAt: Date.now() };
        }
        await chrome.storage.local.set({ [META_KEY]: meta });
        done += batch.length;
      } catch (e) {
        failed += batch.length; lastError = e.message;
        if (/API key|403|401/.test(e.message)) break;
      }
      await writeJob({ done, failed, error: lastError });
    }
    // bake the new tags into the search index and rebuild embeddings so meaning search sees them
    const reindexed = await indexBookmarks();
    if (done > 0 && (await chrome.storage.local.get(API_KEY_STORAGE))[API_KEY_STORAGE]) {
      await chrome.storage.local.remove(EMBEDDINGS_KEY);
      batchEmbedBookmarks(reindexed, apiKey).catch(e => console.warn('Re-embed after tagging failed:', e));
    }
    await writeJob({ running: false, done, failed, error: lastError });
  } catch (e) {
    await writeJob({ running: false, error: e.message });
  } finally {
    clearInterval(keepAlive);
    tagging = false;
  }
}

// ─── Local Keyword & Semantic Heuristic Search ──────────────────────────────
function searchLocal(query, bookmarks) {
  const clean = query.toLowerCase().trim();
  const terms = clean.split(/\s+/).filter(t => t.length > 1);
  if (terms.length === 0) return bookmarks.slice(0, 20);

  const scored = bookmarks.map(bm => {
    let score = 0;
    const titleLower = bm.title.toLowerCase();
    const urlLower = bm.url.toLowerCase();

    // Exact phrase match
    if (titleLower.includes(clean)) score += 15;
    if (urlLower.includes(clean)) score += 8;

    for (const term of terms) {
      if (titleLower.includes(term)) score += 5;
      if (urlLower.includes(term)) score += 3;
      for (const cat of bm.categories) {
        if (cat.toLowerCase().includes(term)) score += 6;
      }
      if (bm.folderPath.toLowerCase().includes(term)) score += 4;
      if ((bm.tags || []).some(t => t.includes(term))) score += 7;
      if ((bm.summary || '').toLowerCase().includes(term)) score += 2;
    }

    return {
      ...bm,
      score,
      matchScore: Math.min(96, Math.max(50, 45 + score * 3)),
      engineUsed: 'Local Match'
    };
  });

  return scored
    .filter(b => b.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

// ─── Message Handler ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === 'INDEX') {
        const bookmarks = await indexBookmarks();
        sendResponse({ success: true, count: bookmarks.length });
      }

      else if (msg.type === 'SEARCH') {
        const stored = await chrome.storage.local.get([STORAGE_KEY, API_KEY_STORAGE, SETTINGS_KEY]);
        let bookmarks = stored[STORAGE_KEY]?.bookmarks;

        if (!bookmarks || !bookmarks.length) {
          bookmarks = await indexBookmarks();
        }

        const apiKey = stored[API_KEY_STORAGE];
        const embeddingsMap = await getEmbeddings();
        const settings = stored[SETTINGS_KEY] || DEFAULT_SETTINGS;
        let results = [], engineUsed = 'Local';

        // AI search. With the meaning index built this is instant: one query embedding, a local comparison, no second model call.
        if (apiKey) {
          try {
            const ready = Object.keys(embeddingsMap).length >= bookmarks.length * 0.95;
            if (ready) {
              results = await searchWithEmbeddings(msg.query, bookmarks, apiKey);
              engineUsed = 'Meaning';
            } else {   // index still building: let Gemini read the tags instead
              results = await searchWithAI(msg.query, bookmarks, apiKey);
              engineUsed = 'Gemini';
            }
          } catch (e) {
            console.warn('AI search failed, using keyword match:', e);
            results = searchLocal(msg.query, bookmarks);
          }
        } else {
          results = searchLocal(msg.query, bookmarks);
        }
        if (!results.length) results = searchLocal(msg.query, bookmarks).filter(r => r.score >= LOCAL_CONFIDENT);

        sendResponse({ success: true, results, engineUsed });
      }

      else if (msg.type === 'PREFETCH') {   // the panel pre-computes the query vector while the user is still typing
        const key = (await chrome.storage.local.get(API_KEY_STORAGE))[API_KEY_STORAGE];
        if (key && String(msg.query || '').trim().length > 2) embedQuery(String(msg.query), key).catch(() => {});
        sendResponse({ success: true });
      }

      else if (msg.type === 'GENERATE_EMBEDDINGS') {
        const stored = await chrome.storage.local.get([STORAGE_KEY, API_KEY_STORAGE]);
        const bookmarks = stored[STORAGE_KEY]?.bookmarks || (await indexBookmarks());
        const apiKey = stored[API_KEY_STORAGE];

        if (!apiKey) {
          throw new Error('Please set a Gemini API key first to generate embeddings.');
        }

        const status = await batchEmbedBookmarks(bookmarks, apiKey);
        sendResponse({ success: true, status });
      }

      else if (msg.type === 'GET_EMBEDDINGS_STATUS') {
        const stored = await chrome.storage.local.get(STORAGE_KEY);
        const live = stored[STORAGE_KEY]?.bookmarks || [];
        const total = live.length;
        const vecs = await getEmbeddings();
        const embedded = live.filter(bm => vecs[bm.id]).length;
        sendResponse({ success: true, total, embedded });
      }

      else if (msg.type === 'GET_CATEGORIES') {
        const stored = await chrome.storage.local.get(STORAGE_KEY);
        let bookmarks = stored[STORAGE_KEY]?.bookmarks;

        if (!bookmarks || !bookmarks.length) {
          bookmarks = await indexBookmarks();
        }

        const categoryMap = {};
        for (const bm of bookmarks) {
          for (const cat of bm.categories) {
            if (!categoryMap[cat]) categoryMap[cat] = [];
            categoryMap[cat].push(bm);
          }
        }

        const custom = (await chrome.storage.local.get(CUSTOM_CATS_KEY))[CUSTOM_CATS_KEY] || [];
        for (const name of custom) if (!categoryMap[name]) categoryMap[name] = [];

        sendResponse({ success: true, categories: categoryMap, custom, count: bookmarks.length });
      }

      else if (msg.type === 'REMOVE_CATEGORY') {
        const st = await chrome.storage.local.get([CUSTOM_CATS_KEY, OVERRIDES_KEY]);
        const overrides = st[OVERRIDES_KEY] || {};
        for (const id of Object.keys(overrides)) if (overrides[id] === msg.category) delete overrides[id];
        await chrome.storage.local.set({ [CUSTOM_CATS_KEY]: (st[CUSTOM_CATS_KEY] || []).filter(c => c !== msg.category), [OVERRIDES_KEY]: overrides });
        await indexBookmarks();
        sendResponse({ success: true });
      }

      else if (msg.type === 'SET_CATEGORY') {
        const stored = await chrome.storage.local.get(OVERRIDES_KEY);
        const overrides = stored[OVERRIDES_KEY] || {};
        overrides[msg.id] = msg.category;
        await chrome.storage.local.set({ [OVERRIDES_KEY]: overrides });
        await indexBookmarks();
        sendResponse({ success: true });
      }

      else if (msg.type === 'START_TAGGING') {
        tagBookmarks({ force: !!msg.force });   // runs in the background; the popup polls GET_TAG_STATUS
        sendResponse({ success: true });
      }

      else if (msg.type === 'GET_TAG_STATUS') {
        const stored = await chrome.storage.local.get([TAGJOB_KEY, META_KEY, STORAGE_KEY]);
        const meta = stored[META_KEY] || {};
        const live = stored[STORAGE_KEY]?.bookmarks || [];
        const total = live.length;
        const tagged = live.filter(bm => meta[bm.id]?.aiAt && meta[bm.id]?.aiCategory).length;   // only bookmarks that still exist: notes left by deleted ones must not count
        sendResponse({ success: true, job: stored[TAGJOB_KEY] || {}, tagged, total });
      }

      else if (msg.type === 'GET_META') {
        const stored = await chrome.storage.local.get(META_KEY);
        sendResponse({ success: true, meta: stored[META_KEY] || {} });
      }

      else if (msg.type === 'SET_META') {
        const stored = await chrome.storage.local.get(META_KEY);
        const meta = stored[META_KEY] || {};
        meta[msg.id] = { ...(meta[msg.id] || {}), ...msg.patch };
        await chrome.storage.local.set({ [META_KEY]: meta });
        sendResponse({ success: true });
      }

      else if (msg.type === 'CLEAR_DATA') {
        // Local index, embeddings, category overrides, custom categories and bookmark notes. Chrome bookmarks, settings and API key are untouched.
        await chrome.storage.local.remove([STORAGE_KEY, EMBEDDINGS_KEY, OVERRIDES_KEY, CUSTOM_CATS_KEY, META_KEY, TAGJOB_KEY]);
        await indexBookmarks();
        sendResponse({ success: true });
      }

      else if (msg.type === 'ADD_CATEGORY') {
        const name = String(msg.name || '').trim().slice(0, 28);
        if (!name) throw new Error('Category name is empty.');
        const stored = await chrome.storage.local.get(CUSTOM_CATS_KEY);
        const custom = stored[CUSTOM_CATS_KEY] || [];
        if (!custom.includes(name)) custom.push(name);
        await chrome.storage.local.set({ [CUSTOM_CATS_KEY]: custom });
        sendResponse({ success: true });
      }

      else if (msg.type === 'SAVE_API_KEY') {
        await chrome.storage.local.set({ [API_KEY_STORAGE]: msg.apiKey.trim() });
        sendResponse({ success: true });
      }

      else if (msg.type === 'GET_API_KEY') {
        const stored = await chrome.storage.local.get(API_KEY_STORAGE);
        sendResponse({ success: true, apiKey: stored[API_KEY_STORAGE] });
      }

      else if (msg.type === 'GET_SETTINGS') {
        const stored = await chrome.storage.local.get(SETTINGS_KEY);
        sendResponse({ success: true, settings: stored[SETTINGS_KEY] || DEFAULT_SETTINGS });
      }

      else if (msg.type === 'SAVE_SETTINGS') {
        await chrome.storage.local.set({ [SETTINGS_KEY]: msg.settings });
        sendResponse({ success: true });
      }

    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  })();
  return true; // keep channel open for async response
});

// ─── Side panel: clicking the toolbar icon opens a docked panel that stays open across tabs and clicks ───
if (chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(e => console.warn('Side panel setup failed:', e));
}

// ─── Pick up an interrupted indexing run (browser closed, worker stopped) when the worker starts again ───
(async () => {
  const st = await chrome.storage.local.get([TAGJOB_KEY, API_KEY_STORAGE]);
  const job = st[TAGJOB_KEY];
  if (job?.running && st[API_KEY_STORAGE] && Date.now() - (job.updatedAt || 0) > 300000) tagBookmarks();   // quiet for 5 minutes: nothing is running it
})();

// ─── Keyboard shortcut: open the panel from anywhere ───
chrome.commands?.onCommand.addListener(async cmd => {
  if (cmd !== 'open-panel') return;
  const win = await chrome.windows.getCurrent();
  chrome.sidePanel.open({ windowId: win.id }).catch(e => console.warn('Could not open the panel:', e));
});

// ─── Auto-index on install ──────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  indexBookmarks();
});

// ─── Auto-re-index on ANY bookmark change ───────────────────────────────────
let reindexTimer = null;

function debouncedReindex(reason) {
  if (reindexTimer) clearTimeout(reindexTimer);
  reindexTimer = setTimeout(async () => {
    console.log(`[AI Bookmark] Re-indexing: ${reason}`);
    const bookmarks = await indexBookmarks();
    console.log(`[AI Bookmark] Indexed ${bookmarks.length} bookmarks`);

    // Optionally auto-embed newly created bookmark
    const stored = await chrome.storage.local.get([API_KEY_STORAGE, SETTINGS_KEY, EMBEDDINGS_KEY]);
    const apiKey = stored[API_KEY_STORAGE];
    const settings = stored[SETTINGS_KEY] || DEFAULT_SETTINGS;
    const meta = (await chrome.storage.local.get(META_KEY))[META_KEY] || {};
    const hasTagged = Object.values(meta).some(m => m.aiAt);
    if ((apiKey) && settings.autoTagNew !== false && hasTagged) {
      await tagBookmarks();   // only bookmarks without AI tags yet, so new saves
    } else if (apiKey && settings.autoEmbedNew) {
      batchEmbedBookmarks(bookmarks, apiKey).catch(e => console.warn('Background auto-embed error:', e));
    }
    reindexTimer = null;
  }, 2000);
}

chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  debouncedReindex(`Bookmark added: "${bookmark.title || bookmark.url}"`);
});

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  debouncedReindex(`Bookmark removed (id: ${id})`);
});

chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
  debouncedReindex(`Bookmark moved (id: ${id})`);
});

chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
  debouncedReindex(`Bookmark changed: "${changeInfo.title || changeInfo.url}"`);
});

chrome.bookmarks.onImportEnded.addListener(() => {
  debouncedReindex('Bookmark import completed');
});
