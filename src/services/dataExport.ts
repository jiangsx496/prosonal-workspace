/**
 * 数据导出/导入 —— 将所有 localStorage 数据打包为 JSON 文件
 */

const PREFIX = 'pw-'

export interface ExportResult {
  json: string
  keyCount: number
}

/** 导出所有 pw- 前缀的 localStorage 数据，返回 JSON 字符串 */
export function exportAllData(): ExportResult {
  const data: Record<string, unknown> = {}
  let keyCount = 0

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(PREFIX)) continue
    keyCount++
    try {
      data[key] = JSON.parse(localStorage.getItem(key)!)
    } catch {
      data[key] = localStorage.getItem(key)
    }
  }

  return { json: JSON.stringify(data, null, 2), keyCount }
}

export interface ImportResult {
  success: number
  skipped: number
  errors: string[]
}

/** 从 JSON 字符串导入数据到 localStorage（仅写 pw- 前缀的 key） */
export function importAllData(json: string): ImportResult {
  const errors: string[] = []
  let success = 0
  let skipped = 0

  try {
    const data = JSON.parse(json)
    for (const [key, value] of Object.entries(data)) {
      if (!key.startsWith(PREFIX)) {
        skipped++
        continue
      }
      try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
        success++
      } catch (e: any) {
        errors.push(`${key}: ${e.message}`)
      }
    }
  } catch (e: any) {
    errors.push(`JSON 解析失败: ${e.message}`)
  }

  return { success, skipped, errors }
}

/** 触发浏览器下载 JSON 文件 */
export function downloadJson(filename: string, json: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** 读取用户选择的 .json 文件内容 */
export function readJsonFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}
