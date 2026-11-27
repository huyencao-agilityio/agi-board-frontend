---
description: 'Tasks for #6 Home — Workspaces, Boards and Invites (frontend)'
---

# Tasks: #6 Home — Workspaces, Boards and Invites

**Input**: `specs/6/` (plan.md, spec.md, research.md, data-model.md, contracts/api-client.md, quickstart.md)

**Tests**: Included. `.claude/rules/testing.md` requires a component test for each new screen or form, one test per role for permission-dependent UI, and an e2e test when routes or layouts change.

**Sources to keep open while implementing**: `../docs/ui-pipeline/screens/WEB-03-home.md`, `WEB-D16-create-workspace.md`, `WEB-04-workspace-boards.md`, `../docs/ui-pipeline/mockups/web/WEB-03-home.html`, `../agi-board-backend-6/specs/6/contracts/http.md`. Labels are copied verbatim from these (quoted below).

## Format: `[ID] [P?] [Story] Description`

## User stories (from the card's Acceptance Criteria)

| Story                                                  | ACs     | Priority  |
| ------------------------------------------------------ | ------- | --------- |
| US1 Workspace and board lists, empty state, navigation | 4, 5, 6 | P1 🎯 MVP |
| US2 Create workspace (WEB-D16)                         | 1       | P1        |
| US3 Starred and recently viewed, star, record view     | 2       | P2        |
| US4 Pending workspace and board invites                | 3, 7    | P2        |
| US5 Workspace sidebar                                  | 8       | P3        |

---

## Phase 1: Setup

- [x] T001 Confirm no new dependency is needed (all in `package.json`) and that `src/components/ui/` has `button`, `dialog`, `input`; nothing to add. Run `pnpm typecheck` once on the clean worktree as a baseline.

---

## Phase 2: Foundational (blocks all stories)

- [x] T002 Add the contract types `BoardTile`, `WorkspaceTile`, `PendingInvite`, `Home` (fields exactly as in `specs/6/data-model.md`: `visibility: 'private' | 'workspace'`, `backgroundKey: string | null`, `role: 'admin' | 'member' | null`, `memberCount: number | null`, `board: { id, name } | null`, `expired: boolean`) and request functions `getHome()` → `GET /home`, `getWorkspace(id)` → `GET /workspaces/:id`, `createWorkspace({ name })` → `POST /workspaces`, `starBoard(id)` → `PUT /boards/:id/star`, `unstarBoard(id)` → `DELETE /boards/:id/star`, `acceptInvite(id)` → `POST /invites/:id/accept` returning `{ workspaceId: string; boardId: string | null }`, `declineInvite(id)` → `POST /invites/:id/decline`, all through `api()` with `encodeURIComponent` on ids, in `src/features/workspaces/api.ts`
- [x] T003 Add `useHome()` (key `['home']`) and `useWorkspace(id)` (key `['workspaces', id]`) in `src/features/workspaces/hooks.ts`
- [x] T004 [P] Add `byName<T extends { name: string }>(items: T[]): T[]`, which returns a sorted copy using `a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })` and keeps the input order for equal names, in `src/features/workspaces/sort.ts`, with a unit test (case-insensitive order, ties keep input order, input not mutated) in `src/features/workspaces/sort.test.ts`
- [x] T005 [P] Build `BoardTile` in `src/features/workspaces/components/BoardTile.tsx`. Props are `board: BoardTile` and an optional `onToggleStar?: () => void`. It contains:
  - a `<Link to={`/b/${id}`}>` with the board name; long names cut with "…" and a `title`;
  - the visibility icon (lucide `Lock` for private, `Users` for workspace) and the text `Private` / `Workspace`;
  - a token background `bg-muted` with `data-background={backgroundKey ?? undefined}`. Add `// shortcut: no image URL in the contract, map backgroundKey to the thumbnail when board backgrounds land`;
  - when `onToggleStar` is set, a separate `<button aria-pressed={starred} aria-label={starred ? 'Unstar board' : 'Star board'}>` with the lucide `Star` icon, filled when starred. It sits outside the link, so the link and the button are not nested.

**Checkpoint**: data layer and tile ready.

---

## Phase 3: US1 — Workspace and board lists, empty state, navigation (P1) 🎯 MVP

**Goal**: Home lists `Your workspaces` and `Guest workspaces` with counts and board tiles, shows the empty state, and links to WEB-04 and WEB-07. WEB-04 lists the workspace's accessible boards.

