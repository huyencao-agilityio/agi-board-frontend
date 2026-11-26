# Research: #54 user logout (frontend)

## R1. What happens when `POST /auth/logout` fails

- **Decision**: Swallow the error (`.catch(() => {})`), then always clear client state and navigate.
- **Rationale**: Business rule "Frontend clears local state even if the logout request fails due to network errors" and frontend AC 3. A 401/403 (session already ended, CSRF missing) means there is nothing more the user can do either; the server is the authority on the cookie. No message is shown: the spec defines none, and the user lands on Sign in as asked.
- **Alternatives considered**: `try/finally` without catch: rethrows into the menu's `onSelect`, causing an unhandled rejection. Showing an error toast: wording not in the spec (would need asking), and the user still ends up signed out locally.

## R2. How to clear client state so the guards treat the user as signed out

- **Decision**: `queryClient.clear()`, then `queryClient.setQueryData(['session'], null)`, then `navigate('/signin', { replace: true })`.
- **Rationale**: `clear()` drops every cached query (user, boards, cards, `SESSION_ENDED_KEY`), so nothing of the previous user remains (AC 2). Seeding `['session']` with `null` (staleTime is `Infinity`) means:
  - `RequireGuest` on `/signin` shows the form without refetching `/auth/me`. Without the seed, a failed logout whose cookie is still valid would refetch `/auth/me`, get the user back and bounce to `/` (breaks AC 3).
  - Pressing Back to a protected URL hits `RequireAuth` with `user = null` → redirect to Sign in; the protected page is never rendered (AC 2).
  - `SESSION_ENDED_KEY` is gone, so no "You were signed out." notice (decision #32: notice only when the session ended without a logout).
- Signing in again overwrites `['session']` (`useSignIn` / `useVerifyEmail` already `setQueryData`), so the `null` seed does not block the next sign-in.
- **Order**: if `RequireAuth` reacted to `session = null` before our navigate, it would go to `/signin?next=<path>`; our `navigate('/signin', { replace: true })` runs right after and wins. The unit test asserts an empty search and the e2e test the exact URL `/signin`. A Back afterwards reaches the entry before the replaced one (e.g. `/`) and `RequireAuth` sends it to Sign in; for `/` that is a plain `/signin`, for another protected path `/signin?next=…` (existing behaviour).
- **Alternatives considered**: `invalidateQueries` (refetches, slower and same bounce problem); `window.location.assign('/signin')` (full reload clears everything, but throws away the SPA and is harder to test; not needed).

## R3. Where the code lives

- **Decision**: `logOut()` in `src/features/auth/api.ts`; handler stays in `src/app/layouts/AppLayout.tsx`.
- **Rationale**: Every auth endpoint already has a function in `features/auth/api.ts`; `AppLayout` is the only account menu. A `useLogOut` mutation hook would be extra code without a pending/error UI to drive.

## R5. Clean Sign in URL: moved to another ticket

During planning the user asked for a clean `/signin` URL (no `?next`, no `?notice`, always Home after sign-in, notices as router state). It was implemented, reviewed, then **split out on 2026-11-26** by the user's decision: it changes the sign-in flow, is not asked for by card #54, and conflicts with decision #96 (`../specs/001-user-sign-in/spec.md` line 127, `../specs/012-audit-log/spec.md` line 112, `../specs/013-page-not-available/spec.md` FR-008: a signed-out person must return to the opened address after signing in). That ticket should settle the spec change first.

The work is kept for that ticket as git stash `clean-signin-url (split from #54)` and as `../patches/clean-signin-url.patch` (parent repo folder, relative to this checkout). It covers `guards.tsx`, `SignInPage.tsx`, `ResetPasswordPage.tsx`, their tests, `e2e/smoke.spec.ts`, `e2e/password-reset.spec.ts`, `.claude/rules/react.md`, `.claude/rules/security.md` and the `notFound` route handle in `router.tsx`. Review notes for it: same-origin check needed if a return target comes back; `?error` lookup should use `Object.hasOwn`.

## R4. Tests

- **Decision**: `AppLayout.test.tsx` (MSW): (a) 204 → request is POST with CSRF header, lands on Sign in; (b) network error / 500 → still lands on Sign in. `e2e/logout.spec.ts`: signed-in home → account menu → `Log out` → URL is exactly `/signin`; `page.goBack()` stays on Sign in.
- **Rationale**: `.claude/rules/testing.md` (component test for the flow, e2e for an auth-flow change).
