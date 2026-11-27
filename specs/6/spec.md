# Feature Specification: #6 Implement feature Home — Workspaces, Boards and Invites

**Card:** https://trello.com/c/T1qXrg6L/6-implement-feature-home-workspaces-boards-and-invites
**List (status):** In Progress
**Labels:** Feature, Phase 3, Backend, Frontend, Sprint 1
**Members:** Huyen Cao
**Due:** —
**Pulled:** 2026-11-27 (GMT+7); re-synced with the card 2026-11-27 (after the 15:12 GMT+7 card update)

---

## Description

# Home — Workspaces, Boards and Invites

## Overview

Support the following user scenarios and functional requirements:

## User Value

Implement core functionality to support user workflows and system requirements.

## Scope

- Create new workspace
- View starred boards and recently viewed
- Star / unstar a board, and record a board view (feeds "Recently viewed")
- Accept or decline workspace and board invites
- Manage workspace and board lists
- Handle empty state when no workspaces exist
- Navigate to workspace settings and board details
- Handle pending invites with expiration
- Workspace sidebar on Home: active workspaces with expandable `Boards` / `Members` / `Settings`, `Guest workspaces`, and `View archived workspaces` link (only for admins of an archived workspace)
- Board tile thumbnail (board background) on Home, plus the new `boards.background_color` column (migration + backfill) holding the random default color

## Business Rules

- Starred boards appear first, followed by recently viewed: the 6 most recently viewed boards (newest first), starred or not. The two lists are independent: starring a board does not remove it from Recently viewed, so a board can appear in both
- Workspace name: trimmed, 1–100 characters
- Each workspace shows its boards and board-only memberships
- Board-only members see only their specific boards, not all workspace boards
- Invites expire after 14 days (proposed)
- Expired invites can be declined but not accepted
- An invite tied to email requires signing in with that email to see it
- Workspace admins can resend or revoke invites — **out of scope for this card** (sender side: create/send/resend/revoke is a separate ticket)
- System shows workspace and board member counts: a workspace tile's board count = open boards the viewer can access; member count = workspace members (board-only members not included)
- Home excludes closed boards and archived workspaces from every section and from board counts — for everyone, workspace admins included (archived workspaces are listed only on the Archived workspaces page, WEB-20, separate card)
- Workspace sidebar: `Your workspaces` = active workspaces where the person is admin or member, A to Z, each row = first-letter square + name, all rows collapsed on Home; a row expands to `Boards` (→ workspace boards), and `Members` / `Settings` only for workspace admins. `Guest workspaces` = board-only workspaces, `Boards` only. Empty sections hidden. System roles add nothing.
- `View archived workspaces` sits at the bottom of the sidebar, shown only when the person is workspace admin of at least one archived workspace
- No active workspace at all (own or guest) → no sidebar, content full width; if the person administers an archived workspace, `View archived workspaces` shows under the empty-state message
- Board tile: a thumbnail band at the top shows the board background (preset photo, preset color or uploaded image, cropped to fill) with the star toggle on it; board name and visibility sit below on the surface color. Same tile in Starred boards, Recently viewed and inside each workspace
- `boards.background_color` (new, NOT NULL): set to one of the 10 preset colors picked at random when a board is created, stored and never re-randomised; replaced when a person picks a preset color in `Change background`. Existing boards are backfilled with a random preset color in the migration
- What a board shows: uploaded image (`background_object_key`) or preset photo (`background_key`) if one is set, otherwise `background_color`. A background (photo / color / upload) exists only when a person chooses one; until then the board and its tile show the random default color
- The background picker itself (`Photos` 10 preset photos, `Colors` 10 preset colors, `Upload image`) belongs to the Board menu card; this card only needs the column, the random default and the tile thumbnail

## Clarifications (2026-11-27)

