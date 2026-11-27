# Tasks: #33 Implement feature Create Workspace

**Input**: `specs/33/` (spec.md, plan.md, research.md, data-model.md, contracts/api-client.md, quickstart.md)

**Context**: The dialog shipped with #6 in `src/features/workspaces/components/CreateWorkspaceDialog.tsx`. This card only closes the gaps in research R1: the spinner label (R3), browser Back (R2), and regression tests. Stories follow `../specs/029-create-workspace/spec.md` (US1 create, US3 processing, US5 keyboard and accessibility). Tests are requested by the plan.

**Format**: `[ID] [P?] [Story] Description`. All paths are relative to the repo root `agi-board-frontend-33/`.

## Phase 1: Setup

None: no dependency, config or file to add.

## Phase 2: Foundational

None: the API (`createWorkspace`), hook (`useCreateWorkspace`) and dialog already exist.

---

## Phase 3: User Story 1 - Create a workspace (P1)

**Goal**: The created-from-Home flow matches 029 US1, including browser Back closing only the dialog (029 AS1.16, FR-020, decision #349).

**Independent Test**: Open the dialog on Home, press browser Back: dialog closes, URL stays `/`. Reload with the dialog open: Home shows without it. Create "Acme": WEB-04 opens; Back returns to Home with no dialog.

### Tests

- [X] T001 [P] [US1] In `src/features/workspaces/pages/HomePage.test.tsx` (`describe('HomePage Create workspace (US2)')`), add: (a) a double click on `Create` sends exactly one `POST /workspaces` (count requests in the MSW handler); (b) ~~a pasted name with a line break is sent with a space~~ dropped: jsdom strips line breaks from an `<input>` before any handler, so it cannot be tested here (browsers turn them into spaces on paste); (c) `Cancel` after typing closes the dialog, focus returns to the `Create workspace` button, and a reopened dialog has an empty field; (d) `Esc` closes the dialog when not processing.
- [X] T002 [US1] In `src/features/workspaces/pages/HomePage.test.tsx`, add a Back test with the existing `createMemoryRouter`: open the dialog, call `router.navigate(-1)` (return `router` from `renderHome()`), expect the dialog gone, `router.state.location.pathname` still `/` and `Your workspaces` still shown; then open it again, click `Cancel`, and expect the dialog closed and pathname `/` (Cancel drops the history entry it added). Fails before T003.

### Implementation

- [X] T003 [US1] In `src/features/workspaces/components/CreateWorkspaceDialog.tsx`, implement research R2: keep `open` in local state; on open call `navigate('.', { state: { createWorkspace: true } })` (same URL, new history entry); add `const location = useLocation()` and an effect that, when `open` is true and `location.state?.createWorkspace` is falsy, closes the dialog (reset form and `create.reset()` as in `onOpenChange`) unless `create.isPending`, in which case it re-pushes the entry with the same `navigate('.', { state })`; when Cancel / Esc / outside click close the dialog, call `navigate(-1)` to drop the entry; on success navigate to `/w/${workspace.id}` with `{ replace: true }`. A reload must not reopen the dialog (local state only). Keep the existing guard `if (create.isPending) return` in `onOpenChange`.
- [X] T004 [US1] In `e2e/home.spec.ts`, add a test reusing `signIn(page, HOME)`: open `Create workspace`, `page.goBack()` → dialog hidden and URL `/`; open again, `page.reload()` → dialog hidden; open, type "Acme", route `POST http://api.e2e/workspaces` to a 201 workspace `{ id: 'w9', name: 'Acme', role: 'admin', boardCount: 0, memberCount: 1, boards: [] }` and `GET http://api.e2e/workspaces/w9` to the same, click `Create` → URL `/w/w9`; `page.goBack()` → URL `/` with no dialog.

**Checkpoint**: T001–T004 pass; Back/reload behave per FR-020.

---

## Phase 4: User Story 3 - Processing and failure (P2)

**Goal**: While processing, Back is ignored (029 AS3.11) and `Enter` does nothing (AS3.8).

**Independent Test**: With `POST /workspaces` delayed forever, click `Create`, press Back: dialog stays open and locked.

- [X] T005 [US3] In `src/features/workspaces/pages/HomePage.test.tsx`, extend `it('locks the dialog while creating')`: after clicking `Create` (handler uses `delay('infinite')`), `router.navigate(-1)` keeps the dialog open with `Cancel` disabled, and pressing `{Enter}` in the field sends no second request. Depends on T002 (`router` returned) and T003.

**Checkpoint**: T005 passes.

---

## Phase 5: User Story 5 - Keyboard and accessibility (P3)

**Goal**: The spinner button has the text alternative "Creating workspace" (029 US5 AS5, FR-018; research R3).

**Independent Test**: While processing, the `Create` button's accessible name is "Creating workspace".

- [X] T006 [US5] In `src/features/workspaces/pages/HomePage.test.tsx`, in the locking test, query the button while pending with `getByRole('button', { name: 'Creating workspace' })` and expect it disabled (replace the current `{ name: 'Create' }` lookup made after the click). Fails before T007.
- [X] T007 [US5] In `src/features/workspaces/components/CreateWorkspaceDialog.tsx`, render the submit button content as `{create.isPending ? (<><Spinner /><span className="sr-only">Creating workspace</span></>) : 'Create'}`, the same pattern as `src/features/workspaces/components/InviteList.tsx` ("Accepting invite").
- [X] T008 [P] [US5] In `src/features/workspaces/pages/HomePage.test.tsx`, add: with a blank (never touched) field, pressing `{Enter}` sends no request and shows no error (029 AS1.15, AS2.6).

**Checkpoint**: T006–T008 pass.

---

## Phase 6: Polish

- [X] T009 Update the `CreateWorkspaceDialog` doc comment in `src/features/workspaces/components/CreateWorkspaceDialog.tsx` with one line on why the dialog pushes a history entry (Back closes it, #349).
- [X] T010 Run `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` in the worktree; fix failures.
- [ ] T011 Walk through `specs/33/quickstart.md` manual steps 1–5 against a running backend.

---

## Dependencies

- T003 depends on T002 (test first); T004 depends on T003.
- T005 depends on T002 and T003.
- T007 depends on T006. T006 and T005 edit the same test, do them in sequence.
- Phase 5 does not depend on Phase 3 except for the shared test file.
- T010–T011 last.

## Parallel examples

- T001 and T008 (separate `it` blocks in the same file, no shared helper change) can be written in parallel with T007.
- Story phases touch the same two files, so run them in order: US1 → US3 → US5.

## Implementation strategy

MVP = Phase 3 (Back behaviour, the only real behaviour gap). Then US3 (Back ignored while processing, same code path), then US5 (one-line label). Not in this card: visibility, account-menu entry, real-time Home refresh, `Create new board` tile (spec Clarifications; research R1). Session-ended handling is global (`src/lib/query-client.ts`) and already tested there.
