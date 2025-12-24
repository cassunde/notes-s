const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Renderer to Main
  saveFile: (content) => ipcRenderer.send('save-file', content),
  renderMarkdown: (markdown) => ipcRenderer.invoke('render-markdown', markdown),
  openNoteByTitle: (title) => ipcRenderer.send('open-note-by-title', title),
  
  // Main to Renderer
  onFileOpened: (callback) => ipcRenderer.on('file-opened', callback),
  onFileSaved: (callback) => ipcRenderer.on('file-saved', callback),
  onRequestSaveFile: (callback) => ipcRenderer.on('request-save-file', callback),
  onNewFile: (callback) => ipcRenderer.on('new-file', callback),
  onTogglePreview: (callback) => ipcRenderer.on('toggle-preview', callback),
  onTriggerGemini: (callback) => ipcRenderer.on('trigger-gemini', callback),
  onToggleTheme: (callback) => ipcRenderer.on('toggle-theme', callback),

  // Renderer to Main (invokable)
  callGeminiAPI: (text) => ipcRenderer.invoke('call-gemini-api', text)
});
