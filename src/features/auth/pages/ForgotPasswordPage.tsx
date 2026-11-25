import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { z } from 'zod'
import BrandMark from '@/components/common/BrandMark'
import Spinner from '@/components/common/Spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BTN, FIELD, LABEL, LINK } from '@/features/auth/components/styles'
import { emailSchema } from '@/features/auth/email-schema'
import { useForgotPassword } from '@/features/auth/hooks'
import { MESSAGES } from '@/features/auth/messages'

// WEB-14 Forgot password.
// Never branches on an error code: the screen must be the same for every email.

const schema = z.object({ email: emailSchema })

export default function ForgotPasswordPage() {
  const request = useForgotPassword()
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { email: '' },
  })
  const busy = request.isPending
  const emailError = errors.email?.message

  const onSubmit = handleSubmit((values) => request.mutate(values))

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-4">
      <div className="flex justify-center">
        <BrandMark className="size-12 rounded-[14px]" />
      </div>

      {request.isError && (
        <div
          role="alert"
          className="rounded-md bg-(--color-danger-soft) px-3.5 py-3 text-[13px] text-destructive"
        >
          {MESSAGES.generic}
        </div>
      )}

      <h1 className="text-center text-[22px] font-black">Forgot password</h1>
      <p className="text-center text-xs text-muted-foreground">
        We will email a reset link valid for 30 minutes.
      </p>

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
          {...register('email', {
            onChange: () => {
              if (request.isSuccess) request.reset()
            },
          })}
        />
        {emailError && (
          <p id="email-error" role="alert" className="text-xs text-destructive">
            {emailError}
          </p>
        )}
      </div>

      <Button type="submit" className={BTN} disabled={!isValid || busy} aria-busy={busy}>
        {busy ? (
          <>
            <Spinner />
            <span className="sr-only">Sending reset link</span>
          </>
        ) : (
          'Send reset link'
        )}
      </Button>

      {request.isSuccess && (
        <div role="status" className="rounded-md bg-(--color-info-soft) px-3.5 py-3 text-[13px]">
          If this email has an account, we've sent a reset link.
        </div>
      )}

      <p className="text-center">
        <Link to="/signin" className={LINK}>
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
