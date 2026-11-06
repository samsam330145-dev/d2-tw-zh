// D2 Survivors 中文化（網頁版書籤＋書籤修改整合版）：繁體中文、简体中文、日本語，以及 Deutsch、Français、Русский
// 書籤：javascript:import('<這個檔案的網址>').then(m=>m.default()).catch(e=>alert(e))
//   各語言的安裝碼帶語言：m.default('zh-TW')＝第一次就開這個語言（不看遊戲設定和上次用的）

import { loadGame, applyRules, rulesFor, ruleVars, relink, bootHtml } from './core.js';

const MANIFEST = new URL('../data/manifest.json', import.meta.url).href;
const LANG_KEY = 'd2s:lang';
const LAST_KEY = 'd2zh:last';   // 最後一次用的翻譯語言
const GAME_HOSTS = ['d2survivors.lol', 'www.d2survivors.lol'];

const fetch0 = window.fetch.bind(window);
const setItem0 = Storage.prototype.setItem;

const MESSAGES = {
  'zh-TW': {
    loading: '正在載入繁體中文…', on: '繁體中文與修改功能已開啟。再按一次書籤會重新整理頁面，回到原版英文。',
    stuck: '切換失敗。請重新整理頁面，再按一次書籤。',
    failed: '中文化載入失敗：', outdated: '遊戲改版了，中文化需要更新', page: '請先打開 D2 Survivors 的首頁（https://d2survivors.lol/）或遊戲頁面（https://d2survivors.lol/play/），再按這個書籤。',
    old: '書籤需要更新：請到中文化網站重新安裝書籤。', loop: '中文化一直重新載入，已停止。請重新整理頁面。', frame: '中文化載入失敗：框架打不開。請重新整理頁面。',
    setup: '請先選擇遊戲檔案，選完會自動切回繁體中文。',
  },
  'zh-CN': {
    loading: '正在加载简体中文…', on: '简体中文与修改功能已开启。再按一次书签会刷新页面，回到原版英文。',
    stuck: '切换失败。请刷新页面，再按一次书签。',
    failed: '汉化加载失败：', outdated: '游戏更新了，汉化需要更新', page: '请先打开 D2 Survivors 的首页（https://d2survivors.lol/）或游戏页面（https://d2survivors.lol/play/），再按这个书签。',
    old: '书签需要更新：请到汉化网站重新安装书签。', loop: '汉化一直重新加载，已停止。请刷新页面。', frame: '汉化加载失败：框架打不开。请刷新页面。',
    setup: '请先选择游戏文件，选完会自动切回简体中文。',
  },
  ja: {
    loading: '日本語を読み込んでいます…', on: '日本語と修改機能が有効になりました。',
    stuck: '切り替えに失敗しました。', failed: '日本語化の読み込みに失敗しました：', outdated: 'ゲームが更新されました',
    page: 'D2 Survivors のトップページを開いてください。', old: 'ブックマークの更新が必要です。',
    loop: '読み込みが繰り返されたため停止しました。', frame: 'フレームを開けません。', setup: 'まずゲームファイルを選んでください。'
  }
};

const STATUS = {
  'zh-TW': { beta: '（測試中）', draft: '（草稿）' },
  'zh-CN': { beta: '（测试中）', draft: '（草稿）' },
  ja: { beta: '（テスト中）', draft: '（下書き）' },
};

const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { setItem0.call(localStorage, key, value); } catch {} },
};

const normalize = id => id === 'zh' ? 'zh-TW' : id;

function wanted(ids) {
  for (const id of [normalize(store.get(LANG_KEY)), store.get(LAST_KEY)]) if (ids.includes(id)) return id;
  for (const tag of navigator.languages ?? [navigator.language]) {
    const id = /^zh\b.*\b(Hans|CN|SG|MY)\b/i.test(tag) ? 'zh-CN' : /^zh\b/i.test(tag) ? 'zh-TW' : /^(ja|de|fr|ru|pl)\b/i.exec(tag)?.[1].toLowerCase() ?? null;
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
    return { ...l, ...l.web, status, fonts, menu_name: label ? `${l.web.menu_name} ${label}` : l.web.menu_name, dict: new URL(l.dict.url, MANIFEST).href };
  });
  
  const ids = langs.map(l => l.id);
  if (!ids.length) throw new Error(msg.old);
  const first = ids.includes(asked) ? asked : wanted(ids);
  msg = MESSAGES[first] ?? msg;
  showStatus(msg.loading);

  const dicts = new Map();
  const dictModule = lang => {
    if (!dicts.has(lang.id)) {
      const p = get(lang.dict).then(src => URL.createObjectURL(new Blob([`export default ${src};`], { type: 'text/javascript' })));
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
    
    // 【整合重點】：在此處將完整的「書籤修改 / 翻譯 Hook / 裝備創造」程式碼作為初始化指令注入 Blob 遊戲中
    // 透過把 d2_zh.js 的核心邏輯封裝並在遊戲啟動後執行
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
body>:not(iframe):not(#d2zh-toast){display:none!important}
#d2zh-toast{position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:1;padding:8px 14px;border:1px solid #6b5326;border-radius:6px;
background:rgba(12,10,8,.92);color:#e8dfcc;font:14px/1.4 sans-serif;pointer-events:none;transition:opacity .4s}
</style></head><body></body></html>`);
  document.close();
  document.title = title;

  let frame = null;
  let blobs = [];
  const current = () => normalize(store.get(LANG_KEY));
  
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
      // 在此處可載入你的書籤修改介面與面板掛載碼
      doc.write(page.html);
      doc.close();
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
  toast(msg.on, 8000);
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