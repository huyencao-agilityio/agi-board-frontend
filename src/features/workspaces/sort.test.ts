import { describe, expect, it } from 'vitest'
import { byName } from './sort'

describe('byName', () => {
  it('sorts A to Z ignoring case, keeps ties in input order, and leaves the input alone', () => {
    const input = [
      { name: 'beta', n: 1 },
      { name: 'Alpha', n: 2 },
      { name: 'Beta', n: 3 },
      { name: 'alpha', n: 4 },
    ]
    expect(byName(input).map((x) => x.n)).toEqual([2, 4, 1, 3])
    expect(input.map((x) => x.n)).toEqual([1, 2, 3, 4])
  })
})
