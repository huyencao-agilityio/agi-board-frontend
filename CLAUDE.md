@AGENTS.md

## Claude Code

- Reply to the user in Vietnamese; code, comments, commits and PRs in English.
- Starting work on a Trello card (number or URL): use the `pull-ticket` skill.
- Creating a pull request: use the `create-pr` skill.
- Path-scoped rules in `.claude/rules/` (code style, React/data, security, testing, UI) load when matching files are touched; keep them in sync with the code when a convention changes.

## Hooks

`.claude/settings.json` runs these hooks (Node scripts in `.claude/hooks/`):

- `guard.mjs` (PreToolUse): denies force push, pushes or deletes on protected branches (`main`, `master`, `develop`, `staging`, `production`), history rewrites, `--no-verify`, dangerous shell commands, touching `.env*` / `.dev.vars` / keys, and hand edits of `pnpm-lock.yaml`. Asks first for local data loss (`reset --hard`, `clean -f`, discard changes, rebase, amend), deploys, and edits of shared config, `.claude/`, `.github/`, `src/components/ui/`, `tokens.css`.
- `format.mjs` (PostToolUse): runs the project's Prettier on each file written or edited.
- `checks.mjs` (PostToolUse / PostToolUseFailure on Bash, Stop): records which of `pnpm lint|typecheck|test|e2e` passed on the current code, and blocks Stop while changed code has not passed `lint`, `typecheck`, `test` (plus `e2e` when routes, guards, auth or `src/lib/api.ts` changed). Run checks unpiped so their exit code counts.

A `[guard]` denial is intentional: ask the user instead of working around it. If a guard decision is wrong, fix the rule in `guard.mjs`, add a case to `guard.test.mjs`, and run `pnpm test:hooks`.
