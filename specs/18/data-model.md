# Data Model: #18 Forgot Password (frontend)

No stored data. Client types:

## ForgotPasswordForm

| Field   | Rule                        |
| ------- | --------------------------- |
| `email` | Trimmed, valid email format |

## ResetPasswordForm

| Field      | Rule                                                                                    |
| ---------- | --------------------------------------------------------------------------------------- |
| `password` | 8 to 128 characters, a letter and a number, does not contain the email name in any case |
| `confirm`  | Equal to `password`; not sent                                                           |

## ResetLink (memory only)

| Field   | Type   | Source                                   |
| ------- | ------ | ---------------------------------------- |
| `token` | string | URL fragment, removed after the check    |
| `email` | string | Link check; only for the email-name rule |

## WEB-14 states

| From                      | Event                     | To                               |
| ------------------------- | ------------------------- | -------------------------------- |
| opened                    | -                         | default (button disabled)        |
| default                   | Valid email               | filled                           |
| default, filled           | Invalid email, field left | invalid-email                    |
| filled, sent, send-failed | Submit                    | processing                       |
| processing                | 200                       | sent                             |
| processing                | Any error                 | send-failed (email kept)         |
| sent                      | Email edited              | default, filled or invalid-email |

## WEB-15 states

| From       | Event                       | To                           |
| ---------- | --------------------------- | ---------------------------- |
| opened     | No token                    | expired-or-used              |
| opened     | Token                       | checking (spinner)           |
| checking   | 200                         | default                      |
| checking   | `RESET_LINK_INVALID`        | expired-or-used              |
| checking   | Other error                 | generic banner, no form (R4) |
| default    | Rules met, fields equal     | filled                       |
| default    | Confirm left, fields differ | mismatch                     |
| filled     | Submit                      | processing                   |
| processing | 200                         | WEB-01 with the notice       |
| processing | `RESET_LINK_INVALID`        | expired-or-used              |
| processing | Other error                 | filled, generic banner       |
