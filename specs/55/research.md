# Research: #55

## R1. Where the guards sit relative to `AuthLayout`

- **Decision**: Guards are parents of `AuthLayout`, not children.
- **Rationale**: A guard returns `null` while the session loads. As a child of the card layout, that `null` sits inside an already-painted card, which is the flash. As a parent, nothing paints until the guard decides; a signed-in user goes straight to `<Navigate to="/">`.
- **Alternatives**: A loading state inside the card was rejected (still flashes the card for signed-in users). A spinner page was rejected (no spec wording or design for it).

## R2. `RequireGuest` waits on `isFetched`, not `isPending`

- **Decision**: `if (!isFetched) return null`, then `user ? <Navigate to="/" replace /> : <Outlet />`.
- **Rationale**: `/forgot-password` moves from `WaitForSession` to `RequireGuest`. `WaitForSession` uses `isFetched` for two reasons that still apply: (a) the page's POST needs the CSRF cookie set by the first GET; (b) after a failed `/auth/me` (network error), a refetch on window focus puts the query back to `pending`, and an `isPending` guard would unmount the page and lose what was typed. The existing test "keeps the page and what was typed when a failed check runs again on focus" covers (b) and must keep passing for `/forgot-password`. The same fix also helps `/signin` and `/signup`.
- **Alternatives**: Nesting `WaitForSession` inside `RequireGuest` for forgot-password only adds a layer for the same effect.

## R3. Reset password while signed in

- **Decision**: No code change.
- **Rationale**: `useResetPassword` (`src/features/auth/hooks.ts`) already runs `setQueryData(['session'], null)` and drops the other queries on success, before `ResetPasswordPage` navigates to `/signin?notice=password-updated`. `RequireGuest` therefore sees "signed out" and shows Sign in with the notice. This is covered by `ResetPasswordPage.test.tsx` ("sets the password, forgets the session and opens sign in with the notice") and `e2e/password-reset.spec.ts` ("a signed-in person ends on Sign in, not Home"). The backend ending the old session covers "old session no longer works".
- **Alternatives**: None needed.

## R4. Dropping `?next` removes the open-redirect check

- **Decision**: Delete the `/^\/(?!\/)/` check together with `next`.
- **Rationale**: With no URL-driven target there is no open-redirect surface left. `?next=` in old bookmarks is simply ignored.

## R5. Where `docs/frontend-init-plan.md` lives

- **Decision**: It is in the parent repo `agi-board` (`../docs/`), not in this repo. Edit it there, in its own commit/PR.
