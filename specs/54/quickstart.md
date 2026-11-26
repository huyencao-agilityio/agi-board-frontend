# Quickstart: validate #54 user logout (frontend)

## Prerequisites

Worktree `agi-board-frontend-54`, `pnpm install` done.

## Automated

```sh
pnpm lint && pnpm typecheck && pnpm test   # includes src/app/layouts/AppLayout.test.tsx
pnpm e2e                                   # includes e2e/logout.spec.ts (auth flow changed)
```

Expected: all exit 0.

| Scenario | Test | Expected |
|----------|------|----------|
| Click `Log out`, API returns 204 | `AppLayout.test.tsx` | one `POST /auth/logout` with the CSRF header; Sign in screen shown |
| Click `Log out`, API fails (500 / network error) | `AppLayout.test.tsx` | Sign in screen still shown |
| Log out, then press Back | `e2e/logout.spec.ts` | URL is exactly `/signin`; Back stays on Sign in, protected page never shown |

## Manual (with the backend running)

1. `pnpm dev`, sign in, open a board.
2. Account menu → `Log out` → lands on `/signin`, no notice banner.
3. Press Back → Sign in again (plain `/signin`, or `/signin?next=…` when the previous entry was another protected page), board not shown.
4. DevTools → Application → Cookies: session and CSRF cookies are gone.
5. Repeat with DevTools → Network → Offline before clicking `Log out`: still lands on Sign in.

See [contracts/logout.md](./contracts/logout.md) for the endpoint and label.
