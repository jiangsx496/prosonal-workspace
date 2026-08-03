import { watch, type WatchSource } from 'vue'

/**
 * 深监听 + 防抖持久化到 localStorage（默认 300ms）。
 * 避免每次小改动都全量 JSON.stringify 写盘（高频操作如任务勾选、专注计时）。
 */
export function watchPersist<T>(source: WatchSource<T>, key: string, delay = 300): void {
  let timer: ReturnType<typeof setTimeout> | null = null
  watch(source, (val) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(val))
    }, delay)
  }, { deep: true })
}
