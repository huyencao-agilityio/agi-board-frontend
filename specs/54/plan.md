# Implementation Plan: #54 Implement feature user logout

**Branch**: `feat/54-implement-feature-user-logout` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/54/spec.md`

## Summary

Frontend half of card #54 (the backend half lives in `agi-board-backend`). The account menu already has `Log out` wired in `src/app/layouts/AppLayout.tsx`, calling `POST /auth/logout`, then `queryClient.clear()` and `navigate('/signin', { replace: true })`. Two gaps against the card:

1. If the request fails (network error, 5xx, 401/403 from an already-ended session or a bad CSRF token), the `await` throws: client state is **not** cleared and the user stays on the protected page. This breaks business rule "Frontend clears local state even if the logout request fails" and the third frontend AC.
2. No test covers logout (component or e2e), although the auth flow is in scope of the e2e rule.

Approach: move the call into `logOut()` in `src/features/auth/api.ts` (like every other auth endpoint), make the handler ignore the request's outcome and always clear the cache, seed the session as signed out (`null`), and go to a plain `/signin` (no notice: WEB-03 "Account menu → Log out → WEB-01 (signed out, no notice, decision #32)"). Add one component test and one e2e test.

**Out of this ticket (split 2026-11-26):** a clean `/signin` URL (no `?next` / `?notice`, always Home after sign-in) was planned here, then moved to its own ticket by the user because it changes the sign-in flow and conflicts with decision #96. See [research.md R5](./research.md#r5-clean-sign-in-url-moved-to-another-ticket). This ticket does not touch `guards.tsx`, `SignInPage.tsx` or `ResetPasswordPage.tsx`.

## Technical Context

**Language/Version**: TypeScript 5, React 19

**Primary Dependencies**: react-router (data router), TanStack Query, shadcn `DropdownMenu`

**Storage**: N/A on the client (session is an httpOnly cookie the server clears; client state = TanStack Query cache)

**Testing**: Vitest + Testing Library + MSW (`src/test/server.ts`); Playwright with `page.route` on `http://api.e2e`

**Target Platform**: Browser SPA served from Cloudflare Workers

**Project Type**: Web application (frontend only in this repo)

**Performance Goals**: N/A

**Constraints**: POST-only logout; all requests through `src/lib/api.ts` (adds cookies + CSRF header); UI label `Log out` copied verbatim from the spec

**Scale/Scope**: 1 handler, 1 API function, 2 new tests

No NEEDS CLARIFICATION items remain (see [research.md](./research.md)).

## Constitution Check

`.specify/memory/constitution.md` is still the unfilled template, so the gates come from `AGENTS.md` and `.claude/rules/`:

| Gate | Status |
|------|--------|
| Server state through TanStack Query + `src/lib/api.ts`, no direct `fetch` | Pass: `logOut()` uses `api()` |
| Logout is POST only | Pass |
| Permissions enforced by the server; client only steers navigation | Pass: the server revokes the session; the client only forgets it |
| Labels verbatim from the spec, no invented wording | Pass: `Log out`, no new message (failure is silent, the spec defines none) |
| Feature does not import another feature's internals | Pass: `AppLayout` (in `src/app/`) imports from `features/auth` as it already does |
| Out-of-scope items (logout-all, dark mode, i18n) not built | Pass |
| Tests: component test for the flow + e2e for an auth-flow change | Planned |

Re-check after Phase 1: unchanged, all pass.

## Project Structure

### Documentation (this feature)

```text
specs/54/
├── spec.md
├── plan.md              # this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── logout.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── features/auth/
│   └── api.ts                  # + logOut(): POST /auth/logout
└── app/layouts/
    ├── AppLayout.tsx           # handler: ignore failure, clear cache, session = null, go to /signin
    └── AppLayout.test.tsx      # new: success, and failed request still signs out
e2e/
└── logout.spec.ts              # new: Log out → exactly /signin, Back does not show the protected page
```

**Structure Decision**: Keep the handler in `AppLayout` (the only place with an account menu). No new hook: a plain async handler is enough, and a `useMutation` would add nothing (no pending UI; the menu closes on select).

## Complexity Tracking

No violations.
