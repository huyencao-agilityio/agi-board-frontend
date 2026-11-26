import { useQueryClient } from '@tanstack/react-query'
import { Navigate, Outlet } from 'react-router'
import PageNotAvailable from '@/components/common/PageNotAvailable'
import { SESSION_ENDED_KEY, useSession, type SystemRole } from '@/features/auth/session'

// Client guards only steer navigation and hide controls; the server enforces every permission.
// Guards sit above the layouts, so nothing renders until the session is known.

export function RequireAuth() {
  const { data: user, isPending } = useSession()
  const ended = useQueryClient().getQueryData(SESSION_ENDED_KEY)
  if (isPending) return null
  // Sign-in always lands on Home, so no ?next; "You were signed out." only when the session ended without a logout.
  if (!user) return <Navigate to={ended ? '/signin?notice=signed-out' : '/signin'} replace />
  return <Outlet />
}

export function RequireGuest() {
  // Waits like WaitForSession: forgot-password's POST needs the CSRF cookie, and a refetch after a failure must not unmount the page.
  const { data: user, isFetched } = useSession()
  if (!isFetched) return null
  return user ? <Navigate to="/" replace /> : <Outlet />
}

/** For pages open to anyone: the first GET sets the CSRF cookie their POST needs, so wait for it. */
export function WaitForSession() {
  // Not isPending: a refetch after a failed one is pending again and would unmount the page.
  const { isFetched } = useSession()
  return isFetched ? <Outlet /> : null
}

export function RequireSystemRole({ roles }: { roles: SystemRole[] }) {
  const { data: user } = useSession()
  return user && roles.includes(user.systemRole) ? <Outlet /> : <PageNotAvailable />
}
