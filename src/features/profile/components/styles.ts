// WEB-17 mockup: 640px cards, 16px/800 section headings, 12px inline errors, small secondary buttons.
export const CARD =
  'flex w-full max-w-[640px] flex-col gap-2 rounded-xl border bg-(--color-surface) p-5 shadow-sm'
export const HEADING = 'text-base font-extrabold'
export const ERROR = 'text-xs text-destructive'
export const SMALL_BTN = 'h-8 px-3 text-[13px] font-bold'

/** Callbacks from ProfilePage: `onStart` clears the banner, `onFail` shows it. */
export type Report = { onStart: () => void; onFail: () => void }
