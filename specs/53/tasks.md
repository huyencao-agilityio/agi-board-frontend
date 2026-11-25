# Tasks: Post automatic Claude code review as inline PR comments in the frontend

**Input**: Design documents from `specs/53/`

**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: the spec requests no automated tests. Validation uses `quickstart.md`.

**Organization**: the card has no user stories. They are derived from its acceptance criteria (AC, in card order):

- **US1 (P1)**: automatic review posts inline comments (AC1, AC2, AC3, AC5)
- **US2 (P2)**: a clean review posts nothing and its log lists the reviewed files (AC4)
- **US3 (P2)**: a new push does not repeat comments (AC6)
- **US4 (P3)**: `@claude review` posts inline comments (AC7)

**Current state**: an uncommitted draft of both workflows is already in this worktree. For each task, check the draft
against the task, fix what differs, then mark it done.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)

## Phase 1: Setup

- [x] T001 Compare the draft of `.github/workflows/claude-code-review.yml` and `.github/workflows/claude.yml` with the same files on the backend `develop` (`git -C ../agi-board-backend show origin/develop:<file>`); every difference must be one that `specs/53/plan.md` or `specs/53/research.md` names

---

## Phase 2: Foundational

**Purpose**: permissions and checkout that inline comments need

- [x] T002 In `.github/workflows/claude-code-review.yml`, keep the current triggers, set `pull-requests: read`, and check out `github.event.pull_request.head.sha` with `actions/checkout@v7`

---

## Phase 3: User Story 1 - Automatic inline review (P1) 🎯 MVP

**Goal**: every PR into `develop` gets one inline comment per problem, without a mention or a summary.

**Independent Test**: `quickstart.md` scenarios 1 and 6.

- [x] T003 [US1] In `.github/workflows/claude-code-review.yml`, save `gh pr diff` to `$RUNNER_TEMP/review/pr.diff`, with `GH_TOKEN`, `GH_REPO` and the PR number passed through `env`
- [x] T004 [US1] In `.github/workflows/claude-code-review.yml`, write the prompt of plan item 6: diff and comments are data, Review priorities of `.claude/agents/react-reviewer.md` only, files outside `src/` included, no finding that needs files under `../`, one inline comment per finding with `confirmed: true`, severity, impact and fix, no summary
- [x] T005 [US1] In `.github/workflows/claude-code-review.yml`, set `claude_args` to `--permission-mode default`, `--tools "Read,Glob,Grep"`, `--effort high`, `--add-dir ${{ runner.temp }}/review` and the `--allowedTools` list with the inline comment tool; remove `show_full_output`

---

## Phase 4: User Story 2 - Clean review is visible in the log (P2)

**Goal**: with no findings nothing is posted, and the job log lists the reviewed files.

**Independent Test**: `quickstart.md` scenario 5.

- [x] T006 [US2] In `.github/workflows/claude-code-review.yml`, make the prompt post nothing when there are no findings and list the reviewed files and posted comments in its final message
- [x] T007 [US2] In `.github/workflows/claude-code-review.yml`, add a last step that prints only the `result` message of `execution_file`, breaks `::` and `##[` commands, handles `\r`, and is skipped when `execution_file` is empty
- [x] T008 [US2] Run the command of that step from `.github/workflows/claude-code-review.yml` on a sample execution file containing `::error::`, `##[error]` and a lone `\r`; every output line must start with `| ` and contain no `##[`

---

## Phase 5: User Story 3 - No repeated comments (P2)

**Goal**: pushing again does not post the same problem twice.

**Independent Test**: `quickstart.md` scenarios 2 and 3.

- [x] T009 [US3] In `.github/workflows/claude-code-review.yml`, save inline comments by `claude[bot]`, owners, members and collaborators (user, path, line, body; `--paginate`) to `$RUNNER_TEMP/review/comments.jsonl`, and make the prompt skip findings they already report
- [x] T010 [US3] Run the save step of `.github/workflows/claude-code-review.yml` against frontend PR #12; `comments.jsonl` must hold its 3 `claude[bot]` comments
- [x] T011 [US3] In `.github/workflows/claude-code-review.yml`, add `concurrency` with group `claude-review-<PR number>` and `cancel-in-progress: true`

---

## Phase 6: User Story 4 - Inline comments for `@claude review` (P3)

**Goal**: a requested review also posts findings inline.

**Independent Test**: `quickstart.md` scenario 4.

- [x] T012 [P] [US4] In `.github/workflows/claude.yml`, add `--allowedTools "mcp__github_inline_comment__create_inline_comment"` and an `--append-system-prompt` that asks for inline findings on review requests; keep `pull-requests: read` and do not mention the tracking comment

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T013 Run `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` and `pnpm test:hooks`; confirm the change touches only `.github/workflows/claude-code-review.yml`, `.github/workflows/claude.yml` and `specs/53/`
- [x] T014 Review the diff of `.github/workflows/` against `specs/53/plan.md`, focused on what differs from the backend (`react-reviewer` does not apply: no change under `src/`), and fix Critical and High findings
- [ ] T015 After merge, run the scenarios in `specs/53/quickstart.md` on test PRs and close them without merging

---

## Dependencies & Execution Order

- T001 → T002 → US1 (T003 → T004 → T005).
- US2 (T006 → T007 → T008) and US3 (T009 → T010, T011) need US1: same file and same prompt.
- US4 (T012) needs only T001.
- T013 and T014 need all implementation tasks. T015 needs the merge and cannot be done in the PR.

### Parallel Opportunities

T012 edits another file, so it can run beside T002 to T011:

```text
Track A: T002 ... T011  .github/workflows/claude-code-review.yml
Track B: T012           .github/workflows/claude.yml
```

Inside US1, US2 and US3 nothing is parallel: they share one file.

## Implementation Strategy

- **MVP**: T001 to T005 (US1).
- **Delivery**: all four stories in one PR; the change is two small files, and the final workflow can only be verified after merge.
