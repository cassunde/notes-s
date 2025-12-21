const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const hljs = require('highlight.js');

// Configure marked to use highlight.js
marked.setOptions({
  highlight: function(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
});

let mainWindow;
let currentFilePath = null;

// Get file path from command line arguments
const filePathArg = process.argv.find(arg => arg.endsWith('.md'));
if (filePathArg) {
  currentFilePath = path.resolve(filePathArg);
}

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Notes-s'
  });

  mainWindow.loadFile('index.html');
  // mainWindow.webContents.openDevTools();

  mainWindow.webContents.on('did-finish-load', () => {
    if (currentFilePath) {
      fs.readFile(currentFilePath, 'utf-8', (err, data) => {
        if (err) {
          console.error('Failed to open file from argument:', err);
          return;
        }
        mainWindow.webContents.send('file-opened', { filePath: currentFilePath, content: data });
      });
    }
  });

  ipcMain.handle('render-markdown', (event, markdown) => {
    return marked(markdown);
  });

  // Handle saving file content
  ipcMain.on('save-file', (event, content) => {
    const save = (filePath) => {
      fs.writeFile(filePath, content, 'utf-8', err => {
        if (err) {
          console.error('Failed to save file:', err);
        } else {
          console.log('File saved successfully:', filePath);
          currentFilePath = filePath; // Update current file path
        }
      });
    };

    if (currentFilePath) {
      save(currentFilePath);
    } else {
      dialog.showSaveDialog(mainWindow, {
        title: 'Save Markdown File',
        defaultPath: 'untitled.md',
        filters: [{ name: 'Markdown Files', extensions: ['md'] }]
      }).then(result => {
        if (!result.canceled && result.filePath) {
          save(result.filePath);
        }
      });
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  globalShortcut.register('CommandOrControl+S', () => {
    mainWindow.webContents.send('request-save-file');
  });

  globalShortcut.register('CommandOrControl+O', () => {
    dialog.showOpenDialog(mainWindow, {
      title: 'Open Markdown File',
      filters: [{ name: 'Markdown Files', extensions: ['md'] }],
      properties: ['openFile']
    }).then(result => {
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        fs.readFile(filePath, 'utf-8', (err, data) => {
          if (err) {
            console.error('Failed to open file:', err);
            return;
          }
          currentFilePath = filePath; // Store the path of the newly opened file
          mainWindow.webContents.send('file-opened', { filePath, content: data });
        });
      }
    });
  });

  globalShortcut.register('CommandOrControl+N', () => {
    currentFilePath = null; // Reset the current file path
    mainWindow.webContents.send('new-file');
  });

  globalShortcut.register('CommandOrControl+P', () => {
    mainWindow.webContents.send('toggle-preview');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
