import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import BrandMark from '@/components/common/BrandMark'
import Spinner from '@/components/common/Spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useSignIn } from '@/features/auth/hooks'
import { ApiError } from '@/lib/api'
import { env } from '@/lib/env'

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

// Mockup sizes (WEB-01 states): 44px controls, 12px radius, bold labels/links.
const FIELD =
  'h-11 rounded-md bg-(--color-surface) px-3 text-[15px] disabled:opacity-100 md:text-[15px]'
const LABEL = 'text-[13px] font-bold'
const LINK = 'text-sm font-bold text-primary-text underline'
const BTN = 'h-11 w-full rounded-md px-5 font-bold disabled:opacity-45'

const MESSAGES = {
  wrong: 'Email or password is incorrect.',
  deactivated: 'This account has been deactivated. Contact your administrator.',
  locked: 'Too many attempts. Try again in 15 minutes.',
  google: 'Google sign-in failed. Try again.',
}

const URL_ERRORS: Record<string, string> = {
  google_failed: MESSAGES.google,
  account_deactivated: MESSAGES.deactivated,
}

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const code = (e.body as { error?: { code?: string } } | undefined)?.error?.code
    if (code === 'SIGN_IN_LOCKED') return MESSAGES.locked
    if (code === 'ACCOUNT_DEACTIVATED') return MESSAGES.deactivated
  }
  return MESSAGES.wrong
}

export default function SignInPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const login = useSignIn()
  const [showPassword, setShowPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
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

  // Coming back with the browser's back button restores the page from cache with the spinner still on.
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => e.persisted && setGoogleLoading(false)
    window.addEventListener('pageshow', reset)
    return () => window.removeEventListener('pageshow', reset)
  }, [])

  const onSubmit = handleSubmit((values) => {
    setBanner(null)
    login.mutate(values, {
      onSuccess: (res) => {
        if (res.next === 'verify-email') return navigate('/verify-email', { replace: true })
        // Only same-site paths: a "//host" or absolute next would be an open redirect.
        navigate(next && /^\/(?!\/)/.test(next) ? next : '/', { replace: true })
      },
      onError: (e) => setBanner(errorMessage(e)),
    })
  })

  function onGoogle() {
    setGoogleLoading(true)
    window.location.assign(`${env.VITE_API_BASE_URL}/auth/google`)
  }

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

      <Button
        type="button"
        variant="outline"
        className={cn(BTN, 'border-primary text-primary-text')}
        disabled={googleLoading}
        onClick={onGoogle}
      >
        {googleLoading && <Spinner />}
        Continue with Google
      </Button>

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
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            disabled={busy}
            className={cn(FIELD, 'pr-11')}
            {...register('password')}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1 right-1"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </Button>
        </div>
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
