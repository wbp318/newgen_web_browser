const $ = (id) => document.getElementById(id);

const tabsEl       = $('tabs');
const newTabBtn    = $('newtab-btn');
const contentEl    = $('content');
const urlInput     = $('url');
const goBtn        = $('go-btn');
const back         = $('back');
const forward      = $('forward');
const reload       = $('reload');
const stop         = $('stop');
const home         = $('home');
const search       = $('search');
const printBtn     = $('print');
const status       = $('status');
const throbber     = $('throbber');
const lock         = $('lock');
const progressBar  = $('progress-bar');
const findbar      = $('findbar');
const findInput    = $('find-input');
const findCount    = $('find-count');
const findPrev     = $('find-prev');
const findNext     = $('find-next');
const findClose    = $('find-close');
const bookmarksList = $('bookmarks-list');
const historyList   = $('history-list');
const ddBookmarks   = $('dd-bookmarks-list');
const ddHistory     = $('dd-history-list');
const bookmarksPanel = $('bookmarks-panel');
const historyPanel   = $('history-panel');
const bookmarkTab    = $('bookmark-tab');

const HOME_URL = new URL('home.html', location.href).toString();
const HISTORY_LIMIT = 500;

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, m =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

const load = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const persist = (key, v) => {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
};

/* ===== Bookmarks ===== */
const bookmarks = {
  items: load('bookmarks', []),
  has(url) { return this.items.some(b => b.url === url); },
  add(url, title) {
    if (!url || this.has(url)) return;
    this.items.push({ url, title: title || url, addedAt: Date.now() });
    persist('bookmarks', this.items);
    renderBookmarks();
  },
  remove(url) {
    this.items = this.items.filter(b => b.url !== url);
    persist('bookmarks', this.items);
    renderBookmarks();
  },
};

/* ===== History ===== */
const history = {
  items: load('history', []),
  add(url, title) {
    if (!url || /^(about:|file:|view-source:|data:)/i.test(url)) return;
    const last = this.items[this.items.length - 1];
    if (last && last.url === url) {
      last.title = title || last.title;
      last.visitedAt = Date.now();
    } else {
      this.items.push({ url, title: title || url, visitedAt: Date.now() });
    }
    if (this.items.length > HISTORY_LIMIT) {
      this.items = this.items.slice(-HISTORY_LIMIT);
    }
    persist('history', this.items);
    renderHistory();
  },
  clear() { this.items = []; persist('history', this.items); renderHistory(); },
};

