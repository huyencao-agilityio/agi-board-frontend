const pad = (n: number) => String(n).padStart(2, '0')

/** `YYYY/MM/DD` in the viewer's local time, as the WEB-05 mockup shows invite expiry. */
export function formatInviteDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`
}
