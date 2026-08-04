import { supabase } from './supabase'

/**
 * 同步引擎 —— Local-first 架构
 *
 * localStorage 是主存储（离线可用），Supabase 做跨设备同步。
 * 策略：push 推送本地变更，pull 拉取远端变更，last-write-wins 解决冲突。
 */

// 13 张同步表（不含 feed 缓存）
const SYNC_TABLES = [
  'tasks', 'goals', 'habits', 'daily_plans', 'plans',
  'notes', 'journals', 'inbox_items', 'projects',
  'reminders', 'focus_sessions', 'interview_progress', 'interview_custom',
] as const

export type SyncTableName = (typeof SYNC_TABLES)[number]

export interface SyncStatus {
  syncing: boolean
  lastSync: string | null
  error: string | null
}

type SyncListener = (status: SyncStatus) => void

let currentStatus: SyncStatus = { syncing: false, lastSync: null, error: null }
const listeners = new Set<SyncListener>()

function setStatus(partial: Partial<SyncStatus>) {
  currentStatus = { ...currentStatus, ...partial }
  listeners.forEach((fn) => fn(currentStatus))
}

export function subscribeSyncStatus(fn: SyncListener): () => void {
  listeners.add(fn)
  fn(currentStatus)
  return () => listeners.delete(fn)
}

/**
 * 推送：把本地 localStorage 的全部数据推到 Supabase
 * 每个表做 upsert（有则更新，无则插入），以 id 为主键
 */
export async function pushAll(localData: Record<string, any[]>, userId: string) {
  if (!supabase || !userId) return
  setStatus({ syncing: true, error: null })

  try {
    for (const table of SYNC_TABLES) {
      const rows = localData[table]
      if (!rows || rows.length === 0) continue

      // 每行加上 user_id + updated_at，data 字段存完整 JSON
      const payload = rows.map((row) => ({
        id: row.id,
        user_id: userId,
        data: row,
        updated_at: row.updatedAt || new Date().toISOString(),
      }))

      // 批量 upsert（每次最多 500 行，Supabase 限制）
      for (let i = 0; i < payload.length; i += 400) {
        const batch = payload.slice(i, i + 400)
        const { error } = await supabase
          .from(table)
          .upsert(batch, { onConflict: 'id' })
        if (error) throw error
      }
    }

    setStatus({ syncing: false, lastSync: new Date().toISOString() })
  } catch (e: any) {
    setStatus({ syncing: false, error: e.message })
  }
}

/**
 * 拉取：从 Supabase 拉取用户全部数据，合并到本地
 * 合并策略：以 updated_at 比较，新的覆盖旧的
 */
export async function pullAll(
  userId: string,
  mergeFn: (table: SyncTableName, remoteRows: any[]) => void
) {
  if (!supabase || !userId) return
  setStatus({ syncing: true, error: null })

  try {
    for (const table of SYNC_TABLES) {
      const { data, error } = await supabase
        .from(table)
        .select('data, updated_at')
        .eq('user_id', userId)

      if (error) throw error
      if (data && data.length > 0) {
        const rows = data.map((row: any) => ({
          ...row.data,
          updatedAt: row.updated_at,
        }))
        mergeFn(table, rows)
      }
    }

    setStatus({ syncing: false, lastSync: new Date().toISOString() })
  } catch (e: any) {
    setStatus({ syncing: false, error: e.message })
  }
}

/**
 * 收集所有 localStorage 数据用于推送
 */
export function collectLocalData(): Record<string, any[]> {
  const result: Record<string, any[]> = {}
  const keyMap: Record<string, string> = {
    'pw-tasks': 'tasks',
    'pw-goals': 'goals',
    'pw-habits': 'habits',
    'pw-daily': 'daily_plans',
    'pw-plans': 'plans',
    'pw-notes': 'notes',
    'pw-journal': 'journals',
    'pw-inbox': 'inbox_items',
    'pw-projects': 'projects',
    'pw-reminders': 'reminders',
    'pw-focus': 'focus_sessions',
    'pw-interview-progress': 'interview_progress',
    'pw-interview-custom': 'interview_custom',
  }

  for (const [lsKey, table] of Object.entries(keyMap)) {
    try {
      const raw = localStorage.getItem(lsKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        result[table] = Array.isArray(parsed) ? parsed : []
      }
    } catch {
      // skip
    }
  }

  // interview_progress 是对象字典（questionId → progress），非数组，
  // 转成 upsert 可用的数组（id = questionId）
  try {
    const rawProgress = localStorage.getItem('pw-interview-progress')
    if (rawProgress) {
      const parsed = JSON.parse(rawProgress)
      result['interview_progress'] = Object.entries(parsed).map(([questionId, progress]) => ({
        id: questionId,
        ...(progress as object),
      }))
    }
  } catch {
    // skip
  }

  return result
}
