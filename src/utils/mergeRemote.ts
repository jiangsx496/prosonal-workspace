import type { SyncTableName } from '@/services/sync'

/**
 * 把远端拉取的数据合并回 localStorage
 * 策略：以 updatedAt 比较，新的覆盖旧的
 */
export function mergeRemoteData(table: SyncTableName, remoteRows: any[]) {
  if (remoteRows.length === 0) return

  // 远端表名 → localStorage key
  const tableToKey: Record<string, string> = {
    tasks: 'pw-tasks',
    goals: 'pw-goals',
    habits: 'pw-habits',
    daily_plans: 'pw-daily',
    plans: 'pw-plans',
    notes: 'pw-notes',
    journals: 'pw-journal',
    inbox_items: 'pw-inbox',
    projects: 'pw-projects',
    reminders: 'pw-reminders',
    focus_sessions: 'pw-focus',
    interview_progress: 'pw-interview-progress',
    interview_custom: 'pw-interview-custom',
  }

  const lsKey = tableToKey[table]
  if (!lsKey) return

  try {
    const localRaw = localStorage.getItem(lsKey)
    const localRows: any[] = localRaw ? JSON.parse(localRaw) : []

    // 构建 id → row 索引
    const merged = new Map<string, any>()
    for (const row of localRows) {
      merged.set(row.id, row)
    }

    // 用远端数据覆盖（以 updatedAt 判断谁更新）
    for (const remote of remoteRows) {
      const local = merged.get(remote.id)
      if (!local) {
        // 本地没有，直接加
        merged.set(remote.id, remote)
      } else {
        // 比较时间戳
        const localTime = local.updatedAt || local.created_at || ''
        const remoteTime = remote.updatedAt || remote.created_at || ''
        if (remoteTime >= localTime) {
          merged.set(remote.id, remote)
        }
      }
    }

    localStorage.setItem(lsKey, JSON.stringify(Array.from(merged.values())))
    // 触发其他 tab 更新（BroadcastChannel 不可用时用 storage 事件）
    window.dispatchEvent(new StorageEvent('storage', { key: lsKey }))
  } catch {
    // JSON 解析失败则跳过
  }
}
