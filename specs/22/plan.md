# Implementation Plan: #22 Implement feature Profile and Account Settings

**Branch**: `feat/22-implement-feature-profile-and-account-settings` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/22/spec.md`; detailed behaviour from `../specs/018-profile-account-settings/spec.md` and `../docs/ui-pipeline/screens/WEB-17-profile-account-settings.md` (clarification 2026-11-26); mockup `../docs/ui-pipeline/mockups/web/WEB-17-profile-account-settings.html`.

## Summary

Replace the `ProfilePage` placeholder (`/profile`, WEB-17) with the four sections `Profile`, `Password`, `Google`, `Sessions`. Data comes from the backend endpoints built in the same card (`agi-board-backend-22/specs/22/contracts/`): `GET/PATCH /users/me`, `PUT/DELETE /users/me/avatar`, `POST /auth/change-password`, `GET/DELETE /auth/sessions[/:id]`. The header account button gains the avatar; a saved name or photo updates it immediately (`['session']` cache). The 15-minute change-password lock survives a reload using the lock time from the backend. Four small backend additions are needed (listed in [contracts/api.md](./contracts/api.md)). A `SESSION_ENDED` 401 from any request sends the person to `/signin?notice=signed-out` through the existing guard. The password widgets and rules used by auth move to shared folders so the profile feature can reuse them.

## Technical Context

**Language/Version**: TypeScript 5, React 19

**Primary Dependencies**: react-router 8, TanStack Query 5, react-hook-form + zod, shadcn/Radix, lucide-react. No new dependency.

**Storage**: N/A (server state only; no browser storage)

**Testing**: Vitest + Testing Library + MSW (`src/test/server.ts`); Playwright e2e with `page.route`

**Target Platform**: Modern desktop browsers; SPA served by Cloudflare Workers

**Project Type**: Web SPA (frontend only; backend in `agi-board-backend`)

**Performance Goals**: N/A beyond normal page load. Sessions list is small and not paginated (contract).

**Constraints**: Colors only via tokens; all requests through `api()`; English labels copied verbatim from WEB-17; no dark mode or i18n.

**Scale/Scope**: 1 page, 4 section components, 1 API module, 1 hooks module, 1 helper (device label).

## Constitution Check

`.specify/memory/constitution.md` is still the unfilled template, so it sets no gates. The project rules in `AGENTS.md` and `.claude/rules/` act as gates:

| Gate                                                                       | Status                                                                                                          |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Feature does not import another feature's internals                        | Pass after moving `PasswordInput`, `RuleList`, form styles and `password-rules` to shared folders (research R2) |
| `src/lib` does not import a feature                                        | Pass after moving `SESSION_ENDED_KEY` into `src/lib` (research R4)                                              |
| Requests only through `api()` + TanStack Query                             | Pass (`FormData` is already supported by `api()`)                                                               |
| Colors via tokens, shadcn components, lucide icons                         | Pass                                                                                                            |
| Labels verbatim from spec; no invented wording                             | Pass; "Unknown device" (proposed) confirmed by the user (research R6)                                           |
| Sign-in never takes a redirect target from the URL                         | Pass (clarification 2)                                                                                          |
| Tests: component tests per form + server error; e2e when auth flow changes | Planned ([quickstart.md](./quickstart.md))                                                                      |

Re-check after design: no violations; Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/22/
├── spec.md
├── plan.md              # this file
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── api.md           # backend endpoints this page calls
    └── ui.md            # WEB-17 states → UI behaviour
```

### Source Code (repository root)

```text
src/
├── components/common/
│   ├── PasswordInput.tsx        # moved from features/auth/components/
│   ├── RuleList.tsx             # moved from features/auth/components/
│   ├── form-styles.ts           # moved from features/auth/components/styles.ts
│   └── Avatar.tsx               # photo or initials; used by the header and ProfileSection
├── app/layouts/AppLayout.tsx    # account button shows Avatar + name
├── lib/
│   ├── password-rules.ts (+ .test.ts)   # moved from features/auth/
│   └── query-client.ts          # + SESSION_ENDED_KEY and global SESSION_ENDED handling (R4)
├── features/auth/               # imports updated to the moved files; SessionUser gets avatarUrl
└── features/profile/
    ├── api.ts                   # profile, avatar, change-password, sessions requests
    ├── hooks.ts                 # useProfile, useSessions + one mutation hook per action
    ├── device-label.ts (+ .test.ts)     # userAgent → "Chrome on Windows" / "Unknown device"
    ├── pages/
    │   └── ProfilePage.tsx (+ .test.tsx)   # // WEB-17; banner, toast, sections
    └── components/
        ├── ProfileSection.tsx   # avatar, Upload/Remove photo, Full name, Save
        ├── PasswordSection.tsx  # Current/New password, rules, Change password
        ├── GoogleSection.tsx    # status row only
        └── SessionsSection.tsx  # list, Sign out, Sign out of all other sessions
e2e/
└── profile.spec.ts              # page loads; SESSION_ENDED → /signin?notice=signed-out
```

**Structure Decision**: existing single SPA layout (`src/features/<feature>/`). Shared password UI goes to `src/components/common/` and rules to `src/lib/`, as `.claude/rules/react.md` requires for code used by two features.

## Complexity Tracking

None.
