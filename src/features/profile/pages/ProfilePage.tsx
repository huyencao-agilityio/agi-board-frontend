// WEB-17 Profile and account settings
import { useEffect, useState } from 'react'
import Spinner from '@/components/common/Spinner'
import { GoogleSection } from '../components/GoogleSection'
import { PasswordSection } from '../components/PasswordSection'
import { ProfileSection } from '../components/ProfileSection'
import { SessionsSection } from '../components/SessionsSection'
import { useProfile, useSessions } from '../hooks'

const TOAST_MS = 5000
const GENERIC = 'Something went wrong. Try again.'

export default function ProfilePage() {
  const profile = useProfile()
  const sessions = useSessions()
  const [failed, setFailed] = useState(false)
  // `id` restarts the timer when the same text shows again.
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast])

  const report = { onStart: () => setFailed(false), onFail: () => setFailed(true) }
  const loadFailed = profile.isError || sessions.isError

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5">
      {(failed || loadFailed) && (
        <div
          role="alert"
          className="max-w-[640px] rounded-md bg-(--color-danger-soft) px-3.5 py-3 text-[13px] text-destructive"
        >
          {GENERIC}
        </div>
      )}

      <h1 className="text-2xl font-black">Profile</h1>

      {profile.isPending ? (
        <span className="text-muted-foreground" role="status" aria-label="Loading">
          <Spinner />
        </span>
      ) : profile.data ? (
        // Each part waits only for its own data: a sessions failure must not block name or password changes.
        <>
          {/* Keyed: a new saved name (this tab or another) restarts the form from it. */}
          <ProfileSection key={profile.data.fullName} profile={profile.data} {...report} />
          {profile.data.hasPassword && (
            <PasswordSection
              profile={profile.data}
              onToast={(text) => setToast({ text, id: Date.now() })}
              {...report}
            />
          )}
          <GoogleSection linked={profile.data.googleLinked} />
          {sessions.isPending && (
            <span className="text-muted-foreground" role="status" aria-label="Loading">
              <Spinner />
            </span>
          )}
          {sessions.data && <SessionsSection sessions={sessions.data} {...report} />}
        </>
      ) : null}

      {/* Top center (changed from the mockup's bottom right, card #22 clarification). */}
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
