const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const hljs = require('highlight.js');

let mainWindow;
let currentFilePath = null;

// Prevent multiple instances of the app
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // Handle file opening from second instance
      const filePath = commandLine.find(arg => arg.endsWith('.md'));
      if (filePath) {
        openFile(filePath);
      }
    }
  });
}

function openFile(filePath) {
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
      console.error('Failed to open file:', err);
      return;
    }
    currentFilePath = filePath;
    mainWindow.webContents.send('file-opened', { filePath, content: data });
  });
}

// Register IPC handlers once, outside of createWindow
ipcMain.handle('render-markdown', (event, markdown) => {
  return marked(markdown, {
    highlight: function(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  });
});

ipcMain.on('save-file', (event, content) => {
  const save = (filePath) => {
    fs.writeFile(filePath, content, 'utf-8', err => {
      if (err) {
        console.error('Failed to save file:', err);
      } else {
        console.log('File saved successfully:', filePath);
        currentFilePath = filePath;
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

  mainWindow.webContents.on('did-finish-load', () => {
    const filePathArg = process.argv.find(arg => arg.endsWith('.md'));
    if (filePathArg) {
      openFile(path.resolve(filePathArg));
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
        openFile(result.filePaths[0]);
      }
    });
  });

  globalShortcut.register('CommandOrControl+N', () => {
    currentFilePath = null;
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
