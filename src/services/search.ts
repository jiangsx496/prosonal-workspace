import { useTaskStore } from '@/stores/tasks'
import { useGoalStore } from '@/stores/goals'
import { useNoteStore } from '@/stores/notes'
import { useHabitStore } from '@/stores/habits'
import { useProjectStore } from '@/stores/projects'
import { interviewQuestions } from '@/data/interviewQuestions'

export interface SearchResult {
  type: 'task' | 'goal' | 'note' | 'habit' | 'project' | 'interview'
  id: string
  title: string
  subtitle: string
  link: string
}

export function useSearch() {
  const taskStore = useTaskStore()
  const goalStore = useGoalStore()
  const noteStore = useNoteStore()
  const habitStore = useHabitStore()
  const projectStore = useProjectStore()

  function search(query: string): SearchResult[] {
    if (!query.trim()) return []
    const q = query.toLowerCase().trim()
    const results: SearchResult[] = []

    // 任务
    for (const t of taskStore.tasks) {
      if (t.title.toLowerCase().includes(q)) {
        results.push({
          type: 'task', id: t.id, title: t.title,
          subtitle: t.status === 'done' ? '✅ 已完成' : t.status === 'deferred' ? '📥 已延期' : '📋 任务',
          link: '/tasks',
        })
      }
    }

    // 目标
    for (const g of goalStore.goals) {
      if (g.title.toLowerCase().includes(q)) {
        results.push({
          type: 'goal', id: g.id, title: g.title,
          subtitle: `${g.status === 'completed' ? '✅' : '🎯'} ${g.category || '目标'} · ${g.progress ?? 0}%`,
          link: `/goals/${g.id}`,
        })
      }
    }

    // 笔记
    for (const n of noteStore.notes) {
      const haystack = (n.title + ' ' + n.content).toLowerCase()
      if (haystack.includes(q)) {
        results.push({
          type: 'note', id: n.id, title: n.title || '无标题笔记',
          subtitle: '📝 ' + (n.content?.slice(0, 60) || '空笔记'),
          link: '/notes',
        })
      }
    }

    // 习惯
    for (const h of habitStore.habits) {
      if (h.name.toLowerCase().includes(q)) {
        results.push({
          type: 'habit', id: h.id, title: h.name,
          subtitle: `🔥 ${h.streak} 天连续`,
          link: '/habits',
        })
      }
    }

    // 项目
    for (const p of projectStore.projects) {
      if ((p.name + ' ' + p.desc).toLowerCase().includes(q)) {
        results.push({
          type: 'project', id: p.id, title: p.name,
          subtitle: '📁 项目',
          link: '/projects',
        })
      }
    }

    // 面试题
    for (const iq of interviewQuestions) {
      if (iq.question.toLowerCase().includes(q) || iq.answer.toLowerCase().includes(q)) {
        results.push({
          type: 'interview', id: iq.id, title: iq.question,
          subtitle: `📚 ${iq.category}`,
          link: '/interview',
        })
      }
    }

    return results.slice(0, 30)
  }

  return { search }
}
