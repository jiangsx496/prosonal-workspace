// 一次性工具：生成桌面应用图标 build/icon.png
// 风格与侧边栏 logo 一致：渐变紫底（#a855f7 → #7e14ff）+ 白色闪电（favicon 同形）
// canvas 绘制 SVG 保留渐变与形状，1024×1024 方形（macOS 自动加圆角遮罩）
const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const OUT = path.join(__dirname, '..', 'build', 'icon.png')

// 闪电 path 来自 public/favicon.svg（48×46 viewBox），居中放大到内容区 ~57%
const LIGHTNING_PATH =
  'M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z'

// macOS Big Sur+ 图标规范：内容区为居中 squircle（864×864，圆角 185），四周留透明边距，
// 避免满幅背景在桌面上显得比其他应用图标大
const scale = 480 / 48 // 闪电宽 480px，占内容区 ~56%
const tx = 512 - (48 * scale) / 2
const ty = 512 - (46 * scale) / 2

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a855f7"/><stop offset="1" stop-color="#7e14ff"/></linearGradient></defs>
<rect x="80" y="80" width="864" height="864" rx="185" fill="url(#bg)"/>
<g transform="translate(${tx} ${ty}) scale(${scale})"><path d="${LIGHTNING_PATH}" fill="#ffffff"/></g>
</svg>`
const svgDataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')

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
