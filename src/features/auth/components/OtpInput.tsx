import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { isFullCode } from '@/features/auth/code'

type OtpInputProps = {
  value: string[]
  onChange: (value: string[]) => void
  /** Called when the last empty box is filled, not when a digit of a full code is replaced. */
  onComplete: (code: string) => void
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
}

/** Six one-digit boxes that behave as one code: paste or autofill spreads over them. */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  invalid = false,
  describedBy,
}: OtpInputProps) {
  const boxes = useRef<(HTMLInputElement | null)[]>([])
  const wasDisabled = useRef(disabled)

  // Disabling the boxes drops keyboard focus; give it back once they can be used again, unless
  // another field has it by then.
  useEffect(() => {
    const active = document.activeElement
    const inOtherInput = active instanceof HTMLInputElement && !boxes.current.includes(active)
    if (wasDisabled.current && !disabled && !inOtherInput) boxes.current[0]?.focus()
    wasDisabled.current = disabled
  }, [disabled])

  const focus = (index: number) =>
    boxes.current[Math.min(Math.max(index, 0), value.length - 1)]?.focus()

  function fill(index: number, digits: string) {
    const start = digits.length >= value.length ? 0 : index
    const next = value.map((old, i) => digits[i - start] ?? old)
    onChange(next)
    focus(start + digits.length)
    if (isFullCode(next) && !isFullCode(value)) onComplete(next.join(''))
  }

  function onInput(index: number, raw: string) {
    let digits = raw.replace(/\D/g, '')
    // Typed next to a digit that was not selected: the new one replaces it.
    if (digits.length === 2 && value[index]) digits = digits.replace(value[index], '')
    if (digits) return fill(index, digits)
    if (!raw) onChange(value.map((old, i) => (i === index ? '' : old)))
  }

  function onPaste(index: number, e: ClipboardEvent) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '')
    if (digits) fill(index, digits)
  }

  function onKeyDown(index: number, e: KeyboardEvent) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      focus(index + (e.key === 'ArrowLeft' ? -1 : 1))
    } else if (e.key === 'Backspace' && !value[index] && index > 0) {
      e.preventDefault()
      onChange(value.map((old, i) => (i === index - 1 ? '' : old)))
      focus(index - 1)
    }
  }

  return (
    <div
      role="group"
      aria-label="6-digit code"
      aria-describedby={describedBy}
      className="flex justify-center gap-2"
    >
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            boxes.current[i] = el
          }}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          disabled={disabled}
          value={digit}
          // onInput, not onChange: React skips onChange when the same digit is typed over itself.
          onInput={(e) => onInput(i, e.currentTarget.value)}
          onChange={() => {}} // a controlled input needs one
          onPaste={(e) => onPaste(i, e)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="h-[54px] w-full max-w-[46px] min-w-0 rounded-md border border-(--color-border-strong) bg-(--color-surface) text-center text-[22px] font-bold outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed aria-invalid:border-destructive"
        />
      ))}
    </div>
  )
}
