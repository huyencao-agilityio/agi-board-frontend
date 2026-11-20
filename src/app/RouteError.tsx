import { useRouteError } from 'react-router'
import PageNotAvailable from '@/components/common/PageNotAvailable'
import { ApiError } from '@/lib/api'

/** Missing or inaccessible items show WEB-13; anything else is a real error. */
export default function RouteError() {
  const error = useRouteError()
  if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
    return <PageNotAvailable />
  }
  return (
    <div role="alert" className="p-8">
      <h1 className="text-xl font-bold">Something went wrong.</h1>
    </div>
  )
}
