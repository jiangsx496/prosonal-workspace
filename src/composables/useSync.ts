import { ref, onMounted, onUnmounted } from 'vue'
import { subscribeSyncStatus, pushAll, pullAll, collectLocalData, type SyncTableName, type SyncStatus } from '@/services/sync'
import { getSession } from '@/services/auth'
import { mergeRemoteData } from '@/utils/mergeRemote'

const status = ref<SyncStatus>({ syncing: false, lastSync: null, error: null })
let unsub: (() => void) | null = null
let pushTimer: ReturnType<typeof setTimeout> | null = null

/** 防抖推送：本地变更后 3 秒推一次 */
export function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(async () => {
    const { userId } = await getSession()
    if (!userId) return
    const localData = collectLocalData()
    await pushAll(localData, userId)
  }, 3000)
}

/** 手动同步：先拉后推 */
export async function syncNow() {
  const { userId } = await getSession()
  if (!userId) return
  await pullAll(userId, (table, rows) => {
    mergeRemoteData(table as SyncTableName, rows)
  })
  const localData = collectLocalData()
  await pushAll(localData, userId)
}

export function useSync() {
  onMounted(async () => {
    unsub = subscribeSyncStatus((s) => { status.value = s })
    // 启动时自动拉取一次
    const { userId } = await getSession()
    if (userId) {
      await pullAll(userId, (table, rows) => {
        mergeRemoteData(table as SyncTableName, rows)
      })
    }
    // 页面重新可见时同步
    document.addEventListener('visibilitychange', onVisible)
  })

  onUnmounted(() => {
    unsub?.()
    document.removeEventListener('visibilitychange', onVisible)
  })

  return { status, syncNow, schedulePush }
}

function onVisible() {
  if (document.visibilityState === 'visible') syncNow()
}
