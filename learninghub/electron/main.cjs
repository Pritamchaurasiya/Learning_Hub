const { app, BrowserWindow, shell, ipcMain, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const http = require('http');

// Enforce single instance lock for Windows Desktop Application
const gotTheLock = app.requestSingleInstanceLock();
let mainWindow = null;

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
          click: () => mainWindow?.loadURL('http://localhost:3000/dashboard')
        },
        {
          label: 'Courses',
          accelerator: 'CmdOrCtrl+2',
          click: () => mainWindow?.loadURL('http://localhost:3000/courses')
        },
        {
          label: 'Mentorship',
          accelerator: 'CmdOrCtrl+3',
          click: () => mainWindow?.loadURL('http://localhost:3000/mentorship')
        },
        {
          label: 'Peer Review',
          accelerator: 'CmdOrCtrl+4',
          click: () => mainWindow?.loadURL('http://localhost:3000/peer-review')
        },
        {
          label: 'Study Groups',
          accelerator: 'CmdOrCtrl+5',
          click: () => mainWindow?.loadURL('http://localhost:3000/study-groups')
        },
        {
          label: 'Notes Studio',
          accelerator: 'CmdOrCtrl+6',
          click: () => mainWindow?.loadURL('http://localhost:3000/notes')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Support & FAQs',
          click: () => mainWindow?.loadURL('http://localhost:3000/support')
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

function createWindow() {
  mainWindow = new BrowserWindow({
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
      // If dev server not yet responding, try loading built index.html or retry
      const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
      mainWindow.loadFile(distIndex).catch(() => {
        setTimeout(() => mainWindow.loadURL(targetUrl), 2000);
      });
    });
  } else {
    // Check if localhost:3000 is running (e.g. unified desktop runner) or load static dist
    checkPort(3000, (isLive) => {
      if (isLive) {
        mainWindow.loadURL(targetUrl);
      } else {
        const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
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
  }
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
