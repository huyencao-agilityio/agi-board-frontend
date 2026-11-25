# Quickstart: #18 Forgot Password (frontend)

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm e2e
```

Error codes: [contract](./contracts/auth-password-reset.md). States: [data model](./data-model.md).

## Automated scenarios

| Layer     | Scenario                                                | Expected                                                             |
| --------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| Guard     | `WaitForSession`, signed in and out, `/auth/me` failing | Nothing while pending, then the page                                 |
| Component | WEB-14 empty, invalid, corrected email                  | Button disabled; error after blur; error clears                      |
| Component | WEB-14 valid email with spaces                          | Trimmed body and CSRF sent; field locked; Sent text                  |
| Component | WEB-14 edit after Sent                                  | Sent text disappears                                                 |
| Component | WEB-14 network error, then success                      | Banner, email kept, no red border; then Sent, no banner              |
| Component | WEB-15 no token                                         | Expired/used message, no request                                     |
| Component | WEB-15 valid token                                      | Form; fragment removed from the URL                                  |
| Component | WEB-15 `RESET_LINK_INVALID` on check, on submit         | Message replaces the form; `Request a new link` opens WEB-14         |
| Component | WEB-15 check fails (network, 403)                       | Generic banner, not WEB-13; fragment kept                            |
| Component | WEB-15 email name in another case                       | Third rule red, button disabled                                      |
| Component | WEB-15 mismatch, then fixed from either field           | Error under confirm only; clears                                     |
| Component | WEB-15 submit                                           | Body and CSRF sent; fields locked; session cache null; WEB-01 notice |
| Component | WEB-15 `VALIDATION_FAILED`, network error               | Banner; typed values kept                                            |
| E2E       | Sign in → Forgot password → Sent                        | Confirmation                                                         |
| E2E       | Open link in a fresh context → set password             | `/auth/me` before the POST; CSRF header sent; WEB-01 notice          |
| E2E       | Same, with a signed-in session                          | WEB-01, not Home                                                     |
| E2E       | Token storage                                           | Not in the URL, `history.state` or web storage after the check       |

## Manual, with backend #18

1. In `../agi-board-backend-18`, start the API and Mailpit (see its README and `specs/18/quickstart.md`). Make sure its `.env` has no real email key. Here run `pnpm dev`.
2. Request a link for a password account, a Google-only account and an unknown email: same screen; reset link, Google notice, nothing.
3. Open the link in a private window, set a password: WEB-01 notice; only the new password signs in; another signed-in browser is signed out.
4. Open the link again, and an older link after requesting a newer one: expired/used message.
5. Reset an unverified account and sign in: WEB-16.
6. Compare both screens with every HTML state in `../docs/ui-pipeline/states/web/`.

## Not run

2026-11-25: manual scenarios 1 to 5. Backend #18 was uncommitted and still being edited, and its `.env` was not checked for a real email key. Scenario 6 was done with a mocked API.
