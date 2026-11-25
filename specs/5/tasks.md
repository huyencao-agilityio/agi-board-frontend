---
description: 'Task list for #5 Implement feature User Sign Up (frontend)'
---

# Tasks: #5 Implement feature User Sign Up (frontend)

**Input**: `specs/5/` (plan.md, spec.md, research.md, data-model.md, contracts/auth-sign-up.md, quickstart.md)

**Prerequisites**: worktree set up (`pnpm install`). The backend is not needed: tests mock the API.

**Tests**: included, because `.claude/rules/testing.md` requires them. Write each story's tests first and watch them fail.

**UI**: match `../docs/ui-pipeline/states/web/WEB-02-sign-up/` and `WEB-16-verify-email/`; labels and messages verbatim from `../docs/ui-pipeline/screens/`. Follow `.claude/rules/`.

**Stories**: US1 to US4 are the four Acceptance Criteria sections of spec.md. The card sets no priorities; those below are proposed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different files and no dependency on an unfinished task.
- Commit subject: `<type>(auth): #5 <Imperative summary>`

## Phase 1: Setup

- [x] T001 Compare `../agi-board-backend-5/specs/5/contracts/auth-sign-up.md` with `specs/5/contracts/auth-sign-up.md`. If a route, field or error code differs, STOP and tell the user.

---

## Phase 2: Foundational (blocks all user stories)

- [x] T002 [P] Add `errorCode(e: unknown): string | undefined` to `src/lib/api.ts` (reads `error.code` of an `ApiError` body) with cases in `src/lib/api.test.ts` (code, no body, not an `ApiError`). Replace the inline copies in `src/features/auth/session.ts` and `src/features/auth/pages/SignInPage.tsx`.
- [x] T003 [P] Create `src/features/auth/pending-password.ts` (research R10): set `{ email, password }`, get by email (undefined for another email), clear. Module variable only. Test in `src/features/auth/pending-password.test.ts`.
- [x] T004 Move `FIELD`, `LABEL`, `LINK`, `BTN` to `src/features/auth/components/styles.ts`, the Google button with its spinner and `pageshow` reset to `components/GoogleButton.tsx`, and the password input with its show/hide eye to `components/PasswordInput.tsx`; use them in `src/features/auth/pages/SignInPage.tsx`. No visible change: existing sign-in tests pass unedited. `PasswordInput` takes `autoComplete` and passes the other input props on. Needs T002 (same file).
- [x] T005 Add to `src/features/auth/api.ts`: `signUp({ fullName, email, password })` → `{ next: 'verify-email' }`, `verifyEmail({ email, code, password })` → `AuthResult`, `resendCode({ email })` → `{ sent: true }`. Add `useSignUp`, `useVerifyEmail`, `useResendCode` to `src/features/auth/hooks.ts`; `useVerifyEmail` seeds `['session']` with `toSessionUser` and clears the pending password, both in the hook's own `onSuccess`, which also runs when the page is already closed. `gcTime: 0` on sign-up and verify (R10). Needs T003.

**Checkpoint**: `pnpm lint && pnpm typecheck && pnpm test` pass; sign-in is unchanged.

---

## Phase 3: User Story 1 - Sign up with email and password (P1)

**Goal**: WEB-02 at `/signup`, including its live password checklist.

**Independent Test**: a valid form posts the body and opens `/verify-email` with the email; an invalid form keeps `Sign up` disabled.

### Tests (write first)

- [x] T006 [P] [US1] Create `src/features/auth/password-rules.test.ts`: each rule alone; several failing; accented letter; email name in any case; email with spaces around it; empty email name passes; one-letter email name.
- [x] T007 [P] [US1] Create `src/features/auth/pages/SignUpPage.test.tsx`: starts disabled with grey rules; space-only name stays disabled; 500-character name is accepted; invalid email shows "Enter a valid email address." after blur, linked to the field; valid form sends body and CSRF header, locks the inputs, shows a busy button and opens `/verify-email` with `{ email, resendAt }` in state, no password in it, and the pending password set; `EMAIL_ALREADY_EXISTS` and network errors show the banner (research R6) with no red border; sign-in link.

