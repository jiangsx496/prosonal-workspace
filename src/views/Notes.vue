<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { localDateFromISO } from '@/utils/date'
import { useNoteStore } from '@/stores/notes'

const store = useNoteStore()

const titleInput = ref<HTMLInputElement | null>(null)
const contentInput = ref<HTMLTextAreaElement | null>(null)

// 自动保存防抖
let saveTimer: ReturnType<typeof setTimeout> | null = null
function autoSave() {
  if (!store.activeNote) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const title = titleInput.value?.value ?? ''
    const content = contentInput.value?.value ?? ''
    store.updateNote(store.activeNote!.id, { title, content })
  }, 300)
}

// 切换笔记时更新输入框
watch(() => store.activeId, () => {
  nextTick(() => {
    if (titleInput.value && store.activeNote) {
      titleInput.value.value = store.activeNote.title
    }
    if (contentInput.value && store.activeNote) {
      contentInput.value.value = store.activeNote.content
    }
  })
})

// 新建时聚焦标题
function handleCreate() {
  store.createNote()
  nextTick(() => titleInput.value?.focus())
}

function handleDelete() {
  if (!store.activeNote) return
  if (store.notes.length === 1 || confirm('确定删除这条笔记？')) {
    store.removeNote(store.activeNote.id)
  }
}
</script>

<template>
  <div class="space-y-6 pb-20 md:pb-0">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-text-primary">笔记</h1>
      <button
        class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
        @click="handleCreate"
      >+ 新建笔记</button>
    </div>

    <div v-if="store.notes.length > 0" class="flex flex-col md:flex-row gap-4">
      <!-- 左侧列表 -->
      <div class="md:w-56 shrink-0 space-y-1 max-h-[200px] md:max-h-[500px] overflow-y-auto">
        <button
          v-for="note in store.sortedNotes"
          :key="note.id"
          class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
          :class="store.activeId === note.id ? 'bg-accent/10 text-accent font-medium' : 'text-text-secondary hover:bg-card-hover'"
          @click="store.selectNote(note.id)"
        >
          <span class="block truncate">{{ note.title || '无标题' }}</span>
          <span class="block text-xs text-text-muted/60 mt-0.5">{{ localDateFromISO(note.updatedAt) }}</span>
        </button>
      </div>

      <!-- 右侧编辑器 -->
      <div v-if="store.activeNote" class="flex-1 min-w-0">
        <div class="bg-card border border-border rounded-xl overflow-hidden">
          <div class="flex items-center gap-2 px-4 py-2 border-b border-border bg-slate-100">
            <span class="w-3 h-3 rounded-full bg-red-400"></span>
            <span class="w-3 h-3 rounded-full bg-yellow-400"></span>
            <span class="w-3 h-3 rounded-full bg-green-400"></span>
            <span class="ml-2 text-xs text-text-muted">{{ store.activeNote.updatedAt.slice(0, 16).replace('T', ' ') }}</span>
            <button
              class="ml-auto px-2 py-0.5 rounded text-xs text-red-500 hover:bg-red-50 transition-colors"
              @click="handleDelete"
            >删除</button>
          </div>
          <input
            ref="titleInput"
            :value="store.activeNote.title"
            placeholder="笔记标题..."
            class="w-full bg-transparent text-text-primary text-base font-medium px-5 pt-4 pb-2 outline-none placeholder-text-muted/40"
            @input="autoSave"
          />
          <textarea
            ref="contentInput"
            :value="store.activeNote.content"
            placeholder="# 开始写作...&#10;&#10;支持 Markdown 语法，在这里记录你的想法。"
            class="w-full h-[320px] bg-transparent text-text-primary text-sm p-5 pt-0 resize-none outline-none placeholder-text-muted/40 leading-relaxed"
            @input="autoSave"
          ></textarea>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-20 text-text-muted">
      <p class="text-sm">暂无笔记</p>
      <button
        class="mt-3 text-xs text-accent hover:underline"
        @click="handleCreate"
      >创建第一篇笔记</button>
    </div>
  </div>
</template>
