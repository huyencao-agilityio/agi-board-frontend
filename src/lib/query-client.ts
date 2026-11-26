import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError, errorCode } from '@/lib/api'

/** Key set when a 401 says the session was ended or expired (not a normal logout). */
export const SESSION_ENDED_KEY = ['session-ended']

export function createQueryClient() {
  // Any request may find the session ended elsewhere (e.g. signed out from another device's Profile):
  // clearing ['session'] lets RequireAuth send the user to sign-in. Only SESSION_ENDED: sign-in's
  // 401 INVALID_CREDENTIALS must stay on the form.
  const onError = (error: unknown) => {
    if (errorCode(error) !== 'SESSION_ENDED') return
    // A forced sign-out is a logout: the next person must see nothing of this one's data.
    client.removeQueries({ predicate: ({ queryKey: [name] }) => name !== 'session' })
    client.setQueryData(SESSION_ENDED_KEY, true)
    client.setQueryData(['session'], null)
  }
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
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
  return client
}

export const queryClient = createQueryClient()
