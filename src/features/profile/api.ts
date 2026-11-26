import { api } from '@/lib/api'

/** GET /users/me (backend card #22, contracts/users-me.md). */
export type Profile = {
  id: string
  email: string
  fullName: string
  avatarUrl: string | null
  hasPassword: boolean
  googleLinked: boolean
  /** ISO time the change-password lock ends; null when not locked. */
  changePasswordLockedUntil: string | null
}

export type AccountSession = {
  id: string
  userAgent: string | null
  createdAt: string
  lastActiveAt: string
  isCurrent: boolean
}

export const getProfile = () => api<Profile>('/users/me')

export const updateName = (body: { fullName: string }) =>
  api<Profile>('/users/me', { method: 'PATCH', body: JSON.stringify(body) })

export function uploadAvatar(file: File) {
  const body = new FormData()
  body.append('file', file)
  return api<Profile>('/users/me/avatar', { method: 'PUT', body })
}

export const removeAvatar = () => api<void>('/users/me/avatar', { method: 'DELETE' })

export const changePassword = (body: { currentPassword: string; newPassword: string }) =>
  api<void>('/auth/change-password', { method: 'POST', body: JSON.stringify(body) })

export const listSessions = async () =>
  (await api<{ items: AccountSession[] }>('/auth/sessions')).items

export const endSession = (id: string) =>
  api<void>(`/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' })

export const endOtherSessions = () => api<void>('/auth/sessions', { method: 'DELETE' })
