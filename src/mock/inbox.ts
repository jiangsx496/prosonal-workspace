export interface InboxItem {
  id: string
  content: string
  source: 'text' | 'api' | 'ai'
  processed: boolean
  createdAt: string
}

export const mockInboxItems: InboxItem[] = [
  { id: 'i1', content: '完成 Tianshu 设备授权对接文档', source: 'text', processed: false, createdAt: '2025-07-28' },
  { id: 'i2', content: '每天阅读 30 分钟技术文章', source: 'text', processed: false, createdAt: '2025-07-27' },
  { id: 'i3', content: 'Q3 完成实习面试准备，拿到 offer', source: 'text', processed: true, createdAt: '2025-07-25' },
]
