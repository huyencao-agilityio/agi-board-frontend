import { useEffect, useState, type SubmitEvent } from 'react'
import { BTN, LABEL } from '@/components/common/form-styles'
import { PasswordInput } from '@/components/common/PasswordInput'
import { RuleList } from '@/components/common/RuleList'
import Spinner from '@/components/common/Spinner'
import { Button } from '@/components/ui/button'
import { errorCode } from '@/lib/api'
import { isValidPassword, passwordRules } from '@/lib/password-rules'
import { cn } from '@/lib/utils'
import type { Profile } from '../api'
import { useChangePassword } from '../hooks'
import { CARD, ERROR, HEADING, type Report } from './styles'

const MESSAGES = {
  wrong: 'Current password is incorrect.',
  same: 'New password must be different from the current one.',
  locked: 'Too many attempts. Try again in 15 minutes.',
}

type Props = { profile: Profile; onToast: (text: string) => void } & Report

export function PasswordSection({ profile, onToast, onStart, onFail }: Props) {
  const change = useChangePassword()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [serverError, setServerError] = useState<'wrong' | 'same' | null>(null)

  // The lock end comes from the server, so it holds across reloads. `passed` is the lock end that
  // is over; set from a timer so render stays pure (0 ms when it was already over on load).
  const lockedUntil = profile.changePasswordLockedUntil
  const [passed, setPassed] = useState<string | null>(null)
  useEffect(() => {
    if (!lockedUntil) return
    const timer = setTimeout(
      () => setPassed(lockedUntil),
      Math.max(0, Date.parse(lockedUntil) - Date.now()),
    )
    return () => clearTimeout(timer)
  }, [lockedUntil])
  // Truthy check, not `!== null`: a backend without the field sends undefined, which means not locked.
  const locked = !!lockedUntil && passed !== lockedUntil

  const busy = change.isPending
  const same = (current !== '' && current === next) || serverError === 'same'
  const wrong = serverError === 'wrong'
  const currentError = locked ? MESSAGES.locked : wrong ? MESSAGES.wrong : null
  // `wrong` too: resending the same wrong password would only count toward the lock.
  const ready =
    current !== '' && isValidPassword(next, profile.email) && !same && !wrong && !locked && !busy

  function onSubmit(e: SubmitEvent) {
    e.preventDefault()
    if (!ready) return
    onStart()
    setServerError(null)
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setCurrent('')
          setNext('')
          onToast('Password updated')
        },
        onError: (err) => {
          const code = errorCode(err)
          if (code === 'CURRENT_PASSWORD_INCORRECT') setServerError('wrong')
          else if (code === 'NEW_PASSWORD_SAME_AS_CURRENT') setServerError('same')
          // The lock time is stored by useChangePassword.
          else if (code !== 'CHANGE_PASSWORD_LOCKED') onFail()
        },
      },
    )
  }

  return (
    <section aria-labelledby="password-heading" className={CARD}>
      <h2 id="password-heading" className={HEADING}>
        Password
      </h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="current-password" className={LABEL}>
            Current password
          </label>
          <PasswordInput
            id="current-password"
            autoComplete="current-password"
            value={current}
            disabled={busy}
            aria-invalid={currentError !== null}
            aria-describedby={currentError ? 'current-password-error' : undefined}
            onChange={(e) => {
              setCurrent(e.target.value)
              setServerError(null)
            }}
          />
          {currentError && (
            <p id="current-password-error" role="alert" className={ERROR}>
              {currentError}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-password" className={LABEL}>
            New password
          </label>
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            value={next}
            disabled={busy}
            aria-invalid={same}
            aria-describedby={same ? 'new-password-error new-password-rules' : 'new-password-rules'}
            onChange={(e) => {
              setNext(e.target.value)
              setServerError(null)
            }}
          />
          {same && (
            <p id="new-password-error" role="alert" className={ERROR}>
              {MESSAGES.same}
            </p>
          )}
          <RuleList
            id="new-password-rules"
            rules={passwordRules(next, profile.email)}
            empty={next === ''}
          />
        </div>
        <div>
          <Button type="submit" className={cn(BTN, 'w-auto')} disabled={!ready}>
            {busy ? <Spinner /> : null}
            <span className={cn(busy && 'sr-only')}>Change password</span>
          </Button>
        </div>
      </form>
    </section>
  )
}
