// Technical page, not in the BRD: confirms this build reaches the API (baked URL, CORS) and the API reaches its database.
import { useQuery } from '@tanstack/react-query'
import { ApiError, api } from '@/lib/api'
import { cn } from '@/lib/utils'

const CHECKS = [
  { name: 'API', path: '/health' },
  { name: 'Database', path: '/health/db' },
] as const

function StatusRow({ name, path }: (typeof CHECKS)[number]) {
  const { isPending, isError, error } = useQuery({
    queryKey: ['status', path],
    queryFn: () => api<{ status: string }>(path),
    // A health check must report the first failure as is: no retries, no route error boundary.
    retry: false,
    throwOnError: false,
  })

  const result = isPending
    ? 'Checking…'
    : isError
      ? `Error (${error instanceof ApiError ? error.status : 'unreachable'})`
      : 'OK'

  return (
    <li
      className={cn('font-bold', isError ? 'text-destructive' : !isPending && 'text-primary-text')}
    >
      {name}: {result}
    </li>
  )
}

export default function StatusPage() {
  return (
    <main className="flex flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-extrabold">Status</h1>
      <ul className="flex flex-col gap-2" aria-live="polite">
        {CHECKS.map((check) => (
          <StatusRow key={check.path} {...check} />
        ))}
      </ul>
    </main>
  )
}
