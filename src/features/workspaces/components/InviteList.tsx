import Spinner from '@/components/common/Spinner'
import { Button } from '@/components/ui/button'
import { errorCode } from '@/lib/api'
import type { PendingInvite } from '../api'
import { useAcceptInvite, useDeclineInvite } from '../hooks'

const EXPIRED = 'This invite has expired. Ask an admin to resend it.'
const FAILED = 'Something went wrong. Try again.'

export function InviteList({ invites }: { invites: PendingInvite[] }) {
  return (
    <section aria-labelledby="invites-heading" className="flex flex-col gap-3">
      <h2 id="invites-heading" className="text-lg font-extrabold">
        Pending invites
      </h2>
      <ul className="flex flex-col gap-2">
        {invites.map((invite) => (
          <InviteRow key={invite.id} invite={invite} />
        ))}
      </ul>
    </section>
  )
}

function InviteRow({ invite }: { invite: PendingInvite }) {
  // Each row owns its mutations, so Processing locks only this row (decision #47).
  const accept = useAcceptInvite()
  const decline = useDeclineInvite()
  const busy = accept.isPending || decline.isPending
  // Expired meanwhile: the refetched row shows the expired text instead of a second message (WEB-03 §5).
  const failed = (accept.isError && errorCode(accept.error) !== 'INVITE_EXPIRED') || decline.isError

  const run = (action: typeof accept | typeof decline) => {
    accept.reset()
    decline.reset()
    action.mutate(invite.id)
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-md border bg-card p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-bold">{invite.board?.name ?? invite.workspace.name}</span>
        {invite.board && (
          <span className="truncate text-sm text-muted-foreground">{invite.workspace.name}</span>
        )}
        <span className="text-sm text-muted-foreground">
          Invited by {invite.invitedBy.fullName} · Role:{' '}
          {invite.role === 'admin' ? 'Admin' : 'Member'}
        </span>
        {invite.expired && <span className="text-sm text-muted-foreground">{EXPIRED}</span>}
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            {FAILED}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button disabled={busy || invite.expired} onClick={() => run(accept)}>
          {accept.isPending ? (
            <>
              <Spinner />
              <span className="sr-only">Accepting invite</span>
            </>
          ) : (
            'Accept'
          )}
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => run(decline)}>
          Decline
        </Button>
      </div>
    </li>
  )
}
