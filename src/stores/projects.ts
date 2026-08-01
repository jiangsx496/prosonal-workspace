import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import { useTaskStore } from '@/stores/tasks'

export interface Project {
  id: string
  name: string
  desc: string
  color: string
  createdAt: string
}

const STORAGE_KEY = 'pw-projects'
const COLORS = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d', '#65a30d']

function load(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Project[]
  } catch { /* ignore */ }
  return []
}

function save(val: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}

export const useProjectStore = defineStore('projects', () => {
  const projects = ref<Project[]>(load())

  watch(projects, (val) => save(val), { deep: true })

  const sorted = computed(() =>
    [...projects.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  )

  function create(name: string, desc: string = '') {
    const project: Project = {
      id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      name: name.trim(),
      desc: desc.trim(),
      color: COLORS[projects.value.length % COLORS.length],
      createdAt: new Date().toISOString(),
    }
    projects.value.unshift(project)
    return project
  }

  function update(id: string, patch: Partial<Pick<Project, 'name' | 'desc' | 'color'>>) {
    const idx = projects.value.findIndex((p) => p.id === id)
    if (idx !== -1) Object.assign(projects.value[idx], patch)
  }

  function remove(id: string) {
    // 清理关联任务的 project 字段引用
    const taskStore = useTaskStore()
    taskStore.tasks.forEach((t) => {
      if (t.project === projects.value.find((p) => p.id === id)?.name) {
        taskStore.updateTask(t.id, { project: '' })
      }
    })
    projects.value = projects.value.filter((p) => p.id !== id)
  }

  return { projects, sorted, create, update, remove, COLORS }
})
