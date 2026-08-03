/**
 * Web Audio API 音效工具——无需音频文件，用振荡器生成 beep
 *
 * 使用时必须在用户手势（点击按钮）后创建 AudioContext。
 */

let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return ctx
}

/** 播放简单的 beep 音效 */
export function playBeep(frequency: number = 800, duration: number = 200, volume: number = 0.3): void {
  const audioCtx = getContext()
  if (!audioCtx) return

  const oscillator = audioCtx.createOscillator()
  const gainNode = audioCtx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioCtx.destination)

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime)

  gainNode.gain.setValueAtTime(volume, audioCtx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration / 1000)

  oscillator.start(audioCtx.currentTime)
  oscillator.stop(audioCtx.currentTime + duration / 1000)
}

/** 专注完成音效——三声渐进 beep */
export function playCompleteSound(): void {
  playBeep(523, 150, 0.2) // C5
  setTimeout(() => playBeep(659, 150, 0.2), 180) // E5
  setTimeout(() => playBeep(784, 250, 0.2), 360)  // G5
}

/** 休息开始音效——两声柔和 beep */
export function playBreakSound(): void {
  playBeep(440, 150, 0.15) // A4
  setTimeout(() => playBeep(554, 200, 0.15), 180) // C#5
}

/** 初始化 AudioContext（在用户手势内调用，解锁自动播放策略） */
export function initAudioContext(): void {
  const audioCtx = getContext()
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
}
