# Implementation Plan: #55 Fix auth redirects: drop ?next and redirect signed-in users away from guest pages

**Branch**: `fix/55-auth-redirects-drop-next-guest-pages` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

## Summary

Sign-in always lands on Home: `RequireAuth` stops adding `?next`, `SignInPage` stops reading it. Guest guards move above `AuthLayout` so nothing (not even the empty card) renders until the session is known, and `/forgot-password` joins `/signin`, `/signup`, `/verify-email` under `RequireGuest`. `/reset-password` stays under `WaitForSession`; its "clear the cached session on success" requirement is already met by `useResetPassword` (see [research.md](./research.md) R3), so it only needs its existing tests kept green.

## Technical Context

**Language/Version**: TypeScript 5, React 19
**Primary Dependencies**: react-router (data router), TanStack Query
**Storage**: N/A (session lives in the `['session']` query cache)
**Testing**: Vitest + Testing Library + MSW (unit), Playwright (e2e)
**Target Platform**: Browser SPA on Cloudflare Workers static assets
**Project Type**: web frontend
**Performance Goals**: N/A
**Constraints**: permissions enforced by the server; client guards only steer navigation (AGENTS.md)
**Scale/Scope**: 3 source files, 3 test files, 1 doc in the parent repo

## Constitution Check

`.specify/memory/constitution.md` is still the unfilled template, so there are no gates. Checked against `AGENTS.md` instead:

- Server state through TanStack Query / `src/lib/api.ts`: no new calls. ✅
- No new UI wording: the existing notices are reused verbatim. ✅
- Out of scope respected: Google sign-in untouched. ✅

Re-check after design: same result.

## Changes

| File                                          | Change                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/guards.tsx`                          | `RequireAuth`: drop `?next`, `useLocation`, `useMatches`/`notFound`; keep `?notice=signed-out` when `SESSION_ENDED_KEY` is set. `RequireGuest`: wait on `isFetched` instead of `isPending` (card scope, R2).                                                                                                           |
| `src/app/router.tsx`                          | `RequireGuest` → `AuthLayout` → `signin`, `signup`, `verify-email`, `forgot-password`; `WaitForSession` → `AuthLayout` → `reset-password`.                                                                                                                                                                             |
| `src/features/auth/pages/SignInPage.tsx`      | Remove `next` and the same-site check; success → `navigate('/', { replace: true })`.                                                                                                                                                                                                                                   |
| `src/app/guards.test.tsx`                     | `?next` case → expects `''`; add `?notice=signed-out` case; add "signed in at each guest URL → Home, no `main` rendered while pending"; move the `WaitForSession` cases to `/reset-password` and replace `findByRole('main')` (the card no longer renders while waiting). Keep the refocus case for a guest page (R2). |
| `src/features/auth/pages/SignInPage.test.tsx` | Replace the `?next` table with one "always Home" case; drop `next=` from the `?error` URL case.                                                                                                                                                                                                                        |
| `e2e/smoke.spec.ts`                           | `/b/some-board` → `/signin$`; the "/ without ?next" test becomes redundant, merge or keep.                                                                                                                                                                                                                             |
| `../docs/frontend-init-plan.md` (parent repo) | Line 134: `401 → /signin` without `(kèm ?next=)`; line 180 mentions the old e2e, leave as history or reword. Separate commit in `agi-board`.                                                                                                                                                                           |

Unchanged on purpose: `useResetPassword`, `ResetPasswordPage`, `e2e/password-reset.spec.ts` (already covers "signed-in person ends on Sign in, not Home").

## Project Structure

```text
specs/55/
├── spec.md
├── plan.md        # this file
├── research.md
└── quickstart.md
```

No `data-model.md` or `contracts/`: no entities and no external interface change (the API is not touched; the route table keeps the same paths).

## Complexity Tracking

None.
