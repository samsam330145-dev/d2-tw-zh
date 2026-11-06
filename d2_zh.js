// D2 Survivors 中文化＋全功能書籤修改器（基於 d2_zh_2.js 完整修改版）
// 書籤：javascript:import('<這個檔案的網址>').then(m=>m.default()).catch(e=>alert(e))
//   各語言的安裝碼帶語言：m.default('zh-TW')＝第一次就開這個語言（不看遊戲設定和上次用的）

import { loadGame, applyRules, rulesFor, ruleVars, relink, bootHtml } from './core.js';

const MANIFEST = new URL('../data/manifest.json', import.meta.url).href;
const LANG_KEY = 'd2s:lang';
const LAST_KEY = 'd2zh:last';   // 最後一次用的翻譯語言
const GAME_HOSTS = ['d2survivors.lol', 'www.d2survivors.lol'];
const fetch0 = window.fetch.bind(window);
const setItem0 = Storage.prototype.setItem;

// 擴充物品過濾與介面翻譯（補上 QUIVERS 與 ETHEREAL ONLY）
const EXTRA_DICT = {
  "Quivers": "箭袋",
  "QUIVERS": "箭袋",
  "Ethereal Only": "僅無形",
  "ETHEREAL ONLY": "僅無形",
  "Normal": "普通",
  "Socketed": "有洞"
};

const MESSAGES = {
  'zh-TW': {
    loading: '正在載入繁體中文與修改功能…', on: '繁體中文與書籤修改面板已開啟。再按一次書籤會重新整理頁面，回到原版英文。',
    stuck: '切換失敗。請重新整理頁面，再按一次書籤。',
    failed: '中文化載入失敗：', outdated: '遊戲改版了，中文化需要更新', page: '請先打開 D2 Survivors 的首頁（https://d2survivors.lol/）或遊戲頁面（https://d2survivors.lol/play/），再按這個書籤。手機建議從首頁按，比較省記憶體。',
    old: '書籤需要更新：請到中文化網站重新安裝書籤。', loop: '中文化一直重新載入，已停止。請重新整理頁面。', frame: '中文化載入失敗：框架打不開。請重新整理頁面。',
    setup: '請先選擇遊戲檔案，選完會自動切回繁體中文。',
  },
  'zh-CN': {
    loading: '正在加载简体中文与修改功能…', on: '简体中文与修改功能已开启。再按一次书签会刷新页面，回到原版英文。',
    stuck: '切换失败。请刷新页面，再按一次书签。',
    failed: '汉化加载失败：', outdated: '游戏更新了，汉化需要更新', page: '请先打开 D2 Survivors 的首页（https://d2survivors.lol/）或游戏页面（https://d2survivors.lol/play/），再按这个书签。手机建议从首页按，比较省内存。',
    old: '书签需要更新：请到汉化网站重新安装书签。', loop: '汉化一直重新加载，已停止。请刷新页面。', frame: '汉化加载失败：框架打不开。请刷新页面。',
    setup: '请先选择游戏文件，选完会自动切回简体中文。',
  },
  ja: {
    loading: '日本語を読み込んでいます…', on: '日本語になりました。もう一度ブックマークを押すとページを再読み込みして、元の英語版に戻ります。',
    stuck: '切り替えに失敗しました。ページを再読み込みしてから、もう一度ブックマークを押してください。',
    failed: '日本語化の読み込みに失敗しました：', outdated: 'ゲームが更新されたため、日本語化の更新が必要です', page: 'D2 Survivors のトップページを開いてから、このブックマークを押してください。',
    old: 'ブックマークの更新が必要です。', loop: '読み込みが繰り返されたため停止しました。', frame: 'フレームを開けません。',
    setup: 'まずゲームファイルを選んでください。',
  },
  de: {
    loading: 'Deutsch wird geladen…', on: 'Deutsch ist aktiv.',
    stuck: 'Wechsel fehlgeschlagen.', failed: 'Übersetzung konnte nicht geladen werden: ', outdated: 'Das Spiel wurde aktualisiert', page: 'Bitte zuerst die Spielseite öffnen.',
    old: 'Das Lesezeichen ist veraltet.', loop: 'Gestoppt.', frame: 'Rahmen lässt sich nicht öffnen.', setup: 'Bitte zuerst die Spieldateien wählen.',
  },
  fr: {
    loading: 'Chargement du français…', on: 'Le français est activé.',
    stuck: 'Le changement a échoué.', failed: 'Échec du chargement : ', outdated: 'Le jeu a été mis à jour', page: 'Ouvrez d’abord la page du jeu.',
    old: 'Le favori est obsolète.', loop: 'Arrêté.', frame: 'Impossible d’ouvrir le cadre.', setup: 'Choisissez d’abord les fichiers.',
  },
  ru: {
    loading: 'Загрузка русского перевода…', on: 'Русский перевод включен.',
    stuck: 'Не удалось переключить.', failed: 'Не удалось загрузить: ', outdated: 'Игра обновилась', page: 'Сначала откройте страницу игры.',
    old: 'Закладка устарела.', loop: 'Остановлено.', frame: 'Не открывается фрейм.', setup: 'Сначала выберите файлы.',
  },
  pl: {
    loading: 'Wczytywanie polskiego tłumaczenia…', on: 'Polski jest włączony.',
    stuck: 'Nie udało się przełączyć.', failed: 'Nie udało się wczytać: ', outdated: 'Gra została zaktualizowana', page: 'Najpierw otwórz stronę gry.',
    old: 'Zakładka jest nieaktualna.', loop: 'Zatrzymane.', frame: 'Nie można otworzyć ramki.', setup: 'Najpierw wybierz pliki.',
  },
};

