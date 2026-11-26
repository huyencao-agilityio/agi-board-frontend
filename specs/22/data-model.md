# Data model (client): #22 Profile and Account Settings

Shapes are the backend responses ([contracts/api.md](./contracts/api.md)); the client keeps them as-is.

## Profile — query `['profile']` ← `GET /users/me`

| Field | Type | Use |
|---|---|---|
| `id` | string | — |
| `email` | string | Password rule "Does not contain your email name" |
| `fullName` | string | `Full name` field default; initials when no photo |
| `avatarUrl` | string \| null | Photo `src` (resolved against `VITE_API_BASE_URL`); `null` → initials circle, `Remove photo` hidden |
| `hasPassword` | boolean | `false` → `Password` section hidden |
| `googleLinked` | boolean | `Google: Linked` / `Google: Not linked` |
| `changePasswordLockedUntil` | ISO string \| null | **New (backend, proposed)**. Later than now → `Change password` disabled with the lock error |

Written by: `PATCH /users/me`, `PUT /users/me/avatar` (both return the profile → `setQueryData`), `DELETE /users/me/avatar` (204 → set `avatarUrl: null`), 429 `CHANGE_PASSWORD_LOCKED` (→ set `changePasswordLockedUntil` from `details.lockedUntil`). Name and avatar changes also patch `name` / `avatarUrl` in `['session']`.

## Session user — query `['session']` ← `GET /auth/me`

Existing `SessionUser` (`id`, `email`, `name`, `systemRole`) plus **`avatarUrl: string | null`** (backend adds it to the `user` of `/auth/me` and sign-in, proposed). Drives the header avatar.

Initials: first letter of the first and last words of `fullName`, upper case (one word → one letter).

## Session — query `['sessions']` ← `GET /auth/sessions`

| Field | Type | Use |
|---|---|---|
| `id` | string (UUID) | Row key; `DELETE /auth/sessions/:id` |
| `userAgent` | string \| null | Device label (research R6) |
| `createdAt` | ISO string | Not shown |
| `lastActiveAt` | ISO string | "Last active …" |
| `isCurrent` | boolean | `This device`, no `Sign out` |

Order as returned (newest `lastActiveAt` first). After `DELETE /auth/sessions[/:id]` or a password change → invalidate `['sessions']`.

## Form state (local)

| Form | Fields | Valid when |
|---|---|---|
| Name | `fullName` | `trim().length ≥ 1` and `trim() !== profile.fullName` |
| Password | `currentPassword`, `newPassword` | both non-empty, `isValidPassword(newPassword, email)`, `newPassword !== currentPassword`, not locked |

Passwords are never stored outside the form; cleared after success.
