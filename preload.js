const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('newgen', {
  onOpenInNewTab: (cb) => ipcRenderer.on('open-in-new-tab', (_e, url, focus) => cb(url, focus)),
  onViewSource: (cb) => ipcRenderer.on('view-source', (_e, url) => cb(url)),
});