### Implementation

- [x] T008 [P] [US1] Create `src/features/auth/password-rules.ts`: three rules with the labels `At least 8 characters`, `At least one letter and one number`, `Does not contain your email name`. Constraint: "8+ characters, a letter and a number, does not contain the email name"; letter is `\p{L}`, digit is `\d`, email name as in research R3. T006 passes. Needs T006.
- [x] T009 [P] [US1] Create `src/features/auth/components/RuleList.tsx`: list labelled `Rules`; each item grey x (field empty), red x or green check, with token colors. State also given as text for screen readers, not by color alone.
- [x] T010 [US1] Build `src/features/auth/pages/SignUpPage.tsx` (`// WEB-02 Sign up`): react-hook-form with zod, `fullName` "At least one non-space character, no maximum", `email` "Valid email format" (trimmed), `password` per T008. Full name, email with rule `A valid email address`, password with three rules, `Continue with Google` (T004), `or`, `Sign up` with spinner and "Signing up", `Already have an account? Sign in`. The password re-validates when the email changes. On success set the pending password, then navigate (push) to `/verify-email` with `{ email, resendAt: now + 60 s }`. T007 and T018 pass. Needs T003, T004, T005, T007, T008, T009, T018.

**Checkpoint**: WEB-02 works up to the hand-off.

---

## Phase 4: User Story 2 - Email verification (P1) 🎯 MVP ends here

**Goal**: WEB-16 at `/verify-email`, and sign-in of an unverified account.

**Independent Test**: open `/verify-email` with router state and a pending password, enter a code: Home opens and the session is seeded.

### Tests (write first)

- [x] T011 [P] [US2] Create `src/features/auth/components/OtpInput.test.tsx`: digits only; paste and autofill (several digits in one box) fill the boxes, also with spaces or a dash; Backspace and arrows move focus; completion fires once on the 6th digit; disabled; error state.
- [x] T012 [P] [US2] Create `src/features/auth/pages/VerifyEmailPage.test.tsx`, with the pending password cleared between tests: no state → `/signin`; email shown in full; 6th digit sends `{ email, code, password }` once, locks the boxes, seeds `['session']`, clears the pending password (also when the page closes before the answer) and opens Home; every row of research R5; after `INCORRECT_CODE` or `CODE_EXPIRED` editing a digit clears the error; `CODE_LOCKED` disables the boxes until a resend and leaves the countdown running; network error text; resend disabled for 60 s (fake timers), then the toast "A new code has been sent." (gone after 5 seconds), cleared boxes, new countdown; `RESEND_TOO_SOON` restarts the countdown without a toast; an existing `resendAt` continues instead of restarting; `Back to sign up` clears the pending password. Without a pending password, or with one for another email: field and rules shown, the 6th digit does not submit, `Verify` needs both, typed password sent. `VALIDATION_FAILED` with a password from memory shows the field.
- [x] T013 [P] [US2] In `src/features/auth/pages/SignInPage.test.tsx` extend the unverified case: `/verify-email` gets `{ email, resendAt }` with the email of the response, the pending password is set, `['session']` is not seeded. The verified case still seeds it and clears a pending password left from before.

### Implementation

- [x] T014 [P] [US2] Create `src/features/auth/components/OtpInput.tsx` (research R4): 6 inputs labelled `Digit 1` to `Digit 6` in a group `6-digit code`, `inputMode="numeric"`, `autocomplete="one-time-code"` on the first, no `maxLength`. No new dependency. T011 passes. Needs T011.
- [x] T015 [P] [US2] Build `src/features/auth/pages/VerifyEmailPage.tsx` (`// WEB-16 Verify email`) per data-model.md (states, `VerifyState`, `PendingPassword`) and research R2, R4, R5, R6, R7, R10. Countdown derived from `resendAt` with a cleaned-up interval; a resend writes the new `resendAt` with `navigate('.', { replace: true, state })`. Errors linked to the code group and announced. T012 passes. Needs T003, T004, T005, T008, T009, T012, T014.
- [x] T016 [P] [US2] In `src/features/auth/hooks.ts` make `useSignIn` seed the session and clear the pending password only for `next === 'home'`, in the hook's `onSuccess`, with `gcTime: 0`. In `src/features/auth/pages/SignInPage.tsx`, for `verify-email`, set the pending password and navigate (replace) with `{ email: res.user.email, resendAt: now + 60 s }`. T013 passes. Needs T003, T004, T005, T013.

