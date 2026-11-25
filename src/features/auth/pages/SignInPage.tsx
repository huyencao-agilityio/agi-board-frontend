import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import BrandMark from '@/components/common/BrandMark'
import Spinner from '@/components/common/Spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GoogleButton } from '@/features/auth/components/GoogleButton'
import { PasswordInput } from '@/features/auth/components/PasswordInput'
import { BTN, FIELD, LABEL, LINK } from '@/features/auth/components/styles'
import { useSignIn } from '@/features/auth/hooks'
import { MESSAGES } from '@/features/auth/messages'
import { setPendingPassword } from '@/features/auth/pending-password'
import { newVerifyState } from '@/features/auth/verify-state'
import { errorCode } from '@/lib/api'

// WEB-01 Sign in.
// API: see features/auth/api.ts. Errors: ACCOUNT_DEACTIVATED 403, SIGN_IN_LOCKED 429, else INVALID_CREDENTIALS/VALIDATION_FAILED.
// Google: browser redirect to GET /auth/google; the callback returns to /sign-in?error=google_failed|account_deactivated.

// No strength rules at sign-in (ticket): the password only has to be present.
const schema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1),
})

const NOTICES: Record<string, string> = {
  'password-updated': 'Password updated. Sign in with your new password.', // from WEB-15
  'signed-out': 'You were signed out. Sign in again.',
}

const URL_ERRORS: Record<string, string> = {
  google_failed: MESSAGES.google,
  account_deactivated: MESSAGES.deactivated,
}

function errorMessage(e: unknown): string {
  const code = errorCode(e)
  if (code === 'SIGN_IN_LOCKED') return MESSAGES.locked
  if (code === 'ACCOUNT_DEACTIVATED') return MESSAGES.deactivated
  return MESSAGES.wrong
}

export default function SignInPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const login = useSignIn()
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  })

  const next = params.get('next')
  const notice = NOTICES[params.get('notice') ?? '']
  const [banner, setBanner] = useState<string | null>(URL_ERRORS[params.get('error') ?? ''] ?? null)
  const busy = login.isPending
  const emailError = errors.email?.message

  // The Google callback can only report its error in the URL; the banner above keeps it, so the URL need not.
  useEffect(() => {
    if (!params.has('error')) return
    const rest = new URLSearchParams(params)
    rest.delete('error')
    setParams(rest, { replace: true })
  }, [params, setParams])

  const onSubmit = handleSubmit((values) => {
    setBanner(null)
    login.mutate(values, {
      onSuccess: (res) => {
        if (res.next === 'verify-email') {
          setPendingPassword(res.user.email, values.password)
          return navigate('/verify-email', {
            replace: true,
            state: newVerifyState(res.user.email),
          })
        }
        // Only same-site paths: a "//host" or absolute next would be an open redirect.
        navigate(next && /^\/(?!\/)/.test(next) ? next : '/', { replace: true })
      },
      onError: (e) => setBanner(errorMessage(e)),
    })
  })

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-4">
      <div className="flex justify-center">
        <BrandMark className="size-12 rounded-[14px]" />
      </div>

      {banner ? (
        <div
          role="alert"
          className="rounded-md bg-(--color-danger-soft) px-3.5 py-3 text-[13px] text-destructive"
        >
          {banner}
        </div>
      ) : (
        notice && (
          <div role="status" className="rounded-md bg-(--color-info-soft) px-3.5 py-3 text-[13px]">
            {notice}
          </div>
        )
      )}

      <h1 className="text-center text-[22px] font-black">Sign in</h1>

      <GoogleButton />

      <div className="flex items-center gap-3 text-[13px] text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        or
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={LABEL}>
          Email
        </label>
        <Input
          className={FIELD}
          id="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          disabled={busy}
          aria-invalid={!!emailError}
          aria-describedby={emailError ? 'email-error' : undefined}
          {...register('email')}
        />
        {emailError && (
          <p id="email-error" role="alert" className="text-xs text-destructive">
            {emailError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={LABEL}>
          Password
        </label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          disabled={busy}
          {...register('password')}
        />
      </div>

      <div>
        <Link to="/forgot-password" className={LINK}>
          Forgot your password?
        </Link>
      </div>

      <Button type="submit" className={BTN} disabled={!isValid || busy} aria-busy={busy}>
        {busy ? (
          <>
            <Spinner />
            <span className="sr-only">Signing in</span>
          </>
        ) : (
          'Sign in'
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        No account?{' '}
        <Link to="/signup" className={LINK}>
          Create an account
        </Link>
      </p>
    </form>
  )
}
