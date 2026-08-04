import { ref, onMounted, onUnmounted } from 'vue'
import { getSession, onAuthChange, signIn, signUp, signOut, type AuthState } from '@/services/auth'
import { isSupabaseConfigured } from '@/services/supabase'

const state = ref<AuthState>({ userId: null, email: null })
let unsub: (() => void) | null = null

export function useAuth() {
  onMounted(async () => {
    state.value = await getSession()
    unsub = onAuthChange((s) => { state.value = s })
  })
  onUnmounted(() => { unsub?.() })
  return {
    state,
    isConfigured: isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
  }
}
