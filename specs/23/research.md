# Research: #23 Create Board

## R0. Card vs per-screen spec

- **Decision**: Follow `../specs/019-create-board` / WEB-D01 where the card disagrees; answers in [spec.md](spec.md) Clarifications (2026-11-27).
- **Rationale**: The card names a "workspace dropdown" and a `Name` field that exist in no screen spec or mockup; 019 and the TODOs left in `WorkspaceSection.tsx` / `WorkspaceBoardsPage.tsx` agree on the admin tile and `Board title`. Backend card #23 answered the same way (no picker, admin only).
- **Card items kept**: hover tooltips on `Visibility` (wording proposed), spinner + locked fields, trim, no max length, open the new board.

## R1. Where the code lives

- **Decision**: `CreateBoardDialog` in `src/features/workspaces/components/`, `createBoard` in `workspaces/api.ts`, `useCreateBoard` in `workspaces/hooks.ts`.
- **Rationale**: Both entry tiles are in the workspaces feature (Home sections, WEB-04). A feature may not import another feature's internals, so placing the dialog in `features/boards/` would force a move to `components/common/` for no reuse gain.
- **Alternatives considered**: `features/boards/components/` — rejected (cross-feature import).

## R2. API contract (confirmed by backend #23)

- **Decision**: `POST /workspaces/:workspaceId/boards`, body `{ name: string, visibility: 'workspace' | 'private' }`, 201 → `BoardTile` (same shape as Home tiles). 400 `VALIDATION_FAILED`, 403 `BOARD_CREATE_FORBIDDEN` (workspace visible, caller not admin), 404 `WORKSPACE_NOT_FOUND` (unknown, archived, not visible). All map to the one banner.
- **Rationale**: Nested under the workspace like `GET /workspaces/:id`; returning `BoardTile` lets the client navigate with `id` and keeps one board shape. The client needs only `id`.
- **Alternatives considered**: `POST /boards` with `workspaceId` in the body: works too; the client change is one path string, so either is fine if the backend prefers it.

## R3. Dialog behaviour reused from `CreateWorkspaceDialog`

- **Decision**: Same structure: controlled `open`, zod `onChange` validation (`trim().min(1, 'Enter a board title.')`, no max), `Create` disabled until valid, while pending `Cancel` disabled and `onOpenChange` ignored (Esc / outside click, decision #120), inputs read-only / radios disabled, `<Spinner />` + sr-only "Creating board", banner "Something went wrong. Try again." on any error with values kept. On success: close, `reset()`, `navigate('/b/:id')`.
- **Not copied**: the browser-Back history entry of WEB-D16 (decision #349 is about Create workspace; 019 has no Back requirement). Line-break replacement: a single-line `<input>` already drops line breaks on paste.
- **Banner clearing**: 019 AS4.4 says the banner stays while editing until `Create` is clicked again, so no `onChange` reset (differs from WEB-D16).

## R4. Visibility control and tooltips

- **Decision**: Native radio group in a `<fieldset>` with `<legend>Visibility</legend>`, options `Workspace` (checked by default, decision #3) and `Private`, icons `Users` / `Lock` as on `BoardTile`. Each option's label is the trigger of a shadcn `Tooltip` with the proposed text, so it opens on hover and on keyboard focus.
- **Rationale**: Native radios give arrow-key behaviour and form semantics with no extra component; only Tooltip needs generating. Radix Tooltip also opens on focus, which keeps the explanation reachable without a mouse.
- **Alternatives considered**: shadcn `radio-group` — one more generated component for the same behaviour; inline description text — user chose tooltips.

## R5. Tile visibility

- **Decision**: Render the `Create new board` tile (last item of the board grid, styled like a tile with a dashed border) when `workspace.role === 'admin'`; on Home this covers Your workspaces only (Guest workspaces have `role: null`). Render the grid for admins even when the workspace has no boards.
- **Rationale**: 019 FR-011/FR-012: workspace role only; system roles change nothing. Archived workspaces never reach Home/WEB-04 (404).

## R6. After creation

- **Decision**: Invalidate `['home']` and `['workspaces', workspaceId]`, then navigate to `/b/:id`.
- **Open point**: WEB-07 is still a placeholder (`BoardPage` shows "Board") and no `GET /boards/:id` exists. Card AC 2.2 (board header, navigation, empty state) depends on the WEB-07 card; this card only routes there. Flagged in the completion report.
