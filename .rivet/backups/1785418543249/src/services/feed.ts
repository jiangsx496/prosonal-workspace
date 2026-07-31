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

/** 获取 GitHub 近期热门仓库 */
export async function fetchTrendingRepos(): Promise<FeedRepo[]> {
  // 搜索近 7 天创建、按 star 降序排列的仓库
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const url = `https://api.github.com/search/repositories?q=created:>${weekAgo}+stars:>100&sort=stars&order=desc&per_page=5`

  const res = await fetch(url, {
    headers: { 'Accept': 'application/vnd.github.v3+json' },
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
  const seed = today.split('-').reduce((a, b) => parseInt(a) + parseInt(b), 0)
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
export async function fetchDailyFeed(): Promise<DailyFeed> {
  const today = new Date().toISOString().slice(0, 10)
  const cacheKey = `pw-feed-${today}`

  // 检查缓存
  try {
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      const feed = JSON.parse(cached) as DailyFeed
      if (feed.date === today && feed.fetchedAt) return feed
    }
  } catch { /* ignore */ }

  // 并行获取 GitHub + AI
  const [repos, question] = await Promise.allSettled([
    fetchTrendingRepos(),
    fetchDailyQuestion(),
  ])

  const feed: DailyFeed = {
    date: today,
    repos: repos.status === 'fulfilled' ? repos.value : [],
    question: question.status === 'fulfilled' ? question.value : null,
    fetchedAt: new Date().toISOString(),
  }

  // 写缓存
  try {
    localStorage.setItem(cacheKey, JSON.stringify(feed))
    // 清理 3 天前的旧缓存
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('pw-feed-') && key !== cacheKey) {
        localStorage.removeItem(key)
      }
    }
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
