# Research: #5 User Sign Up (frontend)

## R1 Session

- **Decision**: `verifyEmail` seeds `['session']`; `signUp` does not. `useSignIn` seeds it only when `next === 'home'`.
- **Rationale**: the backend sets no cookie before verification. Today `useSignIn` always seeds the session, so `RequireGuest` would send an unverified person to Home with no real session.
- **Alternatives**: invalidating `['session']` (an extra round trip).

## R2 Passing the email to WEB-16

- **Decision**: `navigate('/verify-email', { state: { email, resendAt } })`. A resend replaces the state. No state: redirect to `/signin`.
- **Rationale**: `history.state` survives a reload, so the countdown continues instead of restarting (`../specs/016-verify-email/spec.md`, edge cases). `.claude/rules/security.md` forbids web storage for user data, and a query string would put the email in logs.
- **Alternatives**: sessionStorage, `?email=` (both refused above); React context (lost on reload).
- **Password**: not in this state, see R10.

## R3 Form rules

- **Decision**: zod schema plus `password-rules.ts`, matching the backend: length >= 8, `\p{L}`, `\d`, and not containing the trimmed, lower-cased email name (case-insensitive; an empty name passes). Full name must be non-empty after trim. The whole form validates live, so changing the email re-checks the password.
- **Rule display**: grey x when the field is empty, then red x or green check. The inline email error appears after blur, as on sign-in; password problems show only in the checklist (decision #35).
- **Not in the UI**: the backend's 128-character password and 254-character email limits have no message in the spec. The server's `VALIDATION_FAILED` shows the generic banner (R6). No `maxLength` on the password, because it would silently cut a pasted password.

## R4 Code input

- **Decision**: one small `OtpInput` with 6 inputs as in the mockup: digits only, paste or autofill spreads over the boxes, Backspace and arrows move, submit on the 6th digit (not while the password field is shown: the spec then submits with `Verify` only). First box has `autocomplete="one-time-code"`. No `maxLength`, which would break autofill.
- **Alternatives**: shadcn `input-otp` (a new dependency).

## R5 Errors on WEB-16

| Code                  | UI                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `INCORRECT_CODE`      | Inline "Incorrect code."; red boxes, cleared                                               |
| `CODE_LOCKED`         | Inline "Too many attempts. Request a new code."; boxes cleared and disabled until a resend |
| `CODE_EXPIRED`        | Inline "This code has expired. Request a new code."; boxes cleared                         |
| `ACCOUNT_DEACTIVATED` | WEB-01 text, inline                                                                        |
| `RESEND_TOO_SOON`     | No toast; countdown restarts at 60                                                         |
| `VALIDATION_FAILED`   | Password from memory: forget it and show the password field. Field already shown: R6       |

- The screen follows the server's code and does not count attempts. Per the card, the 6th try is blocked; `../specs/016-verify-email/spec.md` FR-007 says the 5th. The card and backend agree, so they win.
- Disabling the boxes when locked implements the card's "blocks further attempts"; the mockup does not draw them disabled.
- `INCORRECT_CODE` also covers a used or voided code, and `CODE_EXPIRED` an email with no request; the texts are the same.
- `RESEND_TOO_SOON` can also come from a sign-up or resend made elsewhere for the same email, so it can appear when the local countdown is over.
- After a reload the locked state is forgotten and the boxes open again; accepted, because the server still refuses with `CODE_LOCKED`.
- While a resend is pending the boxes and `Verify` are locked, so the result of an old code is never shown against a new one.
- The countdown is never shortened by an error (decision #365).

## R6 Generic failure

- **Decision**: network or unexpected errors show "Something went wrong. Try again.", as a banner on WEB-02 and inline on WEB-16.
- **Rationale**: neither spec has a text; this one is used across `screen_mapping.md`.

## R7 Toast

- **Decision**: a `role="status"` element on WEB-16, shown for 5 seconds. The status container stays mounted so it is announced.
- **Alternatives**: a toast library (not needed for one toast).

## R8 Duplicate email

- **Decision** (2026-11-25, decision #367): `EMAIL_ALREADY_EXISTS` shows the banner "An account with this email already exists. Sign in instead." for a verified, Google-only or deactivated account; the form keeps its values. An unverified password account goes to WEB-16 as a new sign-up. Replaces the earlier no-reveal flow.
- **Google sign-up on a password account**: the backend merges both into one account and signs in (decision #5). The frontend flow is the same as any Google return, so it has no code of its own.

## R9 Google

- **Decision**: reuse the sign-in redirect to `GET /auth/google`. The API callback goes to `/home`.
- **Known gap**: a cancelled or failed Google sign-up returns to `/sign-in`, not `/signup`, because the backend redirect is fixed. `../specs/002-user-sign-up/spec.md` expects the sign-up screen. Changing that needs the backend.

## R10 Password at verification

- **Decision**: `pending-password.ts` keeps `{ email, password }` in a module variable. WEB-02 and WEB-01 (unverified) set it before navigating; WEB-16 reads it for its own email. It is cleared after a successful verification, after any successful sign-in (`next: home`) and on `Back to sign up`. Without it, WEB-16 shows the `Password` field with the WEB-02 rules (states `password-needed`, `password-filled`).
- **Rationale**: `verify-email` requires the password, which becomes the account password (decision #366). A reload empties memory, which is the behavior the contract and spec ask for. Matching the email stops a password being used for another address after browser back or forward.
- **Where**: the two success cases clear it in the hook's `onSuccess`, not in the page, so it also runs when the page is already closed.
- **Not cleared on read or unmount**: React StrictMode mounts twice in development.
- **Mutations**: TanStack Query keeps the variables of finished mutations for 5 minutes, so sign-in, sign-up and verify use `gcTime: 0`.
- **Field**: `autocomplete="new-password"`, from the shared `PasswordInput`.
- **Form library exception**: WEB-16 does not use react-hook-form + zod (`.claude/rules/react.md`, Forms). It has the 6 code boxes and, at most, one password field with no error text of its own; `isValidPassword` is the same check WEB-02's schema uses.
- **Alternatives**: `history.state` (browsers write it to disk for session restore); web storage (forbidden); query cache (dropped after 5 minutes, and visible in devtools); Outlet context (`RequireGuest` renders its own `Outlet` between the layout and WEB-01/02).

## R11 Sign-in leak accepted

- **Decision**: sign-in of an unverified account still answers 200 with `next: "verify-email"` and opens WEB-16.
- **Rationale**: backend finding R2 was accepted by the project owner, so the frontend keeps decision #38.
