import { useQueryClient } from '@tanstack/react-query'
import { Navigate, Outlet, useLocation } from 'react-router'
import PageNotAvailable from '@/components/common/PageNotAvailable'
import { SESSION_ENDED_KEY, useSession, type SystemRole } from '@/features/auth/session'

// Client guards only steer navigation and hide controls; the server enforces every permission.

export function RequireAuth() {
  const { data: user, isPending } = useSession()
  const location = useLocation()
  const ended = useQueryClient().getQueryData(SESSION_ENDED_KEY)
  if (isPending) return null
  if (!user) {
    // Opening the app at "/" needs no ?next; "You were signed out." only when the session ended without a logout.
    const params = new URLSearchParams()
    const path = location.pathname + location.search
    if (path !== '/') params.set('next', path)
    if (ended) params.set('notice', 'signed-out')
    const query = params.toString()
    return <Navigate to={`/signin${query ? `?${query}` : ''}`} replace />
  }
  return <Outlet />
}

export function RequireGuest() {
  const { data: user, isPending } = useSession()
  if (isPending) return null
  return user ? <Navigate to="/" replace /> : <Outlet />
}

export function RequireSystemRole({ roles }: { roles: SystemRole[] }) {
  const { data: user } = useSession()
  return user && roles.includes(user.systemRole) ? <Outlet /> : <PageNotAvailable />
}
