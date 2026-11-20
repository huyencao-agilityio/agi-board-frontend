import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 401/403/404 will not change on retry; the UI handles them.
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
      // Let the route error boundary show WEB-13 for missing or inaccessible items.
      throwOnError: (error) =>
        error instanceof ApiError && (error.status === 403 || error.status === 404),
    },
  },
})
