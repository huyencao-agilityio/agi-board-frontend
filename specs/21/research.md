# Research: #21 Invite to Workspace

## R1 Scope split with cards #6 and #8

- **Decision**: Build the WEB-D11 dialog and the WEB-05 page shell with the `Sent invites` section. Do not build the member table, member count, role dropdown, `Remove` or the workspace menu.
- **Rationale**: Card #6 says outright that "create/send/resend/revoke is a separate ticket", and its recipient side (Accept / Decline on Home) is already live. Card #8 (Workspace Members, To Do) covers the member list, roles and remove. WEB-05 is a placeholder today, so this card has to put up enough of the page to host `Invite` and the table.
- **Alternatives considered**: Building the whole WEB-05 here was rejected: it duplicates card #8 and depends on member endpoints that do not exist yet.

## R2 API contract (from backend #21)

- **Decision**: Follow `agi-board-backend/specs/21/contracts/invites.md`, mirrored in [contracts/api-client.md](contracts/api-client.md). This changes the first frontend draft in five places:
  1. Resend and revoke are nested under the workspace: `/workspaces/:wid/invites/:id/resend` and `DELETE /workspaces/:wid/invites/:id`.
  2. The list is paginated as `{ items, nextCursor }` (R11).
  3. A member who is not an admin gets `403 INVITE_MANAGE_FORBIDDEN`, which already maps to WEB-13 like a 404.
  4. `INVITE_PENDING` also covers an expired invite.
  5. Resend has a 60 s cooldown, `429 RESEND_COOLDOWN` (R12).
- **Conflict**: Spec 017 FR-007 says inviting an address again replaces its expired invite. The backend refuses with `INVITE_PENDING`, and the admin uses `Resend` instead. Card #21's business rule "Expired invites can be resent or revoked" supports the backend. The UI shows the existing inline text "This person already has a pending invite.". **Resolved 2026-11-27 (user): follow the backend**; spec 017 FR-007 is superseded for this card.

## R3 Error mapping

- **Decision**:
  - `409 ALREADY_MEMBER` → inline "This person is already a member." under `Email`.
  - `409 INVITE_PENDING` → inline "This person already has a pending invite."
  - Any other send failure → red banner "Something went wrong. Try again." inside the dialog, with the values kept.
  - `Resend` / `Revoke` failure → red banner above the title, row unchanged.
  - A 404/403 on the list → WEB-13 through the query client, like `useWorkspace`.
- **Rationale**: Spec 017 FR-009/010/011 and spec 005 FR-018. An inline server error is set with RHF `setError` on `email`, clears when the email is edited, and keeps `Send invite` disabled while it shows.

## R4 Role dropdown component

- **Decision**: Add the shadcn `select` with `pnpm dlx shadcn@latest add select` (Radix Select, already under `radix-ui`).
- **Rationale**: The UI rules say to reuse shadcn and to add a missing one through the CLI. The house component wins over a native `<select>`, and `DropdownMenu` is a menu, not a form control. Card #8's role dropdown will reuse it.

## R5 Email validation

- **Decision**: Move `src/features/auth/email-schema.ts` to `src/lib/email-schema.ts`, update its 2 importers (`SignUpPage`, `ForgotPasswordPage`), and reuse it in the dialog.
- **Rationale**: Its rules match spec 017 exactly: trim, valid format, message "Enter a valid email address.". A feature must not import another feature's internals. Case-insensitive comparison is done by the server (FR-012).

## R6 Toast "Invite sent"

- **Decision**: Keep the toast as page-local state on `WorkspaceMembersPage`, the same pattern as `ProfilePage` (5 s, top center, `role="status"`). The dialog calls `onSent()` and the page shows the toast.
- **Rationale**: The project has no toast library, and adding one for a second use is not worth it. Extract a shared component when a third page needs one.

## R7 Archived workspace

- **Decision**: Defer. Do not add an `archived` flag in this card.
- **Rationale**: `GET /workspaces/:id` returns 404 for archived workspaces (decision #368), so WEB-05 already shows WEB-13 and `Invite` cannot be reached, which meets FR-013's goal. The read-only archived view belongs to the archived-workspaces card (WEB-20). The code gets a `shortcut:` comment.

## R8 Real-time updates

- **Decision**: None. The table refetches after this admin's own actions, and on window focus (TanStack default).
- **Rationale**: Spec 005 FR-015 (other admins' changes without reload) belongs to WEB-05 as a whole (card #8). The project's WebSocket is per board, not per workspace.

## R9 Row actions

- **Decision**: Each row owns its `Resend` / `Revoke` mutations, so only that row locks while it is busy (the same as `InviteRow`, decision #47). `Revoke` acts immediately with no confirmation, because the spec has none. On success the hooks invalidate `['workspaces', id, 'invites']`. `Resend` is allowed on Pending and Expired rows.

## R10 Date format

- **Decision** (unchanged): Show `Expires` as `YYYY/MM/DD` in the viewer's local time, as in the mockup (`2026/11/28`). Use a small helper in `SentInvites.tsx` built on `Intl.DateTimeFormat` parts. It gets one unit test because of the timezone edge.

## R11 List pagination

- **Decision**: Fetch one page with `limit=100` (the backend max) and ignore `nextCursor`. No "Load more" control.
- **Rationale**: Neither WEB-05 nor its mockup has a paging control or its wording, and a workspace with 100+ unanswered invites is not expected. The code gets the comment `shortcut: first 100 pending invites only; add paging when the spec gives a control for it`.

## R12 Resend cooldown (429 `RESEND_COOLDOWN`)

- **Decision**: Treat it as a failed `Resend`: the banner "Something went wrong. Try again." shows above the title and the row stays unchanged (spec 005 FR-018). Do not use `retryAfterSeconds`.
- **Rationale**: No spec gives cooldown wording, and the UI rules forbid inventing text. **Resolved 2026-11-27 (user): follow the backend**; the backend gives no wording, so the generic banner stays.
