#!/usr/bin/env node
// PostToolUse: format the file Claude just wrote with the project's own Prettier.
// Respects .prettierrc and .prettierignore; unsupported file types are skipped (--ignore-unknown).
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

let input
try {
  input = JSON.parse(readFileSync(0, 'utf8'))
} catch {
  process.exit(0)
}

const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd()
const file = input.tool_response?.filePath ?? input.tool_input?.file_path
const prettier = path.join(projectDir, 'node_modules', '.bin', 'prettier')
const rel = file ? path.relative(projectDir, path.resolve(projectDir, file)) : ''

// Only files inside this project, and only once dependencies are installed.
if (!rel || rel.startsWith('..') || path.isAbsolute(rel) || !existsSync(prettier)) process.exit(0)

try {
  execFileSync(prettier, ['--write', '--ignore-unknown', '--log-level', 'warn', rel], {
    cwd: projectDir,
    stdio: ['ignore', 'ignore', 'pipe'],
  })
} catch (e) {
  // A syntax error Prettier cannot parse is worth telling Claude about; it never blocks the edit.
  const message = String(e.stderr ?? e.message)
    .trim()
    .split('\n')
    .slice(0, 5)
    .join('\n')
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `Prettier could not format ${rel}:\n${message}`,
      },
    }),
  )
}
