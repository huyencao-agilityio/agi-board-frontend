import { cn } from '@/lib/utils'

/** AGI Board logo square; `className` sets the size and radius (default 30px / 8px radius). */
export default function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex size-[30px] items-center justify-center rounded-[8px] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-primary)_80%,var(--color-surface)),var(--color-primary))]',
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-[60%] fill-none stroke-primary-foreground stroke-[2.2] [stroke-linecap:round] [stroke-linejoin:round]"
      >
        <path d="M5 19 12 5l7 14M8.5 14h7" />
      </svg>
    </span>
  )
}
