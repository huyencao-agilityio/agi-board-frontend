# Data Model: #5 User Sign Up (frontend)

No stored data. Client types:

## SignUpForm

| Field      | Rule                                                                  |
| ---------- | --------------------------------------------------------------------- |
| `fullName` | At least one non-space character, no maximum                          |
| `email`    | Valid email format                                                    |
| `password` | 8+ characters, a letter and a number, does not contain the email name |

## VerifyState (`history.state`)

| Field      | Type             | Set by                                        |
| ---------- | ---------------- | --------------------------------------------- |
| `email`    | string           | Sign-up, or sign-in with `next: verify-email` |
| `resendAt` | number, epoch ms | Arrival and each resend: now + 60 s           |

The password is never part of it.

## PendingPassword (memory only)

| Field      | Type   | Set by                                        |
| ---------- | ------ | --------------------------------------------- |
| `email`    | string | Sign-up, or sign-in with `next: verify-email` |
| `password` | string | Same                                          |

Cleared on verification success, on any successful sign-in and on `Back to sign up`; lost on reload.

## WEB-02 states

`default` → `filled` (all rules met) → `processing` → WEB-16, or `email-already-exists` banner. `invalid-input` when the email is wrong after blur.

## WEB-16 states

| From                | Event                                     | To                                                     |
| ------------------- | ----------------------------------------- | ------------------------------------------------------ |
| opened              | Password in memory for this email         | default                                                |
| opened              | No password                               | password-needed                                        |
| default             | 6th digit                                 | processing                                             |
| password-needed     | 6 digits and password rules met           | password-filled                                        |
| password-filled     | Verify                                    | processing                                             |
| processing          | `VALIDATION_FAILED`, password from memory | password-needed                                        |
| processing          | 200                                       | Home (`replace`)                                       |
| processing          | `INCORRECT_CODE`                          | wrong-code                                             |
| processing          | `CODE_LOCKED`                             | locked                                                 |
| processing          | `CODE_EXPIRED`                            | expired                                                |
| processing          | `ACCOUNT_DEACTIVATED`                     | same boxes, WEB-01 text inline                         |
| processing          | Network or unexpected error               | filled, generic text inline (research R6)              |
| wrong-code, expired | digit typed                               | default, error cleared                                 |
| any, countdown over | Resend, 200                               | resent: boxes cleared and enabled, toast, countdown 60 |
