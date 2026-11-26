---
description: "Tasks for #22 Profile and Account Settings (WEB-17)"
---

# Tasks: #22 Implement feature Profile and Account Settings

**Input**: `specs/22/` (spec.md, plan.md, research.md, data-model.md, contracts/api.md, contracts/ui.md, quickstart.md)

**Detailed behaviour**: `../specs/018-profile-account-settings/spec.md` (user stories US1–US4 below use its numbering and priorities), screen `../docs/ui-pipeline/screens/WEB-17-profile-account-settings.md`, mockup `../docs/ui-pipeline/mockups/web/WEB-17-profile-account-settings.html`.

**Tests**: Included. `.claude/rules/testing.md` requires a component test per form (happy path + named server errors + listed states) and an e2e test when the auth flow changes.

**Backend dependency**: the four backend additions in `contracts/api.md` § "Backend changes this page needs" (`NEW_PASSWORD_SAME_AS_CURRENT`, `details.lockedUntil`, `changePasswordLockedUntil`, `avatarUrl` on `/auth/me`). Frontend tests mock them with MSW, so work is not blocked; confirm the names with backend card #22 before merging.

**Conventions for every task**: labels and messages verbatim from WEB-17 §4/§7 (English); colors only via tokens; requests only through `api()` from `src/lib/api.ts`; branch on `errorCode(e)`, never on message text; tests use MSW (`server.use(http.…(\`${import.meta.env.VITE_API_BASE_URL}/…\`))`), role/label queries and `userEvent`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 name and photo (P1), US2 password (P1), US4 sessions (P2), US3 Google status (P3)

---

## Phase 1: Setup (move shared code)

**Purpose**: let `features/profile` reuse password UI without importing `features/auth` internals (research R2). No behaviour change.

- [X] T001 Move `src/features/auth/password-rules.ts` and `src/features/auth/password-rules.test.ts` to `src/lib/password-rules.ts` and `src/lib/password-rules.test.ts` with `git mv`; update every import (`SignUpPage.tsx`, `ResetPasswordPage.tsx`, `VerifyEmailPage.tsx`, `RuleList.tsx`)
- [X] T002 Move `src/features/auth/components/styles.ts` to `src/components/common/form-styles.ts` with `git mv`; update every import in `src/features/auth/` (`FIELD`, `LABEL`, `LINK`, `BTN`)
- [X] T003 Move `src/features/auth/components/PasswordInput.tsx` and `src/features/auth/components/RuleList.tsx` to `src/components/common/` with `git mv`; update their imports (form-styles, password-rules) and every import in `src/features/auth/pages/` (depends on T001, T002)
- [X] T004 Run `pnpm lint && pnpm typecheck && pnpm test` unpiped; all existing auth tests must pass unchanged

---

## Phase 2: Foundational (blocking all stories)

**Purpose**: session-ended handling, `avatarUrl` on the session user, profile data layer, page shell.