const SETUP_EN = 'Choose your game files first. The bookmark takes over again by itself afterwards.';

const STATUS = {
  'zh-TW': { beta: '（測試中）', draft: '（草稿）' },
  'zh-CN': { beta: '（测试中）', draft: '（草稿）' },
  ja: { beta: '（テスト中）', draft: '（下書き）' },
  de: { beta: '(Beta)', draft: '(Entwurf)' },
  fr: { beta: '(bêta)', draft: '(brouillon)' },
  ru: { beta: '(бета)', draft: '(черновик)' },
  pl: { beta: '(beta)', draft: '(wersja robocza)' },
  en: { beta: '(beta)', draft: '(draft)' },
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
    const label = status === 'available' ? '' : (STATUS[l.id] ?? STATUS.en)[status];
    const fonts = (l.web.fonts ?? []).map(f => typeof f === 'string' ? f : { ...f, url: new URL(f.url, MANIFEST).href });
    return { ...l, ...l.web, status, fonts, menu_name: label ? `${l.web.menu_name}${label.startsWith('（') ? '' : ' '}${label}` : l.web.menu_name, dict: new URL(l.dict.url, MANIFEST).href };
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
        let injectedSrc = src;
        try {
          // 動態補強字典對應
          const parsed = eval(`(${src})`);
          Object.assign(parsed, EXTRA_DICT);
          injectedSrc = JSON.stringify(parsed);
        } catch {}
        return URL.createObjectURL(new Blob([`export default ${injectedSrc};`], { type: 'text/javascript' }));
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
  const contexts = new Set();
  const proto = win.BaseAudioContext?.prototype;
  const hooked = ['state', 'currentTime'].map(name => [name, proto && Object.getOwnPropertyDescriptor(proto, name)]).filter(([, d]) => d?.get);
  for (const [name, d] of hooked) Object.defineProperty(proto, name, { ...d, get() { contexts.add(this); return d.get.call(this); } });
  for (const type of ['keydown', 'keyup']) win.dispatchEvent(new KeyboardEvent(type, { key: 'F24', code: 'F24', bubbles: true }));
  await new Promise(r => setTimeout(r, 300));
  for (const [name, d] of hooked) Object.defineProperty(proto, name, d);
  try {
    const tx = win.IDBDatabase.prototype.transaction;
    win.IDBDatabase.prototype.transaction = function (stores, mode, ...rest) {
      if (mode && mode !== 'readonly') throw new win.DOMException('stopped', 'InvalidStateError');
      return tx.call(this, stores, mode, ...rest);
    };
  } catch {}
  for (const c of contexts) c.close().catch(() => {});

  win.fetch = () => new Promise(() => {});
  win.requestAnimationFrame = () => 0;
  const last = win.setTimeout(() => {});
  for (let i = 0; i <= last; i++) { win.clearTimeout(i); win.clearInterval(i); }
  for (const c of win.document.querySelectorAll('canvas')) {
    try { (c.getContext('webgl2') || c.getContext('webgl'))?.getExtension('WEBGL_lose_context')?.loseContext(); } catch {}
  }
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
background:rgba(12,10,8,.92);color:#e8dfcc;font:14px/1.4 "Microsoft JhengHei","Microsoft YaHei","Meiryo","PingFang TC","Hiragino Sans","Noto Sans CJK TC",sans-serif;pointer-events:none;transition:opacity .4s}
#d2zh-toast[data-at=bottom]{top:auto;bottom:12px}

/* 書籤修改獨立按鈕樣式 */
#d2ed-btn { position: fixed; top: 12px; right: 12px; z-index: 2147483647; background: #2c2215; color: #e8dfcc; border: 1px solid #6b5326; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-family: "Microsoft JhengHei", sans-serif; }
#d2ed-btn:hover { background: #42331f; }
</style></head><body>
<button id="d2ed-btn" onclick="window.__d2edOpen?.()">書籤修改</button>
</body></html>`);
  document.close();
  document.title = title;

  new MutationObserver(() => {
    for (const el of [...document.body.children]) if (el.tagName !== 'IFRAME' && el.id !== 'd2zh-toast' && el.id !== 'd2ed-btn') el.remove();
  }).observe(document.body, { childList: true });

  let frame = null;
  let blobs = [];
  let boots = [];
  const current = () => normalize(store.get(LANG_KEY));

  const show = async (page, auto) => {
    if (auto) {
      const now = Date.now();
      boots = boots.filter(t => now - t < 15000).concat(now);
      if (boots.length > 3) {
        toast(msg.loop, 0);
        for (const url of page.blobs) URL.revokeObjectURL(url);
        return;
      }
    }
    const old = frame;
    const oldBlobs = blobs;
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
      if (!doc) { toast(msg.frame, 0); return; }
      doc.open();
      doc.write(page.html.replace('<head>', `<head>${FRAME_COUNTER}${LOWRES}`));
      doc.close();
      if (old) watch(next);

      // 掛載 D2ED / D2EC 修改器介面邏輯
      try {
        const win = next.contentWindow;
        window.__d2edOpen = () => {
          win.eval(`
            if (typeof d2edOpen === 'function') {
              d2edOpen();
            } else {
              alert('書籤修改面板準備中，若已在遊戲內請直接使用選單。');
            }
          `);
        };
      } catch (e) {
        console.error(e);
      }

      next.addEventListener('load', () => {
        let d = null;
        try { d = next.contentDocument; } catch {}
        if (next !== frame || !d) return;
        const path = next.contentWindow.location.pathname;
        if (path === setupPath) { onSetup = true; toast(MESSAGES[current()]?.setup ?? SETUP_EN, 0, 'bottom'); return; }
        if (onSetup) { onSetup = false; hideToast(); }
        if (!d.querySelector('meta[name="d2zh"]') && gamePaths.includes(path)) reboot(true);
      });
      next.focus();
    }, { once: true });
    if (old) {
      old.replaceWith(next);
      for (const url of oldBlobs) URL.revokeObjectURL(url);
    } else {
      document.body.append(next);
    }
  };

  let running = null;
  let again = false;
  let againAuto = true;
  const reboot = (auto = false) => {
    again = true;
    againAuto &&= auto;
    running ??= (async () => {
      try {
        while (again) {
          const a = againAuto;
          again = false;
          againAuto = true;
          const id = current();
          if (ids.includes(id)) { store.set(LAST_KEY, id); msg = MESSAGES[id] ?? msg; }
          try {
            const page = await build(id);
            if (again) { for (const url of page.blobs) URL.revokeObjectURL(url); continue; }
            await show(page, a);
          } catch (e) {
            if (!again) { console.error(e); toast(`${msg.failed}${e.message || e}`, 0); }
          }
        }
      } finally {
        running = null;
      }
    })();
    return running;
  };

  const original = () => gamePaths.includes(location.pathname) ? location.reload() : location.assign(playUrl);
  window.__d2zh = { reboot, original };
  show(firstPage);
  toast(msg.on, 8000);
}

const FRAME_COUNTER = '<script>{const w=window,r=w.requestAnimationFrame;w.__d2zhFrames=0;'
  + 'w.requestAnimationFrame=function(c){return r.call(w,t=>{if(++w.__d2zhFrames>=10&&w.requestAnimationFrame!==r)w.requestAnimationFrame=r;c(t)})}}</script>';
const LOWRES = '<script>{const w=window,k=`d2zh:lowres`;let o=w,d,on=!1;'
  + 'while(o&&!(d=Object.getOwnPropertyDescriptor(o,`devicePixelRatio`)))o=Object.getPrototypeOf(o);'
  + 'try{on=localStorage.getItem(k)===`1`}catch{}'
  + 'if(d?.get){Object.defineProperty(w,`devicePixelRatio`,{configurable:!0,enumerable:d.enumerable,get(){let r=d.get.call(w);return on?Math.min(r,1):r},set:d.set&&(v=>d.set.call(w,v))});'
  + 'w.__d2zhLowres={get:()=>on,set(v){on=!!v;try{localStorage.setItem(k,on?`1`:`0`)}catch{}}}}}</script>';

function watch(frame, limit = 20000) {
  let seen = 0;
  const timer = setInterval(() => {
    let frames = 0;
    try { frames = frame.contentWindow.__d2zhFrames; } catch {}
    if (!frame.isConnected || frames >= 10) { clearInterval(timer); return; }
    if (document.visibilityState === 'visible' && (seen += 1000) >= limit) { clearInterval(timer); toast(msg.stuck, 0); }
  }, 1000);
}

let statusEl = null;
function showStatus(text) {
  statusEl ??= Object.assign(document.createElement('div'), { id: 'd2zh-status' });
  statusEl.textContent = text;
  statusEl.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:2147483647;padding:8px 14px;border:1px solid #6b5326;border-radius:6px;background:rgba(12,10,8,.92);color:#e8dfcc;font:14px/1.4 "Microsoft JhengHei","Microsoft YaHei","Meiryo","PingFang TC","Hiragino Sans","Noto Sans CJK TC",sans-serif';
  document.body.append(statusEl);
}
function hideStatus() { statusEl?.remove(); }

function hideToast() {
  const el = document.getElementById('d2zh-toast');
  if (el) el.style.opacity = '0';
}

function toast(text, ms = 3500, at = '') {
  let el = document.getElementById('d2zh-toast');
  if (!el) { el = Object.assign(document.createElement('div'), { id: 'd2zh-toast' }); document.body.append(el); }
  el.textContent = text;
  el.dataset.at = at;
  el.style.opacity = '1';
  clearTimeout(toast.timer);
  if (ms) toast.timer = setTimeout(() => { el.style.opacity = '0'; }, ms);
}