- Invite scope: recipient side only (list pending, accept, decline). Create/send/resend/revoke belong to a separate ticket.
- Starred / Recently viewed write side is in scope: star/unstar a board and record a board view; only boards the user can access.
- Closed boards and archived workspaces are not shown on Home and are not counted.
- Recently viewed: up to 6, newest first, starred boards included (revised: the earlier "starred boards excluded" is withdrawn; a starred board stays in Recently viewed).
- Workspace tile counts: board count = open boards the viewer can access; member count = workspace members only.
- Workspace name: max 100 characters after trim (it is copied into the permanent audit log); longer names are refused.
- Archived workspaces are hidden from Home for everyone, admins included; admins reach them via `View archived workspaces` (decision #368).
- Shared Workspace sidebar on Home and workspace pages; workspace tabs removed (decisions #369, #370).
- No sidebar when the person has no active workspace; archived link moves under the empty message (decision #372).
- Board tiles show the board background as a thumbnail; a board with no chosen background shows a random preset color assigned at creation and kept; `boards.background_color` is added in this card (decisions #375, #376, #377).

---

## Acceptance Criteria

### 1. Create new workspace

- [ ] **Given** the home screen is displayed, **When** the user taps Create workspace, **Then** a dialog opens with a name field and Create button disabled until a name is entered.
- [ ] **Given** the user enters a workspace name, **When** they tap Create, **Then** the workspace is created, the user becomes admin, and the workspace appears in their list.
- [ ] **Given** the user enters a workspace name longer than 100 characters (after trimming), **When** they tap Create, **Then** the workspace is not created.

### 2. View starred and recently viewed boards

- [ ] **Given** the user has starred boards and viewed others, **When** they view home, **Then** starred boards appear first, followed by recently viewed (up to 6, starred boards included).
- [ ] **Given** a board is in Recently viewed, **When** the user stars it, **Then** it appears in Starred boards and stays in Recently viewed.
- [ ] **Given** a board was removed from workspace or access was lost, **When** the user views home, **Then** that board disappears from both starred and recently viewed sections.

### 3. Accept or decline invites

- [ ] **Given** the user receives a workspace invite, **When** they view home, **Then** the invite appears in a pending section showing the workspace name and sender.
- [ ] **Given** the user has a pending invite, **When** they tap Accept, **Then** they join the workspace and it appears in their workspace list.
- [ ] **Given** the user has a pending invite, **When** they tap Decline, **Then** the invite is removed from their list.
- [ ] **Given** an invite has expired (14 days, proposed), **When** the user views home, **Then** Accept is disabled but Decline is still available.

### 4. Workspace and board lists

- [ ] **Given** the user is a member of multiple workspaces, **When** they view home, **Then** each workspace shows its name, board count (boards the user can access), and member count (workspace members).
- [ ] **Given** a workspace has private and public boards, **When** the user is a member, **Then** they see both types if they have access.
- [ ] **Given** a workspace is archived, **When** anyone views home, including its workspace admins, **Then** that workspace is not shown and not counted.

### 5. Handle empty state

- [ ] **Given** a new user with no workspaces, **When** they view home, **Then** an empty state appears with Create workspace option and information about invites, and no sidebar is shown.
- [ ] **Given** the user has no active workspace but is admin of an archived workspace, **When** they view home, **Then** `View archived workspaces` shows under the empty-state message and opens the Archived workspaces page.

### 6. Navigate workspace and board details

- [ ] **Given** the user views a workspace tile, **When** they tap it, **Then** the workspace opens and shows all accessible boards.
- [ ] **Given** the user views a board tile, **When** they tap it, **Then** the board opens in the editor.

### 7. Handle pending board invites

- [ ] **Given** the user receives a board invite, **When** they view home, **Then** the invite appears showing the board name and workspace context.
- [ ] **Given** the user accepts a board invite, **When** they tap Accept, **Then** they are added to that board as a board-only member.

### 8. Workspace sidebar

- [ ] **Given** the user has active workspaces, **When** they view home, **Then** the sidebar lists them under `Your workspaces` (A to Z, all collapsed) and board-only workspaces under `Guest workspaces`.
- [ ] **Given** the user expands a workspace row, **Then** `Boards` shows for everyone and `Members` / `Settings` only for workspace admins; each opens the matching workspace page.
- [ ] **Given** the user is workspace admin of at least one archived workspace, **Then** `View archived workspaces` shows at the bottom of the sidebar; **Given** they administer none, **Then** it is hidden.

### 9. Board tile thumbnail and default color

- [ ] **Given** a board has an uploaded image or a preset photo, **When** the user views home, **Then** its tile shows that image as the thumbnail, cropped to fill, with name and visibility below.
- [ ] **Given** a board has no chosen background, **When** the user views home, **Then** its tile shows the board's `background_color`, and the same color shows on the board itself.
- [ ] **Given** a new board is created, **Then** `background_color` is set to one of the 10 preset colors at random and does not change on later loads.
- [ ] **Given** the migration runs on existing boards, **Then** every board gets a random preset `background_color` and no board is left without one.

---

## Checklists

None

## Comments

- **Huyen Cao**, 2026-11-27 15:12 (GMT+7): Scope update 2026-11-27 (UI decisions #375-#377): board tiles on Home now show the board background as a thumbnail. Backend: add `boards.background_color` (NOT NULL, random preset color at board creation, backfill existing boards); display = uploaded image or preset photo if set, else background_color. See Scope, Business Rules and Acceptance Criteria 9. The picker (Photos + Colors + Upload) stays with the Board menu card.
- **Huyen Cao**, 2026-11-27 13:15 (GMT+7): Scope update 2026-11-27 (UI decisions #368, #369, #372): archived workspaces hidden from Home for everyone (admins included); new Workspace sidebar on Home (Your workspaces / Guest workspaces, expandable Boards / Members / Settings, `View archived workspaces` at the bottom for admins of an archived workspace); no sidebar when the user has no active workspace, archived link moves under the empty message. See Business Rules, Clarifications and Acceptance Criteria 4, 5, 8. The Archived workspaces page itself (WEB-20, spec 034) is a separate card.

## Attachments / Links

None
