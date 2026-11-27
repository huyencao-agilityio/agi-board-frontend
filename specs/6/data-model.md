# Data model: #6 Home (frontend view)

Types mirror the backend contract (`../agi-board-backend-6/specs/6/contracts/http.md`); the client stores no other state than the query cache and local UI flags.

## BoardTile

| Field                       | Type                       | UI use                              |
| --------------------------- | -------------------------- | ----------------------------------- |
| id                          | string                     | key, link `/b/:id`, star target     |
| name                        | string                     | tile title; sort key                |
| workspaceId / workspaceName | string                     | context (not shown on Home tiles)   |
| visibility                  | `'private' \| 'workspace'` | icon + text `Private` / `Workspace` |
| backgroundKey               | string \| null             | not used by the UI (preset id)      |
| backgroundThumbnailUrl      | string \| null             | thumbnail band image (research R5)  |
| backgroundColor             | string (hex)               | thumbnail band color when no image  |
| starred                     | boolean                    | star toggle state, `aria-pressed`   |

## WorkspaceTile

| Field       | Type                          | UI use                                                                             |
| ----------- | ----------------------------- | ---------------------------------------------------------------------------------- |
| id, name    | string                        | section header link `/w/:id`, sidebar row, letter square = first letter uppercased |
| role        | `'admin' \| 'member' \| null` | `null` → Guest workspaces; `admin` → `Members`, `Settings`, `Create new board`     |
| boardCount  | number                        | `N board(s)`                                                                       |
| memberCount | number \| null                | `M member(s)`, hidden when null                                                    |
| boards      | BoardTile[]                   | tiles, sorted by name                                                              |

## PendingInvite

| Field              | Type                     | UI use                                             |
| ------------------ | ------------------------ | -------------------------------------------------- |
| id                 | string                   | key, accept/decline target                         |
| type               | `'workspace' \| 'board'` | title source                                       |
| workspace          | `{ id, name }`           | title (workspace invite) or context (board invite) |
| board              | `{ id, name } \| null`   | title (board invite)                               |
| role               | `'admin' \| 'member'`    | `Role: Admin` / `Role: Member`                     |
| invitedBy.fullName | string                   | `Invited by <name>`                                |
| expired            | boolean                  | expired text, `Accept` disabled                    |

## Home

`{ starred: BoardTile[]; recent: BoardTile[]; workspaces: WorkspaceTile[]; invites: PendingInvite[]; hasArchivedWorkspaces: boolean }`

Derived during render (no `useState` copies):

- `ownWorkspaces = workspaces.filter(w => w.role !== null).sort(byName)`
- `guestWorkspaces = workspaces.filter(w => w.role === null).sort(byName)`
- `starred = home.starred.sort(byName)`; `recent` as sent (starred boards included, card AC 2)
- `isEmpty = workspaces.length === 0` → empty state, no sidebar, no Starred/Recent

## Local UI state

| Where                   | State                                                                         | Transitions                                    |
| ----------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------- |
| Invite row              | idle → accepting → (removed \| error) ; idle → declining → (removed \| error) | from mutation status per invite id             |
| Create workspace dialog | closed → open → processing → (closed + navigate \| error banner)              | banner cleared on name edit and on reopen      |
| Sidebar row             | collapsed ↔ expanded                                                          | initial: expanded only for the URL's workspace |
| Star toggle             | optimistic flip → settled \| rolled back                                      | `useToggleStar` (research R6)                  |

## Validation

- Workspace name: `z.string().trim().min(1, 'Enter a workspace name.').max(100, 'Use 100 characters or fewer.')` (card AC 1.3, decision #379, same limit as the backend DTO). Line breaks become spaces before submitting (#239).
