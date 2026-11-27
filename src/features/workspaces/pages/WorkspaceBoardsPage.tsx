// WEB-04 Workspace boards — accessible-board list for card #6 (AC 6.1); the full screen comes with its own card.
import { Link, useParams } from 'react-router'
import Spinner from '@/components/common/Spinner'
import { BoardTile } from '../components/BoardTile'
import { useWorkspace } from '../hooks'
import { byName } from '../sort'

export default function WorkspaceBoardsPage() {
  const { workspaceId = '' } = useParams()
  // A 404 (archived, unknown, no access) is thrown to RouteError → WEB-13 by the query client.
  const { data: workspace, isError } = useWorkspace(workspaceId)

  if (isError) {
    return (
      <p
        role="alert"
        className="max-w-160 rounded-md bg-(--color-danger-soft) px-3.5 py-3 text-[13px] text-destructive"
      >
        Something went wrong. Try again.
      </p>
    )
  }
  if (!workspace) {
    return (
      <span role="status" aria-label="Loading" className="text-muted-foreground">
        <Spinner />
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 title={workspace.name} className="truncate text-2xl font-extrabold">
        {workspace.name}
      </h1>
      {/* Empty workspace: members see a faint line; the admin `Create new board` tile comes with WEB-D01 (decisions #61, #63). */}
      {workspace.boards.length === 0 && workspace.role !== 'admin' && (
        <p className="text-muted-foreground">No boards yet.</p>
      )}
      {workspace.boards.length > 0 && (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
          {byName(workspace.boards).map((b) => (
            <BoardTile key={b.id} board={b} />
          ))}
        </ul>
      )}
      {/* shortcut: the contract has no board roles, so board admins (also allowed by WEB-04 #5) do not see
          this link yet; add it when GET /workspaces/:id reports them. */}
      {workspace.role === 'admin' && (
        <Link
          to="closed-boards"
          className="self-start text-sm font-bold text-primary-text underline"
        >
          Closed boards
        </Link>
      )}
    </div>
  )
}
