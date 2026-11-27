import { useQueryClient } from '@tanstack/react-query'
import { Link, Outlet, useNavigate } from 'react-router'
import { Avatar } from '@/components/common/Avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { logOut } from '@/features/auth/api'
import { useSession } from '@/features/auth/session'

// Shared header. Search, Create and Notifications are added in their sprints (F-10, F-05, F-11).
export default function AppLayout() {
  const { data: user } = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const isSystemAdmin = user?.systemRole === 'SUPPORT' || user?.systemRole === 'SUPER_ADMIN'

  const handleLogOut = () => {
    // Not awaited: a failed or stalled request must not keep the user on the page (card #54).
    // The CSRF header is read when the call starts, so clearing state right after is safe.
    void logOut().catch(() => {})
    queryClient.clear()
    // Signed out without refetching /auth/me: a still-valid cookie must not bounce the user back in.
    queryClient.setQueryData(['session'], null)
    navigate('/signin', { replace: true })
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b bg-card px-6">
        {/* Same centered width as the page content (max-w-300), so the header lines up on wide screens. */}
        <div className="mx-auto flex h-15 w-full max-w-300 items-center gap-4">
          <Link to="/" className="flex-1 text-lg font-black text-primary-text">
            AGI Board
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost">
                {/* Decorative here: the button's name is the person's name. */}
                {user && (
                  <span aria-hidden="true" className="contents">
                    <Avatar name={user.name} url={user.avatarUrl} size="sm" />
                  </span>
                )}
                {user?.name}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/profile">Profile</Link>
              </DropdownMenuItem>
              {isSystemAdmin && (
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/admin/users">Admin console</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="cursor-pointer" onSelect={handleLogOut}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
