# Tasks: #21 Implement feature Invite to Workspace

**Input**: `specs/21/` (spec.md, plan.md, research.md, data-model.md, contracts/api-client.md, quickstart.md)

**Context**:

- This card builds the sender side of workspace invites: the WEB-D11 dialog and the WEB-05 page shell with its `Sent invites` table.
- The backend contract is `agi-board-backend/specs/21/contracts/invites.md`, mirrored in `contracts/api-client.md`.
- The member table, roles, remove and the workspace menu stay with card #8 (research R1).
- The recipient side (Accept / Decline on Home) shipped with card #6 and is already covered in `HomePage.test.tsx` (`describe('HomePage pending invites (US4)')`). Here it only gets a regression run.
- Stories follow the card's acceptance criteria: US1 Send, US2 Manage, US3 Accept, US4 Decline.
- Tests are requested by the plan.

**Format**: `[ID] [P?] [Story] Description`. All paths are relative to the repo root `agi-board-frontend-21/`. API base in tests: `const API = import.meta.env.VITE_API_BASE_URL` (as in `WorkspaceBoardsPage.test.tsx`).

## Phase 1: Setup

- [x] T001 Add the shadcn Select with `pnpm dlx shadcn@latest add select`. It creates `src/components/ui/select.tsx`; do not hand-edit it (research R4). Check `git diff package.json pnpm-lock.yaml`: no new dependency is expected, because `radix-ui` is already installed.
- [x] T002 [P] Move `src/features/auth/email-schema.ts` to `src/lib/email-schema.ts` with `git mv`. Update the imports in `src/features/auth/pages/SignUpPage.tsx` and `src/features/auth/pages/ForgotPasswordPage.tsx` to `@/lib/email-schema`, and confirm with `grep -rn "email-schema" src` (research R5).

## Phase 2: Foundational (blocks US1 and US2)

- [x] T003 In `src/features/workspaces/api.ts`, add after the invite functions, with a comment `// Backend card #21 (agi-board-backend specs/21/contracts/invites.md).`:
  - type `SentInvite = { id: string; email: string; role: 'admin' | 'member'; expiresAt: string; lastSentAt: string; expired: boolean; invitedBy: { id: string; fullName: string } }`;
  - type `InviteRole = SentInvite['role']`;
  - `getSentInvites(workspaceId)` → `api<{ items: SentInvite[]; nextCursor: string | null }>(\`/workspaces/${id(workspaceId)}/invites?limit=100\`)`, with the comment `// shortcut: first 100 pending invites only; add paging when the spec gives a control for it.` (R11);
  - `sendInvite(workspaceId, body: { email: string; role: InviteRole })` → `POST /workspaces/:id/invites` with a JSON body, returning `SentInvite`;
  - `resendInvite(workspaceId, inviteId)` → `POST /workspaces/:id/invites/:inviteId/resend`, returning `SentInvite`;
  - `revokeInvite(workspaceId, inviteId)` → `DELETE /workspaces/:id/invites/:inviteId`, returning `void`.

  Encode both ids with the existing `id()`.

- [x] T004 In `src/features/workspaces/hooks.ts`, add:
  - `const invitesKey = (workspaceId: string) => ['workspaces', workspaceId, 'invites']`;
  - `useSentInvites(workspaceId)`: `useQuery` on that key, with `select: (d) => d.items`;
  - `useSendInvite(workspaceId)`, `useResendInvite(workspaceId)` (mutationFn takes `inviteId`) and `useRevokeInvite(workspaceId)` (same). Each one does `onSettled: () => client.invalidateQueries({ queryKey: invitesKey(workspaceId) })`, on error too, so a row that was revoked or accepted meanwhile refreshes (R3).

  Note: `['workspaces', id]` is a prefix of this key, so `useCreateBoard`'s invalidation also refetches invites, which is harmless.

**Checkpoint**: `pnpm typecheck` passes.

---

