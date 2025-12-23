const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const fs = require('fs');
const path = require('path');

// Carrega as variáveis de ambiente de um arquivo .env na pasta home do usuário
// Isso garante que a chave da API não precisa estar no terminal e funciona com o app empacotado.
require('dotenv').config({ path: path.join(app.getPath('home'), '.notes-s.env') });

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

  globalShortcut.register('CommandOrControl+G', () => {
    mainWindow.webContents.send('trigger-gemini');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

ipcMain.handle('call-gemini-api', async (event, selectedText) => {
  // !! AÇÃO NECESSÁRIA DO USUÁRIO !!
  // Para esta função funcionar, você precisa:
  // 1. Ter uma chave de API para a API do Gemini (Google AI Studio).
  // 2. Armazenar essa chave de forma segura, por exemplo, em variáveis de ambiente.
  //    NÃO coloque a chave diretamente no código.
  // 3. Implementar a lógica de chamada da API aqui.

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const errorMessage = `
---------------------------------
ERRO: Chave da API do Gemini não encontrada.
Configure a variável de ambiente GEMINI_API_KEY para usar esta funcionalidade.
---------------------------------`;
    return errorMessage;
  }

  // Exemplo de como fazer a chamada (requer 'node-fetch' ou similar)
  try {
    const fetch = (await import('node-fetch')).default;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey 
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: selectedText }] }]
      })
    });
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;

    // Retornando uma resposta de exemplo por enquanto
//     return `

// --- RESPOSTA DA API (EXEMPLO) ---
// O texto selecionado foi: "${selectedText}".
// (Implemente a chamada real à API em index.js para ver uma resposta real.)
// ---------------------------------`;

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
