const { contextBridge, ipcRenderer } = require('electron');
const shell = require('electron').shell;

contextBridge.exposeInMainWorld('api', {
  openSettings: () => ipcRenderer.send('open-settings-window'),
  onThemeChange: (callback) => ipcRenderer.on('theme-changed', (_, theme) => callback(theme)),
  selectImage: () => ipcRenderer.invoke('select-image'),
  exportNote: (note) => ipcRenderer.invoke('export-note', note),
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  onTransparentToggle: (callback) =>
    ipcRenderer.on('transparent-mode', (_, value) => callback(value)),
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),

  openExternalLink: (url) => ipcRenderer.send('open-link', url),
});
