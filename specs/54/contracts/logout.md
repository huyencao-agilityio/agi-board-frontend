# Contracts: #54 user logout

## API consumed: `POST /auth/logout`

Owned by `agi-board-backend` (same card). As the frontend relies on it:

| Item                  | Value                                                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Method / path         | `POST /auth/logout` (POST only)                                                                                                         |
| Request               | no body; session cookie (`credentials: 'include'`) + `X-CSRF-Token` header from the `csrf_token` cookie, both added by `src/lib/api.ts` |
| Success               | `204 No Content`, `Set-Cookie` clearing the session and CSRF cookies                                                                    |
| Already-ended session | `204` (idempotent)                                                                                                                      |
| Missing/invalid CSRF  | rejected (4xx)                                                                                                                          |
| Frontend handling     | any outcome (2xx, 4xx, 5xx, network error) → clear client state and go to `/signin`                                                     |

## UI contract: account menu (shared app header)

From `../docs/ui-pipeline/screens/WEB-03-home.md` and the other signed-in screens:

| Element           | Label     | Action                                                                          |
| ----------------- | --------- | ------------------------------------------------------------------------------- |
| Account menu item | `Log out` | → WEB-01 Sign in at `/signin`, history entry replaced, no notice (decision #32) |

No new labels or messages. The `/signin` route contract (`?next`, `?notice`, `?error`) is unchanged by this ticket.
