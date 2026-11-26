import { useEffect, useState, type SubmitEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import BrandMark from '@/components/common/BrandMark'
import Spinner from '@/components/common/Spinner'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/features/auth/components/PasswordInput'
import { RuleList } from '@/features/auth/components/RuleList'
import { BTN, LABEL, LINK } from '@/features/auth/components/styles'
import { useResetLink, useResetPassword } from '@/features/auth/hooks'
import { MESSAGES } from '@/features/auth/messages'
import { isValidPassword, passwordRules } from '@/features/auth/password-rules'
import { useSession } from '@/features/auth/session'
import { errorCode } from '@/lib/api'

// WEB-15 Reset password. Opened from the emailed link: /reset-password#token=...
// RESET_LINK_INVALID has one message for every cause, so it does not reveal which.

const ALERT = 'rounded-md bg-(--color-danger-soft) px-3.5 py-3 text-[13px] text-destructive'

const isInvalidLink = (e: unknown) => errorCode(e) === 'RESET_LINK_INVALID'

export default function ResetPasswordPage() {
  const { hash } = useLocation()
  const inUrl = new URLSearchParams(hash.slice(1)).get('token') ?? ''
  const [token, setToken] = useState(inUrl)
  // Another link opened in this tab; the empty hash after the clean-up keeps the token.
  if (inUrl && inUrl !== token) setToken(inUrl)
  return <ResetPassword key={token} token={token} />
}

function ResetPassword({ token }: { token: string }) {
  const { hash, pathname } = useLocation()
  const navigate = useNavigate()
  const link = useResetLink(token)
  const reset = useResetPassword()
  const { data: user } = useSession()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [confirmLeft, setConfirmLeft] = useState(false)

  const busy = reset.isPending
  const invalid = !token || isInvalidLink(link.error) || isInvalidLink(reset.error)
  const failed = !invalid && (link.isError || reset.isError)
  const email = link.data?.email
  const mismatch = confirmLeft && confirm !== password

  // After a failed check the token stays in the URL, so a reload tries again.
  const answered = invalid || link.isSuccess
  useEffect(() => {
    if (answered && hash) navigate(pathname, { replace: true })
  }, [answered, hash, pathname, navigate])

  function onSubmit(e: SubmitEvent) {
    e.preventDefault()
    reset.mutate(
      { token, password },
      { onSuccess: () => navigate('/signin?notice=password-updated', { replace: true }) },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center">
        <BrandMark className="size-12 rounded-[14px]" />
      </div>

      {failed && (
        <div role="alert" className={ALERT}>
          {MESSAGES.generic}
        </div>
      )}

      <h1 className="text-center text-[22px] font-black">Reset password</h1>

      {invalid ? (
        <>
          <div role="alert" className={ALERT}>
            This link has expired or was already used.
          </div>
          {/* /forgot-password is for guests (a signed-in person changes the password in Profile), so no link it would bounce. */}
          {!user && (
            <p className="text-center">
              <Link to="/forgot-password" className={LINK}>
                Request a new link
              </Link>
            </p>
          )}
        </>
      ) : email === undefined ? (
        link.isPending && (
          <div aria-busy="true" className="flex justify-center">
            <Spinner />
          </div>
        )
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className={LABEL}>
              New password
            </label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              disabled={busy}
              aria-describedby="password-rules"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <RuleList
              id="password-rules"
              empty={!password}
              rules={passwordRules(password, email)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm" className={LABEL}>
              Confirm new password
            </label>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              disabled={busy}
              aria-invalid={mismatch}
              aria-describedby={mismatch ? 'confirm-error' : undefined}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => setConfirmLeft(true)}
            />
            {mismatch && (
              <p id="confirm-error" role="alert" className="text-xs text-destructive">
                Passwords do not match.
              </p>
            )}
          </div>

          <Button
            type="submit"
            className={BTN}
            disabled={busy || confirm !== password || !isValidPassword(password, email)}
            aria-busy={busy}
          >
            {busy ? (
              <>
                <Spinner />
                <span className="sr-only">Setting new password</span>
              </>
            ) : (
              'Set new password'
            )}
          </Button>
        </form>
      )}
    </div>
  )
}
