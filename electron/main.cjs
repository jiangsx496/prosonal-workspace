// Electron 主进程 — 加载 Vite 构建产物（dist/），离线桌面应用
// 使用 CommonJS（.cjs）：与 package.json 的 "type": "module" 隔离，避免 ESM 加载坑
const { app, BrowserWindow, protocol, net } = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

// app:// 自定义协议：ES module 脚本在 file:// 下会被 CORS 拦截（origin null），
// 必须用标准 scheme 加载 dist，Vue 应用才能挂载
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
])

const DIST_ROOT = path.join(__dirname, '..', 'dist')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 380,
    minHeight: 600,
    title: 'Personal Workspace',
    backgroundColor: '#f8fafc',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.loadURL('app://./index.html')
}

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const url = new URL(request.url)
    let relPath = decodeURIComponent(url.pathname)
    if (relPath === '/' || relPath === '') relPath = '/index.html'
    // 防路径逃逸：只允许 dist/ 内文件
    const filePath = path.resolve(DIST_ROOT, '.' + relPath)
    if (filePath !== DIST_ROOT && !filePath.startsWith(DIST_ROOT + path.sep)) {
      return new Response('Not Found', { status: 404 })
    }
    return net.fetch(pathToFileURL(filePath).toString())
  })
  createWindow()
  // macOS 惯例：点击 Dock 图标且无窗口时重新创建
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
