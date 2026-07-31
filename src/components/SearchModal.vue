<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useSearch } from '@/services/search'
import type { SearchResult } from '@/services/search'

const { search } = useSearch()

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const query = ref('')
const results = ref<SearchResult[]>([])
const inputRef = ref<HTMLInputElement | null>(null)
const selectedIdx = ref(0)

watch(() => props.show, async (v) => {
  if (v) {
    query.value = ''
    results.value = []
    selectedIdx.value = 0
    await nextTick()
    inputRef.value?.focus()
  }
})

watch(query, (q) => {
  results.value = q.trim() ? search(q.trim()) : []
  selectedIdx.value = 0
})

const typeIcon: Record<string, string> = {
  task: '📋', goal: '🎯', habit: '🔥', note: '📝', project: '📁',
}
const typeLabel: Record<string, string> = {
  task: '任务', goal: '目标', habit: '习惯', note: '笔记', project: '项目',
}

function openResult(r: SearchResult) {
  emit('close')
  if (r.type === 'goal' && r.id) router.push(`/goals/${r.id}`)
  else if (r.type === 'task') router.push('/tasks')
  else if (r.type === 'habit') router.push('/habits')
  else if (r.type === 'note') router.push('/notes')
  else if (r.type === 'project') router.push('/projects')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx.value = Math.min(selectedIdx.value + 1, results.value.length - 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx.value = Math.max(selectedIdx.value - 1, 0) }
  else if (e.key === 'Enter' && results.value[selectedIdx.value]) { openResult(results.value[selectedIdx.value]) }
  else if (e.key === 'Escape') { emit('close') }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]" @click.self="emit('close')">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <div class="relative w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div class="flex items-center gap-3 px-4 py-3 border-b border-border">
          <span class="text-base">🔍</span>
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            placeholder="搜索任务、目标、习惯、笔记..."
            class="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder-text-muted"
            @keydown="onKeydown"
          />
          <button class="text-xs text-text-muted hover:text-text-secondary px-1" @click="emit('close')">ESC</button>
        </div>
        <div v-if="results.length > 0" class="max-h-80 overflow-y-auto">
          <div
            v-for="(r, i) in results" :key="`${r.type}-${r.id || i}`"
            class="flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors"
            :class="i === selectedIdx ? 'bg-card-hover' : 'hover:bg-card-hover'"
            @click="openResult(r)"
            @mouseenter="selectedIdx = i"
          >
            <span class="text-sm shrink-0 mt-0.5">{{ typeIcon[r.type] }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-text-primary truncate">{{ r.title }}</p>
              <p v-if="r.desc" class="text-xs text-text-muted truncate mt-0.5">{{ r.desc }}</p>
            </div>
            <span class="text-[10px] text-text-muted bg-card-hover px-1.5 py-0.5 rounded shrink-0">{{ typeLabel[r.type] }}</span>
          </div>
        </div>
        <div v-else-if="query.trim()" class="py-8 text-center text-xs text-text-muted">
          未找到「{{ query }}」相关结果
        </div>
        <div v-else class="py-6 text-center text-xs text-text-muted">
          输入关键词搜索
        </div>
      </div>
    </div>
  </Teleport>
</template>
