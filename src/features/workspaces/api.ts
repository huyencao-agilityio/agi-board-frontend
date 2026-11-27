import { api } from '@/lib/api'

// Shapes from backend card #6 (agi-board-backend specs/6/contracts/http.md).
export type BoardTile = {
  id: string
  name: string
  workspaceId: string
  workspaceName: string
  visibility: 'private' | 'workspace'
  /** Preset id from board_backgrounds, or null. */
  backgroundKey: string | null
  /** Server-relative tile image URL; null → show `backgroundColor`. */
  backgroundThumbnailUrl: string | null
  /** One of the 10 preset colors: chosen, or the random default kept per board (decision #376). */
  backgroundColor: string
  starred: boolean
}

export type WorkspaceTile = {
  id: string
  name: string
  /** null = board-only member (Guest workspaces). */
  role: 'admin' | 'member' | null
  boardCount: number
  /** null for a board-only viewer. */
  memberCount: number | null
  boards: BoardTile[]
}

export type PendingInvite = {
  id: string
  type: 'workspace' | 'board'
  workspace: { id: string; name: string }
  board: { id: string; name: string } | null
  role: 'admin' | 'member'
  invitedBy: { fullName: string }
  expiresAt: string
  expired: boolean
}

export type Home = {
  starred: BoardTile[]
  recent: BoardTile[]
  workspaces: WorkspaceTile[]
  invites: PendingInvite[]
  hasArchivedWorkspaces: boolean
}

const id = (value: string) => encodeURIComponent(value)

export const getHome = () => api<Home>('/home')

export const getWorkspace = (workspaceId: string) =>
  api<WorkspaceTile>(`/workspaces/${id(workspaceId)}`)

export const createWorkspace = (body: { name: string }) =>
  api<WorkspaceTile>('/workspaces', { method: 'POST', body: JSON.stringify(body) })

export const starBoard = (boardId: string) =>
  api<void>(`/boards/${id(boardId)}/star`, { method: 'PUT' })

export const unstarBoard = (boardId: string) =>
  api<void>(`/boards/${id(boardId)}/star`, { method: 'DELETE' })

export const acceptInvite = (inviteId: string) =>
  api<{ workspaceId: string; boardId: string | null }>(`/invites/${id(inviteId)}/accept`, {
    method: 'POST',
  })

export const declineInvite = (inviteId: string) =>
  api<void>(`/invites/${id(inviteId)}/decline`, { method: 'POST' })
