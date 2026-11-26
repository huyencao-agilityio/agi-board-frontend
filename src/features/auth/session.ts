import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError, errorCode } from '@/lib/api'
import { SESSION_ENDED_KEY } from '@/lib/query-client'

export type SystemRole = 'USER' | 'SUPPORT' | 'SUPER_ADMIN'

export type SessionUser = {
  id: string
  email: string
  name: string
  systemRole: SystemRole
  avatarUrl: string | null
}

/** Body of POST /auth/sign-in and GET /auth/me; `next` says whether the email is verified. */
export type AuthResult = {
  user: {
    id: string
    email: string
    fullName: string
    systemRole: SystemRole
    avatarUrl?: string | null
  }
  next: 'home' | 'verify-email'
}

export function toSessionUser({ user }: AuthResult): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.fullName,
    systemRole: user.systemRole,
    avatarUrl: user.avatarUrl ?? null,
  }
}

/** Current signed-in person, or null when signed out (401). */
export function useSession() {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        return toSessionUser(await api<AuthResult>('/auth/me'))
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          queryClient.setQueryData(SESSION_ENDED_KEY, errorCode(e) === 'SESSION_ENDED')
          return null
        }
        throw e
      }
    },
    staleTime: Infinity,
    // The guards wait on this query: a failing API must not keep them blank through retries
    // (a refetch on mount would also put an errored query back to pending), so fail once and treat as signed out.
    retry: false,
    retryOnMount: false,
  })
}
