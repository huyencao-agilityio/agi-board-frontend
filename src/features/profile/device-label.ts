// shortcut: partial browser/OS list, extend it when users report a wrong label.
// Order matters: Edge and Chrome UAs also contain "Chrome"/"Safari"; iPhone/iPad/Android UAs also contain "Mac"/"Linux".
const BROWSERS: [RegExp, string][] = [
  [/Edg\//, 'Edge'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
]
const SYSTEMS: [RegExp, string][] = [
  [/iPhone/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/Linux/, 'Linux'],
]

const find = (ua: string, list: [RegExp, string][]) => list.find(([re]) => re.test(ua))?.[1]

/** "Chrome on Windows"; only the known part when one is missing; "Unknown device" when neither is known. */
export function deviceLabel(userAgent: string | null): string {
  const browser = userAgent ? find(userAgent, BROWSERS) : undefined
  const system = userAgent ? find(userAgent, SYSTEMS) : undefined
  if (browser && system) return `${browser} on ${system}`
  return browser ?? system ?? 'Unknown device'
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'always' })

/** "Last active now" under a minute, else "Last active 2 hours ago". */
export function lastActive(iso: string, now = Date.now()): string {
  const ago = Math.max(0, now - Date.parse(iso))
  const [unit, ms] = UNITS.find(([, size]) => ago >= size) ?? []
  if (!unit || !ms) return 'Last active now'
  return `Last active ${relative.format(-Math.floor(ago / ms), unit)}`
}
