const { contextBridge, ipcRenderer } = require('electron');
const shell = require('electron').shell;

contextBridge.exposeInMainWorld('api', {
  openSettings: () => ipcRenderer.send('open-settings-window'),
  onThemeChange: (callback) => ipcRenderer.on('theme-changed', (_, theme) => callback(theme)),
  selectImage: () => ipcRenderer.invoke('select-image'),
  exportNote: (note) => ipcRenderer.invoke('export-note', note),
  copyImage: (filePath) => ipcRenderer.invoke('copy-image', filePath),
  copyImageBuffer: (name, arrayBuffer) => ipcRenderer.invoke('copy-image-buffer', { name, data: arrayBuffer }),
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  toggleMaximize: () => ipcRenderer.send('window:maximize'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onWindowMaximized: (callback) => ipcRenderer.on('window-maximized', (_, value) => callback(value)),
  close: () => ipcRenderer.send('window:close'),
  onTransparentToggle: (callback) =>
    ipcRenderer.on('transparent-mode', (_, value) => callback(value)),
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),

  openExternalLink: (url) => ipcRenderer.send('open-link', url),
});
