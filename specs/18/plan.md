# Implementation Plan: #18 Implement feature Forgot Password (frontend)

**Branch**: `feat/18-implement-feature-forgot-password` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/18/spec.md`; UI in `../docs/ui-pipeline/states/web/WEB-14-forgot-password/` and `WEB-15-reset-password/`; parent specs `../specs/014-forgot-password/` and `015-reset-password/` (paths are relative to the repo root)

## Summary

Build WEB-14 Forgot password and WEB-15 Reset password on the existing `/forgot-password` and `/reset-password` routes, replacing their placeholders. WEB-14 shows the same confirmation for every email. WEB-15 reads the token from the URL fragment, checks it, and shows either the form or the expired/used message. Success clears the cached session and opens WEB-01, which already has the `password-updated` notice. Both routes must wait for the first `GET /auth/me`, because it sets the CSRF cookie (R1).

## Technical Context

**Language/Version**: TypeScript 7, React 19

**Primary Dependencies**: react-router 8, TanStack Query 5, react-hook-form + zod 4, Tailwind 4, shadcn Button/Input. No new dependency.

**Storage**: None. The token is kept in memory after it leaves the URL (R2).

**Testing**: Vitest + Testing Library + MSW; Playwright with mocked API

**Target Platform**: Browser SPA on Cloudflare Workers

**Project Type**: Web frontend

**Performance Goals**: No specific target

**Constraints**: Same UI for every email; no token or password in web storage, `history.state`, logs or (after the check) the URL; WCAG 2.1 AA; token colors only

**Scale/Scope**: 2 screens, 3 endpoints, 1 route wrapper

**Dependency**: backend ticket #18 (`../agi-board-backend-18`, uncommitted on 2026-11-25). Tests mock the API; a real end-to-end run needs that backend. Ship no earlier than the backend.

## Constitution Check

`.specify/memory/constitution.md` is an unfilled template, so it defines no gates. `AGENTS.md` and `.claude/rules/` are used instead.

| Gate                                              | Before design | After design                                                  |
| ------------------------------------------------- | ------------- | ------------------------------------------------------------- |
| All requests through `api()`; CSRF on writes      | Pass          | Pass: 3 POSTs in `features/auth/api.ts`; cookie ensured by R1 |
| No token in storage; removed from the address bar | Pass          | Pass: R2                                                      |
| Same UI for every email                           | Pass          | Pass: WEB-14 branches only on success or failure              |
| Verbatim English labels                           | Pass          | Pass: one reused generic text on WEB-15 (R4)                  |
| Session not re-checked in pages                   | Pass          | Pass: the wait is a route wrapper in `guards.tsx`             |
| No raw `fetch`, no `useEffect` loading            | Pass          | Pass: the link check is a `useQuery` (R3)                     |
| `components/ui` not hand-edited                   | Pass          | Pass                                                          |
| Tests per layer, including e2e for auth flow      | Pass          | Pass: see quickstart                                          |

## Project Structure

### Documentation (this feature)

```text
specs/18/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/auth-password-reset.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/app/
├── guards.tsx                    # + WaitForSession (R1)
├── guards.test.tsx
└── router.tsx                    # both routes under WaitForSession
src/features/auth/
├── api.ts                        # + forgotPassword, checkResetLink, resetPassword
├── hooks.ts                      # + useForgotPassword, useResetLink, useResetPassword
├── email-schema.ts               # trimmed email schema, moved from SignUpPage
└── pages/
    ├── ForgotPasswordPage.tsx    # WEB-14
    ├── ResetPasswordPage.tsx     # WEB-15
    ├── SignUpPage.tsx            # import email-schema
    └── *.test.tsx
e2e/password-reset.spec.ts
```

**Structure Decision**: Existing feature layout. Reused as they are: `AuthLayout`, `BrandMark`, `Spinner`, `PasswordInput`, `RuleList`, `styles.ts`, `password-rules.ts`, `MESSAGES.generic`, `errorCode`, and the notice in `SignInPage`.

`../docs/frontend-init-plan.md` line 114 now says the token is in the fragment, as the backend sends it (T017).

## Complexity Tracking

No violations.
