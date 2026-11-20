#!/usr/bin/env node
// PreToolUse guard for Bash, Write and Edit. Reads the hook payload on stdin and prints a
// permission decision: "deny" for operations that should never run unattended, "ask" for
// destructive or sensitive ones a person should confirm. Rules: see check() and its tests.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const PROTECTED_BRANCHES = ['main', 'master', 'develop', 'staging', 'production']
const BRANCH = `(?:origin\\/)?(?:${PROTECTED_BRANCHES.join('|')})`

// [pattern, decision, reason]; tested against each segment of a compound shell command.
const BASH_RULES = [
  // Git: history rewrite and remote damage
  [
    /\bgit\s+push\b.*(\s--force(-with-lease|-if-includes)?\b|\s-[a-zA-Z]*f\b|\s\+\S+)/,
    'deny',
    'Force push is blocked. Push normally or open a PR.',
  ],
  [
    new RegExp(`\\bgit\\s+push\\b.*\\s(--delete\\s+|-d\\s+|:)${BRANCH}\\b`),
    'deny',
    'Deleting a protected remote branch is blocked.',
  ],
  [
    new RegExp(`\\bgit\\s+push\\b(?:\\s+\\S+)*\\s+(?:\\S+:)?${BRANCH}(\\s|$)`),
    'deny',
    'Direct push to a protected branch is blocked. Push a feature branch and open a PR.',
  ],
  [/\bgit\s+(filter-branch|filter-repo)\b/, 'deny', 'Rewriting repository history is blocked.'],
  [/\bgit\s+update-ref\s+-d\b/, 'deny', 'Deleting refs directly is blocked.'],
  [
    new RegExp(`\\bgit\\s+branch\\s+.*-[a-zA-Z]*[dD]\\b.*\\s${BRANCH}(\\s|$)`),
    'deny',
    'Deleting a protected branch is blocked.',
  ],
  // Git: local data loss, needs confirmation
  [
    /\bgit\s+reset\b.*\s--(hard|merge|keep)\b/,
    'ask',
    'git reset --hard discards uncommitted work.',
  ],
  [/\bgit\s+clean\b.*\s-[a-zA-Z]*f/, 'ask', 'git clean -f deletes untracked files.'],
  [
    /\bgit\s+(checkout|restore)\b(?!.*--staged).*\s(\.|--\s+\S+|:\/)(\s|$)/,
    'ask',
    'This discards local changes to files.',
  ],
  [/\bgit\s+stash\s+(drop|clear)\b/, 'ask', 'This deletes stashed work.'],
  [/\bgit\s+branch\s+.*-D\b/, 'ask', 'git branch -D deletes a branch even if it is not merged.'],
  [/\bgit\s+rebase\b/, 'ask', 'Rebase rewrites commits; confirm first.'],
  [/\bgit\s+commit\b.*--amend\b/, 'ask', 'Amending rewrites the last commit; confirm first.'],
  [
    /\bgit\s+(commit|push|merge|rebase)\b.*--no-verify\b/,
    'deny',
    '--no-verify skips commitlint and the branch-name check (husky hooks).',
  ],
  // Destructive shell
  [
    /\brm\s+(-[a-zA-Z]*\s+)*(\/|~|\$HOME|\.|\.\.|\*|\.\/\*|\/\*)(\s|$)/,
    'deny',
    'Recursive delete of root, home, parent or the whole project is blocked.',
  ],
  [/\brm\s+(-\S+\s+)*\S*\.git(\/|\s|$)/, 'deny', 'Deleting the .git directory is blocked.'],
  [/\bsudo\b/, 'deny', 'sudo is blocked in this project.'],
  [
    /\b(mkfs(\.\w+)?|fdisk|parted)\b|\bdd\b.*\bof=\/dev\//,
    'deny',
    'Disk-level commands are blocked.',
  ],
  [/:\(\)\s*\{\s*:\|:&\s*\};:/, 'deny', 'Fork bomb blocked.'],
  [/\bchmod\s+(-R\s+)?0?777\b/, 'deny', 'chmod 777 is blocked.'],
  [/\b(curl|wget)\b.*\|\s*(ba|z)?sh\b/, 'deny', 'Piping a download into a shell is blocked.'],
  [/>\s*\/dev\/sd[a-z]/, 'deny', 'Writing to a raw disk is blocked.'],
  // Secrets and environment files
  [
    /(^|[\s'"=/<])\.env(\.(?!example\b)[\w.-]+)?(?=$|[\s'";|&)])/,
    'deny',
    'Environment files hold secrets; do not read or change them from the shell.',
  ],
  [
    /(^|[\s'"=/<])\.dev\.vars\b/,
    'deny',
    '.dev.vars holds secrets; do not read or change it from the shell.',
  ],
  [/\bwrangler\s+secret\b/, 'ask', 'This changes Cloudflare secrets.'],
  [/\b(printenv|env)\s*$/, 'ask', 'Dumping the environment can expose tokens.'],
  // Lockfile and deploys
  [
    /(\brm\b|>)\s*.*\b(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)\b/,
    'deny',
    'Do not delete or overwrite the lockfile; use pnpm add/remove/install.',
  ],
  [
    /\b(wrangler\s+deploy\b.*--env\s+production|pnpm\s+(run\s+)?deploy:production)\b/,
    'ask',
    'This deploys to production.',
  ],
  [
    /\bpnpm\s+(run\s+)?deploy:staging\b|\bwrangler\s+deploy\b/,
    'ask',
    'This deploys to Cloudflare.',
  ],
]

// [test(relativePath), decision, reason]; first match wins.
const FILE_RULES = [
  [(p) => p.startsWith('..') || path.isAbsolute(p), null, null], // outside the project: not our concern
  [
    (p) => /(^|\/)\.env(\..+)?$/.test(p) && !p.endsWith('.env.example'),
    'deny',
    'Environment files hold secrets; edit them yourself.',
  ],
  [
    (p) => /(^|\/)\.dev\.vars$|\.(pem|key|p12|pfx)$/.test(p),
    'deny',
    'Secret or key files are not edited by Claude.',
  ],
  [
    (p) => /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$/.test(p),
    'deny',
    'The lockfile is generated; change dependencies with pnpm add/remove instead.',
  ],
  [(p) => p === '.git' || p.startsWith('.git/'), 'deny', 'Git internals are not edited directly.'],
  [
    (p) => p.startsWith('.claude/'),
    'ask',
    'This changes Claude Code settings or hooks for the whole team.',
  ],
  [(p) => p.startsWith('.github/'), 'ask', 'This changes CI/CD.'],
  [
    (p) =>
      /^(package\.json|pnpm-workspace\.yaml|wrangler\.jsonc|vite\.config\.ts|playwright\.config\.ts|tsconfig(\.\w+)?\.json|components\.json|\.oxlintrc\.json|\.prettierrc|\.prettierignore|\.gitignore|\.nvmrc|index\.html)$/.test(
        p,
      ),
    'ask',
    'This is a shared project configuration file.',
  ],
  [
    (p) => p.startsWith('src/components/ui/'),
    'ask',
    'src/components/ui is generated by shadcn; prefer regenerating it.',
  ],
  [
    (p) => p === 'src/styles/tokens.css',
    'ask',
    'tokens.css is copied from the design; change the design source too.',
  ],
]

/** Splits a shell command into simple segments; quotes are not parsed (errs toward checking more). */
const segments = (cmd) =>
  cmd
    .split(/\n|;|&&|\|\||(?<![>|])\|(?!\|)/)
    .map((s) => s.trim())
    .filter(Boolean)

export function check(input, projectDir = process.cwd(), currentBranch = '') {
  const { tool_name: tool, tool_input: args = {} } = input
  if (tool === 'Bash') {
    const cmd = String(args.command ?? '')
    // A bare `git push` while on a protected branch pushes that branch.
    if (
      PROTECTED_BRANCHES.includes(currentBranch) &&
      segments(cmd).some(
        (s) => /^git\s+push(\s+-\S+)*(\s+\S+)?$/.test(s) && !/\s(--tags|--delete|-d)\b/.test(s),
      )
    ) {
      return {
        decision: 'deny',
        reason: `You are on ${currentBranch}; push a feature branch and open a PR.`,
      }
    }
    // Pipe-aware rules (curl | sh) need the whole command; the rest run per segment.
    for (const [re, decision, reason] of BASH_RULES) {
      if (
        re.test(cmd.replace(/\s+/g, ' ')) &&
        (re.source.includes('\\|') || segments(cmd).some((s) => re.test(s)))
      ) {
        return { decision, reason }
      }
    }
    return null
  }
  if (tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit' || tool === 'NotebookEdit') {
    const file = args.file_path ?? args.notebook_path
    if (!file) return null
    const rel = path.relative(projectDir, path.resolve(projectDir, file)).split(path.sep).join('/')
    for (const [test, decision, reason] of FILE_RULES) {
      if (test(rel)) return decision ? { decision, reason: `${rel}: ${reason}` } : null
    }
  }
  return null
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let input
  try {
    input = JSON.parse(readFileSync(0, 'utf8'))
  } catch {
    process.exit(0) // malformed payload: let Claude Code's own permission flow decide
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd()
  let branch = ''
  if (input.tool_name === 'Bash' && /\bgit\s+push\b/.test(input.tool_input?.command ?? '')) {
    try {
      branch = execFileSync('git', ['branch', '--show-current'], {
        cwd: input.cwd || projectDir,
        encoding: 'utf8',
      }).trim()
    } catch {} // not a git repo: branch rules that need it are skipped
  }
  const result = check(input, projectDir, branch)
  if (result) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: result.decision,
          permissionDecisionReason: `[guard] ${result.reason}`,
        },
      }),
    )
  }
}
