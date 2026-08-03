// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Goals from '@/views/Goals.vue'

// 最小路由表：Goals 列表 + GoalDetail stub
const routes = [
  { path: '/goals', name: 'goals', component: Goals },
  { path: '/goals/:id', name: 'goal-detail', component: { template: '<div>detail stub</div>' } },
]

describe('Goals.vue 删除按钮交互', () => {
  let router: ReturnType<typeof createRouter>

  beforeEach(async () => {
    setActivePinia(createPinia())
    router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/goals')
    await router.isReady()
  })

  it('点击卡片 ✕：弹删除确认框，且不导航到详情页', async () => {
    const wrapper = mount(Goals, {
      global: { plugins: [router] },
      attachTo: document.body,
    })
    await wrapper.vm.$nextTick()

    const delBtn = wrapper.find('button[title="删除"]')
    expect(delBtn.exists()).toBe(true)

    await delBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // 弹窗应出现（Teleport 到 body）
    const modal = document.body.querySelector('.fixed.inset-0')
    expect(modal, '点击 ✕ 后应弹出删除确认框').toBeTruthy()
    expect(modal!.textContent).toContain('删除目标')

    // 不应导航到详情页
    expect(router.currentRoute.value.path).toBe('/goals')
    expect(router.currentRoute.value.path).not.toMatch(/^\/goals\//)

    wrapper.unmount()
  })

  it('删除按钮 @click.prevent 取消 a 标签默认导航（防回归：否则点击会整页跳进详情页）', async () => {
    const wrapper = mount(Goals, {
      global: { plugins: [router] },
      attachTo: document.body,
    })
    await wrapper.vm.$nextTick()

    const link = wrapper.find('a')
    const delBtn = link.find('button[title="删除"]')
    let seen: Event | null = null
    // 同元素监听：Vue 的 @click.prevent.stop 先注册先执行（preventDefault + stopPropagation），
    // 本监听器后执行——能观察到 defaultPrevented 且事件未冒泡到 a 标签
    delBtn.element.addEventListener('click', (e) => { seen = e })

    await delBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(seen, '点击应触发 button 上的监听器').not.toBeNull()
    expect(seen!.defaultPrevented, '@click.prevent 应取消默认导航（阻止整页跳转）').toBe(true)
    expect(router.currentRoute.value.path).toBe('/goals')

    wrapper.unmount()
  })
})
