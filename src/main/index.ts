import { app, BrowserWindow, shell } from 'electron'
import path from 'path'
import { initDb } from './store/db'
import { registerIpcHandlers } from './ipc'

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // Open external links in OS browser, not Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    let csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'"
    // Vite HMR uses ws://localhost:<port> in dev mode — allow it
    const devUrl = process.env.ELECTRON_RENDERER_URL
    if (devUrl) {
      const { port } = new URL(devUrl)
      csp += ` ws://localhost:${port}`
    }
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    })
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  const userDataPath = app.getPath('userData')
  initDb(`${userDataPath}/conversations.db`)

  const win = createWindow()
  registerIpcHandlers(win)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
