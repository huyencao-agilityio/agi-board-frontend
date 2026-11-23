import { useMutation, useQueryClient } from '@tanstack/react-query'
import { signIn } from './api'
import { toSessionUser } from './session'

/** Signs in and seeds the session cache, so the guards let the user in without another round trip. */
export function useSignIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: signIn,
    onSuccess: (res) => queryClient.setQueryData(['session'], toSessionUser(res)),
  })
}
