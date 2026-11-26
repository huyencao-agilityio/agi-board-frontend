import { describe, expect, it } from 'vitest'
import { deviceLabel, lastActive } from './device-label'

const UA = {
  chromeWin:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  edgeWin:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
}

describe('deviceLabel', () => {
  it.each([
    [UA.chromeWin, 'Chrome on Windows'],
    [UA.edgeWin, 'Edge on Windows'],
    [UA.safariIphone, 'Safari on iPhone'],
    [UA.firefoxLinux, 'Firefox on Linux'],
    [UA.chromeAndroid, 'Chrome on Android'],
    [UA.safariMac, 'Safari on macOS'],
    ['SomeBot (Windows NT 10.0)', 'Windows'],
    ['curl/8.0', 'Unknown device'],
    [null, 'Unknown device'],
  ])('%s → %s', (ua, label) => expect(deviceLabel(ua)).toBe(label))
})

describe('lastActive', () => {
  const now = Date.parse('2026-11-26T12:00:00.000Z')
  it.each([
    ['2026-11-26T11:59:30.000Z', 'Last active now'],
    ['2026-11-26T11:55:00.000Z', 'Last active 5 minutes ago'],
    ['2026-11-26T10:00:00.000Z', 'Last active 2 hours ago'],
    ['2026-11-23T12:00:00.000Z', 'Last active 3 days ago'],
    ['2026-11-26T12:05:00.000Z', 'Last active now'],
  ])('%s → %s', (iso, text) => expect(lastActive(iso, now)).toBe(text))
})
