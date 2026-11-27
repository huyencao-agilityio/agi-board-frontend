# Implementation Plan: #6 Home — Workspaces, Boards and Invites

**Branch**: `feat/6-home-workspaces-boards-and-invites` | **Date**: 2026-11-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/6/spec.md` (Trello card #6), screen specs `../docs/ui-pipeline/screens/WEB-03-home.md`, `WEB-D16-create-workspace.md`, `WEB-04-workspace-boards.md`, mockup `../docs/ui-pipeline/mockups/web/WEB-03-home.html`, backend contract `../agi-board-backend-6/specs/6/contracts/http.md`.

## Summary

Replace the WEB-03 Home placeholder with the real page: pending invites (accept / decline, expired state), `Create workspace` dialog (WEB-D16), `Starred boards`, `Recently viewed`, `Your workspaces` and `Guest workspaces` with board tiles, star toggle and counts, the empty state, and the shared Workspace sidebar. Everything on Home comes from one `GET /home` query; writes are `POST /workspaces`, `PUT|DELETE /boards/:id/star`, `POST /boards/:id/views`, `POST /invites/:id/accept|decline`. The sidebar is also mounted in `WorkspaceLayout` (replacing the Boards/Members/Settings tabs, decision #370); WEB-04 gets a minimal board list from `GET /workspaces/:id` (AC 6.1) and the board page records a view on open (AC 6.2).

**Updates after implementation (2026-11-27)**: the sidebar has a `Home` link (UI decision #378); board tiles show a thumbnail band (`backgroundThumbnailUrl`, else `backgroundColor`, card AC 9); `Create workspace` sits right of `Your workspaces`; `Closed boards` is a link on WEB-04 and `Audit log` a link on WEB-06 (no tabs). See research R5, R7, R8, R10 and tasks Phase 9.

## Technical Context

**Language/Version**: TypeScript 7, React 19

**Primary Dependencies**: react-router 8, TanStack Query 5, react-hook-form + zod, shadcn/ui (Radix), Tailwind 4, lucide-react (all installed; no new dependency)

**Storage**: N/A (server state through `src/lib/api.ts`)

**Testing**: Vitest + Testing Library + MSW (component), Playwright with `page.route` (e2e)

**Target Platform**: Modern desktop browsers; SPA served by Cloudflare Workers

**Project Type**: Web SPA (frontend only; backend is `agi-board-backend`, card #6 there)

**Performance Goals**: Home renders from a single request; no N+1 per workspace

**Constraints**: Tokens only for colors; labels verbatim from spec; server enforces permissions, client only hides; WCAG 2.1 AA

**Scale/Scope**: 1 page rebuilt (WEB-03), 1 dialog (WEB-D16), 1 shared sidebar, small edits to WEB-04 / WEB-07 placeholders and `WorkspaceLayout`

## Constitution Check

`.specify/memory/constitution.md` is an unfilled template, so the gates are the project rules in `AGENTS.md` and `.claude/rules/`.

| Gate                                                                                                   | Status                                                                                        |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Feature layout `src/features/<feature>/{pages,components,api.ts,hooks.ts}`; no cross-feature internals | PASS: all new code under `features/workspaces/`; `boards` only gets its own `recordView` call |
| All requests through `api()` + TanStack Query; keys start with the resource                            | PASS: `['home']`, `['workspaces', id]`                                                        |
| Colors only via tokens                                                                                 | PASS: board background falls back to a token color (research R5)                              |
| Labels verbatim; no invented wording                                                                   | PASS: from WEB-03 / D16 / mockup; count wording confirmed by the user (R3)                    |
| Permissions server-side; client hides `Members` / `Settings` / `Create new board` by `role`            | PASS                                                                                          |
| 403/404 → WEB-13 via `RouteError`                                                                      | PASS: `GET /workspaces/:id` 404 thrown by the default `throwOnError`                          |
| Dialog = shadcn `Dialog`, form = RHF + zod                                                             | PASS                                                                                          |
| Out-of-scope items (sender-side invites, WEB-20 page, real-time, `Create new board` dialog) not built  | PASS (R7)                                                                                     |

Re-check after Phase 1: PASS, no violations; Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/6/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api-client.md
└── tasks.md             # /speckit-tasks
```

### Source Code

```text
src/
├── app/
│   └── layouts/WorkspaceLayout.tsx        # sidebar + outlet, no tabs
├── features/
│   ├── workspaces/
│   │   ├── api.ts                         # getHome, createWorkspace, getWorkspace, star/unstar, accept/decline
│   │   ├── hooks.ts                       # useHome, useWorkspace, useCreateWorkspace, useToggleStar, useAcceptInvite, useDeclineInvite
│   │   ├── sort.ts (+ .test.ts)           # byName (A–Z, case-insensitive, stable)
│   │   ├── components/
│   │   │   ├── BoardTile.tsx              # name, visibility, background, star toggle
│   │   │   ├── InviteList.tsx             # Pending invites, row states
│   │   │   ├── CreateWorkspaceDialog.tsx  # WEB-D16
│   │   │   ├── WorkspaceSection.tsx       # workspace header (name, counts) + tiles + Create new board tile
│   │   │   └── WorkspaceSidebar.tsx       # shared sidebar (Home + workspace pages)
│   │   └── pages/
│   │       ├── HomePage.tsx (+ .test.tsx) # WEB-03
│   │       └── WorkspaceBoardsPage.tsx    # WEB-04: minimal accessible-board list
│   └── boards/
│       ├── api.ts                         # recordView
│       └── pages/BoardPage.tsx            # records a view on open
e2e/home.spec.ts
```

**Structure Decision**: Home already lives in `features/workspaces/` (router imports it from there), so all Home code stays in that feature. `BoardTile` is used by Home and WEB-04, both in the same feature, so it stays in `features/workspaces/components/` rather than `components/common/`.

## Complexity Tracking

None.
