const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),
});
