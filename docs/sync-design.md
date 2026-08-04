# Personal Workspace 跨设备同步——技术选型与实现计划

> **Status: PENDING**

## 需求

在手机端和电脑端之间实时同步数据（目标、任务、习惯等），保持 local-first 架构（离线可用）。

## 技术选型

| 维度 | 选择 | 理由 |
|------|------|------|
| 后端框架 | Express + better-sqlite3 | 轻量、Node 生态成熟、SQLite 单文件零运维 |
| 数据库 | SQLite | 个人应用无需 PostgreSQL，一个 .db 文件=全部数据，备份=复制文件 |
| 认证 | JWT (email + password) | 简单可靠，个人应用不需要 OAuth |
| 同步策略 | Local-first + 推拉同步 | localStorage 为主存储，云端做增量同步，离线照常可用 |
| 冲突解决 | Last-write-wins (updated_at) | 个人单用户场景冲突极少，简单优先 |
| 部署 | VPS + PM2 + Nginx 反向代理 | 用户自有服务器，数据完全自控 |

**放弃 Supabase/Firebase 的原因**：Supabase 免费档 7 天不活跃自动 pause；Firebase 锁定 Google 生态。自有 VPS 无此限制，数据主权完全在用户。

## 数据架构

### 现有 localStorage key → SQLite 表映射

```
pw-tasks       → tasks        (有 goalId 外键)
pw-goals       → goals        (有 plan JSON)
pw-habits      → habits       (有 completedDates JSON)
pw-daily       → daily_plans  (有 taskIds JSON)
pw-plans       → plans
pw-notes       → notes
pw-journal     → journals
pw-inbox       → inbox_items
pw-projects    → projects
pw-reminders   → reminders
pw-imports     → imports
pw-focus       → focus_sessions
pw-interview-* → interview_progress + interview_custom
pw-feed-*      → 不同步（每日刷新的缓存数据）
```

### SQLite Schema 核心设计

```sql
-- 每张表统一加 user_id + updated_at + deleted 软删除标记
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'backlog',
  priority TEXT DEFAULT 'medium',
  goal_id TEXT,
  scheduled_date TEXT,
  due_date TEXT,
  -- ... 其他字段
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted INTEGER DEFAULT 0
);

-- 类似结构适用于 goals / habits / notes / journals / ...
```

## API 设计

```
POST   /api/auth/register     注册
POST   /api/auth/login        登录 → 返回 JWT token

GET    /api/sync/pull         拉取自上次同步后的变更 (?since=ISO8601)
POST   /api/sync/push         推送本地变更（批量 upsert）
GET    /api/sync/status       检查服务端最新 updated_at
```

同步 API 是通用的——不按表拆分，前端把所有变更打包一次性推/拉，服务端按表分发。

### Push 请求体示例

```json
{
  "changes": {
    "tasks": [{ "id": "t1", "title": "新任务", "updated_at": "2025-01-01T00:00:00Z", ... }],
    "goals": [{ "id": "g1", "title": "新目标", "updated_at": "2025-01-01T00:00:00Z", ... }]
  }
}
```

### Pull 响应体示例

```json
{
  "tasks": [{ "id": "t1", "title": "...", "updated_at": "...", "deleted": 0 }],
  "goals": [...],
  "serverTime": "2025-01-01T12:00:00Z"
}
```

## 同步引擎设计

```
┌─────────────────────────────────────────────────────┐
│ Frontend (Vue + Pinia)                              │
│                                                     │
│  ┌──────────┐   ┌──────────────┐   ┌─────────────┐ │
│  │ Pinia     │   │ watchPersist │   │ syncEngine  │ │
│  │ Stores    │──→│ (localStorage)│   │ (推/拉合并) │ │
│  │ (14个)    │   │              │   │             │ │
│  └──────────┘   └──────────────┘   └──────┬──────┘ │
│       │                                   │        │
│       └──────────── merge ────────────────┘        │
│                                            │        │
└────────────────────────────────────────────┼────────┘
                                             │ HTTPS
                                             ▼
┌─────────────────────────────────────────────────────┐
│ Backend (Express + SQLite)                          │
│                                                     │
│  POST /api/sync/push ──→ upsert by id + updated_at  │
│  GET  /api/sync/pull ──→ SELECT WHERE updated_at > ?│
│  POST /api/auth/*    ──→ JWT 签发/验证              │
│                                                     │
│  better-sqlite3 ──→ workspace.db (单文件)           │
└─────────────────────────────────────────────────────┘
```

### 同步时机

1. **应用启动时**：pull → 合并到本地 → 更新 UI
2. **本地变更后**：防抖 2s → push
3. **页面重新可见**（visibilitychange）：pull + push
4. **手动触发**：Settings 页加「立即同步」按钮

### 冲突处理

Last-write-wins：比较 `updated_at`，新的覆盖旧的。个人单用户跨设备场景下，真正冲突的概率极低（需要两台设备同时编辑同一条记录）。

## 项目结构

```
personal-workspace/
├── src/                        # 前端（现有）
│   ├── services/
│   │   ├── sync.ts             # 新增：同步引擎
│   │   ├── auth.ts             # 新增：认证
│   │   └── api.ts              # 新增：HTTP 客户端
│   ├── composables/
│   │   └── useSync.ts          # 新增：同步状态 composable
│   └── views/
│       └── Settings.vue        # 修改：加同步设置区
│
├── server/                     # 新增：后端
│   ├── index.ts                # Express 入口
│   ├── db.ts                   # better-sqlite3 初始化 + schema
│   ├── routes/
│   │   ├── auth.ts             # 注册/登录
│   │   └── sync.ts             # 推/拉同步
│   ├── middleware/
│   │   └── auth.ts             # JWT 验证中间件
│   ├── package.json            # 后端独立依赖
│   └── ecosystem.config.cjs    # PM2 配置
│
└── .env.example                # 环境变量模板
```

## 实现波次

### Wave 1: 后端骨架 + 认证（独立可测）
- server/ Express 项目初始化
- SQLite schema + better-sqlite3 连接
- JWT 认证（register + login）
- 单元测试：注册/登录/token 验证

### Wave 2: 同步 API（push/pull）
- 通用 push/pull 路由
- 14 张表的 upsert/select 逻辑
- 软删除支持
- 集成测试：push → pull 数据一致性

### Wave 3: 前端同步引擎
- src/services/api.ts（fetch 封装）
- src/services/auth.ts（登录/注册/token 管理）
- src/services/sync.ts（推/拉/合并引擎）
- src/composables/useSync.ts（同步状态 + 自动触发）

### Wave 4: Store 集成 + UI
- 每个 store 加 updated_at 字段
- persist.ts 扩展为同时触发同步
- Settings 页加登录/同步状态 UI
- 端到端测试

### Wave 5: 部署
- Nginx 反向代理配置
- PM2 进程管理
- HTTPS（Let's Encrypt）
- 部署文档
