# Feature Specification: #55 Fix auth redirects: drop ?next and redirect signed-in users away from guest pages

**Card:** https://trello.com/c/nEszCBms/55-fix-auth-redirects-drop-next-and-redirect-signed-in-users-away-from-guest-pages
**List (status):** In Progress
**Labels:** Phase 3, Frontend, Sprint 1
**Members:** Huyen Cao
**Due:** —
**Pulled:** 2026-11-26 (GMT+7)

---

## Description

## Overview
Two issues found while testing auth navigation on the frontend.

1. After sign-in, the user is sent back to the page they came from (`?next=`). We no longer want this: sign-in always lands on Home (`/`).
2. A signed-in user who types a guest URL (`/signin`, `/signup`, `/verify-email`, `/forgot-password`) briefly sees the empty auth card (border radius + shadow) before the redirect. `/forgot-password` does not redirect at all.

## Root cause
- `RequireAuth` (`src/app/guards.tsx`) adds `?next=<path>`; `SignInPage` reads it and navigates there.
- In `src/app/router.tsx`, `AuthLayout` (the card) wraps the guards, so while the session is loading the guard returns `null` inside an already-rendered card.
- `/forgot-password` sits under `WaitForSession`, not `RequireGuest`.

## Scope
- Remove `?next` from `RequireAuth` and from `SignInPage`; sign-in success always navigates to `/`. Keep `?notice=signed-out` (shows "You were signed out. Sign in again." when a session ends without logout).
- Router: move the guards above `AuthLayout` so nothing renders until the session is known.
- Move `/forgot-password` under `RequireGuest`.
- `RequireGuest` waits on `isFetched` (like `WaitForSession`), not `isPending`. Otherwise moving `/forgot-password` breaks two things `WaitForSession` handled: its POST needs the CSRF cookie set by the first `GET /auth/me`, and after a failed `/auth/me` a refetch on window focus puts the query back to pending, which would unmount the page and lose what was typed.
- `/reset-password` stays open to signed-in users (a reset link opened in a signed-in browser must still work). The backend already ends all sessions on reset (`end_reason = 'password_reset'`), so on reset success the frontend must clear the cached session before going to `/signin?notice=password-updated`; otherwise `RequireGuest` sends the user to Home and they get "You were signed out" instead.
- Update `docs/frontend-init-plan.md` (401 → `/signin` without `?next=`).
- Update tests: `guards.test.tsx`, `SignInPage.test.tsx` (`?next` cases), e2e that expect `?next=`.

Out of scope: Google sign-in (already always lands on `/home`).

---

## Acceptance Criteria

- [ ] Signed out, open `/b/x` → `/signin` with no `?next`; after sign-in → Home.
- [ ] Session ends (not logout) → `/signin?notice=signed-out` still shows the notice.
- [ ] Signed in, type `/signin`, `/signup`, `/verify-email`, `/forgot-password` → redirected to Home with no auth card flashing.
- [ ] Signed out on `/forgot-password` after a failed `/auth/me`: refocusing the tab keeps the page and the typed email.
- [ ] Signed in, open a valid reset link, set new password → lands on `/signin` with "Password updated. Sign in with your new password."; the old session no longer works.
- [ ] Signed out flows (sign in, sign up, verify email, forgot/reset password) unchanged.
- [ ] lint, typecheck, unit tests, e2e pass.

---

## Checklists

None

## Comments

None

## Attachments / Links

None
