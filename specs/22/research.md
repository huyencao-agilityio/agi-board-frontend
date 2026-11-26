# Research: #22 Profile and Account Settings

No open NEEDS CLARIFICATION remains. Decisions below.

## R1. Backend endpoints

- **Decision**: Use the contracts in `agi-board-backend-22/specs/22/contracts/` (`users-me.md`, `auth-account.md`), summarised in [contracts/api.md](./contracts/api.md).
- **Rationale**: Built in the same card; codes are stable and specific (`CURRENT_PASSWORD_INCORRECT`, `CHANGE_PASSWORD_LOCKED`, …), so the UI can branch on `error.code` as `.claude/rules/react.md` requires.
- **Alternatives**: Extend `GET /auth/me` for profile data — rejected, it has no `avatarUrl`, `hasPassword`, `googleLinked`.

## R2. Reusing password UI across features

- **Decision**: Move `PasswordInput`, `RuleList`, `styles.ts` (→ `form-styles.ts`) to `src/components/common/` and `password-rules.ts` (+ test) to `src/lib/`; update the auth imports.
- **Rationale**: A feature must not import another feature's components (`AGENTS.md`). The move is mechanical: no behaviour change.
- **Alternatives**: Copy them into `features/profile` — rejected, two copies of the password rules would drift from the backend.

## R3. Header name and avatar after saving

- **Decision**: The header account button shows the avatar (photo or initials, shared `Avatar` component in `src/components/common/`) next to the name. Backend adds `avatarUrl` to the `user` of `GET /auth/me` and sign-in (proposed; same value as in `GET /users/me`); `SessionUser` gets `avatarUrl: string | null`. After `PATCH /users/me` or `PUT/DELETE /users/me/avatar` succeeds, set `['profile']` from the response and patch `name` / `avatarUrl` in the `['session']` cache.
- **Rationale**: The header already reads `useSession()`, so one source drives it with no extra request per page. `['session']` has `staleTime: Infinity`, so a cache patch is needed for the change to show immediately.
- **Alternatives**: Header calls `GET /users/me` itself — rejected, one more request on every signed-in page and two caches for the same person.

## R4. Session ended elsewhere

- **Decision**: In `src/lib/query-client.ts`, add `QueryCache` and `MutationCache` `onError`: when `errorCode(e) === 'SESSION_ENDED'`, set `SESSION_ENDED_KEY` to `true` and `['session']` to `null`. `RequireAuth` then redirects to `/signin?notice=signed-out` (clarification 2).
- **Rationale**: Today only the `/auth/me` query notices an ended session, so a Profile request would show the generic banner instead. React only to `SESSION_ENDED`, not every 401: sign-in returns 401 `INVALID_CREDENTIALS`, which must stay on the form.
- **Alternatives**: Handle it inside each profile mutation — rejected, it repeats and misses other pages. Polling — rejected by the user.
- **Note**: `SESSION_ENDED_KEY` lives in `features/auth/session.ts`; `src/lib` must not import a feature, so the key constant moves to `src/lib/query-client.ts` (or a tiny `src/lib/session-keys.ts`) and auth imports it from there.

## R5. Avatar upload and display

- **Decision**: Validate on the client before upload: `file.type` in `image/jpeg|png|webp` and `size ≤ 5 MB`; otherwise show "Choose a JPG, PNG or WebP image up to 5 MB." and send nothing. Map server 413 `PAYLOAD_TOO_LARGE` / 415 `UNSUPPORTED_IMAGE_TYPE` to the same inline error. The hidden `<input type="file" accept="image/jpeg,image/png,image/webp">` is opened by the `Upload photo` button. Image `src` = `new URL(avatarUrl, env.VITE_API_BASE_URL).href`; `alt=""` would hide it, so `alt` = the person's name.
- **Rationale**: Spec allows only JPG/PNG/WebP even though the backend also accepts GIF; the stricter client rule is what the spec shows. The `v=` param in `avatarUrl` busts the immutable cache.
- **Alternatives**: Let the server reject — rejected, the spec says nothing is sent.

## R6. Session row label and time

- **Decision**: Small parser in `features/profile/device-label.ts`: browser (Edge, Chrome, Firefox, Safari) + OS (Windows, macOS, iPhone, iPad, Android, Linux) → "Chrome on Windows"; only one known → that one; null/unknown → "Unknown device" (proposed, confirmed by the user 2026-11-26). Time: "Last active now" under 1 minute, else `Intl.RelativeTimeFormat('en', { numeric: 'auto' })` → "Last active 2 hours ago" (mockup wording).
- **Rationale**: No dependency for a few regexes. `shortcut:` comment noting the browser/OS list is partial.
- **Alternatives**: `ua-parser-js` — rejected, new dependency for one label.

## R7. Password section rules

- **Decision**: Reuse `passwordRules(newPassword, email)` and `RuleList`. Same password: the client shows "New password must be different from the current one." and disables `Change password` as soon as both fields match; the backend's 400 `NEW_PASSWORD_SAME_AS_CURRENT` (proposed) shows the same error (covers paths the client check misses). `CURRENT_PASSWORD_INCORRECT` → inline under `Current password`. Mutation uses `gcTime: 0` like the auth password mutations.
- **Lock across reloads**: the backend exposes the lock end time: `changePasswordLockedUntil: string | null` in `GET /users/me` and `details.lockedUntil` in the 429 `CHANGE_PASSWORD_LOCKED` body (proposed names; the backend already keeps `lockedUntil` for the sign-in lock). The page derives `locked = lockedUntil > now`: on 429 it writes `details.lockedUntil` into `['profile']`; one `setTimeout` until that time re-enables the button. While locked, "Too many attempts. Try again in 15 minutes." shows under `Current password` (text verbatim from the spec even when less time remains).
- **Alternatives**: `localStorage` with the lock time — rejected: per browser only (another device or a cleared storage shows the button enabled), and the repo rules keep browser storage for conveniences, not state that must hold. Countdown text ("Try again in 7 minutes") — not in the spec.

## R8. Toast and banner

- **Decision**: Toast "Password updated" reuses the VerifyEmailPage markup (`role="status"`, fixed bottom-right, inverse tokens, 5 s timer). Banner "Something went wrong. Try again." is a page-level `role="alert"` above the title, set by any failed mutation that has no specific mapping, cleared on the next action.
- **Rationale**: No toast library in the project; one more inline toast is smaller than adding `sonner`.

## R9. Processing state

- **Decision**: Each section's button shows `Spinner` while its mutation is pending; the section's fields are disabled meanwhile. One mutation at a time per section.
