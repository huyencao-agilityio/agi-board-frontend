# Research: #18 Forgot Password (frontend)

## R1. CSRF cookie on a direct visit

- **Decision**: Add `WaitForSession` to `guards.tsx`: it calls `useSession()`, renders nothing while pending, then `<Outlet />` for anyone. Both routes go under it.
- **Rationale**: The backend sets `csrf_token` on a safe request only. A person opening the emailed link in a new browser has made none, so the first POST would answer 403 `CSRF_INVALID`. `RequireGuest` cannot be used: both screens are open to signed-in people.
- **Alternatives considered**: A GET inside each page (repeats it, and pages must not check the session); retry after 403 in `api()` (changes every request).

## R2. Token in the URL

- **Decision**: Read `#token=` from `useLocation().hash` into state. Once the check answers (valid or `RESET_LINK_INVALID`), remove the fragment with `navigate(..., { replace: true })`. A network failure leaves it, so reloading retries. A new fragment in the same tab replaces the token and resets the form (`key={token}`).
- **Rationale**: `security.md`: read, send, then remove. The fragment is what the backend email uses and never reaches a server.
- **Consequence**: Reloading WEB-15 after the check shows the expired/used message, although the emailed link still works.
- **Alternatives considered**: Keep it in `history.state` or `sessionStorage` (the token would outlive the page; the storage is forbidden).

## R3. Checking the link

- **Decision**: `useResetLink(token)` is a `useQuery` (`enabled: !!token`, `staleTime: Infinity`, `gcTime: 0`, `refetchOnWindowFocus: false`, `throwOnError: false`). A missing or empty token shows the expired/used message without a request.
- **Rationale**: The POST only reads and does not use the link up. `gcTime: 0` drops the token from the cache after leaving. `throwOnError: false` because the global default would turn a 403 `CSRF_INVALID` into WEB-13.
- **Alternatives considered**: `useMutation` started in an effect (runs twice in StrictMode, and the rules forbid loading in effects).

## R4. Failures the spec does not describe on WEB-15

- **Decision**: Any failure other than `RESET_LINK_INVALID` shows the banner `Something went wrong. Try again.` (`MESSAGES.generic`). On submit the form and typed values stay. On the check, the banner shows without a form; reloading retries (R2). While checking: title and spinner, no text.
- **Rationale**: The same text as WEB-14 (decision #41); no wording invented.

## R5. Session after a successful reset

- **Decision**: `useResetPassword` on success removes all cached queries and sets `['session']` to `null`; then the page opens `/signin?notice=password-updated` with `replace`. `gcTime: 0`, as for the other password mutations.
- **Rationale**: The server ended the account's sessions. With a cached user, `RequireGuest` would send the person to Home instead of WEB-01, and the old user's data would remain. `removeQueries` is used, not `clear()`, which would also drop the running mutation.
- **Consequence**: If this browser is signed in to a different account, that cookie is still valid. WEB-01 opens as specified, but a reload returns to that account's Home.

## R6. WEB-14 Sent and failure states

- **Decision**: Both derive from the mutation. Editing the email after Sent calls `mutation.reset()` (decision #43). The failure banner stays until the next submit. The button stays enabled after Sent.
- **Rationale**: Mockup `sent.html`, spec 014 AS7, AS8, AS11. The server applies the 60-second limit silently, so there is no countdown.

## R7. Confirm field

- **Decision**: `Passwords do not match.` shows once the confirm field was left (touched) and differs, computed during render.
- **Rationale**: A form-level resolver error on `confirm` would not update when only `New password` changes. No error while still typing the first time.

## R8. Email-name rule

- **Decision**: Use the `email` returned by the check. It is never shown on the screen.
- **Rationale**: The client has no other source; the server checks the rule again.

## R9. Password maximum

- **Decision**: `passwordRules` fails over 128 characters, with the row `At most 128 characters` listed only then. It applies to WEB-02, WEB-15 and WEB-16.
- **Rationale**: The backend rejects longer passwords; without the check the form allowed them and only showed the generic error. Requested by the user on 2026-11-25. The spec has no text, so the label follows the backend message `password must have at most 128 characters` (proposed).
- **Alternatives considered**: `maxLength` on the input (silently cuts a pasted password).
