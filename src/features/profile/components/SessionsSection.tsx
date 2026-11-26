import Spinner from '@/components/common/Spinner'
import { Button } from '@/components/ui/button'
import { errorCode } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { AccountSession } from '../api'
import { deviceLabel, lastActive } from '../device-label'
import { useEndOtherSessions, useEndSession } from '../hooks'
import { CARD, HEADING, SMALL_BTN, type Report } from './styles'

export function SessionsSection({
  sessions,
  onStart,
  onFail,
}: { sessions: AccountSession[] } & Report) {
  const end = useEndSession()
  const endOthers = useEndOtherSessions()
  const busy = end.isPending || endOthers.isPending
  const hasOthers = sessions.some((s) => !s.isCurrent)

  function signOut(id: string) {
    onStart()
    end.mutate(id, {
      // Already gone (404): the list refreshes, nothing to report.
      onError: (e) => errorCode(e) !== 'SESSION_NOT_FOUND' && onFail(),
    })
  }

  function signOutOthers() {
    onStart()
    endOthers.mutate(undefined, { onError: onFail })
  }

  return (
    <section aria-labelledby="sessions-heading" className={CARD}>
      <h2 id="sessions-heading" className={HEADING}>
        Sessions
      </h2>
      <ul>
        {sessions.map((s) => {
          const label = deviceLabel(s.userAgent)
          const pending = end.isPending && end.variables === s.id
          return (
            <li key={s.id} className="flex items-center gap-3 border-b py-2.5">
              <div className="flex-1">
                <b>{label}</b>
                <p className="text-xs text-muted-foreground">{lastActive(s.lastActiveAt)}</p>
              </div>
              {s.isCurrent ? (
                <span className="rounded-full bg-(--color-primary-soft) px-2.5 py-0.5 text-xs font-bold text-primary-text">
                  This device
                </span>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className={SMALL_BTN}
                  disabled={busy}
                  aria-label={pending ? undefined : `Sign out ${label}`}
                  onClick={() => signOut(s.id)}
                >
                  {pending ? <Spinner /> : null}
                  <span className={cn(pending && 'sr-only')}>Sign out</span>
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      {hasOthers && (
        <div>
          <Button
            type="button"
            variant="outline"
            className="font-bold"
            disabled={busy}
            onClick={signOutOthers}
          >
            {endOthers.isPending ? <Spinner /> : null}
            <span className={cn(endOthers.isPending && 'sr-only')}>
              Sign out of all other sessions
            </span>
          </Button>
        </div>
      )}
    </section>
  )
}
