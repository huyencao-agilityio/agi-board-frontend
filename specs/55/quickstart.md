# Quickstart: validate #55

## Automated

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm e2e
```

Guards and routes change, so `pnpm e2e` is required.

## Manual (`pnpm dev`, real API)

| # | State | Action | Expected |
|---|-------|--------|----------|
| 1 | Signed out | Open `/b/x` | URL is `/signin` (no `?next`); sign in → Home `/` |
| 2 | Signed in | End the session server-side (not Log out), reload a protected page | `/signin?notice=signed-out`, shows "You were signed out. Sign in again." |
| 3 | Signed in | Type `/signin`, `/signup`, `/verify-email`, `/forgot-password` | Home, no auth card flash (throttle network in DevTools to see it clearly) |
| 3b | Signed out, API down | Open `/forgot-password`, type an email, bring the API back, switch tabs and return | Page and typed email still there |
| 4 | Signed in | Open a valid reset link, set a new password | `/signin` with "Password updated. Sign in with your new password."; old tab's next API call → signed out |
| 5 | Signed out | Sign in, sign up + verify, forgot + reset password | Same as before this change |
