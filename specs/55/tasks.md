---
description: "Task list for #55"
---

# Tasks: #55 Fix auth redirects: drop ?next and redirect signed-in users away from guest pages

**Input**: `specs/55/` (spec.md, plan.md, research.md, quickstart.md)
**Tests**: requested by the card ("Update tests: …"), so test tasks are included.

The card has no user stories; they are grouped from its Scope and Acceptance Criteria:

- **US1 (P1)**: Sign-in always lands on Home, no `?next`. AC 1, 2.
- **US2 (P1)**: Signed-in users are sent away from guest pages with no card flash; `/forgot-password` is a guest page. AC 3, 4.
- **US3 (P2)**: Reset password while signed in ends on Sign in. AC 5. Already implemented (research R3): verify only.

## Phase 1: Setup

None. The worktree is installed and no new dependency is needed.

## Phase 2: Foundational

None. US1 and US2 touch different parts of `guards.tsx` but share no new code.

## Phase 3: US1, sign-in always lands on Home (P1)

**Independent test**: signed out, open `/b/x` → URL `/signin` with no query; sign in → Home. A session that ended without logout → `/signin?notice=signed-out` with "You were signed out. Sign in again."

- [X] T001 [US1] In `src/app/guards.tsx` `RequireAuth`: remove the `next` param and everything only it used (`useLocation`, `useMatches`, the `notFound` check and its two comments). Keep: `if (ended) params.set('notice', 'signed-out')` and the `<Navigate to={`/signin${query ? `?${query}` : ''}`} replace />` shape. Remove now-unused imports.
- [X] T002 [P] [US1] In `src/features/auth/pages/SignInPage.tsx`: delete `const next = params.get('next')` and the same-site regex; on verified success call `navigate('/', { replace: true })`. Keep the `?notice` and `?error` handling and the `verify-email` branch unchanged.
- [X] T003 [US1] In `src/app/guards.test.tsx` `describe('RequireAuth')`: change "keeps ?next for a known protected path" to "sends a protected path to a plain /signin" expecting `''` for `/b/x`; keep the unknown-URL case; add a case where `/auth/me` returns 401 with body `{ error: { code: 'SESSION_ENDED' } }` (the shape `errorCode` in `src/lib/api.ts` reads, as in `src/features/auth/session.test.tsx`) and expect `?notice=signed-out`.
- [X] T004 [P] [US1] In `src/features/auth/pages/SignInPage.test.tsx`: replace the `it.each` "after sign-in goes to ?next=%s -> %s" table with one test: setup `/signin?next=%2Fb%2Fx`, sign in with a `home` result, expect Home (the old `?next` is ignored). In the `?error=%s` test, drop `next=%2Fb%2Fx&` from the setup URL and expect the search to be empty (`/^$/`).
- [X] T005 [P] [US1] In `e2e/smoke.spec.ts` "signed-out visitor is sent to Sign in": expect `toHaveURL(/\/signin$/)`. Keep "opening the app at / goes to a plain /signin without ?next" as is.

## Phase 4: US2, guest pages redirect signed-in users with no flash (P1)

**Independent test**: signed in, open `/signin`, `/signup`, `/verify-email`, `/forgot-password` → Home, and the auth card (`main`) never renders while `/auth/me` is pending. Signed out on `/forgot-password` after a failed `/auth/me`, refocusing keeps the page and the typed email.

- [X] T006 [US2] In `src/app/guards.tsx` `RequireGuest`: use `const { data: user, isFetched } = useSession()`; `if (!isFetched) return null`; then `user ? <Navigate to="/" replace /> : <Outlet />`. Add a one-line comment: waits like `WaitForSession` (CSRF cookie from the first GET; a refetch after a failure must not unmount the page).
- [X] T007 [US2] In `src/app/router.tsx`: replace the `{ element: <AuthLayout />, children: [...] }` block with two siblings: `{ element: <RequireGuest />, children: [{ element: <AuthLayout />, children: [signin (WEB-01), signup (WEB-02), verify-email (WEB-16), forgot-password (WEB-14)] }] }` and `{ element: <WaitForSession />, children: [{ element: <AuthLayout />, children: [reset-password (WEB-15)] }] }`. Keep the screen-ID comments.
- [X] T008 [US2] In `src/app/guards.test.tsx`: add `describe('RequireGuest')`:
  - `it.each(['/signin', '/signup', '/verify-email', '/forgot-password'])` signed in (`/auth/me` returns the `home` user body already used in this file) → pathname becomes `/`.
  - While `/auth/me` is still pending on `/signin`, `screen.queryByRole('main')` is null (no card flash).
  - Move "keeps the page and what was typed when a failed check runs again on focus" here, still on `/forgot-password`.
- [X] T009 [US2] In `src/app/guards.test.tsx` `describe('WaitForSession')`: switch `visit` to `/reset-password` (no token → the page shows its invalid-link state, heading "Reset password"); change `heading` to `{ name: 'Reset password' }`; in "waits for the first GET" replace `await screen.findByRole('main')` with a check that nothing renders until `answer()` (e.g. `expect(screen.queryByRole('main')).toBeNull()`); keep "lets a signed-in person / a failing API through" asserting pathname `/reset-password`. Delete the refocus case here (moved in T008).
- [X] T010 [P] [US2] Check `e2e/sign-up.spec.ts` and `e2e/password-reset.spec.ts` for anything that relied on `/forgot-password` being open to signed-in users or on the card rendering before the session loads; adjust only if `pnpm e2e` fails.

## Phase 5: US3, reset password while signed in (P2)

**Independent test**: signed in, open a valid reset link, set a new password → `/signin` with "Password updated. Sign in with your new password."

- [X] T011 [US3] No code change (research R3). Confirm these still pass after T007: `src/features/auth/pages/ResetPasswordPage.test.tsx` "sets the password, forgets the session and opens sign in with the notice" and `e2e/password-reset.spec.ts` "a signed-in person ends on Sign in, not Home".

## Phase 6: Polish

- [X] T012 Run `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` unpiped in the worktree; fix until all pass.
- [X] T013 [P] In the parent repo, `../docs/frontend-init-plan.md` line 134: change `401 → về /signin (kèm ?next=)` to `401 → về /signin`. Leave line 180 (dated history). Separate commit in `agi-board`, not in this PR.
- [X] T014 Run the `react-reviewer` agent on the diff; fix Critical and High findings, then `/create-pr`.

## Dependencies

- T001 → T003. T006 → T007 → T008, T009. T007 → T010, T011.
- US1 and US2 are independent but both edit `src/app/guards.tsx` and `src/app/guards.test.tsx`: do them one after the other, not in parallel.
- T012 after all code tasks; T014 after T012.

## Parallel examples

- US1: T002, T004, T005 (different files) alongside T001.
- Polish: T013 any time (other repo).

## Implementation strategy

One small PR: US1 → US2 → US3 check → polish. No MVP split; the card ships as a whole.
