# Implementation Plan: #33 Implement feature Create Workspace

**Branch**: `feat/33-implement-feature-create-workspace` | **Date**: 2026-11-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/33/spec.md` (Trello card #33, clarified 2026-11-27), per-screen spec `../specs/029-create-workspace/spec.md`, screen spec `../docs/ui-pipeline/screens/WEB-D16-create-workspace.md`.

## Summary

The `Create workspace` dialog (WEB-D16) already shipped with card #6: `CreateWorkspaceDialog` on Home (button right of `Your workspaces`, in every state), trimmed 1–100 character name, blank/too-long inline errors, spinner + locked fields, failure banner that clears on edit and reopen, `POST /workspaces` with `{ name }`, invalidate `['home']`, open `/w/:id`. Card #33, after clarification (no visibility, Home only, 1–100 characters), adds no new screen or API.

This card closes the remaining gaps against spec 029 inside the same component and adds the missing tests:

1. Spinner text alternative "Creating workspace" (029 FR-018); today the hidden label stays "Create".
2. Browser Back closes only the dialog, is ignored while processing; a reload shows Home without it (029 FR-020, decision #349).
3. Regression tests for the acceptance criteria not yet covered (double click → one request, `Enter` on a blank name, focus return on close, line breaks → spaces, session ended on create, Back).

## Technical Context

**Language/Version**: TypeScript 7, React 19

**Primary Dependencies**: react-router 8, TanStack Query 5, react-hook-form + zod, shadcn/ui Dialog (Radix), Tailwind 4 (all installed; no new dependency)

**Storage**: N/A (server state through `src/lib/api.ts`)

**Testing**: Vitest + Testing Library + MSW (`HomePage.test.tsx`); Playwright `page.route` (`e2e/home.spec.ts`) for Back/reload

**Target Platform**: Modern desktop browsers; SPA on Cloudflare Workers

**Project Type**: Web SPA (frontend only; backend `POST /workspaces` already exists, no backend change)

**Performance Goals**: N/A (one request per creation)

**Constraints**: Labels verbatim from spec; tokens only; server enforces permissions; WCAG 2.1 AA

**Scale/Scope**: 1 component (`CreateWorkspaceDialog.tsx`), its tests, 1 e2e test

## Constitution Check

`.specify/memory/constitution.md` is an unfilled template, so the gates are `AGENTS.md` and `.claude/rules/`.

| Gate | Status |
|---|---|
| Feature layout; no cross-feature internals | PASS: only `features/workspaces/components/CreateWorkspaceDialog.tsx` |
| Requests through `api()` + TanStack Query | PASS: unchanged `useCreateWorkspace` |
| Labels verbatim | PASS: "Creating workspace" is the (proposed) text in 029 US5 / WEB-D16 |
| No out-of-scope features | PASS: no visibility, no account-menu entry, no real-time (spec Clarifications; #6 R7) |
| Dialog = shadcn `Dialog`, form = RHF + zod | PASS |

Re-check after Phase 1: PASS; Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/33/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/api-client.md
```

### Source Code (repository root)

```text
src/features/workspaces/
├── components/CreateWorkspaceDialog.tsx   # spinner label, Back handling
└── pages/HomePage.test.tsx                # new dialog tests
e2e/home.spec.ts                            # Back / reload test
```

**Structure Decision**: Existing feature folder `src/features/workspaces/`; no new files except tests.

## Complexity Tracking

None.
