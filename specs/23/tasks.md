# Tasks: #23 Implement feature Create Board

**Input**: `specs/23/` (spec.md, plan.md, research.md, data-model.md, contracts/api-client.md, quickstart.md)

**Context**: New dialog WEB-D01 opened from an admin-only `Create new board` tile on Home and WEB-04, modelled on `src/features/workspaces/components/CreateWorkspaceDialog.tsx`. Stories follow the card's Acceptance Criteria groups (spec.md), with details from `../specs/019-create-board/spec.md` and the Clarifications. Endpoint `POST /workspaces/:workspaceId/boards` is confirmed by backend #23; tests mock it with MSW / `page.route`. Tests are included: the repo's Stop hook requires `lint`, `typecheck`, `test` (and `e2e` for route changes) to pass.

**Format**: `[ID] [P?] [Story] Description`. All paths are relative to the repo root `agi-board-frontend-23/`.

## Phase 1: Setup

- [x] T001 Generate the tooltip component with `pnpm dlx shadcn@latest add tooltip` (`src/components/ui/tooltip.tsx`). The generated `Tooltip` has no built-in provider; `CreateBoardDialog` wraps its tooltips in a local `TooltipProvider` (works in component tests without app providers). Added a `ResizeObserver` stub to `src/test/setup.ts` for Radix Popper in jsdom.

## Phase 2: Foundational

- [x] T002 [P] In `src/features/workspaces/api.ts`, add `export type BoardVisibility = BoardTile['visibility']` and `export const createBoard = (workspaceId: string, body: { name: string; visibility: BoardVisibility }) => api<BoardTile>(\`/workspaces/${id(workspaceId)}/boards\`, { method: 'POST', body: JSON.stringify(body) })`.
- [x] T003 In `src/features/workspaces/hooks.ts`, add `useCreateBoard(workspaceId: string)`: `useMutation({ mutationFn: (body) => createBoard(workspaceId, body), onSuccess: () => Promise.all([invalidate ['home'], invalidate ['workspaces', workspaceId]]) })` (research R6). Depends on T002.

**Checkpoint**: `pnpm typecheck` passes.

---

## Phase 3: User Story 1 - Enter a board title, create and open the board (P1) 🎯 MVP

Card AC 1 + AC 2; 019 US1, US2, US3; research R3, R5, R6.

**Goal**: A workspace admin clicks `Create new board`, types a title, clicks `Create`, and lands on `/b/:id`.

**Independent Test**: On Home as admin of "Marketing", click `Create new board` in its section → dialog `Create board` with empty `Board title`, read-only "Marketing", `Create` disabled; type " Roadmap " → `Create` enabled; click → request body `{ name: 'Roadmap', visibility: 'workspace' }`, spinner, then URL `/b/<id>`.

### Tests

- [x] T004 [P] [US1] In `src/features/workspaces/pages/HomePage.test.tsx`, add `describe('HomePage Create board (#23)')` with an MSW handler for `POST ${API}/workspaces/:workspaceId/boards` that records the body and returns a `BoardTile` `{ id: 'b9', name: 'Roadmap', workspaceId: 'w1', … }`: (a) a workspace with `role: 'admin'` shows a `Create new board` button as the last tile, also when it has no boards; workspaces with `role: 'member'` and `role: null` (Guest) show none; (b) clicking it opens dialog `Create board` with an empty, focused `Board title` field, the workspace name as text (not an input), and `Create` disabled; (c) typing spaces then clearing shows "Enter a board title." with `aria-invalid` and `Create` disabled; typing a title clears it and enables `Create`; (d) " Roadmap " is sent as `{ name: 'Roadmap', visibility: 'workspace' }` to `/workspaces/w1/boards` and the router lands on `/b/b9`; (e) a very long title (500 chars) is accepted; (f) a double click on `Create` sends exactly one request.
- [x] T005 [P] [US1] In `src/features/workspaces/pages/HomePage.test.tsx` (same describe), with the handler using `delay('infinite')`: after `Create`, the submit button's accessible name is "Creating board" and it is disabled, `Board title` is read-only, both radios and `Cancel` are disabled, and `{Escape}` leaves the dialog open (decision #120).
- [x] T006 [P] [US1] In `src/features/workspaces/pages/HomePage.test.tsx` (same describe), with the handler returning 403 `{ error: { code: 'BOARD_CREATE_FORBIDDEN' } }`: banner "Something went wrong. Try again." shows, the typed title and the chosen visibility stay, `Create` is enabled again; editing the title keeps the banner (019 AS4.4).
- [x] T007 [P] [US1] In `src/features/workspaces/pages/WorkspaceBoardsPage.test.tsx`, add: `role: 'admin'` with `boards: []` shows the `Create new board` tile and no "No boards yet."; `role: 'member'` shows no tile; clicking the tile as admin opens `Create board` with the workspace name read-only.

