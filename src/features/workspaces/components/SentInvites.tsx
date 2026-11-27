import { Button } from '@/components/ui/button'
import type { SentInvite } from '../api'
import { useResendInvite, useRevokeInvite } from '../hooks'
import { formatInviteDate } from '../invite-date'

type SentInvitesProps = {
  workspaceId: string
  invites: SentInvite[]
  /** A row action starts: the page drops its banner. */
  onStart: () => void
  /** A row action failed: the page shows its banner; the row stays as it was (decision #69). */
  onFail: () => void
}

/** WEB-05 Sent invites; hidden when there are none (decision #71). */
export function SentInvites({ invites, ...rest }: SentInvitesProps) {
  if (invites.length === 0) return null
  return (
    <section aria-labelledby="sent-invites-heading" className="flex flex-col gap-3">
      <h2 id="sent-invites-heading" className="text-lg font-extrabold">
        Sent invites
      </h2>
      <table className="w-full text-left text-sm">
        <thead className="text-muted-foreground">
          <tr className="border-b">
            <th scope="col" className="py-2 font-bold">
              Email
            </th>
            <th scope="col" className="py-2 font-bold">
              Role
            </th>
            <th scope="col" className="py-2 font-bold">
              Status
            </th>
            <th scope="col" className="py-2 font-bold">
              Expires
            </th>
            {/* The spec gives this column no heading. */}
            <th aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {invites.map((invite) => (
            <InviteRow key={invite.id} invite={invite} {...rest} />
          ))}
        </tbody>
      </table>
    </section>
  )
}

function InviteRow({
  invite,
  workspaceId,
  onStart,
  onFail,
}: Omit<SentInvitesProps, 'invites'> & { invite: SentInvite }) {
  // Each row owns its mutations, so only this row locks while busy.
  const resend = useResendInvite(workspaceId, onFail)
  const revoke = useRevokeInvite(workspaceId, onFail)
  const busy = resend.isPending || revoke.isPending

  const run = (action: typeof resend | typeof revoke) => {
    onStart()
    action.mutate(invite.id)
  }

  return (
    <tr className="border-b">
      {/* max-w-0 lets truncate work in an auto table; the width keeps the column from collapsing. */}
      <td className="w-2/5 max-w-0 truncate py-2 pr-3" title={invite.email}>
        {invite.email}
      </td>
      <td className="py-2 pr-3">{invite.role === 'admin' ? 'Admin' : 'Member'}</td>
      <td className="py-2 pr-3">{invite.expired ? 'Expired' : 'Pending'}</td>
      <td className="py-2 pr-3">{formatInviteDate(invite.expiresAt)}</td>
      <td className="py-2">
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(resend)}>
            Resend
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(revoke)}>
            Revoke
          </Button>
        </div>
      </td>
    </tr>
  )
}
