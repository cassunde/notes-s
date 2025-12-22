const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Renderer to Main
  saveFile: (content) => ipcRenderer.send('save-file', content),
  renderMarkdown: (markdown) => ipcRenderer.invoke('render-markdown', markdown),
  
  // Main to Renderer
  onFileOpened: (callback) => ipcRenderer.on('file-opened', callback),
  onRequestSaveFile: (callback) => ipcRenderer.on('request-save-file', callback),
  onNewFile: (callback) => ipcRenderer.on('new-file', callback),
  onTogglePreview: (callback) => ipcRenderer.on('toggle-preview', callback),
  onTriggerGemini: (callback) => ipcRenderer.on('trigger-gemini', callback),

  // Renderer to Main (invokable)
  callGeminiAPI: (text) => ipcRenderer.invoke('call-gemini-api', text)
});
