import { useMutation, useQueryClient } from '@tanstack/react-query'
import { resendCode, signIn, signUp, verifyEmail } from './api'
import { clearPendingPassword } from './pending-password'
import { toSessionUser } from './session'

// gcTime 0 on the mutations that carry a password: the cache would keep their variables for 5 minutes.

/** Signs in and, for a verified account, seeds the session cache, so the guards let the user in without another round trip. */
export function useSignIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: signIn,
    gcTime: 0,
    onSuccess: (res) => {
      // An unverified account gets no session: WEB-16 starts it.
      if (res.next !== 'home') return
      clearPendingPassword()
      queryClient.setQueryData(['session'], toSessionUser(res))
    },
  })
}

export function useSignUp() {
  return useMutation({ mutationFn: signUp, gcTime: 0 })
}

/** Verifies the email, which starts the session. Runs here, not in the page, which may be closed by then. */
export function useVerifyEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: verifyEmail,
    gcTime: 0,
    onSuccess: (res) => {
      clearPendingPassword()
      queryClient.setQueryData(['session'], toSessionUser(res))
    },
  })
}

export function useResendCode() {
  return useMutation({ mutationFn: resendCode })
}
