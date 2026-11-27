import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router'
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

// Required, trimmed, 1–100 characters (card #6, decision #379; matches the backend DTO), names may repeat (#231).
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a workspace name.')
    .max(100, 'Use 100 characters or fewer.'),
})

const ENTRY = { createWorkspace: true }

/**
 * WEB-D16 Create workspace, with its `Create workspace` trigger button.
 * Opening pushes a same-URL history entry so browser Back closes only the dialog (#349); `open` stays
 * local so a reload never reopens it.
 */
export function CreateWorkspaceDialog() {
  const [open, setOpen] = useState(false)
  const create = useCreateWorkspace()
  const navigate = useNavigate()
  const location = useLocation()
  const atEntry = (location.state as typeof ENTRY | null)?.createWorkspace === true
  // Not '.': on an index route that resolves to `/?index`.
  const here = { pathname: location.pathname, search: location.search, hash: location.hash }
  const { register, handleSubmit, formState, reset } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { name: '' },
  })
  const nameError = formState.errors.name?.message

  const close = () => {
    setOpen(false)
    // A reopened dialog starts empty, without the banner (#237).
    reset()
    create.reset()
  }

  const onOpenChange = (next: boolean) => {
    if (create.isPending) return // Esc, outside click and Cancel ignored while Processing
    if (next) {
      setOpen(true)
      // After a reload or Forward the current entry may already be ours: reuse it, so one Back closes.
      navigate(here, { state: ENTRY, replace: atEntry })
    } else {
      close()
      if (atEntry) navigate(-1) // drop the entry this dialog pushed
    }
  }

  // Browser Back popped our entry: close, or while Processing put the entry back (Back ignored).
  // shortcut: two quick Backs while Processing can pop past Home before the entry is restored; the
  // History API cannot block Back, revisit only if users report it.
  // Syncs with browser history (an external system), so closing from the effect is intended.
  useEffect(() => {
    if (!open || atEntry) return
    if (create.isPending) navigate(here, { state: ENTRY })
    // oxlint-disable-next-line react/set-state-in-effect -- history pop is external
    else close()
    // Deps limited to atEntry on purpose: adding `open` would close the dialog before its push lands.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [atEntry])

  const onSubmit = handleSubmit(({ name }) => {
    // Line breaks become spaces (#239).
    create.mutate(
      { name: name.replace(/[\r\n]+/g, ' ') },
      {
        onSuccess: (workspace) => {
          setOpen(false)
          reset()
          // Replaces the dialog's entry, so Back from WEB-04 returns to Home without the dialog.
          navigate(`/w/${workspace.id}`, { replace: true })
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
              {create.isPending ? (
                <>
                  <Spinner />
                  <span className="sr-only">Creating workspace</span>
                </>
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
