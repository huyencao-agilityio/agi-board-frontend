# Data Model: #21 Invite to Workspace

Client-side shapes only; the server owns storage.

## SentInvite (WEB-05 `Sent invites` row)

| Field        | Type                  | Notes                                                       |
| ------------ | --------------------- | ----------------------------------------------------------- |
| `id`         | string (uuid)         | Used by Resend / Revoke                                     |
| `email`      | string                | Normalized by the server (trimmed, lowercase)               |
| `role`       | `'admin' \| 'member'` | Shown as `Admin` / `Member`                                 |
| `expiresAt`  | ISO 8601 string (UTC) | Shown as `YYYY/MM/DD`, local time                           |
| `expired`    | boolean               | Status `Expired` when true, else `Pending` (server decides) |
| `lastSentAt` | ISO 8601 string       | Not shown (no column in WEB-05)                             |
| `invitedBy`  | `{ id, fullName }`    | Not shown (no column in WEB-05)                             |

List response: `{ items: SentInvite[], nextCursor: string | null }`. The page renders `items`.

States: Pending → Expired as time passes. Pending or Expired → Pending on Resend: same id and role, `expiresAt` = now + 14 days, at most once per 60 s. Any state → gone on Revoke, accept or decline.

## InviteForm (WEB-D11)

| Field   | Type                  | Default    | Validation                          |
| ------- | --------------------- | ---------- | ----------------------------------- |
| `email` | string                | `''`       | `emailSchema` (trim + valid format) |
| `role`  | `'admin' \| 'member'` | `'member'` | one of the two                      |

Server errors on `email`: `ALREADY_MEMBER` and `INVITE_PENDING` show inline. `INVITE_PENDING` also covers an expired invite. Other failures show the dialog banner.

## Existing (unchanged)

- `WorkspaceTile` (`GET /workspaces/:id`): `name` for the title, `role === 'admin'` gates `Invite` / `Resend` / `Revoke`.
- `PendingInvite` (Home, card #6): recipient side.

## UI text (verbatim)

| Where                  | Text                                                                                                              | Source             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------ |
| WEB-05 button          | `Invite`                                                                                                          | WEB-05 §4          |
| WEB-05 section heading | `Sent invites`                                                                                                    | mockup WEB-05      |
| Table headers          | `Email`, `Role`, `Status`, `Expires`                                                                              | mockup WEB-05      |
| Status                 | `Pending`, `Expired`                                                                                              | WEB-05 §4          |
| Row actions            | `Resend`, `Revoke`                                                                                                | WEB-05 §4          |
| Toast                  | `Invite sent`                                                                                                     | WEB-05 §7          |
| Banner (WEB-05)        | `Something went wrong. Try again.`                                                                                | WEB-05 §7          |
| Dialog title           | `Invite`                                                                                                          | 017 FR-001         |
| Fields                 | `Email`, `Role` (`Member`, `Admin`)                                                                               | WEB-D11 §4, mockup |
| Buttons                | `Cancel`, `Send invite`                                                                                           | 017 FR-001         |
| Spinner label          | `Sending invite`                                                                                                  | mockup WEB-D11     |
| Inline errors          | `Enter a valid email address.` / `This person is already a member.` / `This person already has a pending invite.` | 017 FR-003/009/010 |
| Dialog banner          | `Something went wrong. Try again.`                                                                                | 017 FR-011         |
