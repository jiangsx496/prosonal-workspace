// 一次性工具：把 public/favicon.svg 渲染成透明背景的高清 PNG（build/icon.png）
// qlmanage 转换会填白底；capturePage 在 transparent+offscreen 下返回黑底。
// canvas 绘制 SVG 天然保留透明通道，最可靠
const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const OUT = path.join(__dirname, '..', 'build', 'icon.png')
const svgDataUrl =
  'data:image/svg+xml;base64,' +
  fs.readFileSync(path.join(__dirname, '..', 'public', 'favicon.svg')).toString('base64')

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    webPreferences: { offscreen: true },
  })
  await win.loadURL('about:blank')
  const dataUrl = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const img = new Image()
      img.onerror = (e) => resolve('ERROR:' + e.message)
      img.onload = () => {
        const c = document.createElement('canvas')
        c.width = 1024
        c.height = 1024
        const ctx = c.getContext('2d')
        ctx.clearRect(0, 0, 1024, 1024)
        ctx.drawImage(img, 0, 0, 1024, 1024)
        resolve(c.toDataURL('image/png'))
      }
      img.src = ${JSON.stringify(svgDataUrl)}
    })
  `)
  fs.writeFileSync(OUT, Buffer.from(dataUrl.split(',')[1], 'base64'))
  console.log('saved', OUT)
  app.quit()
})
