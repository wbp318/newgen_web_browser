const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('newgen', {
  onAction: (cb) => ipcRenderer.on('action', (_e, name, ...args) => cb(name, ...args)),
  fetchSuggestions: (q) => ipcRenderer.invoke('fetch-suggestions', q),
});
