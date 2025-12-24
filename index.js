const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const fs = require('fs');
const path = require('path');

// Carrega as variáveis de ambiente de um arquivo .env na pasta home do usuário
// Isso garante que a chave da API não precisa estar no terminal e funciona com o app empacotado.
require('dotenv').config({ path: path.join(app.getPath('home'), '.notes-s.env') });

const { marked } = require('marked');
const hljs = require('highlight.js');

let windows = new Set();


// Prevent multiple instances of the app
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    const filePath = commandLine.find(arg => arg.endsWith('.md'));
    if (filePath) {
      createWindow(filePath);
    } else if (windows.size > 0) {
      const window = windows.values().next().value;
      if (window) {
        if (window.isMinimized()) window.restore();
        window.focus();
      }
    }
  });
}

function openFile(window, filePath) {
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
      console.error('Failed to open file:', err);
      return;
    }
    window.filePath = filePath;
    window.webContents.send('file-opened', { filePath, content: data });
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
  const window = BrowserWindow.fromWebContents(event.sender);
  const save = (filePath) => {
    fs.writeFile(filePath, content, 'utf-8', err => {
      if (err) {
        console.error('Failed to save file:', err);
      } else {
        console.log('File saved successfully:', filePath);
        window.filePath = filePath;
        window.webContents.send('file-saved', filePath);
      }
    });
  };

  if (window.filePath) {
    save(window.filePath);
  } else {
    dialog.showSaveDialog(window, {
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

ipcMain.on('open-note-by-title', (event, title) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  const currentFilePath = window.filePath;

  if (!currentFilePath) {
    dialog.showErrorBox('Cannot Open Note', 'Please save the current file first to establish a directory for related notes.');
    return;
  }

  const currentDir = path.dirname(currentFilePath);
  const targetPath = path.join(currentDir, `${title}.md`);

  if (fs.existsSync(targetPath)) {
    openFile(window, targetPath);
  } else {
    dialog.showMessageBox(window, {
      type: 'question',
      buttons: ['Yes', 'No'],
      title: 'Create Note',
      message: `The note "${title}" does not exist. Would you like to create it?`
    }).then(result => {
      if (result.response === 0) { // 'Yes'
        fs.writeFile(targetPath, '', 'utf-8', (err) => {
          if (err) {
            dialog.showErrorBox('Error Creating File', `Failed to create note: ${err.message}`);
            return;
          }
          openFile(window, targetPath);
        });
      }
    });
  }
});


function createWindow(filePath) {
  const window = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Notes-s'
  });

  window.loadFile('index.html');

  window.webContents.on('did-finish-load', () => {
    if (filePath) {
      openFile(window, filePath);
    }
  });

  window.on('closed', () => {
    windows.delete(window);
  });

  windows.add(window);
  return window;
}

app.whenReady().then(() => {
  const filePathArg = process.argv.find(arg => arg.endsWith('.md'));
  if (filePathArg) {
    createWindow(path.resolve(filePathArg));
  } else {
    createWindow();
  }

  globalShortcut.register('CommandOrControl+S', () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      window.webContents.send('request-save-file');
    }
  });

  globalShortcut.register('CommandOrControl+O', () => {
    dialog.showOpenDialog({
      title: 'Open Markdown File',
      filters: [{ name: 'Markdown Files', extensions: ['md'] }],
      properties: ['openFile']
    }).then(result => {
      if (!result.canceled && result.filePaths.length > 0) {
        createWindow(result.filePaths[0]);
      }
    });
  });

  globalShortcut.register('CommandOrControl+N', () => {
    createWindow();
  });

  globalShortcut.register('CommandOrControl+P', () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      window.webContents.send('toggle-preview');
    }
  });

  globalShortcut.register('CommandOrControl+G', () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      window.webContents.send('trigger-gemini');
    }
  });

  app.on('activate', () => {
    if (windows.size === 0) {
      createWindow();
    }
  });
});

ipcMain.handle('call-gemini-api', async (event, selectedText) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const errorMessage = `
---------------------------------
ERRO: Chave da API do Gemini não encontrada.
Configure a variável de ambiente GEMINI_API_KEY para usar esta funcionalidade.
---------------------------------`;
    return errorMessage;
  }

  try {
    const fetch = (await import('node-fetch')).default;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

    const youtubeUrlRegex = /(https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[\w-]+)/;
    const youtubeUrlMatch = selectedText.match(youtubeUrlRegex);

    let parts = [{ text: selectedText }];

    if (youtubeUrlMatch) {
      const youtubeUrl = youtubeUrlMatch[0];
      parts.push({
        file_data: {
          file_uri: youtubeUrl
        }
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: parts }]
      })
    });
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;

  } catch (error) {
    console.error('Erro ao chamar a API do Gemini:', error);
    return 'Erro ao processar a requisição para a API do Gemini.';
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
