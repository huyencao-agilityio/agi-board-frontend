# Tasks: #54 Implement feature user logout (frontend)

**Input**: Design documents from `specs/54/` (plan.md, spec.md, research.md, data-model.md, contracts/logout.md, quickstart.md)

**Tests**: Included. The card does not ask for them, but `.claude/rules/testing.md` requires a component test for the flow and an e2e test for an auth-flow change (plan.md, research R4).

**Stories** (from the card's frontend acceptance criteria; the card has no P1/P2 labels):

- **US1 (P1)**: Logout. Click `Log out` → `POST /auth/logout` → cached user data cleared → `/signin`; Back does not show protected pages. Also covers the request failing (frontend AC 1–3; AC 3 is the same handler, so it is not split out).

The clean Sign in URL work (former US2, T006–T012) was moved to its own ticket on 2026-11-26; see research.md R5.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)

---

## Phase 1: Setup

None. Worktree, dependencies and test tooling (Vitest + MSW in `src/test/server.ts`, Playwright on `http://api.e2e`) already exist.

## Phase 2: Foundational

- [x] T001 Add `logOut()` to `src/features/auth/api.ts`: `/** POST /auth/logout. 204, idempotent; clears the session and CSRF cookies. */ export function logOut() { return api<void>('/auth/logout', { method: 'POST' }) }`. No body (do not use the `post` helper, which sends JSON). Logout is POST only.

---

## Phase 3: US1 Logout (P1) 🎯 MVP

**Goal**: Logout from the account menu always ends on Sign in with no previous user data, even when the request fails.

**Independent test**: `pnpm test src/app/layouts/AppLayout.test.tsx` and `pnpm e2e e2e/logout.spec.ts` pass.

### Tests

- [x] T002 [P] [US1] Create `src/app/layouts/AppLayout.test.tsx`. Render `routes` from `src/app/router.tsx` in `createMemoryRouter` at `/` with a fresh `QueryClient({ defaultOptions: { queries: { retry: false } } })` (same pattern as `src/app/guards.test.tsx`). MSW: `GET ${API}/auth/me` → 200 with an `AuthResult` body (`{ user: { id, email, fullName: 'Ann Lee', systemRole: 'USER' }, next: 'home' }`). Open the account menu (`getByRole('button', { name: 'Ann Lee' })`), click `getByRole('menuitem', { name: 'Log out' })`. Cases:
  1. `POST ${API}/auth/logout` → 204: exactly one POST was sent, carrying the `X-CSRF-Token` header when `document.cookie` has `csrf_token=abc` (cleared in `afterEach`). Then pathname `/signin`, search `''`, the `Sign in` heading is visible, no `status` notice.
  2. `POST /auth/logout` → `HttpResponse.error()` (network error), and a separate case → 500: still lands on `/signin`, and `/auth/me` is not called again after the click (session seeded as `null`, research R2).
- [x] T003 [P] [US1] Create `e2e/logout.spec.ts`. Mock `http://api.e2e/auth/me` (200 with the `AuthResult` body while signed in, 401 after logout) and `http://api.e2e/auth/logout` → 204. Go to `/`, open `Profile` from the account menu, then `Log out`. Assert `toHaveURL(/\/signin$/)` and the `Sign in` heading. `page.goBack()` (reaches `/`, which `RequireAuth` sends to a plain `/signin`): URL matches `/\/signin$/` and Home is not visible.

### Implementation

- [x] T004 [US1] In `src/app/layouts/AppLayout.tsx`, rewrite the handler (depends on T001):
  ```ts
  const handleLogOut = async () => {
    await logOut().catch(() => {}) // sign out locally even when the request fails
    queryClient.clear()
    queryClient.setQueryData(['session'], null) // guards see "signed out" without refetching /auth/me
    navigate('/signin', { replace: true })
  }
  ```
  Import `logOut` from `@/features/auth/api`, drop the direct `api` import, keep the label `Log out` verbatim. `queryClient.clear()` also removes `SESSION_ENDED_KEY`, so no "You were signed out." notice (decision #32).
- [x] T005 [US1] Run `pnpm test src/app/layouts/AppLayout.test.tsx` and `pnpm e2e e2e/logout.spec.ts`; fix until both exit 0.

**Checkpoint**: Logout meets all three frontend ACs.

---

## Phase 4: Polish & cross-cutting

- [x] T006 Run `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` unpiped (the `checks.mjs` hook records them); all exit 0.
- [ ] T007 Manual check per `specs/54/quickstart.md` (Manual section) with `pnpm dev` and the backend running; record what was and was not verified.
- [x] T008 Run the `react-reviewer` agent on the diff; fix Critical and High findings, then rerun T006. (0 Critical; the only High concerned the clean-URL work, now moved out of this ticket.)
- [ ] T009 PR **Risk** section: if `POST /auth/logout` fails, the server session stays valid while the client shows Sign in (spec asks for this; no message defined). No pending state on the menu item (Medium review finding, not addressed).

---

## Dependencies & execution order

```text
T001 ─▶ T004 ─▶ T005 ─▶ T006 ─▶ T007 ─▶ T008 ─▶ T009
T002, T003 ────────┘
```

T002 and T003 can be written in parallel with T001; they fail until T004.

## Implementation strategy

US1 alone is the whole ticket: T001–T005, then polish (T006–T009), then `/create-pr`.
