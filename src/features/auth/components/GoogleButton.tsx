import { useEffect, useState } from 'react'
import Spinner from '@/components/common/Spinner'
import { Button } from '@/components/ui/button'
import { env } from '@/lib/env'
import { cn } from '@/lib/utils'
import { BTN } from '@/components/common/form-styles'

/** Starts the Google flow, which signs up or signs in, with a full-page redirect to GET /auth/google. */
export function GoogleButton() {
  const [loading, setLoading] = useState(false)

  // Coming back with the browser's back button restores the page from cache with the spinner still on.
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => e.persisted && setLoading(false)
    window.addEventListener('pageshow', reset)
    return () => window.removeEventListener('pageshow', reset)
  }, [])

  function onClick() {
    setLoading(true)
    window.location.assign(`${env.VITE_API_BASE_URL}/auth/google`)
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(BTN, 'border-primary text-primary-text')}
      disabled={loading}
      onClick={onClick}
    >
      {loading && <Spinner />}
      Continue with Google
    </Button>
  )
}
