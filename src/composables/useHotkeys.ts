import { onMounted, onUnmounted } from 'vue'
import type { Router } from 'vue-router'

/**
 * 全局快捷键系统（F5）
 *
 * 事件约定：F/N/Space// 键通过 window CustomEvent 通知组件，
 * 组件端用 `window.addEventListener('hotkey-xxx', handler)` 监听：
 *   - hotkey-toggle-first  Space  完成/取消完成第一个未完成任务
 *   - hotkey-focus         F      打开全屏专注
 *   - hotkey-new-task      N      新建任务弹窗
 *   - hotkey-search        /      聚焦搜索（等同 ⌘K）
 * T/R/G 直接由本 composable 路由跳转（无需组件接线）。
 *
 * 例外：⌘K（Sidebar 已处理）与 Esc（各 Modal 自行处理）不在此拦截；
 * 焦点在 input/textarea/contenteditable 时跳过，避免输入字符被劫持。
 */

export type HotkeyAction = 'toggle-first' | 'focus' | 'new-task' | 'search'

export function dispatchHotkey(action: HotkeyAction) {
  window.dispatchEvent(new CustomEvent(`hotkey-${action}`))
}

/** 焦点是否在可输入区域（input/textarea/contenteditable） */
function isTypingTarget(el: Element | null): boolean {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true
  return (el as HTMLElement).isContentEditable === true
}

export function useHotkeys(router: Router) {
  function onKeydown(e: KeyboardEvent) {
    // ⌘K / Ctrl+K 由 Sidebar 处理（输入框内也响应），此处放行
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') return

    // 焦点在输入区时跳过（⌘K 与 Esc 除外——本映射不注册两者）
    if (isTypingTarget(document.activeElement)) return

    const key = e.key.toLowerCase()
    switch (key) {
      case ' ':
        // 按钮聚焦时 Space 默认激活按钮（如「开始专注」），跳过避免双重触发
        if (document.activeElement?.tagName === 'BUTTON') return
        e.preventDefault()
        dispatchHotkey('toggle-first')
        break
      case 'f':
        dispatchHotkey('focus')
        break
      case 'n':
        dispatchHotkey('new-task')
        break
      case '/':
        e.preventDefault()
        dispatchHotkey('search')
        break
      case 't':
        router.push({ name: 'execute' })
        break
      case 'r':
        router.push({ name: 'review' })
        break
      case 'g':
        router.push({ name: 'goals' })
        break
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))
}
