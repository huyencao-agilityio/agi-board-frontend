---
description: 'Task list for #18 Implement feature Forgot Password (frontend)'
---

# Tasks: #18 Implement feature Forgot Password (frontend)

**Input**: `specs/18/` (plan.md, spec.md, research.md, data-model.md, contracts/auth-password-reset.md, quickstart.md)

**Prerequisites**: worktree set up (`pnpm install`). The backend is not needed: tests mock the API.

**Tests**: included, because `.claude/rules/testing.md` requires them. Write each story's tests first and watch them fail.

**UI**: match `../docs/ui-pipeline/states/web/WEB-14-forgot-password/` and `WEB-15-reset-password/`; labels and messages verbatim from there and from `../docs/ui-pipeline/screens/`. Follow `.claude/rules/`.

**Stories**: US1 to US3 are the three Acceptance Criteria sections of spec.md. The card sets no priorities; those below are proposed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different files and no dependency on an unfinished task.
- Commit subject: `<type>(auth): #18 <Imperative summary>`

## Phase 1: Setup

- [x] T001 Compare `../agi-board-backend-18/specs/18/contracts/` with `specs/18/contracts/auth-password-reset.md`. If a route, field, error code or the emailed link differs, STOP and tell the user.

---

## Phase 2: Foundational (blocks all user stories)

- [x] T002 Test in `src/app/guards.test.tsx`: `WaitForSession` renders nothing while `/auth/me` is pending, then the page when it answers 200, 401 or fails; a signed-in person is not redirected from `/forgot-password`.
- [x] T003 Add `WaitForSession` to `src/app/guards.tsx` (research R1: null while `useSession()` is pending, then `<Outlet />` for anyone) and put `forgot-password` and `reset-password` under it in `src/app/router.tsx`. Comment why: the GET sets the CSRF cookie. Needs T002.

**Checkpoint**: `pnpm lint && pnpm typecheck && pnpm test` pass.

---

## Phase 3: User Story 1 - Request password reset (P1)

**Goal**: WEB-14 opens from Sign in, sends the request and shows the same confirmation for every email.

**Independent test**: on `/forgot-password`, submit an email with the API mocked; the confirmation shows. Make the API fail; the banner shows and the email stays.

### Tests

- [x] T004 [P] [US1] Create `src/features/auth/pages/ForgotPasswordPage.test.tsx` with the WEB-14 component rows of quickstart.md: disabled when empty; `Enter a valid email address.` after blur, linked to the field, clears when corrected; spaces trimmed in the body and CSRF header sent; field and button locked with `aria-busy` while pending; Sent text in `role="status"`; edit after Sent removes it and the button follows the email format; network error shows the `role="alert"` banner with the email kept and no `aria-invalid`, then a successful resubmit removes it; `Back to sign in` opens `/signin`; no link to `/reset-password`.

### Implementation

- [x] T005 [P] [US1] Move `emailSchema` (email "Trimmed, valid email format") from `src/features/auth/pages/SignUpPage.tsx` to `src/features/auth/email-schema.ts` and import it there. Existing sign-up tests pass unedited.
- [x] T006 [P] [US1] Add `forgotPassword({ email })` → `{ sent: true }` to `src/features/auth/api.ts` and `useForgotPassword` to `src/features/auth/hooks.ts`.
- [x] T007 [US1] Build WEB-14 in `src/features/auth/pages/ForgotPasswordPage.tsx`: brand mark, failure banner (`MESSAGES.generic`) above the title, title `Forgot password`, help `We will email a reset link valid for 30 minutes.`, `Email` with placeholder `name@example.com`, `Send reset link` (sr-only `Sending reset link` while busy), Sent banner `If this email has an account, we've sent a reset link.` under the button, `Back to sign in`. Sent and failed derive from the mutation; editing calls `reset()` only after success (R6). Do not branch on error codes. Needs T003, T005, T006.
- [x] T008 [US1] Create `e2e/password-reset.spec.ts`: from `/signin`, `Forgot your password?` → submit → confirmation. Needs T007.

**Checkpoint**: US1 works alone; T004 and T008 pass.

---

## Phase 4: User Story 2 - Validate reset link and set new password (P1)

**Goal**: WEB-15 opens from the emailed link, checks it, and shows the form with the live rules or the expired/used message.

**Independent test**: open `/reset-password#token=x` with the check mocked as valid, then as `RESET_LINK_INVALID`; the form or the message shows and the fragment leaves the URL.

### Tests

