// WEB-03 Home
import { Link } from 'react-router'
import Spinner from '@/components/common/Spinner'
import { cn } from '@/lib/utils'
import type { BoardTile as Board } from '../api'
import { BoardTile } from '../components/BoardTile'
import { CreateWorkspaceDialog } from '../components/CreateWorkspaceDialog'
import { InviteList } from '../components/InviteList'
import { WorkspaceSection } from '../components/WorkspaceSection'
import { WorkspaceSidebar } from '../components/WorkspaceSidebar'
import { useHome, useToggleStar } from '../hooks'
import { byName } from '../sort'

const H2 = 'text-lg font-extrabold'

export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-300 gap-8">
      {/* Mounted with the content so both share one /home request. Renders nothing without an active
          workspace, so the content takes the full width (decision #372). */}
      <WorkspaceSidebar />
      <div className="flex min-w-0 flex-1 flex-col gap-8">
        <h1 className="sr-only">Home</h1>
        <HomeContent />
      </div>
    </div>
  )
}

function HomeContent() {
  const { data: home, isPending, isError } = useHome()
  const star = useToggleStar()
  const onToggleStar = (board: Board) => star.mutate(board)

  if (isPending) {
    return (
      <span
        role="status"
        aria-label="Loading"
        className="flex justify-center p-8 text-muted-foreground"
      >
        <Spinner />
      </span>
    )
  }
  if (isError) {
    return (
      <p
        role="alert"
        className="mx-auto max-w-160 rounded-md bg-(--color-danger-soft) px-3.5 py-3 text-[13px] text-destructive"
      >
        Something went wrong. Try again.
      </p>
    )
  }

  const own = byName(home.workspaces.filter((w) => w.role !== null))
  const guest = byName(home.workspaces.filter((w) => w.role === null))
  const empty = home.workspaces.length === 0

  return (
    <>
      {home.invites.length > 0 && <InviteList invites={home.invites} />}
      {!empty && (
        <>
          <BoardSection
            title="Starred boards"
            boards={byName(home.starred)}
            onToggleStar={onToggleStar}
          />
          <BoardSection title="Recently viewed" boards={home.recent} onToggleStar={onToggleStar} />
        </>
      )}
      <section className="flex flex-col gap-5">
        {/* As in the mockup: `Create workspace` sits right of the heading, in every state. */}
        <div className="flex items-center gap-3">
          <h2 className={cn(H2, 'flex-1')}>Your workspaces</h2>
          <CreateWorkspaceDialog />
        </div>
        {own.map((w) => (
          <WorkspaceSection key={w.id} workspace={w} onToggleStar={onToggleStar} />
        ))}
        {empty && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-muted-foreground">
              You have no workspace yet. Create one or wait for an invite.
            </p>
            {home.hasArchivedWorkspaces && (
              <Link
                to="/archived-workspaces"
                className="text-sm font-bold text-primary-text underline"
              >
                View archived workspaces
              </Link>
            )}
          </div>
        )}
      </section>
      {guest.length > 0 && (
        <section className="flex flex-col gap-5">
          <h2 className={H2}>Guest workspaces</h2>
          {guest.map((w) => (
            <WorkspaceSection key={w.id} workspace={w} onToggleStar={onToggleStar} />
          ))}
        </section>
      )}
    </>
  )
}

type BoardSectionProps = { title: string; boards: Board[]; onToggleStar: (board: Board) => void }

function BoardSection({ title, boards, onToggleStar }: BoardSectionProps) {
  if (boards.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <h2 className={H2}>{title}</h2>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
        {boards.map((b) => (
          <BoardTile key={b.id} board={b} onToggleStar={onToggleStar} />
        ))}
      </ul>
    </section>
  )
}