## Phase 3: User Story 1 - Send workspace invites (P1) 🎯 MVP

**Goal**: A workspace admin opens WEB-05, clicks `Invite`, enters an email and role, and sends. The dialog closes, the toast "Invite sent" shows, and the invite appears in `Sent invites` as Pending (card AC 1; spec 017 FR-001…FR-012).

**Independent Test**: With MSW, render `/w/w1/members` as admin, send `new@example.com` as `Admin`: the POST body is `{ email: 'new@example.com', role: 'admin' }`, the dialog closes, "Invite sent" shows, and the row `new@example.com · Admin · Pending` is listed.

### Tests

- [x] T005 [US1] Create `src/features/workspaces/pages/WorkspaceMembersPage.test.tsx`, modelled on `WorkspaceBoardsPage.test.tsx`:
  - A `renderPage()` helper with `createMemoryRouter` at `/w/w1/members` (route `w/:workspaceId/members`, plus a `*` route rendering text "WEB-13" as the errorElement) and a fresh `QueryClient`.
  - MSW `GET ${API}/workspaces/w1` → `{ id: 'w1', name: 'ASNET Engineering', role: 'admin', boardCount: 0, memberCount: 1, boards: [] }`.
  - MSW `GET ${API}/workspaces/w1/invites` → `{ items: [], nextCursor: null }` by default.

  Add `describe('WorkspaceMembersPage invite dialog (US1)')` with these cases:
  - (a) The title "ASNET Engineering" (h1) and the `Invite` button show; the `Sent invites` heading does not.
  - (b) Clicking `Invite` opens a dialog named `Invite` with `Email` empty, `Role` showing `Member`, and `Send invite` disabled.
  - (c) Typing `abc` and blurring shows "Enter a valid email address." with `aria-invalid="true"`, and `Send invite` stays disabled. Fixing it to `new@example.com` clears the error and enables the button.
  - (d) Pick `Admin`, send. The POST body equals `{ email: 'new@example.com', role: 'admin' }`, the dialog closes, `role="status"` contains "Invite sent", and after the invalidation (the GET handler now returns that item) the row shows `new@example.com`, `Admin`, `Pending`.
  - (e) Typing ` New@Example.com` sends `email: 'New@Example.com'`: trimmed only, because the server lower-cases (R5).
  - (f) While the POST is `delay('infinite')`, the button's accessible name is "Sending invite" and it is disabled, the `Email` field and `Cancel` are disabled, and `Esc` does not close the dialog.
  - (g) A POST answering 409 `ALREADY_MEMBER` keeps the dialog open with the inline "This person is already a member." and `Send invite` disabled. Editing the email clears the error.
  - (h) The same with 409 `INVITE_PENDING` → "This person already has a pending invite.".
  - (i) A POST answering 500 keeps the dialog open with the entered email and role, `role="alert"` shows "Something went wrong. Try again.", and `Send invite` is enabled.
  - (j) `Cancel` after typing closes the dialog with no POST, and reopening shows an empty `Email` and `Member`.
  - (k) With `role: 'member'` in the workspace response, `Invite` is not rendered.

  Use the `fail(status, code)` pattern from `HomePage.test.tsx` for error bodies (`{ error: { code } }`).

### Implementation