- [X] T005 Move `SESSION_ENDED_KEY` from `src/features/auth/session.ts` to `src/lib/query-client.ts` (export it there; auth and `src/app/guards.tsx` import it from `@/lib/query-client`), so `src/lib` never imports a feature (research R4)
- [X] T006 In `src/lib/query-client.ts` add `queryCache: new QueryCache({ onError })` and `mutationCache: new MutationCache({ onError })`: when `errorCode(e) === 'SESSION_ENDED'`, `queryClient.setQueryData(SESSION_ENDED_KEY, true)` and `queryClient.setQueryData(['session'], null)`. React to `SESSION_ENDED` only: a 401 `INVALID_CREDENTIALS` from sign-in must stay on the form. One-line comment with that reason (depends on T005)
- [X] T007 [P] Test in `src/lib/query-client.test.ts`: a mutation failing with 401 `SESSION_ENDED` sets `['session']` to `null` and `SESSION_ENDED_KEY` to `true`; a 401 `INVALID_CREDENTIALS` leaves `['session']` unchanged (depends on T006)
- [X] T008 Add `avatarUrl: string | null` to `SessionUser` and to `AuthResult['user']` in `src/features/auth/session.ts`; `toSessionUser` maps `user.avatarUrl ?? null` (older responses without the field still work); update test fixtures that build a `SessionUser` (`src/features/auth/session.test.tsx`, `src/app/layouts/AppLayout.test.tsx`, others found by `pnpm typecheck`)
- [X] T009 [P] Create `src/components/common/Avatar.tsx`: props `{ name: string; url: string | null; size: 'sm' | 'lg' }` (`sm` for the header, `lg` = 80px for Profile per WEB-17 §4 #3). With a url: `<img src={new URL(url, env.VITE_API_BASE_URL).href} alt={name}>` in a circle; without: a circle with initials = first letter of the first and last words of `name`, upper case (one word → one letter), `aria-hidden` initials plus `sr-only` name. Token colors only (data-model.md "Initials")
- [X] T010 [P] Test in `src/components/common/Avatar.test.tsx`: "An Nguyen" → "AN", "Madonna" → "M", url renders an `img` with the absolute API URL
- [X] T011 Create `src/features/profile/api.ts` with types `Profile` (`id`, `email`, `fullName`, `avatarUrl: string | null`, `hasPassword`, `googleLinked`, `changePasswordLockedUntil: string | null`) and `AccountSession` (`id`, `userAgent: string | null`, `createdAt`, `lastActiveAt`, `isCurrent`) per data-model.md, and request functions: `getProfile` (`GET /users/me`), `updateName({ fullName })` (`PATCH /users/me`), `uploadAvatar(file)` (`PUT /users/me/avatar`, `FormData` field `file`, no manual Content-Type), `removeAvatar` (`DELETE /users/me/avatar`), `changePassword({ currentPassword, newPassword })` (`POST /auth/change-password`), `listSessions` (`GET /auth/sessions`, returns `items`), `endSession(id)` (`DELETE /auth/sessions/:id`), `endOtherSessions` (`DELETE /auth/sessions`)
- [X] T012 Create `src/features/profile/hooks.ts` with `useProfile()` (`queryKey: ['profile']`) and `useSessions()` (`queryKey: ['sessions']`); mutation hooks are added per story (depends on T011)
- [X] T013 Replace the placeholder in `src/features/profile/pages/ProfilePage.tsx` (keep the first line `// WEB-17 Profile and account settings`): `<h1>` `Profile`; `Spinner` while `useProfile`/`useSessions` are pending (contracts/ui.md "Loading", inferred); page-level banner "Something went wrong. Try again." (`role="alert"`, above the title, destructive tokens) driven by a `showError()` / `clearError()` pair passed to the sections; toast slot copied from `VerifyEmailPage.tsx` (`role="status"`, fixed bottom-right, inverse tokens, 5 s timer) driven by `showToast(text)`; render the section components as they are added (depends on T012)

**Checkpoint**: `pnpm lint && pnpm typecheck && pnpm test` pass; `/profile` shows the title and loading/banner/toast plumbing.

---

## Phase 3: User Story 1 — Edit my name and photo (P1) 🎯 MVP

**Goal**: change the full name and the photo; the header shows the new name and avatar at once.

**Independent test**: change the name, `Save`, upload a photo, remove it; the field, the avatar and the header update each time.

### Tests (US1)

- [X] T014 [P] [US1] Component tests in `src/features/profile/pages/ProfilePage.test.tsx` (fresh `QueryClient` with `retry: false`, memory router, MSW for `GET /users/me` and `GET /auth/sessions`): `Full name` shows the current name and `Save` is disabled; blank, spaces-only and unchanged-after-edit names keep `Save` disabled; " An Nguyen " sends `PATCH /users/me` with the CSRF header, then the field shows "An Nguyen"; while pending only a spinner shows in `Save` and the field is disabled; no photo → initials and no `Remove photo`; uploading a PNG sends `PUT /users/me/avatar` and shows the photo and `Remove photo`; `Remove photo` sends `DELETE` and returns to initials; a PDF or a 6 MB file shows "Choose a JPG, PNG or WebP image up to 5 MB." and sends no request; 415 `UNSUPPORTED_IMAGE_TYPE` and 413 `PAYLOAD_TOO_LARGE` show the same inline error; a 500 on save shows the banner, keeps the typed name, no red border
- [X] T015 [P] [US1] Header test in `src/app/layouts/AppLayout.test.tsx`: account button shows initials + name when `avatarUrl` is null and the photo when set

### Implementation (US1)

- [X] T016 [US1] In `src/features/profile/hooks.ts` add `useUpdateName`, `useUploadAvatar`, `useRemoveAvatar`. On success: `setQueryData(['profile'], profile)` (remove → `{ ...old, avatarUrl: null }`) and patch `['session']` with `name: profile.fullName` / `avatarUrl` (research R3; do not invalidate `['session']`, it has `staleTime: Infinity`)
- [X] T017 [US1] Create `src/features/profile/components/ProfileSection.tsx`: section heading `Profile`; `Avatar size="lg"` at the top; `Upload photo` button opening a hidden `<input type="file" accept="image/jpeg,image/png,image/webp">`; client check before upload: type in `image/jpeg|image/png|image/webp` and `size ≤ 5 * 1024 * 1024`, else inline error "Choose a JPG, PNG or WebP image up to 5 MB." (`role="alert"`, under the buttons) and no request; map 413/415 to the same error; `Remove photo` only when `avatarUrl !== null`; `Full name` form with react-hook-form + zod: required, "at least one non-space character, no maximum length", trimmed on save (decision #102); `Save` disabled until `trim() !== profile.fullName` and valid; after success the field shows the saved (trimmed) value; spinner only in the pressed button and fields disabled while pending; other errors → `showError()`. Classes from `form-styles.ts` (depends on T009, T016)
- [X] T018 [US1] In `src/app/layouts/AppLayout.tsx` show `Avatar size="sm"` + name in the account `DropdownMenuTrigger` button (accessible name stays the person's name) (depends on T008, T009)
- [X] T019 [US1] Render `ProfileSection` in `ProfilePage.tsx` (depends on T013, T017)

**Checkpoint**: T014, T015 pass.

---

## Phase 4: User Story 2 — Change my password (P1)

**Goal**: change the password with live rules, wrong-password, same-password and lock handling; other sessions are signed out.

**Independent test**: right current password + valid new one → toast "Password updated", fields cleared, sessions refetched.

### Tests (US2)

- [X] T020 [P] [US2] Add to `src/features/profile/pages/ProfilePage.test.tsx`: both fields empty and `Change password` disabled on load; rule list grey x when empty, red x / green check while typing (rules from `passwordRules(newPassword, profile.email)`); `New password` equal to `Current password` → "New password must be different from the current one." under `New password`, button disabled, no request; 400 `NEW_PASSWORD_SAME_AS_CURRENT` → same error; 400 `CURRENT_PASSWORD_INCORRECT` → "Current password is incorrect." under `Current password` with `aria-invalid`; 429 `CHANGE_PASSWORD_LOCKED` with `details.lockedUntil` 15 min ahead → "Too many attempts. Try again in 15 minutes." under `Current password`, button disabled; `changePasswordLockedUntil` in the future on load → same locked state; with `vi.useFakeTimers()`, passing the lock time re-enables the button; 204 → toast "Password updated", both fields cleared, `GET /auth/sessions` refetched; `hasPassword: false` → no `Password` section; 500 → banner, entries kept, button enabled

### Implementation (US2)

- [X] T021 [US2] In `src/features/profile/hooks.ts` add `useChangePassword` (`gcTime: 0`, like the auth password mutations): on success invalidate `['sessions']`; on 429 `CHANGE_PASSWORD_LOCKED` set `['profile']` `changePasswordLockedUntil` from `error.details.lockedUntil`
- [X] T022 [US2] Create `src/features/profile/components/PasswordSection.tsx` (rendered only when `profile.hasPassword`): heading `Password`; `Current password` and `New password` with `PasswordInput`; `RuleList` under `New password` (`empty` while the field is empty); same-password check as soon as both fields are non-empty and equal; `locked = changePasswordLockedUntil !== null && Date.parse(changePasswordLockedUntil) > Date.now()`, with one `useEffect` + `setTimeout` until the lock time that forces a re-render (cleanup on change/unmount); `Change password` disabled unless both fields are non-empty, `isValidPassword(newPassword, email)`, not equal, not locked, not pending; errors: `CURRENT_PASSWORD_INCORRECT` → "Current password is incorrect.", `NEW_PASSWORD_SAME_AS_CURRENT` → "New password must be different from the current one.", locked → "Too many attempts. Try again in 15 minutes." (all inline, `role="alert"`, `aria-describedby`, red border via `aria-invalid`); `VALIDATION_FAILED` / `PASSWORD_NOT_SET` / others → `showError()`; success → `showToast('Password updated')` and reset both fields (depends on T021)
- [X] T023 [US2] Render `PasswordSection` in `ProfilePage.tsx` after `ProfileSection` (depends on T022)

**Checkpoint**: T020 passes.

---

## Phase 5: User Story 4 — Manage my sessions (P2)

**Goal**: list sessions with device and last active time; sign out one or all others.

**Independent test**: with three sessions, sign out one, then all others; only `This device` remains and both controls disappear.

### Tests (US4)

- [X] T024 [P] [US4] Unit tests in `src/features/profile/device-label.test.ts`: Chrome on Windows UA → "Chrome on Windows"; Safari on iPhone → "Safari on iPhone"; Firefox on Linux → "Firefox on Linux"; Edge (contains "Chrome") → "Edge on Windows"; only the OS known → e.g. "Windows"; `null` and an unrecognised string → "Unknown device"; `lastActive` helper: under 1 minute → "Last active now", 2 hours → "Last active 2 hours ago", 3 days → "Last active 3 days ago" (time passed in)
- [X] T025 [P] [US4] Add to `src/features/profile/pages/ProfilePage.test.tsx`: each row shows the device label and last active text; the current row shows `This device` and no `Sign out`; `Sign out` on another row sends `DELETE /auth/sessions/:id` and the row disappears; `Sign out of all other sessions` sends `DELETE /auth/sessions` and only `This device` remains; a single session hides both controls; 404 `SESSION_NOT_FOUND` refetches the list with no banner; 500 → banner, list unchanged

### Implementation (US4)

- [X] T026 [P] [US4] Create `src/features/profile/device-label.ts`: `deviceLabel(userAgent: string | null): string` (browser Edge → Chrome → Firefox → Safari, checked in that order; OS iPhone, iPad, Android, Windows, macOS, Linux; both → "<browser> on <os>", one → that one, none → "Unknown device" (proposed, confirmed 2026-11-26)) with a `// shortcut: partial browser/OS list, extend when users report wrong labels` comment; `lastActive(iso: string, now = Date.now()): string` → "Last active now" under 60 s, else `Intl.RelativeTimeFormat('en', { numeric: 'auto' })` in minutes/hours/days prefixed with "Last active "
- [X] T027 [US4] In `src/features/profile/hooks.ts` add `useEndSession` and `useEndOtherSessions`; on success and on 404 `SESSION_NOT_FOUND` invalidate `['sessions']`
- [X] T028 [US4] Create `src/features/profile/components/SessionsSection.tsx`: heading `Sessions`; list in API order keyed by `id`; each row `deviceLabel(userAgent)`, `lastActive(lastActiveAt)`, then `This device` (when `isCurrent`) or a text `Sign out` button; `Sign out of all other sessions` secondary button; both controls hidden when there is only one session; spinner only in the pressed button; errors other than 404 → `showError()` (depends on T026, T027)
- [X] T029 [US4] Render `SessionsSection` last in `ProfilePage.tsx` (depends on T028)

**Checkpoint**: T024, T025 pass.

---

## Phase 6: User Story 3 — See my Google status (P3)

**Goal**: show Google link status only.

**Independent test**: Google-linked and not-linked accounts show the matching text and no button.

- [X] T030 [P] [US3] Add to `src/features/profile/pages/ProfilePage.test.tsx`: `googleLinked: true` → "Google: Linked"; `false` → "Google: Not linked"; no `Link Google` / `Unlink Google` button; Google-only (`hasPassword: false`, `googleLinked: true`) shows `Google` but not `Password`
- [X] T031 [US3] Create `src/features/profile/components/GoogleSection.tsx`: heading `Google`, one status row "Google: Linked" / "Google: Not linked", no button
- [X] T032 [US3] Render `GoogleSection` between `PasswordSection` and `SessionsSection` in `ProfilePage.tsx` (order per WEB-17 §3) (depends on T031)

---

## Phase 7: Polish & cross-cutting

- [X] T033 Update `e2e/logout.spec.ts`: the Profile heading is now `Profile` (was the placeholder "Profile and account settings"); mock `GET /users/me` and `GET /auth/sessions` there; keep the account button name assertion working with the avatar
- [X] T034 [P] Create `e2e/profile.spec.ts` (mock every call with `page.route` on `http://api.e2e`): (1) open `/profile`, see the four section headings; (2) `PATCH /users/me` answered with 401 `{ error: { code: 'SESSION_ENDED' } }` (and `/auth/me` then 401) → URL `/signin?notice=signed-out`
- [X] T035 Compare the page with `../docs/ui-pipeline/mockups/web/WEB-17-profile-account-settings.html` (spacing, 80px avatar, section cards, header avatar) and fix differences using tokens only
- [X] T036 Run `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` unpiped; fix until all exit 0
- [X] T037 Run the `react-reviewer` agent on the diff; fix Critical and High findings, then re-run T036

---

## Dependencies & execution order

- Phase 1 (T001–T004) → Phase 2 (T005–T013) → stories.
- After Phase 2 the stories are independent: US1 (T014–T019), US2 (T020–T023), US4 (T024–T029), US3 (T030–T032). They all edit `ProfilePage.tsx`, `ProfilePage.test.tsx` and `hooks.ts`, so do them one after another (priority order US1 → US2 → US4 → US3), or merge those three files carefully.
- Polish (T033–T037) after the stories you ship.

### Parallel opportunities

- Phase 2: T007, T009/T010 alongside T011–T012.
- US1: T014 and T015 together; T018 alongside T016–T017.
- US4: T024, T025 and T026 together.
- US3: T030 and T031 together.
- Polish: T034 alongside T033/T035.

## Implementation strategy

- **MVP**: Phases 1–3 (shared moves, foundation, US1 name/photo + header avatar).
- Then US2 (password), US4 (sessions), US3 (Google status), each a testable increment.
- One PR for the card after Phase 7 (`/create-pr`), unless the backend additions are late: then US2's lock-after-reload part waits for `changePasswordLockedUntil`, and everything else can ship.
