# Implementation Plan: Post automatic Claude code review as inline PR comments in the frontend

**Branch**: `fix/53-inline-claude-review-comments` | **Date**: 2026-11-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/53/spec.md`

## Summary

Port the review workflow of backend ticket #52 (backend PR #20, merged and verified on GitHub) to this repo. Only the
part of the prompt that names project rules differs. Decisions and evidence: [research.md](research.md).

## Technical Context

**Language/Version**: GitHub Actions YAML; the prompt is English text

**Primary Dependencies**: `anthropics/claude-code-action@v1`, `actions/checkout@v7`, `gh` and `jq` (preinstalled on the runner)

**Storage**: N/A (two temporary files in `$RUNNER_TEMP/review`)

**Testing**: Prettier and YAML parse locally; local dry run of the prompt; a real PR after merge ([quickstart.md](quickstart.md))

**Target Platform**: GitHub-hosted `ubuntu-latest`

**Project Type**: CI workflow of a web app

**Performance Goals**: none in the spec; the local dry run on a 72 KB diff cost 0.30 USD at list price

**Constraints**: the action skips a PR whose workflow file differs from `develop`, so the real test is after merge. The
repo is public: PR diffs and comments are untrusted input.

**Scale/Scope**: 2 workflow files

## Constitution Check

`.specify/memory/constitution.md` is the unfilled template and defines no gates. Checked against `AGENTS.md`:

| Rule                                           | Before design | After design                                                                                       |
| ---------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| Every change belongs to one card               | Pass          | Pass: two workflow files, backend untouched                                                        |
| No secrets in code or logs                     | Pass          | Pass: `show_full_output` is removed                                                                |
| Git: branch, commit and PR conventions         | Pass          | Pass: the workflow cannot approve or merge                                                         |
| `pnpm lint`, `typecheck`, `test` before "done" | Pass          | Pass on the current draft (127 tests); run again before the PR. No route or auth change, so no e2e |

## Design

### `claude-code-review.yml`

1. Trigger unchanged: `opened`, `synchronize`, `ready_for_review`, `reopened` on PRs into `develop`.
2. `concurrency` per PR number with `cancel-in-progress: true`.
3. `pull-requests: read`: comments are posted with the Claude App token.
4. Check out `github.event.pull_request.head.sha`.
5. Save `gh pr diff` and the inline comments of Claude and the team to `$RUNNER_TEMP/review`.
6. Prompt: read the project rules and the Review priorities of `react-reviewer.md` (`AGENTS.md` wins); review every
   changed file except lock files, including files outside `src/`; one inline comment per finding with
   `confirmed: true`; skip findings already reported; no summary. Files under `../` are not in the checkout, so label
   and scope mismatches that cannot be verified from this repo are not reported.
7. `claude_args`: `--permission-mode default`, `--tools "Read,Glob,Grep"`, `--effort high`, `--add-dir`, and the inline
   comment tool. `show_full_output` is removed.
8. Last step: print only the final message from `execution_file`, with `::` and `##[` commands broken; skipped when the
   action skips the review.

### `claude.yml`

1. Allow the inline comment tool and ask for inline findings on review requests. `pull-requests` stays `read`.

### Acceptance criteria coverage

| Criterion                                                | Covered by              |
| -------------------------------------------------------- | ----------------------- |
| Starts without `@claude`                                 | Review workflow 1       |
| Problem is an inline comment with severity, impact, fix  | Review workflow 4, 6    |
| One comment per problem, no summary                      | Review workflow 6       |
| No problem: nothing posted, log lists files              | Review workflow 6, 8    |
| Large diff fully reviewed                                | Review workflow 5, 6    |
| No repeated comment after a push                         | Review workflow 2, 5, 6 |
| `@claude review` posts inline; tracking comment may list | `claude.yml` 1          |

## Project Structure

### Documentation (this feature)

```text
specs/53/
├── spec.md
├── plan.md
├── research.md
├── quickstart.md
└── tasks.md        # created by /speckit-tasks
```

No `data-model.md` (no entities) and no `contracts/` (no API change; internal CI only).

### Source Code (repository root)

```text
.github/workflows/
├── claude-code-review.yml   # changed
└── claude.yml               # changed
```

**Structure Decision**: edit the two existing workflows; no new workflow, script or dependency.

## Complexity Tracking

No violations.
