# Quickstart: #21 Invite to Workspace

## Automated

```sh
pnpm lint && pnpm typecheck && pnpm test   # MSW tests in WorkspaceMembersPage.test.tsx
pnpm e2e                                   # e2e/members.spec.ts (page.route mocks)
```

## Manual (needs the backend branch `feat/21-invite-to-workspace` running, see contracts/api-client.md)

1. `pnpm dev`, then sign in as a workspace admin and open `/w/<id>/members`. Expect the title, `Invite`, and no `Sent invites` section yet.
2. Click `Invite`. Expect `Email` empty, `Role` = `Member`, and `Send invite` disabled.
3. Type `abc`. Expect the inline "Enter a valid email address." with `Send invite` disabled. Fix it, and the error clears.
4. Send to a new address as `Admin`. Expect a spinner ("Sending invite") with the fields locked, then the dialog closes, the toast "Invite sent" shows, and the row is `Admin` · `Pending` · expiry 14 days ahead.
5. Invite the same address again. Expect "This person already has a pending invite.". Invite your own email. Expect "This person is already a member.".
6. Click `Resend` (wait 60 s after sending; earlier → 429 → banner). Expect the row to stay with a refreshed expiry. An `Expired` row turns `Pending`. Click `Revoke`. Expect the row to disappear, and the section to hide once it is empty.
7. Go offline (DevTools) and click `Resend`. Expect the banner "Something went wrong. Try again." above the title, with the row unchanged.
8. Sign in as the invitee. Expect the invite on Home, where `Accept` joins with the chosen role and `Decline` removes it (regression for card #6).
9. As a non-admin member, open `/w/<id>/members`. Expect WEB-13.
