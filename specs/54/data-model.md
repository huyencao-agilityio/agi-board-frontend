# Data model: #54 user logout (frontend)

No new entities. Logout changes only client state the app already has.

## Client state touched

| State | Where | Before logout | After logout |
|-------|-------|---------------|--------------|
| Session user | TanStack Query `['session']` (`SessionUser \| null`) | the signed-in person | `null` (seeded, not refetched) |
| Session-ended flag | `['session-ended']` (`SESSION_ENDED_KEY`) | maybe set | removed (no "You were signed out." notice) |
| Every other server cache (boards, cards, workspaces, …) | TanStack Query | user data | removed by `queryClient.clear()` |
| Session + CSRF cookies | browser, httpOnly / set by server | present | cleared by the server's 204 response; untouched by the client if the request failed |

## State transitions

```text
Signed in ──click "Log out"──▶ POST /auth/logout ──(204 | error)──▶ cache cleared, session = null ──▶ /signin (replace)
```

The outcome of the request does not change the client transition (business rule: clear local state even on failure).
