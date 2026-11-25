# Research: #53 Inline Claude review comments

## Evidence in this repo

- PR #14: the 70 KB diff was cut to a 2 KB preview; the run took 5 turns and Claude listed files it had not opened.
- PR #12: `claude[bot]` posted 3 inline comments, all about the same problem. Inline posting itself works.
- `show_full_output: true` logs every tool result, and the repo is public.

## Decision 1: port the workflow of #52

- **Decision**: take the two workflows from the backend `develop` and change only the project rules in the prompt.
- **Rationale**: backend PR #21 ran it on GitHub after merge: `claude[bot]` posted 3 of 3 seeded bugs on the right lines,
  no summary, nothing repeated after a push, with `pull-requests: read`. A trial (backend PR #19, with `github.token`)
  showed that a new push cancels the running review.
- **Alternatives considered**: patch the current frontend workflow (keeps the truncated diff, duplicates and full log).

## Decision 2: prompt uses only the Review priorities of `react-reviewer.md`

- **Rationale**: the agent's other sections stop when nothing under `src/` changed, run the checks, and define a report
  format. CI runs the checks and findings go inline.
- **Alternatives considered**: use the whole agent file (would skip workflow, e2e and config changes).

## Decision 3: no findings that need files outside the repo

- **Rationale**: `AGENTS.md` names product docs and UI specs under `../`, which the runner does not have. Judging labels
  without them invites false positives.
- **Alternatives considered**: check out the parent repo (needs another token; out of scope).

## Decision 4: accept the tracking comment for `@claude review`

- **Rationale**: backend PR #21 showed that a system prompt does not stop the action's tracking comment from listing
  findings, so that sentence is left out here. The acceptance criterion allows it.
- **Alternatives considered**: route `@claude review` through the review workflow (declined for now).

## Local dry run

PR #14 (72 KB diff) with 3 seeded bugs, the prompt and tool limits of this branch, and a stub comment tool: 20 turns, no
permission denials, all 21 changed files reviewed, 2 of 3 bugs found on the right lines, no false positives. Missed: the
submit button no longer requires both passwords to match.

## Known limits

- Findings vary between runs; this does not replace human review.
- Running `@claude review` while the automatic review runs can post the same finding twice.
- Pull requests from forks get no secrets, so they are not reviewed.
- GitHub may refuse very large diffs (about 20,000 lines or 300 files); the job then fails visibly.
