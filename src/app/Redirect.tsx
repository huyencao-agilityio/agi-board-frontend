import { Navigate, useLocation } from 'react-router'

/** Redirects to another path and keeps the query string (e.g. ?error=google_failed). */
export default function Redirect({ to }: { to: string }) {
  const { search } = useLocation()
  return <Navigate to={{ pathname: to, search }} replace />
}
