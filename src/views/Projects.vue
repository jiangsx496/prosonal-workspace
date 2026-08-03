<script setup lang="ts">
import { ref } from 'vue'
import { localDateFromISO } from '@/utils/date'
import { useProjectStore } from '@/stores/projects'

const store = useProjectStore()

const showCreate = ref(false)
const newName = ref('')
const newDesc = ref('')

const editingId = ref<string | null>(null)
const editName = ref('')
const editDesc = ref('')
const editColor = ref('')

function handleCreate() {
  if (!newName.value.trim()) return
  store.create(newName.value.trim(), newDesc.value.trim())
  newName.value = ''
  newDesc.value = ''
  showCreate.value = false
}

function startEdit(id: string) {
  const p = store.projects.find((p) => p.id === id)
  if (!p) return
  editingId.value = id
  editName.value = p.name
  editDesc.value = p.desc
  editColor.value = p.color
}

function saveEdit() {
  if (!editingId.value || !editName.value.trim()) return
  store.update(editingId.value, {
    name: editName.value.trim(),
    desc: editDesc.value.trim(),
    color: editColor.value,
  })
  editingId.value = null
}

function cancelEdit() {
  editingId.value = null
}
</script>

<template>
  <div class="space-y-6 pb-20 md:pb-0">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-text-primary">项目</h1>
      <button
        class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
        @click="showCreate = true"
      >+ 新建项目</button>
    </div>

    <!-- 新建项目表单 -->
    <div v-if="showCreate" class="bg-card border border-border rounded-xl p-5 space-y-3">
      <h3 class="text-sm font-semibold text-text-primary">新建项目</h3>
      <input
        v-model="newName"
        type="text"
        placeholder="项目名称"
        class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-sm outline-none focus:border-accent"
        @keyup.enter="handleCreate"
      />
      <input
        v-model="newDesc"
        type="text"
        placeholder="项目描述（可选）"
        class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-sm outline-none focus:border-accent"
        @keyup.enter="handleCreate"
      />
      <div class="flex items-center gap-2">
        <button class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors" @click="handleCreate">创建</button>
        <button class="px-4 py-2 rounded-lg text-text-muted text-sm hover:bg-card-hover transition-colors" @click="showCreate = false">取消</button>
      </div>
    </div>

    <!-- 项目列表 -->
    <div v-if="store.sorted.length > 0" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="p in store.sorted"
        :key="p.id"
        class="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
      >
        <!-- 编辑模式 -->
        <template v-if="editingId === p.id">
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <input type="color" v-model="editColor" class="w-6 h-6 rounded cursor-pointer border-0 p-0" />
              <input
                v-model="editName"
                type="text"
                class="flex-1 px-2 py-1 rounded border border-border bg-gray-50 text-sm outline-none focus:border-accent"
                @keyup.enter="saveEdit"
              />
            </div>
            <input
              v-model="editDesc"
              type="text"
              placeholder="描述"
              class="w-full px-2 py-1 rounded border border-border bg-gray-50 text-xs outline-none focus:border-accent"
            />
            <div class="flex items-center gap-2">
              <button class="px-3 py-1 rounded bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors" @click="saveEdit">保存</button>
              <button class="px-3 py-1 rounded text-text-muted text-xs hover:bg-card-hover transition-colors" @click="cancelEdit">取消</button>
            </div>
          </div>
        </template>
        <!-- 展示模式 -->
        <template v-else>
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
              <span class="w-3 h-3 rounded-full shrink-0" :style="{ backgroundColor: p.color }"></span>
              <h3 class="font-semibold text-text-primary">{{ p.name }}</h3>
            </div>
            <div class="flex items-center gap-1">
              <button class="text-xs text-text-muted hover:text-accent px-1" @click="startEdit(p.id)" title="编辑">✏️</button>
              <button class="text-xs text-text-muted hover:text-red-500 px-1" @click="store.remove(p.id)" title="删除">🗑️</button>
            </div>
          </div>
          <p v-if="p.desc" class="text-xs text-text-muted">{{ p.desc }}</p>
          <p class="text-xs text-text-muted/60 mt-2">创建于 {{ localDateFromISO(p.createdAt) }}</p>
        </template>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-20 text-text-muted">
      <span class="text-4xl mb-4">📁</span>
      <p class="text-sm">暂无项目</p>
      <p class="text-xs mt-1 opacity-60">点击右上角按钮创建第一个项目</p>
    </div>
  </div>
</template>
