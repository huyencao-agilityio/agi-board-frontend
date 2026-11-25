import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'
import BrandMark from '@/components/common/BrandMark'
import Spinner from '@/components/common/Spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GoogleButton } from '@/features/auth/components/GoogleButton'
import { PasswordInput } from '@/features/auth/components/PasswordInput'
import { RuleList } from '@/features/auth/components/RuleList'
import { BTN, FIELD, LABEL, LINK } from '@/features/auth/components/styles'
import { useSignUp } from '@/features/auth/hooks'
import { MESSAGES } from '@/features/auth/messages'
import { isValidPassword, passwordRules } from '@/features/auth/password-rules'
import { setPendingPassword } from '@/features/auth/pending-password'
import { newVerifyState } from '@/features/auth/verify-state'
import { errorCode } from '@/lib/api'

// WEB-02 Sign up.
// EMAIL_ALREADY_EXISTS 409 tells that an email has an account; accepted in decision #367.

const emailSchema = z.string().trim().pipe(z.email('Enter a valid email address.'))

const schema = z
  .object({ fullName: z.string().trim().min(1), email: emailSchema, password: z.string() })
  .refine((v) => isValidPassword(v.password, v.email), { path: ['password'] })

export default function SignUpPage() {
  const navigate = useNavigate()
  const signUp = useSignUp()
  const [banner, setBanner] = useState<string | null>(null)
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { fullName: '', email: '', password: '' },
  })
  const { email = '', password = '' } = useWatch({ control })
  const busy = signUp.isPending
  const emailError = errors.email?.message

  const onSubmit = handleSubmit((values) => {
    setBanner(null)
    signUp.mutate(values, {
      onSuccess: () => {
        setPendingPassword(values.email, values.password)
        navigate('/verify-email', { state: newVerifyState(values.email) })
      },
      onError: (e) =>
        setBanner(
          errorCode(e) === 'EMAIL_ALREADY_EXISTS' ? MESSAGES.emailExists : MESSAGES.generic,
        ),
    })
  })

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-4">
      <div className="flex justify-center">
        <BrandMark className="size-12 rounded-[14px]" />
      </div>

      {banner && (
        <div
          role="alert"
          className="rounded-md bg-(--color-danger-soft) px-3.5 py-3 text-[13px] text-destructive"
        >
          {banner}
        </div>
      )}

      <h1 className="text-center text-[22px] font-black">Sign up</h1>

      <GoogleButton />

      <div className="flex items-center gap-3 text-[13px] text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        or
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="full-name" className={LABEL}>
          Full name
        </label>
        <Input
          className={FIELD}
          id="full-name"
          autoComplete="name"
          placeholder="Full name"
          disabled={busy}
          {...register('fullName')}
        />
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
          aria-describedby={emailError ? 'email-error email-rules' : 'email-rules'}
          {...register('email')}
        />
        {emailError && (
          <p id="email-error" role="alert" className="text-xs text-destructive">
            {emailError}
          </p>
        )}
        <RuleList
          id="email-rules"
          empty={!email}
          rules={[{ label: 'A valid email address', ok: emailSchema.safeParse(email).success }]}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={LABEL}>
          Password
        </label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          disabled={busy}
          aria-describedby="password-rules"
          {...register('password')}
        />
        <RuleList id="password-rules" empty={!password} rules={passwordRules(password, email)} />
      </div>

      <Button type="submit" className={BTN} disabled={!isValid || busy} aria-busy={busy}>
        {busy ? (
          <>
            <Spinner />
            <span className="sr-only">Signing up</span>
          </>
        ) : (
          'Sign up'
        )}
      </Button>

      <p className="text-center">
        <Link to="/signin" className={LINK}>
          Already have an account? Sign in
        </Link>
      </p>
    </form>
  )
}
