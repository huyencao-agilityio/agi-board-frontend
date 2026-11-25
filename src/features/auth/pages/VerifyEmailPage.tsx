import { useEffect, useState, type SubmitEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import BrandMark from '@/components/common/BrandMark'
import Spinner from '@/components/common/Spinner'
import { Button } from '@/components/ui/button'
import { EMPTY_CODE, isFullCode } from '@/features/auth/code'
import { OtpInput } from '@/features/auth/components/OtpInput'
import { PasswordInput } from '@/features/auth/components/PasswordInput'
import { RuleList } from '@/features/auth/components/RuleList'
import { BTN, LABEL, LINK } from '@/features/auth/components/styles'
import { useResendCode, useVerifyEmail } from '@/features/auth/hooks'
import { MESSAGES } from '@/features/auth/messages'
import { isValidPassword, passwordRules } from '@/features/auth/password-rules'
import { clearPendingPassword, getPendingPassword } from '@/features/auth/pending-password'
import { newVerifyState, RESEND_SECONDS, type VerifyState } from '@/features/auth/verify-state'
import { errorCode } from '@/lib/api'

// WEB-16 Verify email.
// Branches only on the server's error code, never on what account the email has.

const TOAST_MS = 5000

const CODE_ERRORS: Record<string, string> = {
  INCORRECT_CODE: 'Incorrect code.',
  CODE_LOCKED: 'Too many attempts. Request a new code.',
  CODE_EXPIRED: 'This code has expired. Request a new code.',
}

function isVerifyState(state: unknown): state is VerifyState {
  const s = state as Partial<VerifyState> | null
  return typeof s?.email === 'string' && typeof s.resendAt === 'number'
}

export default function VerifyEmailPage() {
  const { state } = useLocation()
  // Opened without a sign-up or sign-in before it, for example by address.
  if (!isVerifyState(state)) return <Navigate to="/signin" replace />
  return <VerifyEmailForm key={state.email} email={state.email} resendAt={state.resendAt} />
}

/** Whole seconds left until `time` (at most the cooldown), updated every second. */
function useSecondsLeft(time: number) {
  const [now, setNow] = useState(Date.now)
  // `now` is up to date only while running, so right after a restart it can be too old.
  const left = Math.min(RESEND_SECONDS, Math.max(0, Math.ceil((time - now) / 1000)))
  const running = left > 0
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [running])
  return left
}

function VerifyEmailForm({ email, resendAt }: VerifyState) {
  const navigate = useNavigate()
  const verify = useVerifyEmail()
  const resend = useResendCode()
  const secondsLeft = useSecondsLeft(resendAt)
  const [held, setHeld] = useState(() => getPendingPassword(email))
  const [password, setPassword] = useState('')
  const [digits, setDigits] = useState(EMPTY_CODE)
  const [error, setError] = useState<{ text: string; aboutCode: boolean } | null>(null)
  const [locked, setLocked] = useState(false)
  const [toast, setToast] = useState(false)

  const busy = verify.isPending
  // Verifying an old code while a new one is being sent would report the old code's result.
  const codeLocked = busy || resend.isPending || locked
  const needsPassword = held === undefined
  const ready =
    isFullCode(digits) && !codeLocked && (!needsPassword || isValidPassword(password, email))

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(false), TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast])

  function submit(code: string) {
    setError(null)
    verify.mutate(
      { email, code, password: held ?? password },
      { onSuccess: () => navigate('/', { replace: true }), onError: onVerifyError },
    )
  }

  function onVerifyError(e: unknown) {
    const code = errorCode(e) ?? ''
    if (code === 'VALIDATION_FAILED' && !needsPassword) {
      // The password typed earlier breaks the rules, so it has to be typed again here.
      clearPendingPassword()
      setHeld(undefined)
      return
    }
    if (code === 'ACCOUNT_DEACTIVATED') {
      setError({ text: MESSAGES.deactivated, aboutCode: false })
      return
    }
    if (!(code in CODE_ERRORS)) {
      setError({ text: MESSAGES.generic, aboutCode: false })
      return
    }
    setError({ text: CODE_ERRORS[code], aboutCode: true })
    setLocked(code === 'CODE_LOCKED')
    setDigits(EMPTY_CODE)
  }

  function onResend() {
    const restartCountdown = () =>
      navigate('/verify-email', { replace: true, state: newVerifyState(email) })
    resend.mutate(
      { email },
      {
        onSuccess: () => {
          setDigits(EMPTY_CODE)
          setError(null)
          setLocked(false)
          setToast(true)
          void restartCountdown()
        },
        onError: (e) => {
          if (errorCode(e) === 'RESEND_TOO_SOON') void restartCountdown()
          else setError({ text: MESSAGES.generic, aboutCode: false })
        },
      },
    )
  }

  function onFormSubmit(e: SubmitEvent) {
    e.preventDefault()
    if (ready) submit(digits.join(''))
  }

  return (
    <form onSubmit={onFormSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex justify-center">
        <BrandMark className="size-12 rounded-[14px]" />
      </div>

      <h1 className="text-center text-[22px] font-black">Verify email</h1>

      <p className="text-center text-xs wrap-anywhere text-muted-foreground">
        Enter the 6-digit code we sent to {email}.
      </p>

      <OtpInput
        value={digits}
        onChange={(next) => {
          setDigits(next)
          setError(null)
        }}
        onComplete={(code) => {
          if (!needsPassword) submit(code)
        }}
        disabled={codeLocked}
        invalid={!!error?.aboutCode}
        describedBy={error ? 'code-error' : undefined}
      />
      {error && (
        <p id="code-error" role="alert" className="text-center text-xs text-destructive">
          {error.text}
        </p>
      )}

      {needsPassword && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className={LABEL}>
            Password
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            // With a full code the field appears because the server refused the held password.
            autoFocus={isFullCode(digits)}
            disabled={busy}
            aria-describedby="password-rules"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <RuleList id="password-rules" empty={!password} rules={passwordRules(password, email)} />
        </div>
      )}

      <Button type="submit" className={BTN} disabled={!ready} aria-busy={busy}>
        {busy ? (
          <>
            <Spinner />
            <span className="sr-only">Verifying</span>
          </>
        ) : (
          'Verify'
        )}
      </Button>

      <div className="text-center">
        {secondsLeft > 0 ? (
          <span className="text-xs text-muted-foreground">Resend in {secondsLeft}s</span>
        ) : (
          <button
            type="button"
            className={LINK}
            disabled={busy || resend.isPending}
            onClick={onResend}
          >
            Resend code
          </button>
        )}
      </div>

      <p className="text-center">
        <Link to="/signup" className={LINK} onClick={clearPendingPassword}>
          Back to sign up
        </Link>
      </p>

      <div role="status" className="fixed right-6 bottom-6">
        {toast && (
          <p className="rounded-md bg-(--color-inverse-bg) px-[18px] py-3 text-sm font-bold text-(--color-inverse-text)">
            A new code has been sent.
          </p>
        )}
      </div>
    </form>
  )
}