### Implementation

- [x] T008 [US1] Create `src/features/workspaces/components/CreateBoardDialog.tsx` (`/** WEB-D01 Create board, with its `Create new board` tile trigger. */`), props `{ workspace: Pick<WorkspaceTile, 'id' | 'name'> }`, following `CreateWorkspaceDialog.tsx` without its history-entry logic (research R3):
  - zod schema `name: z.string().trim().min(1, 'Enter a board title.')` — "no maximum length" (decision #118), no max rule; `visibility: z.enum(['workspace', 'private'])`, default `'workspace'` (decision #3); `useForm({ resolver: zodResolver(schema), mode: 'onChange', defaultValues: { name: '', visibility: 'workspace' } })`.
  - Trigger: `<DialogTrigger asChild><button type="button">Create new board</button></DialogTrigger>` rendered as an `<li>` tile (same size as `BoardTile`, dashed border, token colors only, focus ring like `BoardTile`).
  - `DialogTitle` "Create board"; field label `Board title` (id `board-title`, `autoFocus`, `readOnly={create.isPending}`, `aria-invalid` / `aria-describedby` on error, error `<p role="alert">` under it); read-only workspace block: label "Workspace" + the workspace name as text with `truncate` and `title`.
  - `onOpenChange`: ignore while `create.isPending`; on close `reset()` and `create.reset()`.
  - Submit: `create.mutate(values, { onSuccess: (board) => { setOpen(false); reset(); navigate(\`/b/${board.id}\`) } })`; button `disabled={!formState.isValid || create.isPending}`, pending content `<Spinner /><span className="sr-only">Creating board</span>`; `Cancel` (`variant="outline"`) disabled while pending.
  - Banner `{create.isError && <p role="alert">Something went wrong. Try again.</p>}` with the same classes as `CreateWorkspaceDialog`; do not clear it on edit (019 AS4.4).
  - Leave the `Visibility` fieldset as a placeholder radio pair for now; US2 (T011) adds icons and tooltips.
- [x] T009 [US1] In `src/features/workspaces/components/WorkspaceSection.tsx`, replace the `shortcut:` comment: render the `<ul>` grid when `workspace.boards.length > 0 || workspace.role === 'admin'`, and append `<CreateBoardDialog workspace={workspace} />` as the last item when `workspace.role === 'admin'` (019 FR-011/FR-012). Depends on T008.
- [x] T010 [US1] In `src/features/workspaces/pages/WorkspaceBoardsPage.tsx`, update the empty-workspace comment, render the grid when `workspace.boards.length > 0 || workspace.role === 'admin'`, and append `<CreateBoardDialog workspace={workspace} />` for `workspace.role === 'admin'`. Depends on T008.

**Checkpoint**: T004–T007 pass.

---

## Phase 4: User Story 2 - Choose visibility (P2)

Card AC 3; spec Clarifications (tooltips); research R4.

**Goal**: `Visibility` shows `Workspace` (selected) and `Private`, each explained by a tooltip on hover and focus; the choice is sent.

**Independent Test**: Open the dialog: `Workspace` checked, `Private` not; hover/focus each → its tooltip text; choose `Private` and create → body `visibility: 'private'`.

- [x] T011 [US2] In `src/features/workspaces/components/CreateBoardDialog.tsx`, build `Visibility` as `<fieldset>` + `<legend>Visibility</legend>` with two native `<input type="radio" {...register('visibility')}>` options in this order: `Workspace` (value `workspace`, icon `Users`) and `Private` (value `private`, icon `Lock`), icons `aria-hidden` as in `BoardTile.tsx`; radios `disabled={create.isPending}`. Wrap each option's `<label>` in `Tooltip` / `TooltipTrigger asChild` / `TooltipContent` from `@/components/ui/tooltip` with the (proposed) text exactly: Workspace → "All members of the workspace can see this board." · Private → "Only board members can see this board." Also link each text to its radio with `aria-describedby` via a visually hidden span so screen readers get it without hover.
- [x] T012 [P] [US2] In `src/features/workspaces/pages/HomePage.test.tsx` (Create board describe): `Workspace` radio checked and `Private` unchecked on open; focusing/hovering `Private` shows "Only board members can see this board." (`findByRole('tooltip')`), `Workspace` shows "All members of the workspace can see this board."; choosing `Private` then `Create` sends `visibility: 'private'`.

**Checkpoint**: T012 passes. Access to a Private board (AC 3.2) is enforced by the backend; nothing to build here.

---

## Phase 5: User Story 3 - Cancel without creating (P3)

Card AC 4; 019 US4 AS1.

**Goal**: `Cancel`, `Esc` and a click outside close the dialog, create nothing, and leave the person on the workspace view; reopening starts clean.

**Independent Test**: Open, type a title, choose `Private`, `Cancel` → closed, no request, still on `/`; reopen → empty title, `Workspace` selected, no banner.

- [x] T013 [P] [US3] In `src/features/workspaces/pages/HomePage.test.tsx` (Create board describe): (a) `Cancel` after typing closes the dialog, sends no request, pathname stays `/`, focus returns to the `Create new board` tile; reopening shows an empty title, `Workspace` checked and no banner (also after a failed create); (b) `{Escape}` closes the dialog the same way. Outside click is covered by Radix and checked in e2e (T014).

**Checkpoint**: T013 passes (behaviour comes from T008; fix there if not).

---

## Phase 6: Polish & Cross-Cutting

- [x] T014 In `e2e/home.spec.ts`, add `test('a workspace admin creates a board from the Home tile and lands on it')` reusing `signIn(page, HOME)` with a workspace `role: 'admin'`: click `Create new board`, click outside the dialog → closed; reopen, type "Roadmap", route `POST http://api.e2e/workspaces/w1/boards` to 201 `BoardTile` `{ id: 'b9', … }` (assert the posted JSON is `{ name: 'Roadmap', visibility: 'workspace' }`), route `POST http://api.e2e/boards/b9/views` to 204, click `Create` → URL `/b/b9`.
- [x] T015 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm e2e` unpiped; fix until all pass.
- [ ] T016 Walk through [quickstart.md](quickstart.md) against the backend #23 branch (`pnpm dev`) and compare the dialog and tile with `../docs/ui-pipeline/mockups/web/WEB-D01-create-board.html` and `WEB-03-home.html`.
- [x] T017 Run the `react-reviewer` agent on the diff; fix Critical and High findings, then `/create-pr`.

---

## Dependencies & Execution Order

- T001 (tooltip) → T011. T002 → T003 → T008 → T009, T010 → T011.
- US1 (Phase 3) is the MVP and blocks US2/US3 (same component). US2 and US3 are independent of each other.
- Tests T004–T007 can be written first (they fail until T008–T010); T012 after T011's labels exist; T013 any time after T008.

### Parallel opportunities

- T001 ∥ T002.
- T004, T005, T006 share `HomePage.test.tsx` (one person or sequential edits); T007 (`WorkspaceBoardsPage.test.tsx`) in parallel with them.
- T012 ∥ T013 once T011 is done (same test file: append in separate `it` blocks).

## Implementation Strategy

1. MVP: T001–T010 → an admin can create a board (default `Workspace` visibility) and land on it; run `pnpm test`.
2. Add US2 (T011–T012) for visibility + tooltips, then US3 checks (T013).
3. Polish: e2e, full checks, quickstart, review, PR.

## Out of scope (recorded)

- WEB-07 board header / navigation / empty state (card AC 2.2): `BoardPage` is still a placeholder and there is no `GET /boards/:id`; belongs to the WEB-07 card (research R6).
- Workspace picker, workspace dropdown, browser-Back handling for this dialog (spec Clarifications, research R3).
