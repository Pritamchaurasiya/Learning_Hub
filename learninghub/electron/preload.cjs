const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isElectron: true,
  platform: process.platform,
  getInfo: () => ipcRenderer.invoke('desktop:get-info'),
  minimize: () => ipcRenderer.invoke('desktop:window-action', 'minimize'),
  maximize: () => ipcRenderer.invoke('desktop:window-action', 'maximize'),
  close: () => ipcRenderer.invoke('desktop:window-action', 'close')
});
