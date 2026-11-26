import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { SessionUser } from '@/features/auth/session'
import { ApiError, errorCode } from '@/lib/api'
import {
  changePassword,
  endOtherSessions,
  endSession,
  getProfile,
  listSessions,
  removeAvatar,
  updateName,
  uploadAvatar,
  type Profile,
} from './api'

const PROFILE = ['profile']
const SESSIONS = ['sessions']
const LOCK_MS = 15 * 60_000

export function useProfile() {
  return useQuery({ queryKey: PROFILE, queryFn: getProfile })
}

export function useSessions() {
  return useQuery({ queryKey: SESSIONS, queryFn: listSessions })
}

/** Stores the new profile and mirrors name and photo into the header's session (staleTime Infinity, so patch, not invalidate). */
function saveProfile(client: QueryClient, profile: Profile) {
  client.setQueryData(PROFILE, profile)
  client.setQueryData<SessionUser | null>(['session'], (user) =>
    user ? { ...user, name: profile.fullName, avatarUrl: profile.avatarUrl } : user,
  )
}

export function useUpdateName() {
  const client = useQueryClient()
  return useMutation({ mutationFn: updateName, onSuccess: (p) => saveProfile(client, p) })
}

export function useUploadAvatar() {
  const client = useQueryClient()
  return useMutation({ mutationFn: uploadAvatar, onSuccess: (p) => saveProfile(client, p) })
}

export function useRemoveAvatar() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: removeAvatar,
    onSuccess: () => {
      const profile = client.getQueryData<Profile>(PROFILE)
      if (profile) saveProfile(client, { ...profile, avatarUrl: null })
    },
  })
}

export function useChangePassword() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: changePassword,
    // The cache would keep the passwords (the variables) for 5 minutes.
    gcTime: 0,
    onSuccess: () => client.invalidateQueries({ queryKey: SESSIONS }),
    onError: (e) => {
      if (!(e instanceof ApiError) || errorCode(e) !== 'CHANGE_PASSWORD_LOCKED') return
      type Locked = { error?: { details?: { lockedUntil?: string } } } | undefined
      // Fallback to the 15 minutes the spec states if the server sent no end time.
      const lockedUntil =
        (e.body as Locked)?.error?.details?.lockedUntil ??
        new Date(Date.now() + LOCK_MS).toISOString()
      client.setQueryData<Profile>(PROFILE, (p) =>
        p ? { ...p, changePasswordLockedUntil: lockedUntil } : p,
      )
    },
  })
}

export function useEndSession() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: endSession,
    onSettled: (_data, e) => {
      // Already gone (404) is as good as signed out: refresh the list either way.
      if (!e || errorCode(e) === 'SESSION_NOT_FOUND')
        void client.invalidateQueries({ queryKey: SESSIONS })
    },
  })
}

export function useEndOtherSessions() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: endOtherSessions,
    onSuccess: () => client.invalidateQueries({ queryKey: SESSIONS }),
  })
}
