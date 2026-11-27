# Research: #6 Home — Workspaces, Boards and Invites (frontend)

## R1. One `GET /home` query feeds Home and the sidebar

- **Decision**: `useHome()` with key `['home']`. Home sections and `WorkspaceSidebar` both read it; the sidebar on workspace pages reuses the cached query.
- **Rationale**: The backend contract already returns starred, recent, workspaces (with `role`), invites and `hasArchivedWorkspaces` in one response. Every Home write invalidates one key.
- **Alternatives**: A separate sidebar endpoint (none exists); per-workspace queries (N+1).

## R2. Ordering is done on the client

- **Decision**: `byName` helper: `a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })`, using the stable `Array.prototype.sort`. Applied to workspaces (sidebar and sections), boards inside a workspace, and `Starred boards`. `Recently viewed` keeps the server order (newest first).
- **Rationale**: WEB-03 §8 (decision #50) says A to Z, ignoring case; the contract returns starred boards by star date and workspaces by `name asc`, which is case-sensitive in Postgres. Equal names keep the server order, which approximates creation order (decision #350, see Risks).
- **Alternatives**: Ask the backend to sort (cross-repo change for a one-liner).

## R3. Workspace counts wording

- **Decision**: `N board(s) · M member(s)` (singular for 1). When `memberCount` is `null` (board-only viewer), show only the board count.
- **Rationale**: AC 4 requires both counts; neither WEB-03 nor the mockup has wording. Confirmed by the user on 2026-11-27.

## R4. Invite row states and errors

- **Decision**: Accept → spinner with the text alternative `Accepting invite` (mockup), and that row's buttons are disabled (decision #47). On success, invalidate `['home']` (the row goes away and the workspace or board appears) and stay on Home (WEB-03 §6). Decline → invalidate `['home']`. 409 `INVITE_EXPIRED` → no generic message; the refetch shows the expired text (WEB-03 §5, review fix). Any other error, including 404 `INVITE_NOT_FOUND` → `Something went wrong. Try again.` shown in the row, buttons enabled again (decision #48), and `['home']` invalidated so the expired or gone state shows. `expired: true` → `This invite has expired. Ask an admin to resend it.` in the row, `Accept` disabled.
- **Row text**: title = workspace name (workspace invite) or board name (board invite); for a board invite the workspace name is shown as context (AC 7.1); meta line `Invited by <fullName> · Role: <Admin|Member>` (mockup).
- **Alternatives**: Navigating to the workspace after accept. Rejected: WEB-03 says stay on Home.

## R5. Board tile background (updated 2026-11-27, decisions #375–#377)

- **Decision**: As in the mockup, the tile has a 64px thumbnail band over the name and visibility, which sit on the surface color; the star sits on the band in a white circle. When `backgroundThumbnailUrl` is set (`/api/v1/board-backgrounds/<key>/thumbnail`), the band shows that image, resolved against `VITE_API_BASE_URL` as Avatar does, cropped to fill; otherwise it is filled with `backgroundColor` from the API.
- **Rationale**: UI decisions #375 (thumbnail band) and #376 (a random preset color kept per board). Card AC 9 (re-synced 2026-11-27): the backend stores `boards.background_color` (random preset color at creation, backfilled), so the client no longer derives a color (the earlier `defaultBoardColor` helper was removed).
- **Open**: Uploaded backgrounds come back with `backgroundThumbnailUrl: null` until the upload ticket adds their route, so those tiles show `backgroundColor`.

## R6. Star toggle is optimistic

- **Decision**: `useToggleStar` patches `['home']` in `onMutate`: it flips `starred` on every tile with that board id and adds the board to or removes it from `starred`. `onError` restores the snapshot silently (decision #51), and `onSettled` invalidates `['home']`. The button has `aria-pressed`, and its label is `Star board` or `Unstar board`.
- **Rationale**: Instant feedback with a silent rollback is the spec's behaviour; the rules allow optimistic updates where the spec needs them.

## R7. Scope boundaries

- **In**: WEB-03, WEB-D16, the sidebar on Home and in `WorkspaceLayout`, WEB-04's accessible-board list (AC 6.1), recording a view in `BoardPage` (AC 6.2).
- **Out** (other cards): sending, resending and revoking invites; the WEB-20 page (the link points to `/archived-workspaces`, which falls to WEB-13 until that card lands); the WEB-D01 `Create new board` dialog (the tile shows for admins but is wired up in WEB-D01's card; see Risks); search, bell and shortcuts in the header; real-time Home updates; the archived workspace shown in the sidebar on its own page (decision #374).
- **Tabs**: `WorkspaceLayout` has no tabs (decision #370). Following the mockups (user request, 2026-11-27), `Closed boards` is a text link under the board tiles on WEB-04, shown to workspace admins (board admins later: the contract has no board roles), and `Audit log` is a text link on WEB-06, its only entry point (decision #24).

## R8. Sidebar behaviour

- **Decision**: Hidden when `workspaces` is empty (decision #372). `Your workspaces` lists rows with `role !== null`; `Guest workspaces` lists rows with `role === null`. Each row is a `<button aria-expanded>` with a letter square and the name; the name is cut with "…" and shows in full in `title`. The links are `Boards` → `/w/:id`, plus `Members` → `/w/:id/members` and `Settings` → `/w/:id/settings` when `role === 'admin'`. On Home every row starts collapsed. On a workspace page the current workspace starts expanded and the current item is highlighted with `NavLink`. `View archived workspaces` shows at the bottom when `hasArchivedWorkspaces` is true. With no workspace, the same link shows under the empty message instead.
- **Rationale**: WEB-03 §3, WEB-04 §3, decisions #369, #370, #372. Expanded state is local `useState`, seeded from `useParams().workspaceId`.

- **Update 2026-11-27 (decision #378)**: a `Home` link (house icon) sits at the top of the sidebar, `NavLink` to `/` with `end`, highlighted on Home only. Recorded in the parent repo's `docs/ui-pipeline/decisions.md`, with the mapping, specs and mockups updated through the pipeline.

## R9. Recording a view

- **Decision**: `BoardPage` calls `recordView(boardId)` once per `boardId` in a `useEffect` (it syncs with the server, not with React state). Failures are ignored. On success, `['home']` is invalidated.
- **Rationale**: AC 6.2 and the contract note "called by the client when it opens a board". A 404 here must not block the page; the board's own query handles WEB-13.

## R10. Card update 2026-11-27 (15:12 GMT+7)

- **Recently viewed includes starred boards** (AC 2): the two lists are independent. `useToggleStar` already leaves `recent` in place and only flips `starred` on every copy of the tile; a test covers AC 2.2.
- **Workspace name 1–100 characters** (AC 1.3): the server refuses longer names with 400 `VALIDATION_FAILED`, and the dialog shows its generic banner `Something went wrong. Try again.` with the name kept, so the workspace is not created. There is no client-side limit or dedicated message, because WEB-D16 still says "no length limit" (#231) and has no wording for it. Open: record a UI decision and message through the pipeline if a live check is wanted.

## Risks

- The backend #6 work is still uncommitted in `agi-board-backend-6`. If the contract shape changes, update `contracts/api-client.md` and `api.ts`.
- Equal workspace names: the server's tie order may not be creation order. The fix is to add `createdAt` to `WorkspaceTile` if this matters.
- The `Create new board` tile has no target until the WEB-D01 card. Decided in tasks: it is not rendered yet (a dead button is worse for keyboard and screen-reader users). A `shortcut:` comment marks where the WEB-D01 card adds it.
