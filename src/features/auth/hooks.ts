import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  checkResetLink,
  forgotPassword,
  resendCode,
  resetPassword,
  signIn,
  signUp,
  verifyEmail,
} from './api'
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

export function useForgotPassword() {
  return useMutation({ mutationFn: forgotPassword })
}

/** Checks the emailed link once; `data.email` is its account's. */
export function useResetLink(token: string) {
  return useQuery({
    queryKey: ['reset-link', token],
    queryFn: () => checkResetLink({ token }),
    enabled: token !== '',
    staleTime: Infinity,
    refetchOnWindowFocus: false, // would check a failed link again
    gcTime: 0, // the key holds the token
    throwOnError: false, // a 403 here is CSRF_INVALID, not WEB-13
  })
}

/** Sets the password, which ends the account's sessions, so nothing cached for the signed-in person may stay. */
export function useResetPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: resetPassword,
    gcTime: 0,
    onSuccess: () => {
      queryClient.setQueryData(['session'], null)
      // Not the link: its page is still mounted and would check the used link again.
      queryClient.removeQueries({
        predicate: ({ queryKey: [name] }) => name !== 'session' && name !== 'reset-link',
      })
    },
  })
}
