import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
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
import { cn } from '@/lib/utils'
import { useCreateWorkspace } from '../hooks'

// Required, trimmed, no length limit, names may repeat (WEB-D16 #231).
const schema = z.object({ name: z.string().trim().min(1, 'Enter a workspace name.') })

/** WEB-D16 Create workspace, with its `Create workspace` trigger button. */
export function CreateWorkspaceDialog() {
  const [open, setOpen] = useState(false)
  const create = useCreateWorkspace()
  const navigate = useNavigate()
  const { register, handleSubmit, formState, reset } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { name: '' },
  })
  const nameError = formState.errors.name?.message

  const onOpenChange = (next: boolean) => {
    if (create.isPending) return // Esc, outside click and Cancel ignored while Processing
    setOpen(next)
    if (!next) {
      // A reopened dialog starts empty, without the banner (#237).
      reset()
      create.reset()
    }
  }

  const onSubmit = handleSubmit(({ name }) => {
    // Line breaks become spaces (#239).
    create.mutate(
      { name: name.replace(/[\r\n]+/g, ' ') },
      {
        onSuccess: (workspace) => {
          setOpen(false)
          reset()
          navigate(`/w/${workspace.id}`)
        },
      },
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="h-10 px-4 font-bold">Create workspace</Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false} aria-describedby={undefined}>
        <DialogTitle className="text-xl font-extrabold">Create workspace</DialogTitle>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {create.isError && (
            <p
              role="alert"
              className="rounded-md bg-(--color-danger-soft) px-3.5 py-3 text-[13px] text-destructive"
            >
              Something went wrong. Try again.
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="workspace-name" className={LABEL}>
              Workspace name
            </label>
            <Input
              id="workspace-name"
              autoFocus
              className={FIELD}
              readOnly={create.isPending}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? 'workspace-name-error' : undefined}
              {...register('name', {
                // The banner clears as soon as the name is edited (#237).
                onChange: () => create.isError && create.reset(),
              })}
            />
            {nameError && (
              <p id="workspace-name-error" role="alert" className="text-sm text-destructive">
                {nameError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className={cn(BTN, 'w-auto')}
              disabled={create.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={cn(BTN, 'w-auto')}
              disabled={!formState.isValid || create.isPending}
            >
              {create.isPending ? <Spinner /> : null}
              <span className={cn(create.isPending && 'sr-only')}>Create</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