**Checkpoint**: MVP. A new person can sign up, verify and reach Home.

---

## Phase 5: User Story 3 - Google sign-up (P2)

**Goal**: `Continue with Google` on WEB-02 starts the existing Google flow, and the return goes to Home without WEB-16.

**Independent Test**: the two e2e cases of T017 pass.

- [x] T017 [US3] Create `e2e/sign-up.spec.ts` with mocked API: `Continue with Google` on `/signup` requests `http://api.e2e/auth/google`; the return URL `/home` with `/auth/me` answering a user ends on Home and never shows WEB-16. Needs T010. A cancelled Google sign-up returns to Sign in (known gap, research R9); do not work around it.

---

## Phase 6: User Story 4 - Password security (P2)

**Goal**: weak passwords cannot be submitted and the missing rules are visible.

**Independent Test**: each weak password turns its rule red and keeps `Sign up` disabled.

- [x] T018 [US4] In `src/features/auth/pages/SignUpPage.test.tsx` add an `it.each`: under 8 characters, no letter, no number, contains the email name (other letter case); a password failing two rules shows both; changing the email to match the password turns the email-name rule red and disables the button; no separate error text under Password. Write it after T007 and before T010; it passes with T010. Needs T007.

---

## Phase 7: Polish and cross-cutting

- [x] T019 Extend `e2e/sign-up.spec.ts`: sign up → code → Home; reload on WEB-16 keeps the email and countdown, shows the password field, then code and password lead to Home; the password is not in `history.state`, web storage or the URL; unverified sign-in lands on WEB-16; direct `/verify-email` goes to Sign in. Needs T015, T016, T017.
- [x] T020 Run `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` unpiped and fix what fails. Needs T017, T018, T019.
- [x] T021 Compare both screens with every HTML state in `../docs/ui-pipeline/states/web/WEB-02-sign-up/` and `WEB-16-verify-email/`, also at phone width and by keyboard; keep screenshots for the PR. Needs T020.
- [ ] T022 Run the manual scenarios of `specs/5/quickstart.md` with backend #5 and Mailpit. Record in that file what was not run. Needs T020.
- [x] T023 Run the `react-reviewer` agent on the diff (`CLAUDE.md` requires it before `/create-pr`); fix Critical and High findings, then repeat T020. No PR before this passes. Needs T020. (2026-11-25: run by a general agent following the `react-reviewer` definition; 0 Critical, 2 High and Medium M1 to M4 fixed; M5 recorded in research R10.)

**Release note for the PR (Risk)**: merge no later than backend #5. Without T016, the current sign-in treats an unverified account as signed in. Also state there: password problems show as red rules in the checklist, with no separate error text (decision #35), where the card says "an error appears".

---

## Dependencies

- T001 → Foundational (T002 to T005) → stories.
- T004 needs T002; T005 needs T003.
- US2 uses `password-rules.ts` and `RuleList.tsx` from US1 (T008, T009) but not the sign-up page.
- US3 needs T010. US4 is written before T010 (same test file as T007) and passes with it.
- T023 blocks the PR.
- Polish comes last.

## Parallel examples

- Foundational: T002 with T003, then T004 with T005.
- US1: T006 and T007, then T008 with T009.
- US2: T011, T012 and T013, then T014; T015 and T016 edit different files and can run together.
- US3, US4: none.

## Implementation strategy

1. **MVP**: Phases 1 to 4. Sign-up without verification leaves people unable to enter, so US1 and US2 ship together.
2. Then US3. US4 comes with US1 (T018 before T010).
3. Polish, then `/create-pr`.
