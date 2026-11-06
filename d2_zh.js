// D2 Survivors 中文化＋全功能書籤修改器（完整終極整合版）
// 書籤：javascript:import('<這個檔案的網址>').then(m=>m.default()).catch(e=>alert(e))

import { loadGame, applyRules, rulesFor, ruleVars, relink, bootHtml } from './core.js';

const MANIFEST = new URL('../data/manifest.json', import.meta.url).href;
const LANG_KEY = 'd2s:lang';
const LAST_KEY = 'd2zh:last';   
const GAME_HOSTS = ['d2survivors.lol', 'www.d2survivors.lol'];
const fetch0 = window.fetch.bind(window);
const setItem0 = Storage.prototype.setItem;

// 擴充翻譯字典：包含物品過濾新增加的 Quivers 與 ETHEREAL ONLY
const EXTRA_TRANSLATIONS = {
  "Quivers": "箭袋",
  "QUIVERS": "箭袋",
  "Ethereal Only": "僅無形",
  "ETHEREAL ONLY": "僅無形"
};

const MESSAGES = {
  'zh-TW': {
    loading: '正在載入繁體中文與修改功能…', on: '繁體中文與書籤修改面板已開啟！',
    stuck: '切換失敗。請重新整理頁面，再按一次書籤。',
    failed: '載入失敗：', outdated: '遊戲改版了，中文化需更新', page: '請先打開 D2 Survivors 遊戲頁面，再按這個書籤。',
    old: '書籤需要更新：請重新安裝書籤。', loop: '中文化一直重新載入，已停止。', frame: '框架打不開。',
    setup: '請先選擇遊戲檔案，選完會自動切回繁體中文。',
  },
  'zh-CN': {
    loading: '正在加载简体中文与修改功能…', on: '简体中文与书签修改面板已开启！',
    stuck: '切换失败。请刷新页面。', failed: '加载失败：', outdated: '游戏更新了，汉化需更新', page: '请先打开游戏页面。',
    old: '书籤需要更新。', loop: '已停止。', frame: '框架打开失败。', setup: '选完会自动切回简体中文。',
  }
};

const STATUS = {
  'zh-TW': { beta: '（測試中）', draft: '（草稿）' },
  'zh-CN': { beta: '（测试中）', draft: '（草稿）' }
};

const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { setItem0.call(localStorage, key, value); } catch {} },
};

const normalize = id => id === 'zh' ? 'zh-TW' : id;

function wanted(ids) {
  for (const id of [normalize(store.get(LANG_KEY)), store.get(LAST_KEY)]) if (ids.includes(id)) return id;
  for (const tag of navigator.languages ?? [navigator.language]) {
    const id = /^zh\b.*\b(Hans|CN|SG|MY)\b/i.test(tag) ? 'zh-CN' : /^zh\b/i.test(tag) ? 'zh-TW' : null;
    if (id && ids.includes(id)) return id;
  }
  return ids.includes('zh-TW') ? 'zh-TW' : ids[0];
}

let msg = MESSAGES[wanted(Object.keys(MESSAGES))];

export default function run(lang) {
  if (window.__d2zh) return window.__d2zh.original();
  lang = normalize(lang);
  msg = MESSAGES[lang] ?? msg;
  return start(lang).catch(e => {
    hideStatus();
    console.error(e);
    alert(`${msg.failed}${e.message || e}`);
  });
}

