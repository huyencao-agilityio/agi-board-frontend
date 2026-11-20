import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { env } from '@/lib/env'

/**
 * Live updates for one board (F-13): one WebSocket per open board to its Durable Object.
 * shortcut: any message refetches every query under ['boards', boardId]; switch to applying
 * the event payload once the backend fixes the event format (before Sprint 2).
 */
export function useBoardSocket(boardId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!boardId) return
    let socket: WebSocket | undefined
    let retry: ReturnType<typeof setTimeout> | undefined
    let attempt = 0
    let closed = false

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['boards', boardId] })

    const connect = () => {
      socket = new WebSocket(`${env.VITE_WS_BASE_URL}/boards/${boardId}`)
      socket.onopen = () => {
        // Re-sync after a reconnect: we may have missed events while offline.
        if (attempt > 0) refresh()
        attempt = 0
      }
      socket.onmessage = refresh
      socket.onclose = () => {
        if (closed) return
        attempt += 1
        retry = setTimeout(connect, Math.min(30_000, 1000 * 2 ** attempt))
      }
    }

    connect()
    return () => {
      closed = true
      clearTimeout(retry)
      socket?.close()
    }
  }, [boardId, queryClient])
}
