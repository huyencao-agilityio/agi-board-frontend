import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'

export type SystemRole = 'USER' | 'SUPPORT' | 'SUPER_ADMIN'

// shortcut: shape and endpoint are placeholders until the backend publishes its OpenAPI types.
export type SessionUser = {
  id: string
  email: string
  name: string
  systemRole: SystemRole
}

/** Current signed-in person, or null when signed out (401). */
export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        return await api<SessionUser>('/auth/me')
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null
        throw e
      }
    },
    staleTime: Infinity,
  })
}
