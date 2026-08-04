import { supabase, isSupabaseConfigured } from './supabase'

export interface AuthState {
  userId: string | null
  email: string | null
}

/** 获取当前会话 */
export async function getSession(): Promise<AuthState> {
  if (!supabase) return { userId: null, email: null }
  const { data } = await supabase.auth.getSession()
  return {
    userId: data.session?.user.id ?? null,
    email: data.session?.user.email ?? null,
  }
}

/** 注册（邮箱+密码） */
export async function signUp(email: string, password: string) {
  if (!supabase) throw new Error('Supabase 未配置')
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

/** 登录（邮箱+密码） */
export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase 未配置')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

/** 登出 */
export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

/** 监听认证状态变化 */
export function onAuthChange(callback: (state: AuthState) => void) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback({
      userId: session?.user.id ?? null,
      email: session?.user.email ?? null,
    })
  })
  return () => data.subscription.unsubscribe()
}

export { isSupabaseConfigured }
