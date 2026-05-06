const { app, BrowserWindow, shell, Menu, clipboard, ipcMain, protocol, session } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

let mainWindow = null;

// `newgen://` is the browser's internal scheme for built-in pages (newgen://home, etc).
// Must be registered before app.whenReady() to opt the scheme into standard-URL,
// secure-context, and fetch-API privileges expected by web content.
protocol.registerSchemesAsPrivileged([
  { scheme: 'newgen', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

const NEWGEN_PAGES = {
  home: 'home.html',
};

function renderInternalPage(slug) {
  const file = NEWGEN_PAGES[slug];
  if (!file) return null;
  const html = fs.readFileSync(path.join(__dirname, file), 'utf8');
  return html
    .replace(/{{CHROMIUM_VERSION}}/g, process.versions.chrome || '')
    .replace(/{{ELECTRON_VERSION}}/g, process.versions.electron || '')
    .replace(/{{NODE_VERSION}}/g, process.versions.node || '')
    .replace(/{{APP_VERSION}}/g, app.getVersion());
}

function sendAction(name, ...args) {
  mainWindow?.webContents.send('action', name, ...args);
}

function fetchSuggestions(q) {
  return new Promise((resolve) => {
    const query = (q || '').trim();
    if (!query) return resolve([]);
    const url = `https://www.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(Array.isArray(parsed?.[1]) ? parsed[1] : []);
        } catch { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(2500, () => { req.destroy(); resolve([]); });
  });
}

function buildAppMenu() {
  const switchTabItems = [];
  for (let i = 1; i <= 9; i++) {
    switchTabItems.push({
      label: `Tab ${i}`,
      accelerator: `CmdOrCtrl+${i}`,
      click: () => sendAction('switch-tab', i - 1),
    });
  }

  return Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { label: 'New Tab',           accelerator: 'CmdOrCtrl+T',       click: () => sendAction('new-tab') },
        { label: 'Reopen Closed Tab', accelerator: 'CmdOrCtrl+Shift+T', click: () => sendAction('reopen-tab') },
        { label: 'Close Tab',         accelerator: 'CmdOrCtrl+W',       click: () => sendAction('close-tab') },
        { label: 'Open Location',     accelerator: 'CmdOrCtrl+L',       click: () => sendAction('open-location') },
        { type: 'separator' },
        { label: 'Print',             accelerator: 'CmdOrCtrl+P',       click: () => sendAction('print') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Find',              accelerator: 'CmdOrCtrl+F',       click: () => sendAction('find') },
        { label: 'Find Next',         accelerator: 'F3',                click: () => sendAction('find-next') },
        { label: 'Find Previous',     accelerator: 'Shift+F3',          click: () => sendAction('find-prev') },
        { label: 'Find Next (G)',     accelerator: 'CmdOrCtrl+G',       click: () => sendAction('find-next') },
        { label: 'Find Previous (G)', accelerator: 'CmdOrCtrl+Shift+G', click: () => sendAction('find-prev') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload',            accelerator: 'F5',                click: () => sendAction('reload') },
        { label: 'Reload (R)',        accelerator: 'CmdOrCtrl+R',       click: () => sendAction('reload') },
        { label: 'Hard Reload',       accelerator: 'CmdOrCtrl+Shift+R', click: () => sendAction('hard-reload') },
        { label: 'Stop',              accelerator: 'Escape',            click: () => sendAction('stop-or-close-find') },
        { type: 'separator' },
        { label: 'Zoom In',           accelerator: 'CmdOrCtrl+=',       click: () => sendAction('zoom-in') },
        { label: 'Zoom In (Plus)',    accelerator: 'CmdOrCtrl+Plus',    click: () => sendAction('zoom-in') },
        { label: 'Zoom Out',          accelerator: 'CmdOrCtrl+-',       click: () => sendAction('zoom-out') },
        { label: 'Reset Zoom',        accelerator: 'CmdOrCtrl+0',       click: () => sendAction('zoom-reset') },
        { type: 'separator' },
        { label: 'View Source',       accelerator: 'CmdOrCtrl+U',       click: () => sendAction('view-source') },
        { label: 'Developer Tools',   accelerator: 'F12',               click: () => sendAction('dev-tools') },
      ],
    },
    {
      label: 'Go',
      submenu: [
        { label: 'Back',    accelerator: 'Alt+Left',  click: () => sendAction('back') },
        { label: 'Forward', accelerator: 'Alt+Right', click: () => sendAction('forward') },
      ],
    },
    {
      label: 'Bookmarks',
      submenu: [
        { label: 'Add Bookmark',   accelerator: 'CmdOrCtrl+D', click: () => sendAction('add-bookmark') },
        { label: 'Show Bookmarks', accelerator: 'CmdOrCtrl+B', click: () => sendAction('show-bookmarks') },
      ],
    },
    {
      label: 'History',
      submenu: [
        { label: 'Show History', accelerator: 'CmdOrCtrl+H', click: () => sendAction('show-history') },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Next Tab',     accelerator: 'Ctrl+Tab',       click: () => sendAction('next-tab') },
        { label: 'Previous Tab', accelerator: 'Ctrl+Shift+Tab', click: () => sendAction('prev-tab') },
        { type: 'separator' },
        ...switchTabItems,
      ],
    },
  ]);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 760,
    minHeight: 500,
    title: 'Newgen Navigator',
    backgroundColor: '#c0c0c0',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile('index.html');
  return win;
}

function buildContextMenu(contents, params) {
  const items = [];

  if (params.linkURL) {
    items.push(
      { label: 'Open Link in New Tab',
        click: () => sendAction('open-in-new-tab', params.linkURL, true) },
      { label: 'Open Link in Background Tab',
        click: () => sendAction('open-in-new-tab', params.linkURL, false) },
      { label: 'Copy Link Address',
        click: () => clipboard.writeText(params.linkURL) },
      { type: 'separator' }
    );
  }
  if (params.hasImageContents && params.srcURL) {
    items.push(
      { label: 'Open Image in New Tab',
        click: () => sendAction('open-in-new-tab', params.srcURL, true) },
      { label: 'Save Image As...',
        click: () => contents.downloadURL(params.srcURL) },
      { label: 'Copy Image Address',
        click: () => clipboard.writeText(params.srcURL) },
      { type: 'separator' }
    );
  }
  if (params.selectionText) {
    const snippet = params.selectionText.length > 30
      ? params.selectionText.slice(0, 30) + '...'
      : params.selectionText;
    items.push(
      { label: `Search the Web for "${snippet}"`,
        click: () => sendAction(
          'open-in-new-tab',
          'https://www.google.com/search?q=' + encodeURIComponent(params.selectionText),
          true) },
      { label: 'Copy', role: 'copy' },
      { type: 'separator' }
    );
  }
  if (params.isEditable) {
    items.push(
      { label: 'Cut', role: 'cut' },
      { label: 'Copy', role: 'copy' },
      { label: 'Paste', role: 'paste' },
      { type: 'separator' }
    );
  }

  items.push(
    { label: 'Back', enabled: contents.canGoBack(), click: () => contents.goBack() },
    { label: 'Forward', enabled: contents.canGoForward(), click: () => contents.goForward() },
    { label: 'Reload', click: () => contents.reload() },
    { type: 'separator' },
    { label: 'View Page Source',
      click: () => sendAction('view-source-url', contents.getURL()) },
    { label: 'Inspect Element',
      click: () => contents.inspectElement(params.x, params.y) }
  );

  return Menu.buildFromTemplate(items);
}

function newgenProtocolHandler(request) {
  const url = new URL(request.url);
  const slug = (url.hostname || '').toLowerCase();
  const html = renderInternalPage(slug);
  if (html === null) {
    return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

app.whenReady().then(() => {
  // Register the handler on the default session (for the chrome window) and on
  // the webview partition session (for tabs). Custom protocols are per-session;
  // registering only the default session leaves tabs without a handler.
  protocol.handle('newgen', newgenProtocolHandler);
  session.fromPartition('persist:newgen').protocol.handle('newgen', newgenProtocolHandler);

  ipcMain.handle('fetch-suggestions', (_e, q) => fetchSuggestions(q));
  Menu.setApplicationMenu(buildAppMenu());
  mainWindow = createWindow();
});

app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url, disposition }) => {
    const inNewTab = ['foreground-tab', 'background-tab', 'new-window'].includes(disposition);
    if (inNewTab) {
      sendAction('open-in-new-tab', url, disposition !== 'background-tab');
      return { action: 'deny' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (contents.getType() === 'webview') {
    contents.on('context-menu', (_e, params) => {
      const menu = buildContextMenu(contents, params);
      menu.popup({ window: mainWindow });
    });
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