/* ===== URL helpers ===== */
const looksLikeUrl = (s) =>
  /^[\w-]+(\.[\w-]+)+([:/?#].*)?$/.test(s) || /^localhost(:\d+)?/i.test(s);

function navigate(input) {
  const raw = (input || '').trim();
  if (!raw) return;
  let url = raw;
  if (/^(about|file|view-source|chrome|data):/i.test(url)) {
    // pass through
  } else if (!/^https?:\/\//i.test(url)) {
    url = looksLikeUrl(url)
      ? 'https://' + url
      : 'https://duckduckgo.com/?q=' + encodeURIComponent(url);
  }
  const t = tabs.current();
  if (t) t.webview.loadURL(url);
}

/* ===== Tabs ===== */
const tabs = {
  list: [],
  activeId: null,
  nextId: 1,

  create(url, focus = true) {
    const id = this.nextId++;
    const wv = document.createElement('webview');
    wv.setAttribute('allowpopups', '');
    wv.setAttribute('partition', 'persist:newgen');
    contentEl.appendChild(wv);

    const tab = {
      id, title: 'New Tab',
      url: url || HOME_URL,
      webview: wv,
      isLoading: false,
    };
    this.list.push(tab);
    this._wireWebview(tab);
    wv.src = tab.url;
    if (focus) this.switchTo(id);
    else this._renderStrip();
    return tab;
  },

  close(id) {
    const idx = this.list.findIndex(t => t.id === id);
    if (idx === -1) return;
    const tab = this.list[idx];
    tab.webview.remove();
    this.list.splice(idx, 1);
    if (this.list.length === 0) {
      this.create(HOME_URL);
      return;
    }
    if (this.activeId === id) {
      const next = this.list[Math.min(idx, this.list.length - 1)];
      this.switchTo(next.id);
    } else {
      this._renderStrip();
    }
  },

  switchTo(id) {
    const tab = this.list.find(t => t.id === id);
    if (!tab) return;
    this.activeId = id;
    this.list.forEach(t => t.webview.classList.toggle('active', t.id === id));
    this._renderStrip();
    this._syncChrome(tab);
  },

  current() { return this.list.find(t => t.id === this.activeId) || null; },

  next() {
    const i = this.list.findIndex(t => t.id === this.activeId);
    if (i === -1) return;
    this.switchTo(this.list[(i + 1) % this.list.length].id);
  },
  prev() {
    const i = this.list.findIndex(t => t.id === this.activeId);
    if (i === -1) return;
    this.switchTo(this.list[(i - 1 + this.list.length) % this.list.length].id);
  },

  _wireWebview(tab) {
    const wv = tab.webview;
    const isActive = () => tab.id === this.activeId;

    wv.addEventListener('dom-ready', () => { if (isActive()) updateNavButtons(); });

    wv.addEventListener('did-start-loading', () => {
      tab.isLoading = true;
      this._renderStrip();
      if (isActive()) {
        throbber.classList.add('loading');
        startProgress();
        setStatus('Connecting...');
      }
    });

    wv.addEventListener('did-stop-loading', () => {
      tab.isLoading = false;
      this._renderStrip();
      if (isActive()) {
        throbber.classList.remove('loading');
        endProgress();
        setStatus('Document: Done.');
        updateNavButtons();
      }
    });

    wv.addEventListener('did-navigate', (e) => {
      tab.url = e.url;
      history.add(e.url, tab.title);
      if (isActive()) {
        urlInput.value = e.url;
        updateLock(e.url);
        updateNavButtons();
        updateBookmarkButton();
      }
    });

    wv.addEventListener('did-navigate-in-page', (e) => {
      tab.url = e.url;
      if (isActive()) {
        urlInput.value = e.url;
        updateLock(e.url);
        updateBookmarkButton();
      }
    });

    wv.addEventListener('page-title-updated', (e) => {
      tab.title = e.title;
      this._renderStrip();
      const last = history.items[history.items.length - 1];
      if (last && last.url === tab.url) {
        last.title = e.title;
        persist('history', history.items);
      }
      if (isActive()) {
        document.title = (e.title ? e.title + ' - ' : '') + 'Newgen Navigator';
      }
    });

    wv.addEventListener('update-target-url', (e) => {
      if (isActive()) setStatus(e.url || 'Document: Done.');
    });

    wv.addEventListener('did-fail-load', (e) => {
      if (e.errorCode === -3) return;
      if (isActive()) {
        setStatus('Error: ' + e.errorDescription);
        endProgress();
        throbber.classList.remove('loading');
      }
    });

    wv.addEventListener('found-in-page', (e) => {
      if (!isActive()) return;
      const r = e.result;
      findCount.textContent = r.matches ? `${r.activeMatchOrdinal} of ${r.matches}` : 'No matches';
    });
  },

  _syncChrome(tab) {
    urlInput.value = tab.url === HOME_URL ? '' : tab.url;
    updateLock(tab.url);
    updateNavButtons();
    updateBookmarkButton();
    document.title = (tab.title ? tab.title + ' - ' : '') + 'Newgen Navigator';
    throbber.classList.toggle('loading', tab.isLoading);
    setStatus(tab.isLoading ? 'Connecting...' : 'Document: Done.');
  },

  _renderStrip() {
    tabsEl.innerHTML = '';
    this.list.forEach(t => {
      const el = document.createElement('div');
      el.className = 'tab' + (t.id === this.activeId ? ' active' : '');
      el.dataset.tabId = t.id;
      const icon = t.isLoading ? '⌛' : (t.url === HOME_URL ? '★' : '🌐');
      const title = t.title || (t.url === HOME_URL ? 'Welcome' : 'New Tab');
      el.innerHTML = `
        <span class="tab-favicon">${icon}</span>
        <span class="tab-title">${escapeHtml(title)}</span>
        <button class="tab-close" title="Close">×</button>
      `;
      el.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('tab-close')) return;
        if (e.button === 1) { e.preventDefault(); this.close(t.id); }
        else if (e.button === 0) { this.switchTo(t.id); }
      });
      el.querySelector('.tab-close').addEventListener('click', (e) => {
        e.stopPropagation();
        this.close(t.id);
      });
      tabsEl.appendChild(el);
    });
  },
};

/* ===== UI helpers ===== */
function setStatus(msg) { status.textContent = msg; }

