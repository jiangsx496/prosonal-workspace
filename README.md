# 🚀 Personal Workspace — 个人工作台

> 一个全栈自驱的个人生产力工作台，集任务管理、目标追踪、面试复习、专注计时、数据看板于一体。

## ✨ 核心功能

### 📋 任务 & 目标管理
- **今日执行面板**：AI 智能排程、优先级排序、进度追踪
- **目标系统**：目标 → 计划 → 任务三级拆解，进度自动计算
- **收集箱**：自然语言输入「明天下午3点复习Vue面试题」自动解析为结构化任务
- **日历视图**：可视化任务排期，支持拖拽调度

### 📚 面试题库（间隔复习）
- 24+ 前端面试题内置题库，覆盖 JS/CSS/Vue/浏览器原理/网络/性能优化/工程化
- **艾宾浩斯间隔复习算法**：1→1→3→7→14→30 天自动安排复习
- 掌握度标记（新/学习中/熟悉/已掌握）、收藏夹、分类筛选
- AI 每日生成新题，自动入库持续增长
- 首页每日精选 + 一键加入今日计划 / 挂载到目标

### 🍅 沉浸式番茄钟
- 全屏专注模式（SVG 圆形进度环 + 8rem 大字倒计时）
- 自定义专注/短休/长休时长，自动休息切换
- 完成音效（Web Audio API）+ 浏览器通知
- 标签页标题同步倒计时（切到别的 Tab 也能看到剩余时间）

### 📊 数据看板
- 全局统计总览：任务完成率、习惯坚持、专注时长、目标进度、面试题掌握度
- 365 天 GitHub 风格贡献热力图
- 每周趋势柱状图（任务/习惯/专注三维度对比）

### 🎨 更多功能
- **动态激励系统**：6 时段 × 5 情绪基调约 60 条文案，分时段随机展示
- **全局快捷键**：Space 完成任务、F 全屏专注、N 新建、T/R/G 页面切换
- **⌘K 全局搜索**：搜索任务、目标、笔记、习惯、面试题
- **多主题**：浅色/深色/跟随系统/专注深色/暖色护眼
- **PWA 离线可用**：可安装到桌面和手机主屏

## 🛠 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | Vue 3.5 (`<script setup>` + Composition API) |
| 语言 | TypeScript (strict mode) |
| 构建 | Vite 8 + Rollup |
| 状态 | Pinia (模块化 store) |
| 样式 | Tailwind CSS v4 |
| 路由 | Vue Router 4 (懒加载) |
| PWA | vite-plugin-pwa (Workbox) |
| 测试 | Vitest (41 tests) |
| AI | 火山引擎 / OpenAI 兼容 API |

## 📦 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 运行测试
npm test

# 类型检查
npx vue-tsc -b
```

## 🏗 项目架构

```
src/
├── components/     # 可复用组件（FocusScreen, HeatmapWidget, MotivationBanner...）
├── composables/    # 组合式函数（useHotkeys）
├── data/           # 静态数据（面试题库、激励文案库）
├── mock/           # 类型定义 + 初始数据
├── router/         # 路由配置
├── services/       # 业务服务（AI 解析、feed 获取、搜索、调度器...）
├── stores/         # Pinia stores（tasks, goals, focus, interview, motivation...）
├── types/          # TypeScript 类型定义
├── utils/          # 工具函数（日期、音效、间隔复习算法、持久化...）
└── views/          # 页面组件（Execute, Dashboard, InterviewLibrary, Calendar...）
```

## 📐 设计理念

- **纯前端、零后端**：所有数据存储在 localStorage，部署即用，无需服务器
- **离线优先**：PWA + Service Worker，断网也能用
- **响应式**：适配桌面和移动端（md: 断点切换布局）
- **不引入重型依赖**：除 Vue/Pinia/Router 外无额外 UI 库

## 🔧 配置

在设置页面配置 AI API（默认支持火山引擎/OpenAI 兼容接口），即可使用：
- AI 智能任务解析
- 每日面试题自动生成
- 智能计划排程

## 📄 License

MIT