- [x] T009 [US2] Create `src/features/auth/pages/ResetPasswordPage.test.tsx` with the WEB-15 link and form rows of quickstart.md: no token (no request); valid token (form, fragment removed); `RESET_LINK_INVALID` (message, no form, `Request a new link` opens `/forgot-password`); check fails with a network error and with 403 (generic banner, no form, not WEB-13, fragment kept); a new fragment in the same tab (new check, empty form); rules grey, red, green; email name in another case; mismatch shown only under confirm after it is left, cleared from either field; button enabled only when rules are met and fields equal; email never shown.

### Implementation

- [x] T010 [US2] Add `checkResetLink({ token })` → `{ email }` to `src/features/auth/api.ts` and `useResetLink(token)` to `src/features/auth/hooks.ts` with the options of R3, each deviation from the defaults explained in one comment. Needs T006 (same files).
- [x] T011 [US2] Build the link handling in `src/features/auth/pages/ResetPasswordPage.tsx` (R2, R4): token from `useLocation().hash` into state; fragment removed with `replace` after 200 or `RESET_LINK_INVALID`, kept on other errors; spinner while checking; message `This link has expired or was already used.` (`role="alert"`) with `Request a new link`; form keyed by token. No token or password in web storage or `history.state`. Needs T003, T010.
- [x] T012 [US2] Build the form in `src/features/auth/pages/ResetPasswordPage.tsx`: `New password` with `RuleList` (8+ characters, a letter and a number, does not contain the email name in any case; email from the check), `Confirm new password` with `Passwords do not match.` computed as in R7, `Set new password` disabled until valid. Both fields use `PasswordInput` with `autoComplete="new-password"`. Needs T011.

**Checkpoint**: the link and form tests pass; submitting does nothing yet.

---

## Phase 5: User Story 3 - Complete password reset (P1)

**Goal**: submitting sets the password, clears the local session and opens Sign in with the notice.

**Independent test**: with a valid link mocked, submit a valid password; WEB-01 shows `Password updated. Sign in with your new password.`, also when a user was cached as signed in.

### Tests

- [x] T013 [US3] Extend `src/features/auth/pages/ResetPasswordPage.test.tsx`: body is exactly `{ token, password }` and CSRF header sent; both fields and button locked while pending; success sets `['session']` to null, drops other cached queries and opens `/signin?notice=password-updated` with `replace`; `RESET_LINK_INVALID` on submit replaces the form with the message; `VALIDATION_FAILED` and a network error show the banner and keep the typed values; the banner clears on the next submit.

### Implementation

- [x] T014 [US3] Add `resetPassword({ token, password })` → `{ next: 'sign-in' }` to `src/features/auth/api.ts` and `useResetPassword` to `src/features/auth/hooks.ts` (`gcTime: 0`; in its own `onSuccess`: `removeQueries()` then `['session']` = null, R5). Needs T010 (same files).
- [x] T015 [US3] Wire submit in `src/features/auth/pages/ResetPasswordPage.tsx`: navigation on success, message or `MESSAGES.generic` banner on error, spinner with sr-only `Setting new password`. Needs T012, T014.
- [x] T016 [US3] Extend `e2e/password-reset.spec.ts`: link in a fresh context (`/auth/me` sets the `csrf_token` cookie before the first POST, header sent) → set password → WEB-01 notice; the same with a signed-in session ends on WEB-01, not Home; after the check the token is not in the URL, `history.state` or web storage. Needs T008, T015.

**Checkpoint**: all three stories work.

---

## Phase 6: Polish

- [x] T017 [P] In `../docs/frontend-init-plan.md` line 114 change `token ở query` to `token ở fragment` (approved by the user; the file is outside this repo, so it is not part of the PR).
- [x] T018 Run `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` unpiped and compare both screens with every HTML state in `../docs/ui-pipeline/states/web/`.
- [x] T019 Run the manual scenarios of `specs/18/quickstart.md` with backend #18 if it runs with Mailpit and no real email key; otherwise record them as not run in `specs/18/quickstart.md`.
- [x] T020 Run the `react-reviewer` agent on the diff, fix Critical and High findings in the files it names, rerun T018.

---

## Dependencies

- T001 → T002 → T003 → US1, US2. US3 needs US2. US2 needs only T006 from US1 (shared files).
- Order: Phase 1 → 2 → US1 → US2 → US3 → Polish.

## Parallel examples

- US1: T004, T005 and T006 together.
- US2 and US3: none; the tasks share files.
- Polish: T017 at any time.

## Implementation strategy

1. Phases 1 to 3 can be demoed with a mocked API, but do not ship US1 alone: the emailed link would open a placeholder.
2. Add US2, then US3, checking each checkpoint. Ship all three together, no earlier than backend #18.
