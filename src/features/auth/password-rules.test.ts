import { describe, expect, it } from 'vitest'
import { isValidPassword, passwordRules } from './password-rules'

const LENGTH = 'At least 8 characters'
const MIX = 'At least one letter and one number'
const NAME = 'Does not contain your email name'

describe('passwordRules', () => {
  it.each([
    ['abcd1234', 'new@x.co', []],
    ['abcd123', 'new@x.co', [LENGTH]],
    ['abcdefgh', 'new@x.co', [MIX]],
    ['12345678', 'new@x.co', [MIX]],
    ['đ1234567', 'new@x.co', []],
    ['xxNEWxx12', 'new@x.co', [NAME]],
    ['xxnewxx12', '  NEW@x.co ', [NAME]],
    ['abcd1234', 'b@x.co', [NAME]],
    ['abcd1234', '', []],
    ['abcd1234', '@x.co', []],
    ['new', 'new@x.co', [LENGTH, MIX, NAME]],
  ])('%s for %s breaks %j', (password, email, broken) => {
    const failed = passwordRules(password, email).filter((r) => !r.ok)
    expect(failed.map((r) => r.label)).toEqual(broken)
    expect(isValidPassword(password, email)).toBe(broken.length === 0)
  })
})
