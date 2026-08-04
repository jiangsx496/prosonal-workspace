import { watch, isRef, type WatchSource } from 'vue'

/**
 * 深监听 + 防抖持久化到 localStorage（默认 300ms）。
 * 避免每次小改动都全量 JSON.stringify 写盘（高频操作如任务勾选、专注计时）。
 * 同时触发云端同步推送（如果已登录）。
 *
 * 双向：同时监听 storage 事件——云端同步（mergeRemoteData 写入 localStorage
 * 并派发 StorageEvent）或跨标签页写入时，重新 hydrate store，保证页面即时更新。
 */
export function watchPersist<T>(source: WatchSource<T>, key: string, delay = 300): void {
  let timer: ReturnType<typeof setTimeout> | null = null
  watch(source, (val) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(val))
      // 触发云端同步（延迟导入避免循环依赖）
      import('@/composables/useSync').then(({ schedulePush }) => {
        schedulePush()
      }).catch(() => {})
    }, delay)
  }, { deep: true })

  // 外部写入（云端同步 / 其他标签页）→ 重新 hydrate
  // node 测试环境无 window，跳过监听
  if (typeof window === 'undefined') return
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key !== key) return
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return
      const parsed = JSON.parse(raw)
      if (isRef(source)) {
        ;(source as { value: T }).value = parsed
      }
    } catch {
      // JSON 解析失败则跳过（数据未就绪）
    }
  })
}