function updateNavButtons() {
  const t = tabs.current(); if (!t) return;
  back.disabled = !t.webview.canGoBack();
  forward.disabled = !t.webview.canGoForward();
}

function updateLock(url) {
  const secure = /^https:/i.test(url || '');
  lock.title = secure ? 'Connection encrypted (https)' : 'Connection unsecured';
  lock.classList.toggle('secure', secure);
}

function updateBookmarkButton() {
  const t = tabs.current(); if (!t) return;
  bookmarkTab.classList.toggle('active-bookmark', bookmarks.has(t.url));
}

let progressTimer = null;
function startProgress() {
  let p = 6;
  progressBar.style.width = p + '%';
  clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    p = Math.min(p + Math.random() * 7 + 1, 90);
    progressBar.style.width = p + '%';
  }, 240);
}
function endProgress() {
  clearInterval(progressTimer);
  progressTimer = null;
  progressBar.style.width = '100%';
  setTimeout(() => { progressBar.style.width = '0%'; }, 320);
}

/* ===== Find ===== */
const find = {
  open() {
    findbar.hidden = false;
    findInput.focus();
    findInput.select();
  },
  close() {
    findbar.hidden = true;
    const t = tabs.current();
    if (t) t.webview.stopFindInPage('clearSelection');
    findCount.textContent = '';
  },
  search(text, opts = {}) {
    const t = tabs.current(); if (!t) return;
    if (!text) {
      t.webview.stopFindInPage('clearSelection');
      findCount.textContent = '';
      return;
    }
    t.webview.findInPage(text, {
      forward: opts.forward !== false,
      findNext: opts.findNext || false,
    });
  },
};

findInput.addEventListener('input', (e) => find.search(e.target.value));
findInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    find.search(findInput.value, { forward: !e.shiftKey, findNext: true });
  } else if (e.key === 'Escape') {
    e.preventDefault();
    find.close();
  }
});
findPrev.addEventListener('click', () => find.search(findInput.value, { forward: false, findNext: true }));
findNext.addEventListener('click', () => find.search(findInput.value, { forward: true, findNext: true }));
findClose.addEventListener('click', () => find.close());

/* ===== Zoom ===== */
function zoom(delta) {
  const t = tabs.current(); if (!t) return;
  const cur = t.webview.getZoomLevel();
  t.webview.setZoomLevel(cur + delta);
}
function zoomReset() { tabs.current()?.webview.setZoomLevel(0); }

