#!/usr/bin/env node
// Verification hooks: records which checks passed on which code state, and blocks Stop while
// changed code has not passed the checks CLAUDE.md requires.
// Usage: node checks.mjs <post-bash|post-bash-fail|stop>  (hook JSON on stdin)
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const CHECKS = ['lint', 'typecheck', 'test', 'e2e']
// Files the checks look at; a change anywhere else (docs, .claude/) needs no re-run.
const SCOPE = [
  'src',
  'e2e',
  'index.html',
  'package.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'playwright.config.ts',
  '.oxlintrc.json',
]

/** Checks run in full whose exit code is the command's own (not piped, no extra args). */
export function checksInCommand(cmd) {
  const re = /\bpnpm\s+(?:run\s+)?(lint|typecheck|test|e2e)(?![\w:-])(?=\s*(?:2>&1\s*)?(?:$|&&))/g
  return [...cmd.matchAll(re)].map((m) => m[1])
}

/** Checks CLAUDE.md requires for these changed files: e2e when routes, guards or auth flow changed. */
export function requiredChecks(files) {
  const req = new Set(['lint', 'typecheck', 'test'])
  if (
    files.some((f) =>
      /^e2e\/|^playwright\.config\.ts$|^src\/app\/(router|guards)\.tsx$|^src\/features\/auth\/|^src\/lib\/(api|query-client|env)\.ts$/.test(
        f,
      ),
    )
  )
    req.add('e2e')
  return CHECKS.filter((c) => req.has(c))
}

const git = (...args) => {
  try {
    return execFileSync('git', args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

/** Hash of the code in SCOPE, so "check passed" is tied to an exact tree state. */
function fingerprint() {
  const lines = (s) => s.split('\n').filter(Boolean)
  const untracked = lines(git('ls-files', '--others', '--exclude-standard', '--', ...SCOPE))
  const h = createHash('sha256')
    .update(git('rev-parse', 'HEAD'))
    .update(git('diff', 'HEAD', '--', ...SCOPE))
  for (const f of untracked) {
    h.update(f).update(existsSync(join(ROOT, f)) ? readFileSync(join(ROOT, f)) : '')
  }
  const files = [...lines(git('diff', 'HEAD', '--name-only', '--', ...SCOPE)), ...untracked]
  return { hash: h.digest('hex'), files }
}

const stateFile = (sid) =>
  join(
    tmpdir(),
    'claude-hooks-agi-board-frontend',
    `${String(sid || 'default').replace(/[^\w-]/g, '')}.json`,
  )

function loadState(sid) {
  try {
    return JSON.parse(readFileSync(stateFile(sid), 'utf8'))
  } catch {
    return { passes: {} }
  }
}

function saveState(sid, st) {
  mkdirSync(dirname(stateFile(sid)), { recursive: true })
  writeFileSync(stateFile(sid), JSON.stringify(st))
}

const out = (obj) => process.stdout.write(JSON.stringify(obj))

async function main(mode) {
  let raw = ''
  for await (const chunk of process.stdin) raw += chunk
  const input = raw ? JSON.parse(raw) : {}
  const sid = input.session_id
  const st = loadState(sid)
  if (!st.baseline) {
    st.baseline = fingerprint().hash // first call of the session = state before Claude changed anything
    saveState(sid, st)
  }

  if (mode === 'post-bash' || mode === 'post-bash-fail') {
    const ran = checksInCommand(input.tool_input?.command ?? '')
    if (!ran.length) return
    const resp = input.tool_response ?? {}
    const failed =
      mode === 'post-bash-fail' ||
      resp.interrupted ||
      Number(resp.exitCode ?? resp.exit_code ?? 0) !== 0
    const fp = fingerprint().hash
    for (const c of ran) {
      if (failed) delete st.passes[c]
      else st.passes[c] = fp
    }
    saveState(sid, st)
    return
  }

  if (mode === 'stop') {
    const fp = fingerprint()
    if (fp.hash === st.baseline || fp.files.length === 0) return // nothing changed this session
    const missing = requiredChecks(fp.files).filter((c) => st.passes[c] !== fp.hash)
    if (!missing.length) return
    const list = missing.map((c) => `pnpm ${c}`).join(', ')
    if (input.stop_hook_active) {
      out({
        systemMessage: `[checks] Not verified on the current code: ${list}. Do not treat the task as checked.`,
      })
      return
    }
    out({
      decision: 'block',
      reason:
        `[checks] Code changed but these checks have not passed on the current tree: ${list}. ` +
        'Run each one directly (no pipe to tail/grep, so its exit code counts) and fix failures. ' +
        'If a check cannot run, stop and tell the user which check did not run and why; never say it passed.',
    })
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv[2]).catch((e) => {
    process.stderr.write(`[checks] hook error: ${e.message}\n`) // non-blocking: a broken hook must not lock the session
    process.exit(1)
  })
}
