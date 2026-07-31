/**
 * 每日精选 Feed — GitHub 热门仓库 + AI 八股文
 *
 * 数据来源：
 * - GitHub：调用 GitHub Search API 搜索近 7 天创建的高 star 仓库（CORS 友好，无需 token）
 * - 八股文：调用项目已有的 AI API（复用 ai.ts 的 getAIConfig）生成每日面试题
 *
 * 每日刷新一次，结果缓存到 localStorage（key: pw-feed-YYYY-MM-DD）
 */

export interface FeedRepo {
  name: string
  fullName: string
  description: string
  url: string
  stars: number
  language: string
}

export interface FeedQuestion {
  category: string
  question: string
  answer: string
}

export interface DailyFeed {
  date: string
  repos: FeedRepo[]
  questions: FeedQuestion[]
  fetchedAt: string
}

import { interviewQuestions } from '@/data/interviewQuestions'

/**
 * 按日期从题库轮换选取面试题（保证每天不同，循环周期 = 题库长度）
 * 返回 3 道题：从不同分类中选取，保证多样性
 */
function pickDailyQuestions(today: string): FeedQuestion[] {
  const seed = today.split('-').reduce((a: number, b: string) => a + parseInt(b), 0)
  const count = 3
  const picked: FeedQuestion[] = []
  const usedCategories = new Set<string>()

  for (let i = 0; i < count; i++) {
    const idx = (seed + i * 7) % interviewQuestions.length
    const q = interviewQuestions[idx]
    // 避免同分类重复（如果可能）
    if (usedCategories.has(q.category) && i < count - 1) {
      const altIdx = (seed + i * 7 + 3) % interviewQuestions.length
      const altQ = interviewQuestions[altIdx]
      picked.push({ category: altQ.category, question: altQ.question, answer: altQ.answer })
      usedCategories.add(altQ.category)
    } else {
      picked.push({ category: q.category, question: q.question, answer: q.answer })
      usedCategories.add(q.category)
    }
  }

  return picked
}

/** 获取 GitHub 近期热门仓库 */
export async function fetchTrendingRepos(): Promise<FeedRepo[]> {
  // 搜索近 7 天创建、按 star 降序排列的仓库
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  // 随机翻页让每次刷新看到不同的仓库（GitHub Search 最多 1000 条，per_page=5 时最多 200 页）
  const page = Math.floor(Math.random() * 5) + 1
  const url = `https://api.github.com/search/repositories?q=created:>${weekAgo}+stars:>100&sort=stars&order=desc&per_page=5&page=${page}`

  const res = await fetch(url, {
    headers: { 'Accept': 'application/vnd.github.v3+json' },
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}`)
  }

  const data = await res.json()
  return (data.items || []).map((item: any) => ({
    name: item.name,
    fullName: item.full_name,
    description: item.description || '暂无描述',
    url: item.html_url,
    stars: item.stargazers_count,
    language: item.language || 'N/A',
  }))
}

/** 调用 AI 生成每日八股文 */
export async function fetchDailyQuestion(): Promise<FeedQuestion | null> {
  const config = getAIConfig()
  if (!config.apiKey) return null

  const categories = ['JavaScript', 'CSS', 'Vue', '浏览器原理', '网络', '性能优化', '工程化']
  const today = new Date().toISOString().slice(0, 10)
  const seed = today.split('-').reduce((a: number, b: string) => a + parseInt(b), 0)
  const category = categories[seed % categories.length]

  const prompt = `你是一个前端面试辅导助手。请生成一道关于「${category}」的面试题（八股文），包含题目和简短答案。
输出必须是合法 JSON：{"category":"${category}","question":"题目","answer":"答案（100字以内，要点清晰）"}
不要输出 JSON 以外的任何内容。`

  try {
    const res = await fetch(`${config.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(20000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    return JSON.parse(jsonMatch[0]) as FeedQuestion
  } catch {
    return null
  }
}

/** 获取今日 Feed（有缓存则返回缓存，否则获取新数据） */
export async function fetchDailyFeed(today: string, force: boolean = false): Promise<DailyFeed> {
  const cacheKey = `pw-feed-${today}`

  // 检查缓存（force 刷新时跳过）
  if (!force) {
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const feed = JSON.parse(cached) as DailyFeed
        if (feed.date === today && feed.fetchedAt) return feed
      }
    } catch { /* ignore */ }
  }

  // 并行获取 GitHub + AI（题库题作为基础 + AI 补充 2 道）
  const baseQuestions = pickDailyQuestions(today)

  const [repos, ai1, ai2] = await Promise.allSettled([
    fetchTrendingRepos(),
    fetchDailyQuestion(),
    fetchDailyQuestion(),
  ])

  const aiQuestions: FeedQuestion[] = [ai1, ai2]
    .filter((r): r is PromiseFulfilledResult<FeedQuestion> => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value)

  // 题库题 + AI 补充（去重）
  const seen = new Set(baseQuestions.map((q) => q.question))
  const questions = [...baseQuestions, ...aiQuestions.filter((q) => !seen.has(q.question))]

  // repos：API 成功用新数据，失败则从缓存保留旧的（避免网络波动清空已展示的内容）
  let finalRepos: FeedRepo[]
  if (repos.status === 'fulfilled') {
    finalRepos = repos.value
  } else {
    finalRepos = []
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const old = JSON.parse(cached) as DailyFeed
        if (old.repos?.length) finalRepos = old.repos
      }
    } catch { /* ignore */ }
  }

  const feed: DailyFeed = {
    date: today,
    repos: finalRepos,
    questions,
    fetchedAt: new Date().toISOString(),
  }

  // 写缓存
  try {
    localStorage.setItem(cacheKey, JSON.stringify(feed))
    // 清理旧缓存（倒序遍历避免 removeItem 导致的索引偏移）
    const keysToDelete: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('pw-feed-') && key !== cacheKey) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach((key) => localStorage.removeItem(key))
  } catch { /* ignore */ }

  return feed
}

// 内部依赖（避免循环 import，这里直接读 localStorage）
function getAIConfig() {
  return {
    endpoint: localStorage.getItem('pw-ai-endpoint') || 'https://ark.cn-beijing.volces.com/api/v3',
    apiKey: localStorage.getItem('pw-ai-key') || '',
    model: localStorage.getItem('pw-ai-model') || 'doubao-pro-32k',
  }
}
