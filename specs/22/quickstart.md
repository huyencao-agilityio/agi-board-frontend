# Quickstart: validate #22

## Prerequisites

- `.env.local` in this worktree (copy from the main checkout; see `.env.example`).
- For a manual run: backend from `agi-board-backend-22` running with the card #22 endpoints.

## Automated checks

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm e2e
```

`pnpm e2e` is required: `src/lib/query-client.ts` (auth flow) changes.

Expected coverage:

| Test | Proves |
|---|---|
| `src/lib/password-rules.test.ts` (moved) | Rules unchanged after the move |
| `src/features/profile/device-label.test.ts` | "Chrome on Windows", "Safari on iPhone", single known part, `null` → "Unknown device" |
| `src/features/profile/pages/ProfilePage.test.tsx` | Each state in [contracts/ui.md](./contracts/ui.md): name save trims and updates header; Save disabled for blank/unchanged; invalid photo sends nothing; upload/remove; wrong current password; same password (client and 400 `NEW_PASSWORD_SAME_AS_CURRENT`); 429 lock until `details.lockedUntil`; lock already active on load (`changePasswordLockedUntil` in the future) and released when it passes (fake timers); success toast + cleared fields; Google-only hides Password; Google status; only session hides sign-out controls; sign out one / all others; failure banner; CSRF header on writes |
| `src/lib/query-client` or guard test | A `SESSION_ENDED` 401 from a non-session request leads to `/signin?notice=signed-out`; 401 `INVALID_CREDENTIALS` does not |
| `src/app/layouts/AppLayout.test.tsx` | Header shows the photo when `avatarUrl` is set, initials otherwise |
| Existing auth page tests | Still pass after the import moves and the `avatarUrl` field |
| `e2e/profile.spec.ts` | Profile loads with mocked API; a write answered with 401 `SESSION_ENDED` lands on `/signin?notice=signed-out` |

## Manual run

1. `pnpm dev`, sign in, open account menu → `Profile`.
2. Change the name to " New Name ", `Save` → field and header show "New Name".
3. Upload a PNG → photo and `Remove photo`; remove → initials. Choose a PDF → inline error.
4. Sign in from a second browser; Profile lists two sessions. `Sign out` the other one → its next action lands on sign-in with "You were signed out."
5. Change password with the right current password → toast, fields cleared, second browser signed out.
