const { app, BrowserWindow, shell, Menu, clipboard } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 760,
    minHeight: 500,
    title: 'Newgen Navigator',
    backgroundColor: '#c0c0c0',
    autoHideMenuBar: true,
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
        click: () => mainWindow?.webContents.send('open-in-new-tab', params.linkURL, true) },
      { label: 'Open Link in Background Tab',
        click: () => mainWindow?.webContents.send('open-in-new-tab', params.linkURL, false) },
      { label: 'Copy Link Address',
        click: () => clipboard.writeText(params.linkURL) },
      { type: 'separator' }
    );
  }
  if (params.hasImageContents && params.srcURL) {
    items.push(
      { label: 'Open Image in New Tab',
        click: () => mainWindow?.webContents.send('open-in-new-tab', params.srcURL, true) },
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
        click: () => mainWindow?.webContents.send(
          'open-in-new-tab',
          'https://duckduckgo.com/?q=' + encodeURIComponent(params.selectionText),
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
      click: () => mainWindow?.webContents.send('view-source', contents.getURL()) },
    { label: 'Inspect Element',
      click: () => contents.inspectElement(params.x, params.y) }
  );

  return Menu.buildFromTemplate(items);
}

app.whenReady().then(() => {
  mainWindow = createWindow();
});

app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url, disposition }) => {
    const inNewTab = ['foreground-tab', 'background-tab', 'new-window'].includes(disposition);
    if (inNewTab) {
      mainWindow?.webContents.send('open-in-new-tab', url, disposition !== 'background-tab');
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
