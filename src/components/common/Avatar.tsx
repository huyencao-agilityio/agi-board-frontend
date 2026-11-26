import { useState } from 'react'
import { env } from '@/lib/env'
import { cn } from '@/lib/utils'

const SIZE = { sm: 'size-7 text-[11px]', lg: 'size-20 text-[28px]' }

/** First letter of the first and last words, e.g. "An Nguyen" → "AN". */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  const first = words[0][0]
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return (first + last).toUpperCase()
}

/** A person's photo, or a circle with their initials when they have none. */
export function Avatar({
  name,
  url,
  size,
}: {
  name: string
  url: string | null
  size: keyof typeof SIZE
}) {
  // The url whose image failed to load (missing object, blocked cookie): show initials instead.
  const [broken, setBroken] = useState<string | null>(null)
  const base = cn('inline-flex shrink-0 items-center justify-center rounded-full', SIZE[size])
  if (url && url !== broken) {
    // avatarUrl is a path on the API; its ?v= changes with each photo (see backend contract).
    return (
      <img
        src={new URL(url, env.VITE_API_BASE_URL).href}
        alt={name}
        className={cn(base, 'object-cover')}
        onError={() => setBroken(url)}
      />
    )
  }
  return (
    <span className={cn(base, 'bg-(--color-primary-soft) font-bold text-primary-text')}>
      <span aria-hidden="true">{initials(name)}</span>
      <span className="sr-only">{name}</span>
    </span>
  )
}
