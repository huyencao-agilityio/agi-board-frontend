// Run: node --test ".claude/hooks/*.test.mjs"
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checksInCommand, requiredChecks } from './checks.mjs'

test('only full, unpiped check runs count', () => {
  assert.deepEqual(checksInCommand('pnpm lint && pnpm typecheck && pnpm test'), [
    'lint',
    'typecheck',
    'test',
  ])
  assert.deepEqual(checksInCommand('pnpm e2e 2>&1'), ['e2e'])
  assert.deepEqual(checksInCommand('pnpm test | tail -20'), []) // exit code is tail's
  assert.deepEqual(checksInCommand('pnpm test src/lib'), []) // partial run
  assert.deepEqual(checksInCommand('pnpm test:watch'), [])
  assert.deepEqual(checksInCommand('pnpm test:hooks'), [])
})

test('e2e is required only when routes, guards or auth change', () => {
  assert.deepEqual(requiredChecks(['src/features/boards/pages/BoardPage.tsx']), [
    'lint',
    'typecheck',
    'test',
  ])
  for (const f of [
    'src/app/router.tsx',
    'src/app/guards.tsx',
    'src/features/auth/session.ts',
    'src/lib/api.ts',
    'e2e/smoke.spec.ts',
  ]) {
    assert.deepEqual(requiredChecks([f]), ['lint', 'typecheck', 'test', 'e2e'], f)
  }
})
