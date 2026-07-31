import type { ImportRecord } from '@/stores/imports'

export interface ExtractResult {
  content: string
  fileType: ImportRecord['fileType']
  warning?: string
}

/**
 * 浏览器端文件读取（第一阶段：纯前端，不依赖外部库）
 *
 * - txt/md: FileReader 直接读文本
 * - image: 转为 base64 data URL（供后续 OCR）
 * - docx/pdf: 记录元数据，提示用户手动粘贴文本
 */
export async function extractFile(file: File): Promise<ExtractResult> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  // 文本类：直接读取
  if (file.type.startsWith('text/') || ext === 'txt' || ext === 'md') {
    const content = await readFileAsText(file)
    return { content, fileType: ext === 'md' ? 'markdown' : 'text' }
  }

  // 图片：转 base64
  if (file.type.startsWith('image/')) {
    const content = await readFileAsDataURL(file)
    return { content, fileType: 'image', warning: '图片已保存，文本提取需手动或后续 OCR' }
  }

  // docx/pdf：第一阶段不支持自动提取
  if (ext === 'docx' || file.type.includes('word')) {
    return { content: '', fileType: 'docx', warning: 'Word 文件不支持自动提取，请粘贴文本内容' }
  }
  if (ext === 'pdf' || file.type === 'application/pdf') {
    return { content: '', fileType: 'pdf', warning: 'PDF 文件不支持自动提取，请粘贴文本内容' }
  }

  // 未知类型：尝试当文本读
  try {
    const content = await readFileAsText(file)
    return { content, fileType: 'unknown', warning: '未知文件类型，已尝试按文本读取' }
  } catch {
    return { content: '', fileType: 'unknown', warning: '无法读取此文件' }
  }
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('FileReader failed'))
    reader.readAsText(file)
  })
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('FileReader failed'))
    reader.readAsDataURL(file)
  })
}