**Independent Test**: Mock `GET /home`. Workspaces show sorted with `3 boards · 5 members`; a guest workspace shows `1 board` only; with an empty list the empty-state message shows. Clicking the workspace name goes to `/w/:id` and clicking a tile goes to `/b/:id`.

### Tests

- [x] T006 [P] [US1] Component test in `src/features/workspaces/pages/HomePage.test.tsx`. Use a fresh `QueryClient` with `retry: false`, a `MemoryRouter`, and MSW `GET ${API}/home`. Cases:
  - (a) Sections `Your workspaces` and `Guest workspaces` are headings. Workspaces show in A–Z order regardless of case (`alpha` before `Beta`).
  - (b) A member workspace with `boardCount: 3, memberCount: 5` shows `3 boards · 5 members`; `boardCount: 1, memberCount: 1` shows `1 board · 1 member`; a guest workspace (`role: null, memberCount: null, boardCount: 1`) shows `1 board`.
  - (c) Boards inside a workspace are sorted by name; each tile shows `Private` or `Workspace`.
  - (d) The workspace name links to `/w/<id>` and the board tile links to `/b/<id>`.
  - (e) `workspaces: []` shows `You have no workspace yet. Create one or wait for an invite.` and the `Create workspace` button, with no `Starred boards`, `Recently viewed` or navigation landmark.
  - (f) `workspaces: []` with `hasArchivedWorkspaces: true` shows the link `View archived workspaces` to `/archived-workspaces` under the message; with `false` it is absent.
  - (g) A loading state is shown (Spinner) before the response.

### Implementation

