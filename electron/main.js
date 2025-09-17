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
  mainWindow.webContents.send('theme-changed', theme);
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
