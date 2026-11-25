# Quickstart: #5 User Sign Up (frontend)

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm e2e
```

Error codes: [contract](./contracts/auth-sign-up.md). States: [data model](./data-model.md).

## Automated scenarios

| Layer     | Scenario                                          | Expected                                                                            |
| --------- | ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Unit      | Password rules                                    | Each rule; email name in any case; empty email name passes                          |
| Component | Sign up, empty or space-only name                 | Button disabled                                                                     |
| Component | Email changed to match the password               | Email-name rule turns red, button disabled                                          |
| Component | Sign up, valid                                    | Body and CSRF sent; inputs locked; WEB-16 shows the email                           |
| Component | `EMAIL_ALREADY_EXISTS`; network error             | Banner; no red border                                                               |
| Component | Paste 6 digits                                    | Submitted once; session seeded; Home                                                |
| Component | Verify after sign-up, after sign-in               | Body has the typed password; pending password cleared after success                 |
| Component | WEB-16 without the password                       | Field and rules shown; 6th digit does not submit; Verify needs both                 |
| Component | Pending password of another email                 | Not used; field shown                                                               |
| Component | `VALIDATION_FAILED` with the password from memory | Password field appears                                                              |
| Component | Each WEB-16 error code                            | Text from research R5                                                               |
| Component | Locked, then resend                               | Countdown keeps running; boxes enabled after the resend                             |
| Component | Resend                                            | Disabled for 60 s; then toast, cleared boxes, new countdown                         |
| Component | WEB-16 without state                              | `/signin`                                                                           |
| Component | Sign in, unverified                               | WEB-16 with the email; no session seeded                                            |
| E2E       | Sign up → code → Home                             | Home opens                                                                          |
| E2E       | Reload on WEB-16                                  | Same email, countdown not restarted, password field; code and password lead to Home |
| E2E       | Password storage                                  | Not in `history.state`, web storage or the URL                                      |
| E2E       | `Continue with Google`; return to `/home`         | Requests `/auth/google`; Home, no WEB-16                                            |
| E2E       | Sign in unverified                                | WEB-16, not Home                                                                    |

## Manual, with backend #5

1. In `../agi-board-backend-5`, start the API and Mailpit (see its README and `specs/5/quickstart.md`). Here run `pnpm dev`.
2. Sign up at `/signup`, read the code in Mailpit (`http://localhost:8025`), enter it: Home opens.
3. Sign up again with that email, and with the email of a Google-only account: the already-exists banner, no email. Then `Continue with Google` with the first email: Home, same account.
4. Reload WEB-16, enter the code and a different valid password: Home, and only that password signs in.
5. Enter 5 wrong codes, then the right one: blocked until a new code is sent.
6. `Continue with Google` with a new account: Home, no WEB-16.
7. Compare both screens with every HTML state in `../docs/ui-pipeline/states/web/`.

## Not run

2026-11-25: none of the manual scenarios. Backend #5 was being edited in another session, and its local `.env` may hold a real email key, which would send real email instead of using Mailpit.
