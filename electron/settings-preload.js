const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),
  setTransparentMode: (value) => ipcRenderer.send('set-transparent', value),

});