- [x] T006 [US1] Create `src/features/workspaces/components/InviteDialog.tsx` (WEB-D11), modelled on `CreateWorkspaceDialog.tsx` / `CreateBoardDialog.tsx` (shadcn `Dialog`, react-hook-form + zod, `form-styles`).
  - **Props**: `{ workspaceId: string; onSent: () => void }`.
  - **Trigger**: a primary `Button` labelled `Invite`.
  - **Title**: `Invite`.
  - **Schema**: `z.object({ email: emailSchema, role: z.enum(['admin', 'member']) })` with `emailSchema` from `@/lib/email-schema`. Default values `{ email: '', role: 'member' }`.
  - **Fields**:
    - `Email` (visible label, `Input type="email"`, `aria-describedby` linked to the error, `role="alert"` error);
    - `Role` (visible label, shadcn `Select` with items `Member` (`member`) and `Admin` (`admin`), in the mockup's order).
  - **Footer**: `Cancel` (outline, closes the dialog) and `Send invite` (submit). `Send invite` is disabled when the email is not valid (`formState.isValid` with `mode: 'onChange'`), when an email error is shown, or while pending.
  - **Submit**: `useSendInvite(workspaceId).mutate`. On success, reset the form, close the dialog, then call `onSent()`.
  - **On error**:
    - `errorCode(e) === 'ALREADY_MEMBER'` → `setError('email', { message: 'This person is already a member.' })`;
    - `'INVITE_PENDING'` → `setError('email', { message: 'This person already has a pending invite.' })`;
    - otherwise → show a red banner `role="alert"` "Something went wrong. Try again." inside the dialog, above the fields, styled like `WorkspaceBoardsPage`'s alert (`bg-(--color-danger-soft) text-destructive`). The banner clears on the next submit and on reopen.
  - **While pending**: the fields and `Cancel` are disabled, `onOpenChange` ignores close (guard `if (send.isPending) return`), and the button shows `<Spinner /><span className="sr-only">Sending invite</span>`.
  - **On close**: reset the form and call `send.reset()`.
  - **Comment**: put the screen ID as a component doc comment.
- [x] T007 [US1] Replace the placeholder in `src/features/workspaces/pages/WorkspaceMembersPage.tsx`. Keep the first line `// WEB-05 Workspace members`, and add a note that the member table belongs to card #8.
  - **Data**:
    - `useParams` → `workspaceId`;
    - `useWorkspace(workspaceId)`: the loading spinner and error alert are the same as in `WorkspaceBoardsPage`, and 403/404 already go to WEB-13 through the query client;
    - `useSentInvites(workspaceId)`, but only when `workspace.role === 'admin'` (pass `enabled`).
  - **Layout**: a header row with an `h1` holding the workspace name (one line, `truncate`, `title` = full name) and, for admins, `<InviteDialog workspaceId onSent={() => setToast(...)} />`. Below it, `<SentInvites ... />` from T010 (render nothing until US2 lands, or land T010 first).
  - **Toast**: copy the toast state, effect, `TOAST_MS = 5000` and the fixed top-center `role="status"` markup from `src/features/profile/pages/ProfilePage.tsx` (R6). The text is "Invite sent".
  - **Archived**: add the comment `// shortcut: an archived workspace 404s on GET /workspaces/:id (→ WEB-13), so the read-only archived view is not built; add it with the archived-workspaces card.` (R7).
- [x] T008 [US1] Make T005 pass. Run `pnpm test src/features/workspaces/pages/WorkspaceMembersPage.test.tsx`.

**Checkpoint**: US1 works with MSW; sending from WEB-05 shows the toast and the row.

---

## Phase 4: User Story 2 - Manage invites (P1)

**Goal**: WEB-05 lists the sent invites (Email, Role, Status, Expires), and admins can `Resend` (14 days restart, works on expired) or `Revoke` each one. A failure shows the red banner above the title and leaves the row unchanged (card AC 2; spec 005 US4; WEB-05 §4 row 5, §7).

**Independent Test**: With MSW returning one Pending and one Expired invite: both rows show with `Pending` / `Expired` and `YYYY/MM/DD`. `Resend` on the expired row sends `POST .../invites/i2/resend`, and the refetched row shows `Pending`. `Revoke` sends `DELETE .../invites/i1` and the row disappears; with no rows left, `Sent invites` is hidden.

### Tests

- [x] T009 [US2] In `src/features/workspaces/pages/WorkspaceMembersPage.test.tsx`, add `describe('WorkspaceMembersPage sent invites (US2)')`. Fixtures:
  - `i1 = { id: 'i1', email: 'dung.pham@asnet.com.vn', role: 'member', expiresAt: '2026-11-28T09:00:00.000Z', lastSentAt: '2026-11-14T09:00:00.000Z', expired: false, invitedBy: { id: 'u1', fullName: 'Ann Lee' } }`;
  - `i2` = `em.vo@asnet.com.vn`, `admin`, `expired: true`, `expiresAt: '2026-11-02T09:00:00.000Z'`.

  Cases:
  - (a) The `Sent invites` heading and a table with headers `Email`, `Role`, `Status`, `Expires`. Rows show `Member`/`Admin`, `Pending`/`Expired`, and the dates `2026/11/28`/`2026/11/02` (tests run with `TZ` as configured in `vitest` setup; if not fixed, assert with the same formatter).
  - (b) `Resend` on i2 → one POST to `${API}/workspaces/w1/invites/i2/resend`, then the GET refetch (now returning i2 with `expired: false`) shows `Pending`.
  - (c) `Revoke` on i1 → `DELETE ${API}/workspaces/w1/invites/i1`, and the row disappears after the refetch.
  - (d) While the resend is `delay('infinite')`, only that row's `Resend` and `Revoke` are disabled, and the other row stays enabled.
  - (e) A resend answering 429 `RESEND_COOLDOWN` → `role="alert"` "Something went wrong. Try again." above the `h1`, and the row is unchanged (R12).
  - (f) A revoke answering 404 `INVITE_NOT_FOUND` → the same banner, and the list refetches.
  - (g) The banner goes away when the person clicks another `Resend`/`Revoke` or opens `Invite` ("until the person does something else", spec 005 AS4.6).
  - (h) The list is empty → no `Sent invites` heading.
  - (i) With `role: 'member'`, no `GET .../invites` request is made.

### Implementation

- [x] T010 [US2] Create `src/features/workspaces/components/SentInvites.tsx` (WEB-05 section 4).
  - **Props**: `{ workspaceId: string; invites: SentInvite[]; onStart: () => void; onFail: () => void }`, the same `report` pattern as `ProfilePage`.
  - **Empty list**: return `null`.
  - **Markup**: `<section aria-labelledby>` with an `h2` "Sent invites" and a `<table>` with `<th scope="col">` headers `Email`, `Role`, `Status`, `Expires`, plus a last column for the row buttons with an empty `<td>`-style header (`<th aria-hidden="true" />`). The spec has no header text for it, so none is invented.
  - **One row per invite**:
    - the email (`truncate`, `title`);
    - `Admin` or `Member`;
    - `Expired` if `invite.expired`, else `Pending`;
    - `formatDate(invite.expiresAt)`;
    - the buttons `Resend` and `Revoke` (outline, small).
  - **Row mutations**: each row (`InviteRow` subcomponent) owns `useResendInvite(workspaceId)` and `useRevokeInvite(workspaceId)` (R9). A click calls `onStart()`, then `mutate(invite.id, { onError: onFail })`. Both buttons are disabled while either mutation of that row is pending.
  - **`formatDate`**: a helper in the same file, `iso => YYYY/MM/DD` in local time, built from `new Date(iso)` with `getFullYear()`, `getMonth() + 1` and `getDate()`, zero-padded (R10). Export it for the test.
- [x] T011 [US2] Wire `SentInvites` into `src/features/workspaces/pages/WorkspaceMembersPage.tsx`.
  - Add `const [failed, setFailed] = useState(false)`. When it is true, render the red banner `role="alert"` "Something went wrong. Try again." above the header row.
  - Pass `onStart={() => setFailed(false)}` and `onFail={() => setFailed(true)}`. Also clear `failed` when `Invite` is clicked: wrap `InviteDialog`'s trigger click, or add an `onOpen` prop. Pick the smaller change.
  - Render `<SentInvites>` only for admins, once `useSentInvites` has data.
- [x] T012 [P] [US2] (Done as `src/features/workspaces/invite-date.ts` + `invite-date.test.ts`, `formatInviteDate`: a `.tsx` may export components only.) Add `src/features/workspaces/components/SentInvites.test.ts` for `formatDate`: `formatDate('2026-11-28T09:00:00.000Z')` returns `'2026/11/28'` in the test TZ, and a single-digit month/day pads to `'2026/01/05'`.
- [x] T013 [US2] Make T009 and T012 pass.

**Checkpoint**: US1 + US2 pass; WEB-05 matches the mockup's `Sent invites` table.

---

## Phase 5: User Story 3 - Accept workspace invite (P2) · regression only

**Goal**: An invitee sees the invite on Home and joins on `Accept` (card AC 3). This shipped with #6; the backend #21 changes nothing in `GET /home` or `POST /invites/:id/accept`.

- [x] T014 [US3] Run `pnpm test src/features/workspaces/pages/HomePage.test.tsx -t "pending invites"`; all existing cases must pass unchanged. No code change.

## Phase 6: User Story 4 - Decline invite (P2) · regression only

- [x] T015 [US4] Covered by the T014 run (`disables Accept on an expired invite but still declines it` and the decline case). No code change.

---

## Phase 7: Polish & cross-cutting

- [x] T016 Create `e2e/members.spec.ts`, reusing the `signIn` pattern from `e2e/home.spec.ts` (copy the helper; e2e files do not share helpers today).
  - Mock with `page.route`:
    - `GET http://api.e2e/workspaces/w1` → admin workspace;
    - `GET .../workspaces/w1/invites` → stateful (starts empty);
    - `POST .../invites` → 201 item, which is pushed into the state;
    - `POST .../invites/:id/resend` → 200;
    - `DELETE .../invites/:id` → 204, which removes the item from the state.
  - Flow: `/w/w1/members` → `Invite` → type email → `Send invite` → toast "Invite sent" and row `Pending` → `Resend` → `Revoke` → `Sent invites` hidden.
- [x] T017 Run `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` unpiped in the worktree, and fix failures (the e2e run is required because routes/pages changed).
- [x] T018 Compare against the mockups `../docs/ui-pipeline/mockups/web/WEB-05-workspace-members.html` (Sent invites block) and `WEB-D11-invite-to-workspace.html`: labels verbatim, tokens only, focus ring visible, and `Esc` / outside click close the dialog.
- [x] T019 Run the `react-reviewer` agent on the diff, fix Critical/High findings, and re-run T017 (CLAUDE.md flow).
- [ ] T020 Walk through `specs/21/quickstart.md` manual steps 1–9 against the backend branch `feat/21-invite-to-workspace`. Steps that need the backend are skipped if it is not running; say so in the PR. **Not run (2026-11-27): the backend branch has no implementation yet (specs only).**

---

## Dependencies

- T001 and T002 come before T006 (Select, `emailSchema`). T003 → T004 → T006, T007 and T010.
- US1: T005 (test first) → T006 → T007 → T008.
- US2: T009 → T010 → T011 → T013; T012 is parallel with T010/T011. US2 needs T007 (the page exists).
- US3/US4 (T014, T015) are independent and can run any time.
- Polish (T016–T020) comes after US1 + US2.

## Parallel examples

- T001 ∥ T002 (different files).
- T012 (formatter unit test) ∥ T010/T011.
- T014 can run alongside any phase.
- T005 and T009 both edit `WorkspaceMembersPage.test.tsx`; do them in sequence.

## Implementation strategy

1. **MVP** = Phase 1, Phase 2 and US1: an admin can send an invite from WEB-05.
2. Then US2: the table with Resend/Revoke, which completes the card's sender side.
3. US3/US4 are a regression run only.

Not in this card:

- the member table, member count, role change, remove and the workspace menu (card #8);
- the archived read-only view (R7);
- invite paging beyond 100 (R11);
- a cooldown-specific message (R12);
- real-time updates (R8).
