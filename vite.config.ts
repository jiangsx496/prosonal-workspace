/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  // 相对路径：Electron 以 file:// 协议加载 dist 必需；对 Vercel/GitHub Pages 部署同样兼容
  base: './',
  test: {
    environment: 'node',
    exclude: ['node_modules/**', 'dist/**', '.rivet/**'],
  },
  server: {
    watch: {
      // .rivet/ 是运行时工具数据目录（presence/knowledge 等持续写入），
      // 不在 watch 范围内，避免每次写入都触发 full-reload 导致页面刷新循环
      ignored: ['**/.rivet/**'],
    },
  },
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Personal Workspace',
        short_name: 'Workspace',
        description: '我的个人工作台',
        theme_color: '#f8fafc',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'any',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
