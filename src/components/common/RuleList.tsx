import { Check, X } from 'lucide-react'
import type { Rule } from '@/lib/password-rules'
import { cn } from '@/lib/utils'

/** Live checklist under a field: grey while the field is empty, then red x or green check. */
export function RuleList({ id, rules, empty }: { id: string; rules: Rule[]; empty: boolean }) {
  return (
    <ul id={id} aria-label="Rules" className="mt-0.5 flex flex-col gap-1 text-xs">
      {rules.map(({ label, ok }) => {
        const Icon = !empty && ok ? Check : X
        return (
          <li
            key={label}
            className={cn(
              'flex items-center gap-1.5 text-muted-foreground',
              !empty && (ok ? 'text-(--color-success)' : 'text-destructive'),
            )}
          >
            <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={2.4} />
            {label}
            {!empty && <span className="sr-only">{ok ? ' (met)' : ' (not met)'}</span>}
          </li>
        )
      })}
    </ul>
  )
}
