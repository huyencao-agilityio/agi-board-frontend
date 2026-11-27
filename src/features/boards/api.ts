import { api } from '@/lib/api'

/** Feeds Home's Recently viewed (backend card #6). */
export const recordView = (boardId: string) =>
  api<void>(`/boards/${encodeURIComponent(boardId)}/views`, { method: 'POST' })
