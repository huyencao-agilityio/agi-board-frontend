# API contract used by the client (#21)

**Source:** backend card #21, `agi-board-backend/specs/21/contracts/invites.md` (agreed 2026-11-27). Existing calls are unchanged: `POST /invites/:id/accept` and `POST /invites/:id/decline` (card #6).

All calls go through `api()` (cookie + CSRF header; `VITE_API_BASE_URL` already includes `/api/v1`). Errors look like `{ error: { code, message, details? } }` and are read with `errorCode()`.

## `SentInvite` (backend `InviteItem`)

`{ id, email, role: 'admin' | 'member', expiresAt, lastSentAt, expired, invitedBy: { id, fullName } }`. The client displays `email`, `role`, `expired` and `expiresAt`. `lastSentAt` and `invitedBy` are typed but not shown, because neither WEB-05 nor its mockup has a column for them.

## Calls

| Function                              | Request                                                   | Success                                   | Errors → UI                                                                                        |
| ------------------------------------- | --------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `getSentInvites(workspaceId)`         | `GET /workspaces/:workspaceId/invites?limit=100`          | 200 `{ items: SentInvite[], nextCursor }` | 403 `INVITE_MANAGE_FORBIDDEN`, 404 `WORKSPACE_NOT_FOUND` → WEB-13 (query client `throwOnError`)    |
| `sendInvite(workspaceId, body)`       | `POST /workspaces/:workspaceId/invites` `{ email, role }` | 201 `SentInvite`                          | 409 `ALREADY_MEMBER`, 409 `INVITE_PENDING` → inline under `Email`; anything else → dialog banner   |
| `resendInvite(workspaceId, inviteId)` | `POST /workspaces/:workspaceId/invites/:inviteId/resend`  | 200 `SentInvite`                          | 404 `INVITE_NOT_FOUND`, 429 `RESEND_COOLDOWN`, others → page banner; row unchanged; list refetched |
| `revokeInvite(workspaceId, inviteId)` | `DELETE /workspaces/:workspaceId/invites/:inviteId`       | 204                                       | 404 `INVITE_NOT_FOUND`, others → page banner; list refetched                                       |

Server behaviour the UI relies on:

- The email is trimmed and lower-cased on the server.
- The list holds pending invites only, newest first, with expired ones included. `expired` is computed by the server.
- `INVITE_PENDING` also covers an **expired** invite to the same address, and the admin uses `Resend` instead. This conflicts with spec 017 FR-007 ("replace the expired invite"); see research R2.
- Resend keeps the id and role, sets `expiresAt` to now + 14 days, and is limited to once per 60 s per invite (`429`).
- After a revoke, the invitee's Home drops the invite, and their accept/decline get 404.

Query key: `['workspaces', workspaceId, 'invites']`. It is invalidated on settle of send, resend and revoke.
