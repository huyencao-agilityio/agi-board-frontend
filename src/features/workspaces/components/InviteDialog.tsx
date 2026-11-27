import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { BTN, FIELD, LABEL } from '@/components/common/form-styles'
import Spinner from '@/components/common/Spinner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { errorCode } from '@/lib/api'
import { emailSchema } from '@/lib/email-schema'
import { cn } from '@/lib/utils'
import { useSendInvite } from '../hooks'

// The server lower-cases and compares ignoring case (017 FR-012), so the client only trims.
const schema = z.object({ email: emailSchema, role: z.enum(['admin', 'member']) })

// 409s the server answers for the address (017 FR-009, FR-010; INVITE_PENDING covers expired invites too).
const EMAIL_CONFLICTS: Record<string, string> = {
  ALREADY_MEMBER: 'This person is already a member.',
  INVITE_PENDING: 'This person already has a pending invite.',
}

type InviteDialogProps = {
  workspaceId: string
  /** Called on every open, so the page can drop its own banner. */
  onOpen: () => void
  onSent: () => void
}

/** WEB-D11 Invite to workspace, with its `Invite` button on WEB-05 (workspace admins only). */
export function InviteDialog({ workspaceId, onOpen, onSent }: InviteDialogProps) {
  const [open, setOpen] = useState(false)
  const send = useSendInvite(workspaceId)
  const { register, control, handleSubmit, formState, reset, setError } = useForm({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { email: '', role: 'member' as const },
  })
  const emailError = formState.errors.email?.message
  // A 409 is shown inline, so only other failures get the banner.
  const failed = send.isError && !EMAIL_CONFLICTS[errorCode(send.error) ?? '']

  const onOpenChange = (next: boolean) => {
    if (send.isPending) return // Cancel, Esc and outside click ignored while processing
    setOpen(next)
    if (next) onOpen()
    else {
      reset()
      send.reset()
    }
  }

  const onSubmit = handleSubmit((values) =>
    send.mutate(values, {
      onSuccess: () => {
        setOpen(false)
        reset()
        onSent()
      },
      onError: (e) => {
        const message = EMAIL_CONFLICTS[errorCode(e) ?? '']
        if (message) setError('email', { type: 'server', message })
      },
    }),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className={cn(BTN, 'w-auto')}>Invite</Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false} aria-describedby={undefined}>
        <DialogTitle className="text-xl font-extrabold">Invite</DialogTitle>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {failed && (
            <p
              role="alert"
              className="rounded-md bg-(--color-danger-soft) px-3.5 py-3 text-[13px] text-destructive"
            >
              Something went wrong. Try again.
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invite-email" className={LABEL}>
              Email
            </label>
            <Input
              id="invite-email"
              type="email"
              autoFocus
              className={FIELD}
              readOnly={send.isPending}
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? 'invite-email-error' : undefined}
              {...register('email')}
            />
            {emailError && (
              <p id="invite-email-error" role="alert" className="text-sm text-destructive">
                {emailError}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invite-role" className={LABEL}>
              Role
            </label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={send.isPending}
                >
                  <SelectTrigger id="invite-role" className={cn(FIELD, 'w-full')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className={cn(BTN, 'w-auto')}
              disabled={send.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={cn(BTN, 'w-auto')}
              disabled={!formState.isValid || !!emailError || send.isPending}
            >
              {send.isPending ? (
                <>
                  <Spinner />
                  <span className="sr-only">Sending invite</span>
                </>
              ) : (
                'Send invite'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
