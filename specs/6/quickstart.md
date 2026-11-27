# Quickstart: validate #6 Home

## Prerequisites

- Worktree `agi-board-frontend-6`, `pnpm install` done, `.env.local` present.
- For a manual run against a real API: the backend #6 branch (`agi-board-backend-6`) running with the seed data.

## Automated checks

```sh
pnpm lint && pnpm typecheck && pnpm test   # component tests incl. HomePage.test.tsx, sort.test.ts
pnpm e2e                                   # e2e/home.spec.ts (routes + WorkspaceLayout changed)
```

## Scenarios (component tests mock `GET /home` with MSW; e2e with `page.route`)

| #   | Setup (`/home` response)                                                              | Action                                   | Expected                                                                                                                 |
| --- | ------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | `workspaces: []`, `invites: []`                                                       | open `/`                                 | `You have no workspace yet. Create one or wait for an invite.`, `Create workspace`, no sidebar, no Starred/Recent        |
| 2   | as 1 + `hasArchivedWorkspaces: true`                                                  | open `/`                                 | `View archived workspaces` under the message                                                                             |
| 3   | none                                                                                  | `Create workspace` → type spaces → clear | `Create` disabled; `Enter a workspace name.` shown                                                                       |
| 4   | none                                                                                  | type `Team A` → `Create`                 | `POST /workspaces` `{ "name": "Team A" }` with CSRF header; lands on `/w/<id>`                                           |
| 5   | `POST /workspaces` 500                                                                | `Create`                                 | banner `Something went wrong. Try again.`, name kept                                                                     |
| 6   | starred `[B, a]`, recent `[X]`                                                        | open `/`                                 | `Starred boards` shows `a`, `B` in that order; `Recently viewed` after it                                                |
| 7   | board tile with `starred: false`, `PUT …/star` 500                                    | click `Star board`                       | toggles on, then back off with no message                                                                                |
| 8   | workspace invite, not expired                                                         | `Accept`                                 | spinner `Accepting invite`, both buttons disabled; after 200 the refetched `/home` no longer has the row                 |
| 9   | invite `expired: true`                                                                | —                                        | `This invite has expired. Ask an admin to resend it.`; `Accept` disabled; `Decline` works                                |
| 10  | `POST …/accept` 409 `INVITE_EXPIRED`                                                  | `Accept`                                 | only `This invite has expired. Ask an admin to resend it.` after the refetch, no generic error; `Accept` disabled        |
| 11  | own workspace (`role: 'member'`, 3 boards, 5 members) + guest (`role: null`, 1 board) | open `/`                                 | `3 boards · 5 members`; guest shows `1 board` only; sidebar groups `Your workspaces` / `Guest workspaces`, all collapsed |
| 12  | admin vs member workspace                                                             | expand sidebar row                       | admin: `Boards`, `Members`, `Settings`; member and guest: `Boards` only                                                  |
| 13  | `GET /workspaces/:id` 404                                                             | open `/w/:id`                            | WEB-13                                                                                                                   |
| 14  | —                                                                                     | open `/b/:id`                            | one `POST /boards/:id/views`                                                                                             |

### Added after the card update (2026-11-27)

- Starring a board shown in `Recently viewed` keeps it there, and it also appears in `Starred boards` (AC 2.2).
- A 101-character name shows `Use 100 characters or fewer.` under the field, `Create` stays disabled and no request is sent; 100 characters are accepted (AC 1.3, decision #379).
- A tile with `backgroundThumbnailUrl` shows the image; without one, the band is filled with `backgroundColor` (AC 9).
- The sidebar `Home` link goes to `/` and is highlighted only on Home (#378).

## Manual pass

Open `/` and compare it with `../docs/ui-pipeline/mockups/web/WEB-03-home.html` (states: Default, No workspace yet, Processing, Invite expired). Then check keyboard use: Tab order, the expand buttons, and that focus returns to `Create workspace` after the dialog closes.