async function get(url, cache = 'default') {
  const res = await fetch0(url, { cache });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function start(asked) {
  const onPlay = !!document.getElementById('d2-files') && /^\/play\//.test(location.pathname);
  const onHome = /^\/(index\.html)?$/.test(location.pathname);
  if (!GAME_HOSTS.includes(location.hostname) || !(onPlay || onHome)) {
    alert(msg.page);
    return;
  }
  const playUrl = onPlay ? new URL(location.pathname.replace(/[^/]*$/, ''), location.origin).href : new URL('/play/', location.origin).href;
  const [manifest, game] = await Promise.all([
    get(MANIFEST, 'no-cache').then(JSON.parse),
    loadGame(playUrl, url => get(url, url.startsWith(location.origin) ? 'default' : 'no-cache')),
  ]);
  if (manifest.schema !== 2 || !manifest.web?.rules) throw new Error(msg.old);
  
  const langs = manifest.languages.filter(l => l.web).map(l => {
    const status = ['available', 'beta', 'draft'].includes(l.status) ? l.status : 'draft';
    const label = status === 'available' ? '' : (STATUS[l.id] ?? STATUS.en)?.[status] || '';
    const fonts = (l.web.fonts ?? []).map(f => typeof f === 'string' ? f : { ...f, url: new URL(f.url, MANIFEST).href });
    return { ...l, ...l.web, status, fonts, menu_name: label ? `${l.web.menu_name}${label}` : l.web.menu_name, dict: new URL(l.dict.url, MANIFEST).href };
  });
  
  const ids = langs.map(l => l.id);
  if (!ids.length) throw new Error(msg.old);
  const first = ids.includes(asked) ? asked : wanted(ids);
  msg = MESSAGES[first] ?? msg;
  showStatus(msg.loading);

  const dicts = new Map();
  const dictModule = lang => {
    if (!dicts.has(lang.id)) {
      const p = get(lang.dict).then(async src => {
        // 在此注入補強的 Quivers 與 Ethereal Only 翻譯
        let injected = src;
        try {
          const dictObj = eval(`(${src})`);
          Object.assign(dictObj, EXTRA_TRANSLATIONS);
          injected = JSON.stringify(dictObj);
        } catch {}
        return URL.createObjectURL(new Blob([`export default ${injected};`], { type: 'text/javascript' }));
      });
      p.catch(() => dicts.delete(lang.id));
      dicts.set(lang.id, p);
    }
    return dicts.get(lang.id);
  };

  const build = async id => {
    const lang = langs.find(l => l.id === id) ?? null;
    const modules = new Map(game.modules);
    const failed = applyRules(modules, rulesFor(manifest.web.rules, lang), ruleVars(langs, lang, lang && await dictModule(lang)));
    if (failed.length) console.warn('[D2 中文化] 沒套上的修改：', failed.map(r => `${r.label}（${r.found}）`));
    const fatal = failed.filter(r => !r.optional);
    if (fatal.length) throw new Error(`${(MESSAGES[id] ?? msg).outdated}（${fatal.map(r => r.label).join('、')}）`);
    
    const imports = {};
    for (const [url, src] of modules) imports[url] = URL.createObjectURL(new Blob([relink(url, src)], { type: 'text/javascript' }));
    return { html: bootHtml(game.html, playUrl, game.entry, { imports }), blobs: Object.values(imports) };
  };

  const page = await build(first);
  await stopPage();
  store.set(LANG_KEY, first);
  store.set(LAST_KEY, first);
  
  let title = document.title;
  if (!onPlay) {
    title = new DOMParser().parseFromString(game.html, 'text/html').title || title;
    try { history.replaceState(null, '', playUrl); } catch {}
  }
  openShell(page, { ids, build, playUrl, title });
}

async function stopPage(win = window) {
  try { win.LockManager.prototype.request = () => new Promise(() => {}); } catch {}
  try { win.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })); } catch {}
  try { for (const name of ['setItem', 'removeItem', 'clear']) win.Storage.prototype[name] = () => {}; } catch {}
  const add = win.EventTarget.prototype.addEventListener;
  const lifecycle = ['pagehide', 'pageshow', 'visibilitychange', 'freeze', 'resume', 'beforeunload', 'unload'];
  win.EventTarget.prototype.addEventListener = function (type, fn, ...rest) {
    if ((this == null || this === win || this === win.document) && lifecycle.includes(type)) {
      if (type === 'pagehide' && typeof fn === 'function') Promise.resolve().then(() => fn.call(win, new win.PageTransitionEvent('pagehide', { persisted: true })));
      return;
    }
    return add.call(this, type, fn, ...rest);
  };
  win.fetch = () => new Promise(() => {});
  win.requestAnimationFrame = () => 0;
}

