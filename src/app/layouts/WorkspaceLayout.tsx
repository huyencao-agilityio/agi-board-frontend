import { NavLink, Outlet } from 'react-router'
import { cn } from '@/lib/utils'

// Workspace tabs. Settings and Audit log are hidden for non-admins once the workspace role is loaded (Sprint 1).
const tabs = [
  { to: '.', label: 'Boards', end: true },
  { to: 'members', label: 'Members' },
  { to: 'settings', label: 'Settings' },
  { to: 'closed-boards', label: 'Closed boards' },
  { to: 'audit-log', label: 'Audit log' },
]

export default function WorkspaceLayout() {
  return (
    <div className="mx-auto flex max-w-275 flex-col gap-5">
      <nav className="flex gap-1 border-b">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                'border-b-2 px-3 py-2 text-sm font-bold',
                isActive
                  ? 'border-primary text-primary-text'
                  : 'border-transparent text-muted-foreground',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
