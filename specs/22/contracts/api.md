# API used by WEB-17

Source of truth: `agi-board-backend/specs/22/contracts/users-me.md` and `auth-account.md` (backend card #22). This is the subset the page needs; if it differs from the backend file, the backend file wins.

All need the session cookie; writes need the CSRF header (added by `api()`). Any request may return 401 `SESSION_ENDED` → handled globally (research R4).

| Call                         | Request                            | Success                                            | Errors the UI maps                                                                                                                                                                                                                                      |
| ---------------------------- | ---------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /auth/me` (and sign-in) | —                                  | 200 `{ user, next }`; **`user.avatarUrl` added**   | —                                                                                                                                                                                                                                                       |
| `GET /users/me`              | —                                  | 200 profile; **`changePasswordLockedUntil` added** | —                                                                                                                                                                                                                                                       |
| `PATCH /users/me`            | `{ fullName }`                     | 200 profile                                        | 400 `VALIDATION_FAILED` → banner (client blocks it first)                                                                                                                                                                                               |
| `PUT /users/me/avatar`       | `FormData` field `file`            | 200 profile                                        | 413 `PAYLOAD_TOO_LARGE`, 415 `UNSUPPORTED_IMAGE_TYPE` → invalid-photo inline error                                                                                                                                                                      |
| `DELETE /users/me/avatar`    | —                                  | 204                                                | —                                                                                                                                                                                                                                                       |
| `POST /auth/change-password` | `{ currentPassword, newPassword }` | 204 (other sessions ended, current kept)           | 400 `CURRENT_PASSWORD_INCORRECT` → inline; **400 `NEW_PASSWORD_SAME_AS_CURRENT`** → same-password inline; 429 `CHANGE_PASSWORD_LOCKED` with **`details.lockedUntil`** → inline + lock until then; 400 `VALIDATION_FAILED` / `PASSWORD_NOT_SET` → banner |
| `GET /auth/sessions`         | —                                  | 200 `{ items: Session[] }`                         | —                                                                                                                                                                                                                                                       |
| `DELETE /auth/sessions/:id`  | —                                  | 204                                                | 404 `SESSION_NOT_FOUND` → refetch list, no banner (already gone); others → banner                                                                                                                                                                       |
| `DELETE /auth/sessions`      | —                                  | 204                                                | —                                                                                                                                                                                                                                                       |

Any other failure → banner "Something went wrong. Try again."

## Backend changes this page needs (proposed names, confirm with the backend card #22)

1. `POST /auth/change-password`: 400 `NEW_PASSWORD_SAME_AS_CURRENT` when `newPassword` equals the current password, checked **after** the current password is verified (so it never confirms a guess).
2. `POST /auth/change-password` 429 body: `{ error: { code: "CHANGE_PASSWORD_LOCKED", message, details: { lockedUntil: "<ISO>" } } }`.
3. `GET /users/me`: `changePasswordLockedUntil: "<ISO>" | null` (null when not locked or the lock has passed).
4. `GET /auth/me` and sign-in `user`: `avatarUrl: string | null` (same value as `GET /users/me`).
