import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api'
import { createQueryClient, SESSION_ENDED_KEY } from '@/lib/query-client'

function failWith(code: string) {
  const client = createQueryClient()
  client.setQueryData(['session'], { id: 'u1' })
  const mutation = client.getMutationCache().build(client, {
    mutationFn: () => Promise.reject(new ApiError(401, { error: { code } })),
  })
  return { client, run: mutation.execute(undefined).catch(() => {}) }
}

describe('createQueryClient', () => {
  it('signs the user out locally when any request answers SESSION_ENDED', async () => {
    const { client, run } = failWith('SESSION_ENDED')
    client.setQueryData(['profile'], { fullName: 'An' })
    await run
    expect(client.getQueryData(['profile'])).toBeUndefined()
    expect(client.getQueryData(['session'])).toBeNull()
    expect(client.getQueryData(SESSION_ENDED_KEY)).toBe(true)
  })

  it('keeps the session on other 401s such as a wrong sign-in password', async () => {
    const { client, run } = failWith('INVALID_CREDENTIALS')
    await run
    expect(client.getQueryData(['session'])).toEqual({ id: 'u1' })
    expect(client.getQueryData(SESSION_ENDED_KEY)).toBeUndefined()
  })
})
