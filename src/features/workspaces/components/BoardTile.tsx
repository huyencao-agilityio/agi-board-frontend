import { Lock, Star, Users } from 'lucide-react'
import { Link } from 'react-router'
import { env } from '@/lib/env'
import { cn } from '@/lib/utils'
import type { BoardTile as Board } from '../api'

type BoardTileProps = { board: Board; onToggleStar?: (board: Board) => void }

/** Same tile in Starred boards, Recently viewed, workspace sections and WEB-04 (decisions #375–#377). */
export function BoardTile({ board, onToggleStar }: BoardTileProps) {
  const Icon = board.visibility === 'private' ? Lock : Users
  const thumb = board.backgroundThumbnailUrl
  return (
    <li className="relative flex flex-col overflow-hidden rounded-md border bg-card">
      {/* Thumbnail band: the board background, or its default color when none was chosen. */}
      <div
        aria-hidden="true"
        className="h-16 border-b"
        // Data-driven board color from the API, allowed inline by ui.md.
        style={thumb ? undefined : { backgroundColor: board.backgroundColor }}
      >
        {thumb && (
          <img
            src={new URL(thumb, env.VITE_API_BASE_URL).href}
            alt=""
            className="size-full object-cover"
          />
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-4 pt-2 pb-3">
        <Link
          to={`/b/${board.id}`}
          title={board.name}
          className="truncate font-bold after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
        >
          {board.name}
        </Link>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Icon aria-hidden="true" className="size-3.5" />
          {board.visibility === 'private' ? 'Private' : 'Workspace'}
        </span>
      </div>
      {onToggleStar && (
        <button
          type="button"
          aria-pressed={board.starred}
          aria-label={board.starred ? 'Unstar board' : 'Star board'}
          title={board.starred ? 'Unstar board' : 'Star board'}
          onClick={() => onToggleStar(board)}
          // White circle on the thumbnail band so the star reads on any photo or color.
          className="absolute top-2 right-2 z-10 grid size-8 place-items-center rounded-full bg-card text-muted-foreground shadow-sm outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Star
            aria-hidden="true"
            className={cn('size-4', board.starred && 'fill-current text-primary')}
          />
        </button>
      )}
    </li>
  )
}
