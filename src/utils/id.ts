/** 生成带可选前缀的短唯一 ID（时间戳 + 随机数，base36） */
export function generateId(prefix: string = ''): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}
