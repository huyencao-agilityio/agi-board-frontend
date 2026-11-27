import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  acceptInvite,
  createBoard,
  createWorkspace,
  declineInvite,
  getHome,
  getWorkspace,
  starBoard,
  unstarBoard,
  type BoardTile,
  type BoardVisibility,
  type Home,
} from './api'

const HOME = ['home']

/** Everything Home and the Workspace sidebar show, in one request. */
export function useHome() {
  return useQuery({ queryKey: HOME, queryFn: getHome })
}

export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: ['workspaces', workspaceId],
    queryFn: () => getWorkspace(workspaceId),
  })
}

export function useCreateWorkspace() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => client.invalidateQueries({ queryKey: HOME }),
  })
}

export function useCreateBoard(workspaceId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; visibility: BoardVisibility }) =>
      createBoard(workspaceId, body),
    // Not awaited, so the new board opens without waiting for the refetch; on error too, so a lost
    // admin role or an archived workspace (403/404) drops the stale tile.
    onSettled: () => {
      void client.invalidateQueries({ queryKey: HOME })
      void client.invalidateQueries({ queryKey: ['workspaces', workspaceId] })
    },
  })
}

/** Sets `starred` on every copy of the board and adds it to or drops it from Starred boards. */
function withStar(home: Home, board: BoardTile, starred: boolean): Home {
  const mark = (b: BoardTile) => (b.id === board.id ? { ...b, starred } : b)
  const others = home.starred.filter((b) => b.id !== board.id)
  return {
    ...home,
    starred: starred ? [...others, { ...board, starred }] : others,
    recent: home.recent.map(mark),
    workspaces: home.workspaces.map((w) => ({ ...w, boards: w.boards.map(mark) })),
  }
}

/** Optimistic star toggle; a failed save goes back silently (decision #51). */
export function useToggleStar() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (board: BoardTile) => (board.starred ? unstarBoard(board.id) : starBoard(board.id)),
    onMutate: async (board) => {
      await client.cancelQueries({ queryKey: HOME })
      const before = client.getQueryData<Home>(HOME)
      if (before) client.setQueryData(HOME, withStar(before, board, !board.starred))
      return { before }
    },
    onError: (_e, _board, context) => {
      if (context?.before) client.setQueryData(HOME, context.before)
    },
    onSettled: () => client.invalidateQueries({ queryKey: HOME }),
  })
}

// Refetch on error too: an expired or withdrawn invite then shows its real state.
export function useAcceptInvite() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: acceptInvite,
    onSettled: () => client.invalidateQueries({ queryKey: HOME }),
  })
}

export function useDeclineInvite() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: declineInvite,
    onSettled: () => client.invalidateQueries({ queryKey: HOME }),
  })
}