/* ===== Panels rendering ===== */
function renderBookmarks() {
  bookmarksList.innerHTML = '';
  if (bookmarks.items.length === 0) {
    const li = document.createElement('li');
    li.className = 'panel-empty';
    li.textContent = 'No bookmarks yet — press Ctrl+D on any page.';
    bookmarksList.appendChild(li);
  } else {
    bookmarks.items.forEach(b => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="item-link" title="${escapeHtml(b.url)}">${escapeHtml(b.title)}</span>
        <button class="item-del" title="Remove">×</button>
      `;
      li.querySelector('.item-link').addEventListener('click', () => navigate(b.url));
      li.querySelector('.item-del').addEventListener('click', () => bookmarks.remove(b.url));
      bookmarksList.appendChild(li);
    });
  }
  ddBookmarks.innerHTML = '';
  if (bookmarks.items.length === 0) {
    const li = document.createElement('li');
    li.className = 'dd-empty';
    li.textContent = 'No bookmarks';
    ddBookmarks.appendChild(li);
  } else {
    bookmarks.items.slice().reverse().slice(0, 20).forEach(b => {
      const li = document.createElement('li');
      li.className = 'dd-item';
      li.innerHTML = `<span>${escapeHtml(b.title)}</span>`;
      li.addEventListener('click', () => { navigate(b.url); menus.hide(); });
      ddBookmarks.appendChild(li);
    });
  }
  updateBookmarkButton();
}

function renderHistory() {
  historyList.innerHTML = '';
  if (history.items.length === 0) {
    const li = document.createElement('li');
    li.className = 'panel-empty';
    li.textContent = 'No history yet.';
    historyList.appendChild(li);
  } else {
    history.items.slice().reverse().forEach(h => {
      const li = document.createElement('li');
      const ts = new Date(h.visitedAt).toLocaleString();
      li.innerHTML = `
        <span class="item-link" title="${escapeHtml(h.url)}">${escapeHtml(h.title)}</span>
        <span class="item-time">${ts}</span>
      `;
      li.querySelector('.item-link').addEventListener('click', () => navigate(h.url));
      historyList.appendChild(li);
    });
  }
  ddHistory.innerHTML = '';
  if (history.items.length === 0) {
    const li = document.createElement('li');
    li.className = 'dd-empty';
    li.textContent = 'No history';
    ddHistory.appendChild(li);
  } else {
    history.items.slice().reverse().slice(0, 20).forEach(h => {
      const li = document.createElement('li');
      li.className = 'dd-item';
      li.innerHTML = `<span>${escapeHtml(h.title)}</span>`;
      li.addEventListener('click', () => { navigate(h.url); menus.hide(); });
      ddHistory.appendChild(li);
    });
  }
}

/* ===== Menus ===== */
const menus = {
  current: null,
  show(name) {
    this.hide();
    const dd = document.getElementById('menu-' + name);
    const anchor = document.querySelector(`.menu-item[data-menu="${name}"]`);
    if (!dd || !anchor) return;
    const r = anchor.getBoundingClientRect();
    dd.style.left = r.left + 'px';
    dd.style.top = r.bottom + 'px';
    dd.classList.add('show');
    anchor.classList.add('active');
    this.current = name;
  },
  hide() {
    if (!this.current) return;
    document.getElementById('menu-' + this.current)?.classList.remove('show');
    document.querySelector(`.menu-item[data-menu="${this.current}"]`)?.classList.remove('active');
    this.current = null;
  },
  toggle(name) { this.current === name ? this.hide() : this.show(name); },
};

document.querySelectorAll('.menu-item[data-menu]').forEach(item => {
  const name = item.dataset.menu;
  item.addEventListener('click', (e) => { e.stopPropagation(); menus.toggle(name); });
  item.addEventListener('mouseenter', () => {
    if (menus.current && menus.current !== name) menus.show(name);
  });
});

/* Close menus on outside click */
document.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown') && !e.target.closest('.menu-item[data-menu]')) {
    menus.hide();
  }
});

/* ===== Floating panel drag + close ===== */
document.querySelectorAll('.floating-panel').forEach(panel => {
  const titlebar = panel.querySelector('.panel-titlebar');
  let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
  titlebar.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('panel-close')) return;
    dragging = true;
    sx = e.clientX; sy = e.clientY;
    const r = panel.getBoundingClientRect();
    ox = r.left; oy = r.top;
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    panel.style.left = Math.max(0, ox + e.clientX - sx) + 'px';
    panel.style.top = Math.max(0, oy + e.clientY - sy) + 'px';
  });
  document.addEventListener('mouseup', () => { dragging = false; });
});
document.querySelectorAll('.panel-close').forEach(btn => {
  btn.addEventListener('click', () => {
    const p = document.getElementById(btn.dataset.panel);
    if (p) p.hidden = true;
  });
});

/* ===== Action dispatcher ===== */
const actions = {
  'new-tab':       () => tabs.create(HOME_URL),
  'open-location': () => urlInput.focus(),
  'close-tab':     () => tabs.close(tabs.activeId),
  'print':         () => tabs.current()?.webview.print({}),
  'quit':          () => window.close(),
  'cut':           () => tabs.current()?.webview.cut(),
  'copy':          () => tabs.current()?.webview.copy(),
  'paste':         () => tabs.current()?.webview.paste(),
  'select-all':    () => tabs.current()?.webview.selectAll(),
  'find':          () => find.open(),
  'reload':        () => tabs.current()?.webview.reload(),
  'stop':          () => tabs.current()?.webview.stop(),
  'zoom-in':       () => zoom(0.5),
  'zoom-out':      () => zoom(-0.5),
  'zoom-reset':    () => zoomReset(),
  'view-source':   () => { const t = tabs.current(); if (t) tabs.create('view-source:' + t.url); },
  'dev-tools':     () => tabs.current()?.webview.openDevTools(),
  'back':          () => { const t = tabs.current(); if (t && t.webview.canGoBack()) t.webview.goBack(); },
  'forward':       () => { const t = tabs.current(); if (t && t.webview.canGoForward()) t.webview.goForward(); },
  'home':          () => navigate(HOME_URL),
  'add-bookmark':  () => { const t = tabs.current(); if (t) bookmarks.add(t.url, t.title); },
  'show-bookmarks':() => { bookmarksPanel.hidden = false; },
  'show-history':  () => { historyPanel.hidden = false; },
  'clear-history': () => { if (confirm('Clear all browsing history?')) history.clear(); },
  'next-tab':      () => tabs.next(),
  'prev-tab':      () => tabs.prev(),
  'about':         () => alert('Newgen Navigator v0.1\nA modern browser with classic Netscape-era chrome.\n\nBuilt with Electron.'),
};

document.addEventListener('click', (e) => {
  const item = e.target.closest('[data-action]');
  if (!item) return;
  const fn = actions[item.dataset.action];
  if (fn) { fn(); menus.hide(); }
});

/* ===== Toolbar wiring ===== */
back.addEventListener('click',     () => actions.back());
forward.addEventListener('click',  () => actions.forward());
reload.addEventListener('click',   () => actions.reload());
stop.addEventListener('click',     () => actions.stop());
home.addEventListener('click',     () => actions.home());
search.addEventListener('click',   () => actions.home());
printBtn.addEventListener('click', () => actions.print());
goBtn.addEventListener('click',    () => navigate(urlInput.value));
newTabBtn.addEventListener('click',() => tabs.create(HOME_URL));
bookmarkTab.addEventListener('click', () => {
  bookmarksPanel.hidden = !bookmarksPanel.hidden;
});

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); navigate(urlInput.value); }
});
urlInput.addEventListener('focus', () => urlInput.select());

/* ===== Global keyboard shortcuts ===== */
window.addEventListener('keydown', (e) => {
  const ctrl = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();

  // Tabs
  if (ctrl && k === 't')                           { e.preventDefault(); tabs.create(HOME_URL); }
  else if (ctrl && k === 'w')                      { e.preventDefault(); tabs.close(tabs.activeId); }
  else if (ctrl && e.key === 'Tab')                { e.preventDefault(); e.shiftKey ? tabs.prev() : tabs.next(); }
  else if (ctrl && /^[1-9]$/.test(e.key)) {
    e.preventDefault();
    const idx = parseInt(e.key, 10) - 1;
    if (tabs.list[idx]) tabs.switchTo(tabs.list[idx].id);
  }
  // Navigation
  else if (e.key === 'F5' || (ctrl && k === 'r'))  { e.preventDefault(); actions.reload(); }
  else if (e.key === 'Escape') {
    if (!findbar.hidden) find.close();
    else { menus.hide(); actions.stop(); }
  }
  else if (e.altKey && e.key === 'ArrowLeft')      { e.preventDefault(); actions.back(); }
  else if (e.altKey && e.key === 'ArrowRight')     { e.preventDefault(); actions.forward(); }
  else if (ctrl && k === 'l')                      { e.preventDefault(); urlInput.focus(); }
  else if (ctrl && k === 'p')                      { e.preventDefault(); actions.print(); }
  // Find
  else if (ctrl && k === 'f')                      { e.preventDefault(); find.open(); }
  else if (e.key === 'F3' || (ctrl && k === 'g'))  {
    e.preventDefault();
    find.search(findInput.value, { forward: !e.shiftKey, findNext: true });
  }
  // Zoom
  else if (ctrl && (e.key === '+' || e.key === '=')) { e.preventDefault(); zoom(0.5); }
  else if (ctrl && e.key === '-')                  { e.preventDefault(); zoom(-0.5); }
  else if (ctrl && e.key === '0')                  { e.preventDefault(); zoomReset(); }
  // Bookmarks / history
  else if (ctrl && k === 'd')                      { e.preventDefault(); actions['add-bookmark'](); }
  else if (ctrl && k === 'b')                      { e.preventDefault(); bookmarksPanel.hidden = false; }
  else if (ctrl && k === 'h')                      { e.preventDefault(); historyPanel.hidden = false; }
  // Dev / source
  else if (e.key === 'F12')                        { e.preventDefault(); actions['dev-tools'](); }
  else if (ctrl && k === 'u')                      { e.preventDefault(); actions['view-source'](); }
});

/* ===== IPC from main (popups, context menu actions) ===== */
if (window.newgen) {
  window.newgen.onOpenInNewTab((url, focus) => tabs.create(url, focus));
  window.newgen.onViewSource((url) => tabs.create('view-source:' + url));
}

/* ===== Init ===== */
renderBookmarks();
renderHistory();
tabs.create(HOME_URL);
