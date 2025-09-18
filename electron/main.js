const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let settingsWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1800,
    height: 1000,
    frame: false, // 🔥 pencere çerçevesini kapatır
    transparent: true, // 🔥 arka planı şeffaf yapar
    backgroundColor: '#00000000', // 🪟 Windows için tam şeffaf
    vibrancy: 'fullscreen-ui', // macOS
    backgroundMaterial: 'acrylic', // Windows 11
    visualEffectState: 'active',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // geliştirirken gerekli, production'da kapat
    },
  });

  mainWindow.loadURL('http://localhost:5173');
}

function createSettingsWindow() {
  settingsWindow = new BrowserWindow({
    width: 510,
    height: 560,
    frame: false, // 🔥 pencere çerçevesini kapatır
    transparent: true, // 🔥 arka planı şeffaf yapar
    backgroundColor: '#00000000', // 🪟 Windows için tam şeffaf
    vibrancy: 'fullscreen-ui', // macOS
    backgroundMaterial: 'acrylic', // Windows 11
    visualEffectState: 'active',
    parent: mainWindow,
    modal: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'settings-preload.js'),
    },
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));
}

// IPC: Ayarlar penceresi açma
ipcMain.on('open-settings-window', () => {
  if (!settingsWindow) {
    createSettingsWindow();
    settingsWindow.on('closed', () => {
      settingsWindow = null;
    });
  } else {
    settingsWindow.focus();
  }
});

// IPC: Tema değiştirme
ipcMain.on('set-theme', (event, theme) => {
  if (mainWindow) {
    mainWindow.webContents.send('theme-changed', theme);
  }
  if (settingsWindow) {
    settingsWindow.webContents.send('theme-changed', theme);
  }
});

// ✅ IPC: Resim seçme ve public klasörüne kopyalama
ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif', 'jpeg', 'svg'] }]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const fileName = path.basename(filePath);

  // images klasörü: React Vite public klasörünün içi olacak
  const publicImagesPath = path.join(__dirname, '..', 'public', 'user-images');

  if (!fs.existsSync(publicImagesPath)) {
    fs.mkdirSync(publicImagesPath, { recursive: true });
  }

  const destPath = path.join(publicImagesPath, fileName);
  fs.copyFileSync(filePath, destPath);

  // React tarafında erişilebilecek URI'yi döndür
  return `/user-images/${fileName}`;
});

ipcMain.handle('export-note', async (event, { title, content }) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Notu Dışa Aktar (.md)',
    defaultPath: `${title}.md`,
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  });

  if (canceled || !filePath) return false;

  const finalContent = `# ${title}\n\n${content}`;
  fs.writeFileSync(filePath, finalContent, 'utf8');
  return true;
});

// ✅ IPC: Dışarıdan sürüklenen görseli kopyala ve erişim URI'si döndür
ipcMain.handle('copy-image', async (event, filePath) => {
  try {
    if (!filePath) return null;
    const publicImagesPath = path.join(__dirname, '..', 'public', 'user-images');
    if (!fs.existsSync(publicImagesPath)) {
      fs.mkdirSync(publicImagesPath, { recursive: true });
    }
    const ext = path.extname(filePath) || '';
    const base = path.basename(filePath, ext);
    let fileName = `${base}${ext}`;
    let destPath = path.join(publicImagesPath, fileName);
    if (fs.existsSync(destPath)) {
      const stamp = Date.now();
      fileName = `${base}-${stamp}${ext}`;
      destPath = path.join(publicImagesPath, fileName);
    }
    fs.copyFileSync(filePath, destPath);
    return `/user-images/${fileName}`;
  } catch (err) {
    console.error('copy-image error:', err);
    return null;
  }
});

// ✅ IPC: Resim baytlarını al ve user-images klasörüne yaz (path olmadan)
ipcMain.handle('copy-image-buffer', async (event, payload) => {
  try {
    if (!payload || !payload.name || !payload.data) return null;
    const { name, data } = payload;
    const publicImagesPath = path.join(__dirname, '..', 'public', 'user-images');
    if (!fs.existsSync(publicImagesPath)) {
      fs.mkdirSync(publicImagesPath, { recursive: true });
    }
    const ext = path.extname(name) || '';
    const base = path.basename(name, ext);
    let fileName = `${base}${ext}`;
    let destPath = path.join(publicImagesPath, fileName);
    if (fs.existsSync(destPath)) {
      const stamp = Date.now();
      fileName = `${base}-${stamp}${ext}`;
      destPath = path.join(publicImagesPath, fileName);
    }
    const buffer = Buffer.from(new Uint8Array(data));
    fs.writeFileSync(destPath, buffer);
    return `/user-images/${fileName}`;
  } catch (err) {
    console.error('copy-image-buffer error:', err);
    return null;
  }
});

ipcMain.on('window:minimize', () => mainWindow.minimize());
ipcMain.on('window:maximize', () => {
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window:close', () => mainWindow.close());

ipcMain.on('set-transparent', (event, value) => {
  mainWindow.webContents.send('transparent-mode', value);
});

ipcMain.on('open-link', (event, url) => {
  if (url && url.startsWith('http')) {
    shell.openExternal(url).catch(err => {
      console.error('🔴 shell.openExternal error:', err);
    });
  } else {
    console.warn('Geçersiz link:', url);
  }
});

// ✅ IPC: Settings penceresini kapatma
ipcMain.on('close-settings-window', () => {
  if (settingsWindow) {
    settingsWindow.close();
  }
});

app.whenReady().then(() => {
  createMainWindow();
});