function openShell(firstPage, { ids, build, playUrl, title }) {
  const gamePaths = [new URL(playUrl).pathname, new URL('index.html', playUrl).pathname];
  const setupPath = new URL('setup.html', playUrl).pathname;
  let onSetup = false;
  document.open();
  document.write(`<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title></title>
<style>
html,body{margin:0;height:100%;background:#000;overflow:hidden}
iframe{display:block;border:0;width:100%;height:100%}
body>:not(iframe):not(#d2zh-toast):not(#d2ed-btn){display:none!important}
#d2zh-toast{position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:1;padding:8px 14px;border:1px solid #6b5326;border-radius:6px;
background:rgba(12,10,8,.92);color:#e8dfcc;font:14px/1.4 sans-serif;pointer-events:none;transition:opacity .4s}
#d2ed-btn { position: fixed; top: 12px; right: 12px; z-index: 2147483647; background: #2c2215; color: #e8dfcc; border: 1px solid #6b5326; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-family: sans-serif; }
#d2ed-btn:hover { background: #42331f; }
</style></head><body>
<button id="d2ed-btn" onclick="window.__d2edOpen?.()">書籤修改</button>
</body></html>`);
  document.close();
  document.title = title;

  let frame = null;
  let blobs = [];
  
  const show = async (page) => {
    const old = frame;
    if (old) try { await stopPage(old.contentWindow); } catch {}
    const next = frame = document.createElement('iframe');
    blobs = page.blobs;
    next.title = title;
    next.allow = 'fullscreen; gamepad; autoplay; clipboard-read; clipboard-write; screen-wake-lock';
    next.allowFullscreen = true;
    next.src = new URL('/robots.txt', location.origin).href;
    next.addEventListener('load', () => {
      let doc = null;
      try { doc = next.contentDocument; } catch {}
      if (!doc) return;
      doc.open();
      doc.write(page.html);
      doc.close();

      // 掛載修改按鈕邏輯
      try {
        const win = next.contentWindow;
        window.__d2edOpen = () => {
          win.eval(`
            if (typeof d2edOpen === 'function') { 
              d2edOpen(); 
            } else { 
              alert('書籤修改面板初始化中，若已進入遊戲請點擊畫面上的選單。'); 
            }
          `);
        };
      } catch (e) {
        console.error(e);
      }

      next.focus();
    }, { once: true });
    
    if (old) {
      old.replaceWith(next);
      for (const url of blobs) URL.revokeObjectURL(url);
    } else {
      document.body.append(next);
    }
  };

  const original = () => gamePaths.includes(location.pathname) ? location.reload() : location.assign(playUrl);
  window.__d2zh = { original };
  show(firstPage);
  toast(msg.on, 5000);
}

function showStatus(text) {
  let el = document.getElementById('d2zh-status');
  if (!el) { el = Object.assign(document.createElement('div'), { id: 'd2zh-status' }); document.body.append(el); }
  el.textContent = text;
  el.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:2147483647;padding:8px 14px;border:1px solid #6b5326;border-radius:6px;background:rgba(12,10,8,.92);color:#e8dfcc;font:14px/1.4 sans-serif';
}
function hideStatus() { document.getElementById('d2zh-status')?.remove(); }

function toast(text, ms = 3500) {
  let el = document.getElementById('d2zh-toast');
  if (!el) { el = Object.assign(document.createElement('div'), { id: 'd2zh-toast' }); document.body.append(el); }
  el.textContent = text;
  el.style.opacity = '1';
  clearTimeout(toast.timer);
  if (ms) toast.timer = setTimeout(() => { el.style.opacity = '0'; }, ms);
}
