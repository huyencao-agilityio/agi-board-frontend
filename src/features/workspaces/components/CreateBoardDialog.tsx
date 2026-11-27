import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, Users } from 'lucide-react'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { WorkspaceTile } from '../api'
import { useCreateBoard } from '../hooks'

// Required and trimmed, no maximum length, titles may repeat (decision #118).
const schema = z.object({
  name: z.string().trim().min(1, 'Enter a board title.'),
  visibility: z.enum(['workspace', 'private']),
})

// Tooltip text is (proposed) in specs/23 Clarifications.
const VISIBILITY = [
  {
    value: 'workspace',
    label: 'Workspace',
    Icon: Users,
    hint: 'All members of the workspace can see this board.',
  },
  {
    value: 'private',
    label: 'Private',
    Icon: Lock,
    hint: 'Only board members can see this board.',
  },
] as const

type CreateBoardDialogProps = { workspace: Pick<WorkspaceTile, 'id' | 'name'> }

/** WEB-D01 Create board, with its `Create new board` tile; shown to workspace admins only (decision #59). */
export function CreateBoardDialog({ workspace }: CreateBoardDialogProps) {
  const [open, setOpen] = useState(false)
  const create = useCreateBoard(workspace.id)
  const navigate = useNavigate()
  const { register, handleSubmit, formState, reset } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { name: '', visibility: 'workspace' as const },
  })
  const nameError = formState.errors.name?.message

  const onOpenChange = (next: boolean) => {
    if (create.isPending) return // Cancel, Esc and outside click ignored while Processing (#120)
    setOpen(next)
    if (!next) {
      // A reopened dialog starts empty, without the banner.
      reset()
      create.reset()
    }
  }

  const onSubmit = handleSubmit((values) =>
    create.mutate(values, {
      onSuccess: (board) => {
        setOpen(false)
        reset()
        navigate(`/b/${board.id}`)
      },
    }),
  )

  return (
    <li>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="grid size-full min-h-26 place-items-center rounded-md border border-dashed bg-muted px-4 text-sm font-bold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Create new board
          </button>
        </DialogTrigger>
        <DialogContent showCloseButton={false} aria-describedby={undefined}>
          <DialogTitle className="text-xl font-extrabold">Create board</DialogTitle>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            {/* Stays while the title is edited, until `Create` is clicked again (019 AS4.4). */}
            {create.isError && (
              <p
                role="alert"
                className="rounded-md bg-(--color-danger-soft) px-3.5 py-3 text-[13px] text-destructive"
              >
                Something went wrong. Try again.
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="board-title" className={LABEL}>
                Board title
              </label>
              <Input
                id="board-title"
                autoFocus
                className={FIELD}
                readOnly={create.isPending}
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? 'board-title-error' : undefined}
                {...register('name')}
              />
              {nameError && (
                <p id="board-title-error" role="alert" className="text-sm text-destructive">
                  {nameError}
                </p>
              )}
            </div>
            {/* Fixed: the workspace whose tile was clicked, no picker (decision #59). */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="board-workspace" className={LABEL}>
                Workspace
              </label>
              <Input
                id="board-workspace"
                readOnly
                value={workspace.name}
                title={workspace.name}
                className={cn(FIELD, 'bg-muted')}
              />
            </div>
            <fieldset className="flex flex-col gap-1.5" disabled={create.isPending}>
              <legend className={cn(LABEL, 'mb-1.5')}>Visibility</legend>
              <TooltipProvider>
                <div className="flex gap-5">
                  {VISIBILITY.map(({ value, label, Icon, hint }) => (
                    <Tooltip key={value}>
                      {/* Focus on the radio bubbles to the trigger, so keyboard users get the tooltip too. */}
                      <TooltipTrigger asChild>
                        <div>
                          <label className="flex cursor-pointer items-center gap-2 text-[15px]">
                            <input
                              type="radio"
                              value={value}
                              aria-describedby={`visibility-${value}-hint`}
                              className="accent-primary"
                              {...register('visibility')}
                            />
                            <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                            {label}
                          </label>
                          {/* Outside the label so the radio's name stays `Workspace` / `Private`. */}
                          <span id={`visibility-${value}-hint`} className="sr-only">
                            {hint}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{hint}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </TooltipProvider>
            </fieldset>
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
                    <span className="sr-only">Creating board</span>
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </li>
  )
}
