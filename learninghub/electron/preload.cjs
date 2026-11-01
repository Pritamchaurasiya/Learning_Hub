const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isElectron: true,
  platform: process.platform,
  getInfo: () => ipcRenderer.invoke('desktop:get-info'),
  minimize: () => ipcRenderer.invoke('desktop:window-action', 'minimize'),
  maximize: () => ipcRenderer.invoke('desktop:window-action', 'maximize'),
  close: () => ipcRenderer.invoke('desktop:window-action', 'close'),
  toggleFullscreen: () => ipcRenderer.invoke('desktop:window-action', 'toggle-fullscreen'),
  notify: (payload) => ipcRenderer.invoke('desktop:notify', payload),
  saveOfflineData: (key, data) => ipcRenderer.invoke('desktop:offline-save', { key, data }),
  loadOfflineData: (key) => ipcRenderer.invoke('desktop:offline-load', { key }),
  listOfflineData: () => ipcRenderer.invoke('desktop:offline-list'),
  onNavigate: (callback) => {
    const handler = (_event, route) => {
      if (typeof callback === 'function') callback(route);
    };
    ipcRenderer.on('desktop:navigate', handler);
    return () => ipcRenderer.removeListener('desktop:navigate', handler);
  }
});