- [x] T007 [P] [US1] `WorkspaceSection` in `src/features/workspaces/components/WorkspaceSection.tsx`:
  - The `<h3>` holds a `<Link to={`/w/${id}`}>` with the name, on one line cut with "…" and the full name in `title` (decision #334).
  - Counts: `${boardCount} ${boardCount === 1 ? 'board' : 'boards'}`, plus ` · ${memberCount} member(s)` only when `memberCount !== null`.
  - Board tiles use `byName(boards)` with `BoardTile` (`onToggleStar` comes from a prop, wired in US3).
  - No `Create new board` tile: `// shortcut: WEB-D01 dialog is a separate card; add the admin-only tile (decision #59) there`.
- [x] T008 [US1] Replace the placeholder in `src/features/workspaces/pages/HomePage.tsx`, keeping the first line `// WEB-03 Home`:
  - Read `useHome()` and show the `Spinner` while loading.
  - Visually hidden `<h1>Home</h1>`.
  - A `Create workspace` button (wired in US2).
  - `<h2>Your workspaces</h2>` with `byName(workspaces.filter(w => w.role !== null))`, and `<h2>Guest workspaces</h2>` with `role === null`. Each section is hidden when it is empty.
  - When `workspaces.length === 0`: the empty-state text `You have no workspace yet. Create one or wait for an invite.` and, when `hasArchivedWorkspaces`, `<Link to="/archived-workspaces">View archived workspaces</Link>` under it.
  - Derive everything during render; no `useState` copies.
- [x] T009 [US1] WEB-04 minimal list in `src/features/workspaces/pages/WorkspaceBoardsPage.tsx`, keeping `// WEB-04 Workspace boards`: `useParams().workspaceId` and `useWorkspace(id)`, `<h1>` = workspace name, and `byName(boards)` as `BoardTile`s. A 404 `WORKSPACE_NOT_FOUND` is thrown to `RouteError` (WEB-13) by the default `throwOnError`; do not handle it in the page.
- [x] T010 [P] [US1] Component test for WEB-04 in `src/features/workspaces/pages/WorkspaceBoardsPage.test.tsx`: the name as `<h1>`, tiles sorted, and a tile linking to `/b/<id>`.

**Checkpoint**: US1 alone gives a working Home (read-only) and a WEB-04 list.

---

## Phase 4: US2 — Create workspace, WEB-D16 (P1)

**Goal**: The `Create workspace` button opens a dialog; a valid name creates the workspace and lands on WEB-04.

**Independent Test**: Open the dialog. `Create` stays disabled for empty or space-only input. Submitting sends `POST /workspaces` with the trimmed name and the CSRF header and navigates to `/w/<id>`. A 500 shows the banner and keeps the name.

### Tests

- [x] T011 [P] [US2] Add these cases to `src/features/workspaces/pages/HomePage.test.tsx`:
  - (a) Click `Create workspace`: the dialog `Create workspace` opens with focus in `Workspace name`, and `Create` is disabled.
  - (b) Type `   ` and then clear it: `Enter a workspace name.` shows (`role="alert"`) and `Create` stays disabled.
  - (c) Type `  Team A  ` and press `Enter`: `POST ${API}/workspaces` with body `{ "name": "Team A" }` and the `X-CSRF-Token` header (set the `csrf_token` cookie in the test), then navigation to `/w/<id>` (assert with a catch-all route that prints the location).
  - (d) A 500 response shows the banner `Something went wrong. Try again.` and the name stays. Editing the name clears the banner; closing and reopening shows no banner and an empty field.
  - (e) While the request is pending, the `Create` button shows a spinner with a text alternative, and the field and `Cancel` are disabled.

### Implementation

- [x] T012 [US2] `useCreateWorkspace()` in `src/features/workspaces/hooks.ts`: `mutationFn: createWorkspace`, `onSuccess` invalidates `['home']`.
- [x] T013 [US2] `CreateWorkspaceDialog` in `src/features/workspaces/components/CreateWorkspaceDialog.tsx`:
  - shadcn `Dialog`, title `Create workspace`, field label `Workspace name`, buttons `Cancel` (secondary) and `Create` (primary).
  - `react-hook-form` + `zodResolver` with `z.string().trim().min(1, 'Enter a workspace name.')`, no max length (WEB-D16 #231), `mode: 'onChange'`. Before submitting, replace line breaks with spaces (#239).
  - `Create` is disabled while the trimmed name is empty or the mutation is pending.
  - Ignore `Esc`, outside clicks and `Cancel` while pending (#231).
  - The error banner (`role="alert"`) reads `Something went wrong. Try again.`; it clears on name change and resets on close (`mutation.reset()` + `form.reset()`) (#237).
  - On success, close the dialog and `navigate(`/w/${workspace.id}`)`. No toast.
  - Focus returns to the trigger on close (built into the shadcn Dialog).
- [x] T014 [US2] Wire the `Create workspace` button in `src/features/workspaces/pages/HomePage.tsx` to open `CreateWorkspaceDialog`. It shows in both the default and the empty state, for every signed-in person.

**Checkpoint**: US1 + US2 cover a brand-new user end to end.

---

## Phase 5: US3 — Starred and recently viewed, star toggle, record view (P2)

**Goal**: `Starred boards` (A–Z), then `Recently viewed` (server order, ≤ 6). The star toggles optimistically with a silent rollback. Opening a board records a view.

**Independent Test**: With mocked `starred` / `recent`, the sections show in order. Clicking `Star board` sends `PUT`, and a 500 restores the star with no message. Visiting `/b/:id` sends one `POST /boards/:id/views`.

### Tests

- [x] T015 [P] [US3] Add these cases to `src/features/workspaces/pages/HomePage.test.tsx`:
  - (a) `starred: [{name:'Beta'},{name:'alpha'}]` and `recent: [{name:'Zed'},{name:'Ann'}]` show the heading `Starred boards` with `alpha`, `Beta`, then `Recently viewed` with `Zed`, `Ann` (server order).
  - (b) Each section is hidden when its list is empty.
  - (c) Click `Star board` on an unstarred tile: `PUT ${API}/boards/<id>/star` is sent with the CSRF header, and the button immediately becomes `Unstar board` (`aria-pressed=true`).
  - (d) `PUT` returns 500: the button returns to `Star board` and no alert shows.
  - (e) Click `Unstar board`: `DELETE ${API}/boards/<id>/star` is sent.
- [x] T016 [P] [US3] Test in `src/features/boards/pages/BoardPage.test.tsx`: rendering `/b/b1` sends exactly one `POST ${API}/boards/b1/views`. A 404 response leaves the page rendered with no error. Stub the socket if `useBoardSocket` needs it, the same way the existing tests do; if none do, mock `@/lib/ws` with `vi.mock` and add a one-line comment saying why.

### Implementation

- [x] T017 [US3] `useToggleStar()` in `src/features/workspaces/hooks.ts`:
  - `mutationFn: ({ board, star }) => star ? starBoard(board.id) : unstarBoard(board.id)`.
  - `onMutate`: cancel `['home']`, snapshot it, then `setQueryData` to set `starred` on every tile with that id (in `starred`, `recent` and `workspaces[].boards`), adding the board to `starred` or removing it. The contract already excludes starred boards from `recent`; leave `recent` as is until the refetch.
  - `onError`: restore the snapshot silently (decision #51).
  - `onSettled`: invalidate `['home']`.
- [x] T018 [US3] In `src/features/workspaces/pages/HomePage.tsx`, render `<h2>Starred boards</h2>` (`byName(home.starred)`) and then `<h2>Recently viewed</h2>` (`home.recent` as sent) above the workspace sections, each hidden when empty and both hidden in the empty state. Pass `onToggleStar` from `useToggleStar` to every `BoardTile`, in `WorkspaceSection` too.
- [x] T019 [P] [US3] Add `recordView(boardId)` → `POST /boards/:id/views` in `src/features/boards/api.ts` (new file).
- [x] T020 [US3] In `src/features/boards/pages/BoardPage.tsx`, add a `useEffect` keyed on `boardId` that calls `recordView(boardId)`, then invalidates `['home']` through `useQueryClient` on success and ignores errors (`.catch(() => {})`). Add the comment `// AC 6.2: feeds Recently viewed; a 404 here must not block the board`.

**Checkpoint**: Starred and Recently viewed work independently of invites.

---

## Phase 6: US4 — Pending workspace and board invites (P2)

**Goal**: A `Pending invites` section at the top with accept and decline, the processing state, the expired state and row errors.

**Independent Test**: With a mocked `invites` list: rows show their texts; Accept shows the spinner and locks the row; an expired row has Accept disabled; a 409 shows the row error.

### Tests

- [x] T021 [P] [US4] Add these cases to `src/features/workspaces/pages/HomePage.test.tsx`:
  - (a) A workspace invite shows the heading `Pending invites`, the workspace name and `Invited by Binh Tran · Role: Member`.
  - (b) A board invite shows the board name and the workspace name as context.
  - (c) Click `Accept`: `POST ${API}/invites/<id>/accept` is sent with the CSRF header. While pending, the button shows the spinner named `Accepting invite` and both buttons of that row are disabled, while buttons of other rows stay enabled. After success the refetched `/home` (second response without the invite and with the new workspace) no longer shows the row and does show the workspace.
  - (d) `expired: true` shows `This invite has expired. Ask an admin to resend it.`; `Accept` is disabled and `Decline` sends `POST …/decline`.
  - (e) Accept returns 409 `INVITE_EXPIRED`: the row shows `Something went wrong. Try again.` and its buttons are enabled again.
  - (f) With no invites, there is no `Pending invites` heading.
  - (g) Invites still show in the empty state (decision #49).

### Implementation

- [x] T022 [US4] Add `useAcceptInvite()` and `useDeclineInvite()` in `src/features/workspaces/hooks.ts`. Both invalidate `['home']` in `onSettled`, on success and on error, so an expired or gone invite shows its real state.
- [x] T023 [US4] `InviteList` in `src/features/workspaces/components/InviteList.tsx`:
  - `<h2>Pending invites</h2>` and a list. Each row is an `InviteRow` that owns its own two mutations, so state is per row.
  - Title: `invite.board?.name ?? invite.workspace.name`; for a board invite, the workspace name is the context line.
  - Meta line: `Invited by ${invitedBy.fullName} · Role: ${role === 'admin' ? 'Admin' : 'Member'}`.
  - Expired: the text `This invite has expired. Ask an admin to resend it.` and `Accept` disabled.
  - While accepting: `Spinner` with the accessible name `Accepting invite` in place of the `Accept` label, and both buttons disabled.
  - On error: `<p role="alert">Something went wrong. Try again.</p>` in the row, with the buttons enabled again.
  - Stay on Home after success; ignore the `{ workspaceId, boardId }` response (WEB-03 §6).
- [x] T024 [US4] Render `InviteList` at the top of `src/features/workspaces/pages/HomePage.tsx` when `home.invites.length > 0`, in both the default and the empty state.

**Checkpoint**: invites work with or without workspaces.

---

## Phase 7: US5 — Workspace sidebar (P3)

**Goal**: The shared sidebar on Home and on workspace pages, replacing the Boards / Members / Settings tabs.

**Independent Test**: On Home the rows are collapsed. Expanding an admin row shows `Boards`, `Members` and `Settings`; a member or guest row shows `Boards` only. `View archived workspaces` shows only when `hasArchivedWorkspaces`. There is no sidebar with zero workspaces. On `/w/:id/members` that workspace is expanded with `Members` current.

### Tests

- [x] T025 [P] [US5] Component test in `src/features/workspaces/components/WorkspaceSidebar.test.tsx`, with MSW `/home` and a `MemoryRouter`:
  - (a) Groups `Your workspaces` (A–Z) and `Guest workspaces`; each row is a button with `aria-expanded=false` showing the first letter and the name.
  - (b) Expanding an admin row shows the links `Boards` (`/w/<id>`), `Members` (`/w/<id>/members`) and `Settings` (`/w/<id>/settings`).
  - (c) Expanding a member row shows `Boards` only, and so does a guest row.
  - (d) `hasArchivedWorkspaces` true shows the link `View archived workspaces` to `/archived-workspaces`; false leaves it absent.
  - (e) Rendered at `/w/w2/members`, row `w2` starts expanded and `Members` has `aria-current="page"`.
  - (f) `workspaces: []` renders nothing.
- [x] T026 [P] [US5] Update `src/app/layouts/AppLayout.test.tsx` if it asserts workspace tabs. Add an e2e test `e2e/home.spec.ts`, mocking `http://api.e2e/auth/me` and `/home` with `page.route` the way `e2e/profile.spec.ts` does, with one flow per test:
  - (1) Home shows the sidebar; expand a workspace, click `Boards`, land on WEB-04 with the sidebar and the remaining tabs `Closed boards` / `Audit log`, and no `Members` tab.
  - (2) `GET /workspaces/:id` 404 shows WEB-13.
  - (3) An empty account shows the empty-state message and no sidebar.

### Implementation

- [x] T027 [US5] `WorkspaceSidebar` in `src/features/workspaces/components/WorkspaceSidebar.tsx`:
  - Reads `useHome()` and returns `null` while loading or when `workspaces.length === 0` (decision #372).
  - `<nav aria-label="Workspaces">` with `<h2>Your workspaces</h2>` (role ≠ null, `byName`) and `<h2>Guest workspaces</h2>` (role null), each hidden when empty.
  - Row: `<button aria-expanded>` with a letter square (`name[0].toUpperCase()`, `aria-hidden`) and the name, truncated with `title`.
  - Expanded state: `useState<Set<string>>` initialised with `useParams().workspaceId` when present.
  - Expanded links use `NavLink` (`end` for `Boards`): `Boards` → `/w/:id`; `Members` → `/w/:id/members` and `Settings` → `/w/:id/settings` only when `role === 'admin'`.
  - At the bottom, `View archived workspaces` → `/archived-workspaces` when `hasArchivedWorkspaces`. Add `// shortcut: WEB-20 route lands with its own card; WEB-13 until then`.
  - No archived workspace row (decision #374 belongs to the WEB-20 card).
- [x] T028 [US5] In `src/features/workspaces/pages/HomePage.tsx`, use a two-column layout: `WorkspaceSidebar` on the left and the content on the right. With zero workspaces, the content takes the full width (the sidebar renders null).
- [x] T029 [US5] In `src/app/layouts/WorkspaceLayout.tsx`, remove the `Boards`, `Members` and `Settings` tabs and keep `Closed boards` and `Audit log`. Render `WorkspaceSidebar` in a left column with the tabs and `<Outlet />` on the right. Update the top comment to cite decision #370 and the user decision of 2026-11-27. The layout may import the workspaces feature's component, because `app/` composes features.

**Checkpoint**: all 8 AC groups covered.

---

## Phase 8: Polish & cross-cutting

- [x] T030 Compare `/` with `../docs/ui-pipeline/mockups/web/WEB-03-home.html` (states Default, No workspace yet, Processing, Invite expired) for spacing, tokens only (`grep -nE '#[0-9a-fA-F]{3,6}|rgb\(|bg-(red|blue|gray|slate)-' src/features/workspaces`) and keyboard order. Check focus returns to `Create workspace` after the dialog closes.
- [x] T031 Update the route table comment in `../docs/frontend-init-plan.md` only if `WorkspaceLayout`'s tab note there is now wrong (line 61: "tabs Boards / Members / Settings / Closed boards / Audit log"). It is in the parent repo, so note it in the PR instead of editing it, if the parent repo is out of this PR's scope.
- [x] T032 Run `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` unpiped and fix until all exit 0.
- [x] T033 Run the `react-reviewer` agent on the diff and fix Critical and High findings (CLAUDE.md flow), then `/create-pr`. (Review done: 4 High + 3 Medium fixed; `/create-pr` is left to the user.)

---

## Dependencies & execution order

- Phase 2 (T002–T005) blocks every story.
- US1 (T006–T010) comes before the others, because they render inside `HomePage`'s structure from T008.
- US2, US3 and US4 are independent of each other after US1 (each adds one block to `HomePage.tsx`, so edit that file in sequence, not concurrently).
- US5 needs only Phase 2; T028 touches `HomePage.tsx`, so do it after the other Home edits.
- Polish comes last.

```
T001 → T002 → T003 ─┬─ US1 (T006–T010) ─┬─ US2 (T011–T014)
        T004 [P] ───┤                   ├─ US3 (T015–T020)
        T005 [P] ───┘                   ├─ US4 (T021–T024)
                                        └─ US5 (T025–T029) → Polish (T030–T033)
```

## Parallel examples

- Phase 2: T004 (`sort.ts`) and T005 (`BoardTile.tsx`) alongside T002/T003.
- US1: T006 (test), T007 (`WorkspaceSection`) and T010 (WEB-04 test) together; then T008, T009.
- US3: T016 (BoardPage test) and T019 (`boards/api.ts`) while T015/T017 are in progress.
- US5: T025 and T026 (tests) while T027 is being built.

## Implementation strategy

1. **MVP**: Phase 2 + US1. Home lists workspaces and boards, the empty state works, and WEB-04 lists boards. This is shippable on its own.
2. Add US2, so a new user can create a workspace and is no longer stuck on the empty state.
3. Add US3 and US4 in either order.
4. Add US5, which changes `WorkspaceLayout`, so run e2e here.
5. Polish, review, PR.

## Notes

- Labels are verbatim; `(proposed)` in the spec is the agreed wording, so drop the marker and keep the text.
- No `Create new board` tile, no WEB-20 route, no real-time Home updates, no sender-side invite actions (research R7).
- Commit per story: `feat(workspaces): #6 <Summary>` (scope lowercase, summary capitalised).

---

## Phase 9: Changes after implementation (2026-11-27)

Requested during review or caused by card, contract and mockup updates; all done and covered by the checks.

- [x] T034 [US1] Show the workspace name on Home in the link color (`text-primary-text`) so it reads apart from the black group headings, in `src/features/workspaces/components/WorkspaceSection.tsx`
- [x] T035 [US5] Remove the tab row: `Closed boards` becomes an admin-only link under the WEB-04 tiles and `Audit log` a link on WEB-06, as in the mockups, in `src/app/layouts/WorkspaceLayout.tsx`, `src/features/workspaces/pages/WorkspaceBoardsPage.tsx` and `src/features/workspaces/pages/WorkspaceSettingsPage.tsx`
- [x] T036 [US5] Keep sidebar rows the person opened when moving to another workspace, and add the new current workspace, in `src/features/workspaces/components/WorkspaceSidebar.tsx` (+ tests)
- [x] T037 [US5] Add the `Home` link at the top of the sidebar, highlighted on Home only (UI decision #378), in `src/features/workspaces/components/WorkspaceSidebar.tsx` (+ tests)
- [x] T038 [US1] Board tile thumbnail band: `backgroundThumbnailUrl` image or `backgroundColor`, with the star in a white circle on the band (card AC 9, decisions #375–#377), in `src/features/workspaces/components/BoardTile.tsx` and `src/features/workspaces/api.ts` (+ tests)
- [x] T039 [US2] Move `Create workspace` to the right of the `Your workspaces` heading in every state, as in the mockup, in `src/features/workspaces/pages/HomePage.tsx`; sidebar chevron points right when collapsed
- [x] T040 Re-sync `specs/6/spec.md` with the card (15:12 GMT+7 update) and add tests for AC 1.3 (server refuses a name over 100 characters) and AC 2.2 (a starred board stays in Recently viewed) in `src/features/workspaces/pages/HomePage.test.tsx`
- [x] T041 [US2] Limit the workspace name to 100 characters on the client with the inline error `Use 100 characters or fewer.` (PR #19 review, card AC 1.3, UI decision #379), in `src/features/workspaces/components/CreateWorkspaceDialog.tsx` (+ tests for 101 and 100 characters)
