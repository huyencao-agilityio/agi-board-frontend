import { ChevronRight, House } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, useParams } from 'react-router'
import { cn } from '@/lib/utils'
import type { WorkspaceTile } from '../api'
import { useHome } from '../hooks'
import { byName } from '../sort'

const ITEM = 'block rounded-sm px-2 py-1.5 text-sm hover:bg-accent'
const itemClass = ({ isActive }: { isActive: boolean }) =>
  cn(ITEM, isActive && 'bg-accent font-bold text-primary-text')

/** Shared Workspace sidebar on Home and workspace pages (decisions #369, #370, #372, #378). */
export function WorkspaceSidebar() {
  const { data: home } = useHome()
  const { workspaceId } = useParams()
  // None expanded on Home; the current workspace is expanded on its pages (WEB-04). The layout stays mounted
  // between workspaces, so on a workspace change the new one is added and rows the person opened stay open
  // (state adjusted during render).
  const [open, setOpen] = useState(() => new Set<string>(workspaceId ? [workspaceId] : []))
  const [openFor, setOpenFor] = useState(workspaceId)
  if (openFor !== workspaceId) {
    setOpenFor(workspaceId)
    if (workspaceId) setOpen((prev) => new Set(prev).add(workspaceId))
  }
  const isOpen = (id: string) => open.has(id)

  if (!home || home.workspaces.length === 0) return null

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const groups = [
    { title: 'Your workspaces', items: byName(home.workspaces.filter((w) => w.role !== null)) },
    { title: 'Guest workspaces', items: byName(home.workspaces.filter((w) => w.role === null)) },
  ].filter((g) => g.items.length > 0)

  return (
    <nav aria-label="Workspaces" className="flex w-60 shrink-0 flex-col gap-5">
      {/* Visible way back to Home from workspace pages; highlighted on Home (decision #378). */}
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-bold hover:bg-accent',
            isActive && 'bg-accent text-primary-text',
          )
        }
      >
        <House aria-hidden="true" className="size-5" />
        Home
      </NavLink>
      {groups.map((g) => (
        <div key={g.title} className="flex flex-col gap-1">
          <h2 className="px-2 text-xs font-bold text-muted-foreground uppercase">{g.title}</h2>
          <ul className="flex flex-col gap-0.5">
            {g.items.map((w) => (
              <WorkspaceRow
                key={w.id}
                workspace={w}
                open={isOpen(w.id)}
                onToggle={() => toggle(w.id)}
              />
            ))}
          </ul>
        </div>
      ))}
      {home.hasArchivedWorkspaces && (
        // shortcut: the WEB-20 route lands with its own card; WEB-13 until then.
        <Link to="/archived-workspaces" className={cn(ITEM, 'font-bold text-primary-text')}>
          View archived workspaces
        </Link>
      )}
    </nav>
  )
}

type WorkspaceRowProps = { workspace: WorkspaceTile; open: boolean; onToggle: () => void }

function WorkspaceRow({ workspace: w, open, onToggle }: WorkspaceRowProps) {
  const base = `/w/${w.id}`
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        title={w.name}
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm font-bold outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span
          aria-hidden="true"
          className="grid size-6 shrink-0 place-items-center rounded-sm bg-primary text-xs text-primary-foreground"
        >
          {w.name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate">{w.name}</span>
        <ChevronRight aria-hidden="true" className={cn('size-4', open && 'rotate-90')} />
      </button>
      {open && (
        <ul className="flex flex-col gap-0.5 py-1 pl-8">
          <li>
            <NavLink to={base} end className={itemClass}>
              Boards
            </NavLink>
          </li>
          {w.role === 'admin' && (
            <>
              <li>
                <NavLink to={`${base}/members`} className={itemClass}>
                  Members
                </NavLink>
              </li>
              <li>
                <NavLink to={`${base}/settings`} className={itemClass}>
                  Settings
                </NavLink>
              </li>
            </>
          )}
        </ul>
      )}
    </li>
  )
}
