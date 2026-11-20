import { Navigate, Outlet, useLocation } from 'react-router'
import PageNotAvailable from '@/components/common/PageNotAvailable'
import { useSession, type SystemRole } from '@/features/auth/session'

// Client guards only steer navigation and hide controls; the server enforces every permission.

export function RequireAuth() {
  const { data: user, isPending } = useSession()
  const location = useLocation()
  if (isPending) return null
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/signin?next=${next}`} replace />
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
