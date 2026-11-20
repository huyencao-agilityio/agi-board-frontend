import { useQueryClient } from '@tanstack/react-query'
import { Link, Outlet, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSession } from '@/features/auth/session'
import { api } from '@/lib/api'

// Shared header. Search, Create and Notifications are added in their sprints (F-10, F-05, F-11).
export default function AppLayout() {
  const { data: user } = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const isSystemAdmin = user?.systemRole === 'SUPPORT' || user?.systemRole === 'SUPER_ADMIN'

  const logOut = async () => {
    await api('/auth/logout', { method: 'POST' }) // logout is POST only (proposal 7.3)
    queryClient.clear()
    navigate('/signin', { replace: true })
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-15 items-center gap-4 border-b bg-card px-6">
        <Link to="/" className="flex-1 text-lg font-black text-primary-text">
          AGI Board
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost">{user?.name}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/profile">Profile</Link>
            </DropdownMenuItem>
            {isSystemAdmin && (
              <DropdownMenuItem asChild>
                <Link to="/admin/users">Admin console</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={logOut}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
