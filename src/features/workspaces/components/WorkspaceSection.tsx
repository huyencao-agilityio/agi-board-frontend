import { Link } from 'react-router'
import type { BoardTile as Board, WorkspaceTile } from '../api'
import { byName } from '../sort'
import { BoardTile } from './BoardTile'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

type WorkspaceSectionProps = { workspace: WorkspaceTile; onToggleStar: (board: Board) => void }

export function WorkspaceSection({ workspace, onToggleStar }: WorkspaceSectionProps) {
  const counts = [plural(workspace.boardCount, 'board')]
  if (workspace.memberCount !== null) counts.push(plural(workspace.memberCount, 'member'))
  return (
    <section className="flex flex-col gap-3">
      <div className="flex min-w-0 items-baseline gap-3">
        <h3 className="min-w-0 truncate text-base font-bold">
          {/* Long names cut with "…", full name as a tooltip (decision #334). */}
          <Link
            to={`/w/${workspace.id}`}
            title={workspace.name}
            // Link color sets the workspace name apart from the black group headings (Your workspaces).
            className="text-primary-text hover:underline"
          >
            {workspace.name}
          </Link>
        </h3>
        <span className="shrink-0 text-sm text-muted-foreground">{counts.join(' · ')}</span>
      </div>
      {/* shortcut: WEB-D01 dialog is a separate card; add the admin-only `Create new board` tile (decision #59) there. */}
      {workspace.boards.length > 0 && (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
          {byName(workspace.boards).map((b) => (
            <BoardTile key={b.id} board={b} onToggleStar={onToggleStar} />
          ))}
        </ul>
      )}
    </section>
  )
}
