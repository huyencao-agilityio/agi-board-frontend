# Contract used: Auth sign-up

Source: `../agi-board-backend-5/specs/5/contracts/auth-sign-up.md` (commit `b9e8176`, 2026-11-25). Errors are `{ error: { code, message, details } }`; branch on `code`. All are POST with the CSRF header.

| Request                                          | Success                                                                                                | Errors                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `/auth/sign-up` `{ fullName, email, password }`  | 201 `{ next: "verify-email" }`, no session                                                             | 409 `EMAIL_ALREADY_EXISTS`; 400 `VALIDATION_FAILED`                                                     |
| `/auth/verify-email` `{ email, code, password }` | 200 `{ user, next: "home" }`, session set, other sessions end; `password` becomes the account password | 400 `INCORRECT_CODE`, `CODE_EXPIRED`, `VALIDATION_FAILED`; 429 `CODE_LOCKED`; 403 `ACCOUNT_DEACTIVATED` |
| `/auth/resend-code` `{ email }`                  | 200 `{ sent: true }`                                                                                   | 429 `RESEND_TOO_SOON`                                                                                   |
| `/auth/sign-in` (changed)                        | `next: "verify-email"` now sets no session                                                             | unchanged                                                                                               |

- `verify-email` applies the sign-up password rules; `VALIDATION_FAILED` does not count as an attempt.
- `RESEND_TOO_SOON` applies to every email, with or without an account.

`sent: true` is the same for every email.
