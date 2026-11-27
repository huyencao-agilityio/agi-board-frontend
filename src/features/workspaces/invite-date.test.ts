import { describe, expect, it } from 'vitest'
import { formatInviteDate } from './invite-date'

describe('formatInviteDate', () => {
  it('shows the local date as YYYY/MM/DD, zero-padded', () => {
    // Built from local parts so the test holds in any TZ.
    expect(formatInviteDate(new Date(2026, 0, 5, 12).toISOString())).toBe('2026/01/05')
    expect(formatInviteDate(new Date(2026, 10, 28, 0, 0).toISOString())).toBe('2026/11/28')
  })
})
