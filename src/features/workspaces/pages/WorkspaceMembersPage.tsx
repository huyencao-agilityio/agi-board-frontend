// WEB-05 Workspace members — invite side (card #21); the member table, roles and menu come with card #8.
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import Spinner from '@/components/common/Spinner'
import { InviteDialog } from '../components/InviteDialog'
import { SentInvites } from '../components/SentInvites'
import { useSentInvites, useWorkspace } from '../hooks'

const TOAST_MS = 5000
const FAILED = 'Something went wrong. Try again.'

export default function WorkspaceMembersPage() {
  const { workspaceId = '' } = useParams()
  // 403/404 (not an admin, unknown) are thrown to RouteError → WEB-13 by the query client.
  // shortcut: an archived workspace 404s on GET /workspaces/:id (→ WEB-13), so the read-only archived
  // view (WEB-05 "Workspace archived") is not built; add it with the archived-workspaces card.
  const { data: workspace, isError } = useWorkspace(workspaceId)
  const isAdmin = workspace?.role === 'admin'
  const invites = useSentInvites(workspaceId, isAdmin)
  // A failed Resend/Revoke; goes away when the person does something else (decision #69).
  const [failed, setFailed] = useState(false)
  // `id` restarts the timer when the same text shows again.
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast])

  // Only a failed first load replaces the page; a failed background refetch keeps what is shown.
  if ((isError && !workspace) || (invites.isError && !invites.data)) {
    return (
      <p
        role="alert"
        className="max-w-160 rounded-md bg-(--color-danger-soft) px-3.5 py-3 text-[13px] text-destructive"
      >
        {FAILED}
      </p>
    )
  }
  if (!workspace) {
    return (
      <span role="status" aria-label="Loading" className="text-muted-foreground">
        <Spinner />
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {failed && (
        <p
          role="alert"
          className="rounded-md bg-(--color-danger-soft) px-3.5 py-3 text-[13px] text-destructive"
        >
          {FAILED}
        </p>
      )}
      <div className="flex items-center justify-between gap-4">
        <h1 title={workspace.name} className="truncate text-2xl font-extrabold">
          {workspace.name}
        </h1>
        {isAdmin && (
          <InviteDialog
            workspaceId={workspaceId}
            onOpen={() => setFailed(false)}
            onSent={() => setToast({ text: 'Invite sent', id: Date.now() })}
          />
        )}
      </div>
      {/* Gated on the role too: a demoted admin keeps cached invites, which must not stay actionable. */}
      {isAdmin && invites.data && (
        <SentInvites
          workspaceId={workspaceId}
          invites={invites.data}
          onStart={() => setFailed(false)}
          onFail={() => setFailed(true)}
        />
      )}
      <div role="status" className="fixed top-4 left-1/2 z-50 -translate-x-1/2">
        {toast && (
          <p className="rounded-md bg-(--color-inverse-bg) px-[18px] py-3 text-sm font-bold text-(--color-inverse-text)">
            {toast.text}
          </p>
        )}
      </div>
    </div>
  )
}
