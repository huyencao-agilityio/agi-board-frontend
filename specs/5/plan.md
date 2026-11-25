# Implementation Plan: #5 Implement feature User Sign Up (frontend)

**Branch**: `feat/5-implement-feature-user-sign-up` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/5/spec.md`; UI in `../docs/ui-pipeline/states/web/WEB-02-sign-up/` and `WEB-16-verify-email/` (paths are relative to the repo root)

## Summary

Build WEB-02 Sign up and WEB-16 Verify email on the existing `/signup` and `/verify-email` routes, replacing their placeholders. Sign-up creates no session: the email and countdown travel to WEB-16 in router state, the password stays in memory only, and the session starts when the code is accepted. The password is sent with the code and becomes the account password (decision #366); after a reload WEB-16 asks for it again. Sign-in must change too, because the API no longer sets a session for an unverified account.

## Technical Context

**Language/Version**: TypeScript 7, React 19

**Primary Dependencies**: react-router 8, TanStack Query 5, react-hook-form + zod 4, Tailwind 4, shadcn Button/Input, lucide-react. No new dependency.

**Storage**: None. Email and countdown live in `history.state` (R2); the password only in memory (R10).

**Testing**: Vitest + Testing Library + MSW; Playwright with mocked API

**Target Platform**: Browser SPA on Cloudflare Workers

**Project Type**: Web frontend

**Performance Goals**: No specific target

**Constraints**: Do not reveal whether an email has an account, except sign-up's `EMAIL_ALREADY_EXISTS` (decision #367); no user data in web storage or URLs; the password never in `history.state` or the query cache; WCAG 2.1 AA; token colors only

**Scale/Scope**: 2 screens, 3 endpoints, 1 change to sign-in

**Dependency**: backend ticket #5 (`../agi-board-backend-5`, not merged). Tests mock the API; a real end-to-end run needs that backend. The sign-in change here must ship no later than the backend change, see R1.

## Constitution Check

`.specify/memory/constitution.md` is an unfilled template, so it defines no gates. `AGENTS.md` and `.claude/rules/` are used instead.

| Gate                                                | Before design | After design                                                                      |
| --------------------------------------------------- | ------------- | --------------------------------------------------------------------------------- |
| All requests through `api()`; CSRF on writes        | Pass          | Pass: 3 POSTs in `features/auth/api.ts`                                           |
| No session or user data in web storage              | Pass          | Pass: `history.state` without the password (R2, R10)                              |
| Same UI for every email                             | Pass          | Pass: branch only on error codes; `EMAIL_ALREADY_EXISTS` is the allowed exception |
| Verbatim English labels                             | Pass          | Pass: one reused generic text (R6)                                                |
| Guards not duplicated in pages                      | Pass          | Pass: WEB-16 checks for a pending email, not the session                          |
| Feature boundaries; `components/ui` not hand-edited | Pass          | Pass: all changes in `features/auth` and `lib/api.ts`                             |
| Tests per layer, including e2e for auth flow        | Pass          | Pass: see quickstart                                                              |

## Project Structure

### Documentation (this feature)

```text
specs/5/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/auth-sign-up.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/app/router.tsx                # verify-email under RequireGuest
src/lib/
├── api.ts                        # + errorCode(e), replaces 2 inline copies
└── api.test.ts
src/features/auth/
├── api.ts                        # + signUp, verifyEmail, resendCode
├── hooks.ts                      # + 3 hooks; useSignIn seeds the session only for next=home
├── session.ts                    # use errorCode
├── code.ts, messages.ts, verify-state.ts   # empty code, shared texts, WEB-16 router state
├── password-rules.ts             # 3 rules shown by the checklist
├── password-rules.test.ts
├── pending-password.ts           # password typed on WEB-01/02, memory only (R10)
├── components/
│   ├── styles.ts                 # FIELD, LABEL, LINK, BTN moved from SignInPage
│   ├── GoogleButton.tsx          # moved from SignInPage, with its pageshow reset
│   ├── PasswordInput.tsx         # moved from SignInPage (show/hide eye)
│   ├── RuleList.tsx              # live checklist (WEB-02, and WEB-16 password field)
│   └── OtpInput.tsx              # 6 boxes
└── pages/
    ├── SignInPage.tsx            # use moved parts; pass email and password to WEB-16
    ├── SignUpPage.tsx            # WEB-02
    ├── VerifyEmailPage.tsx       # WEB-16
    └── *.test.tsx
e2e/sign-up.spec.ts
```

**Structure Decision**: Existing feature layout. `guards.tsx` needs no change; in `router.tsx`, `verify-email` moves under `RequireGuest` so a signed-in person cannot reopen it from browser history (review M4). Parts are moved out of `SignInPage` because WEB-02 uses the same ones, and WEB-16 the password input and rules.

## Complexity Tracking

No violations.
