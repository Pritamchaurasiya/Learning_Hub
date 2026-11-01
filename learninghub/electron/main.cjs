const { app, BrowserWindow, shell, ipcMain, Menu, Tray, nativeImage, Notification } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Enforce single instance lock for Windows Desktop Application
const gotTheLock = app.requestSingleInstanceLock();
let mainWindow = null;
let appTray = null;

const OFFLINE_VAULT_DIR = path.join(app.getPath('userData'), 'offline_vault');
if (!fs.existsSync(OFFLINE_VAULT_DIR)) {
  try {
    fs.mkdirSync(OFFLINE_VAULT_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create offline vault directory:', err);
  }
}

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);
}

function checkPort(port, callback) {
  const req = http.get(`http://localhost:${port}/`, (res) => {
    callback(true);
  });
  req.on('error', () => {
    callback(false);
  });
  req.setTimeout(1000, () => {
    req.destroy();
    callback(false);
  });
}

function navigateTo(route) {
  if (!mainWindow) return;
  mainWindow.webContents.send('desktop:navigate', route);
}

function createMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Reload App',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          }
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (mainWindow) mainWindow.webContents.reloadIgnoringCache();
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    },
    {
      label: 'Navigation',
      submenu: [
        {
          label: 'Dashboard',
          accelerator: 'CmdOrCtrl+1',
          click: () => navigateTo('/dashboard')
        },
        {
          label: 'Courses',
          accelerator: 'CmdOrCtrl+2',
          click: () => navigateTo('/courses')
        },
        {
          label: 'Mentorship',
          accelerator: 'CmdOrCtrl+3',
          click: () => navigateTo('/mentorship')
        },
        {
          label: 'Peer Review',
          accelerator: 'CmdOrCtrl+4',
          click: () => navigateTo('/peer-review')
        },
        {
          label: 'Study Groups',
          accelerator: 'CmdOrCtrl+5',
          click: () => navigateTo('/study-groups')
        },
        {
          label: 'Notes Studio',
          accelerator: 'CmdOrCtrl+6',
          click: () => navigateTo('/notes')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Support & FAQs',
          click: () => navigateTo('/support')
        },
        {
          label: 'About LearningHub Desktop',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About LearningHub',
              message: 'LearningHub Native Windows Desktop Application',
              detail: `Version: 1.0.0\nRuntime: Electron + Chromium\nFrontend: React 18 + TypeScript\nPlatform: Windows Native (x64)\nReplacing: Flutter/Dart (Fully Decoupled)`
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createTray(iconPath) {
  if (appTray) return;
  try {
    let trayIcon = null;
    if (iconPath && fs.existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath);
    } else {
      // Fallback 16x16 transparent image if no icon is on disk
      trayIcon = nativeImage.createEmpty();
    }

    appTray = new Tray(trayIcon);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open LearningHub',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: 'Toggle Fullscreen',
        click: () => {
          if (mainWindow) {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);
    appTray.setToolTip('LearningHub Desktop Application');
    appTray.setContextMenu(contextMenu);
    appTray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.focus();
        } else {
          mainWindow.show();
        }
      }
    });
  } catch (err) {
    console.error('Failed to initialize system tray:', err);
  }
}

function createWindow() {
  const iconPathPng = path.join(__dirname, '..', 'public', 'app-icon.png');
  const iconPathIco = path.join(__dirname, '..', 'public', 'favicon.ico');
  const windowIcon = fs.existsSync(iconPathPng) ? iconPathPng : (fs.existsSync(iconPathIco) ? iconPathIco : undefined);

  mainWindow = new BrowserWindow({
    icon: windowIcon,
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    title: 'LearningHub - Enterprise Learning & Mentorship Platform',
    backgroundColor: '#0F172A',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: true
    }
  });

  createMenu();

  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
  const targetUrl = process.env.DESKTOP_URL || 'http://localhost:3000';

  if (isDev) {
    mainWindow.loadURL(targetUrl).catch(() => {
      const distIndex = fs.existsSync(path.join(app.getAppPath(), 'dist', 'index.html'))
        ? path.join(app.getAppPath(), 'dist', 'index.html')
        : path.join(__dirname, '..', 'dist', 'index.html');
      mainWindow.loadFile(distIndex).catch(() => {
        setTimeout(() => mainWindow.loadURL(targetUrl), 2000);
      });
    });
  } else {
    checkPort(3000, (isLive) => {
      if (isLive) {
        mainWindow.loadURL(targetUrl);
      } else {
        const distIndex = fs.existsSync(path.join(app.getAppPath(), 'dist', 'index.html'))
          ? path.join(app.getAppPath(), 'dist', 'index.html')
          : path.join(__dirname, '..', 'dist', 'index.html');
        mainWindow.loadFile(distIndex).catch((err) => {
          console.error('Failed to load local build, fallback to localhost:3000', err);
          mainWindow.loadURL(targetUrl);
        });
      }
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    createTray(windowIcon);
  });

  // Handle external navigation securely: open external links in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('desktop:get-info', () => {
  return {
    isDesktop: true,
    platform: process.platform,
    arch: process.arch,
    version: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node
  };
});

ipcMain.handle('desktop:window-action', (event, action) => {
  if (!mainWindow) return;
  switch (action) {
    case 'minimize':
      mainWindow.minimize();
      break;
    case 'maximize':
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
      break;
    case 'close':
      mainWindow.close();
      break;
    case 'toggle-fullscreen':
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      break;
  }
});

// Native Desktop Notifications
ipcMain.handle('desktop:notify', (event, { title, body }) => {
  if (Notification && Notification.isSupported()) {
    new Notification({
      title: title || 'LearningHub Desktop',
      body: body || '',
      silent: false
    }).show();
    return { success: true };
  }
  return { success: false, reason: 'unsupported' };
});

// Offline Secure Vault Storage Handlers
ipcMain.handle('desktop:offline-save', async (event, { key, data }) => {
  if (!key || typeof key !== 'string') throw new Error('Invalid storage key');
  const safeKey = path.basename(key).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const filePath = path.join(OFFLINE_VAULT_DIR, `${safeKey}.json`);
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  return { success: true, key: safeKey };
});

ipcMain.handle('desktop:offline-load', async (event, { key }) => {
  if (!key || typeof key !== 'string') throw new Error('Invalid storage key');
  const safeKey = path.basename(key).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const filePath = path.join(OFFLINE_VAULT_DIR, `${safeKey}.json`);
  if (!fs.existsSync(filePath)) return null;
  const raw = await fs.promises.readFile(filePath, 'utf8');
  return JSON.parse(raw);
});

ipcMain.handle('desktop:offline-list', async () => {
  if (!fs.existsSync(OFFLINE_VAULT_DIR)) return [];
  const files = await fs.promises.readdir(OFFLINE_VAULT_DIR);
  return files.filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, ''));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
