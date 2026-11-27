# Contract: API calls used by #6 (client side)

Source of truth: `../agi-board-backend-6/specs/6/contracts/http.md`. The paths below are relative to `VITE_API_BASE_URL`. All calls go through `api()`, which adds cookies on every call and the CSRF header on writes.

| Function (`features/*/api.ts`)    | Request                     | Success                            | Errors the UI handles                                                                                    |
| --------------------------------- | --------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `getHome()`                       | `GET /home`                 | `Home`                             | 401 via the session guard                                                                                |
| `getWorkspace(id)`                | `GET /workspaces/:id`       | `WorkspaceTile`                    | 404 `WORKSPACE_NOT_FOUND` → WEB-13 (default `throwOnError`)                                              |
| `createWorkspace({ name })`       | `POST /workspaces`          | 201 `WorkspaceTile`                | any (incl. 400 for a name over 100 characters) → `Something went wrong. Try again.` banner in the dialog |
| `starBoard(id)`                   | `PUT /boards/:id/star`      | 204                                | any → silent rollback                                                                                    |
| `unstarBoard(id)`                 | `DELETE /boards/:id/star`   | 204                                | any → silent rollback                                                                                    |
| `recordView(id)` (boards feature) | `POST /boards/:id/views`    | 204                                | ignored                                                                                                  |
| `acceptInvite(id)`                | `POST /invites/:id/accept`  | `{ workspaceId, boardId \| null }` | `INVITE_EXPIRED`, `INVITE_NOT_FOUND`, any → row error + refetch                                          |
| `declineInvite(id)`               | `POST /invites/:id/decline` | 204                                | any → row error + refetch                                                                                |

Tiles read `backgroundThumbnailUrl` (an `<img>`, so no `api()` call; `GET /board-backgrounds/:key/thumbnail` sends the session cookie like the avatar) and `backgroundColor` (always set).

## Query keys and invalidation

| Mutation         | Invalidates                                                |
| ---------------- | ---------------------------------------------------------- |
| createWorkspace  | `['home']` (then navigate to `/w/:id`)                     |
| star / unstar    | optimistic patch of `['home']`, then invalidate `['home']` |
| recordView       | `['home']`                                                 |
| accept / decline | `['home']`                                                 |

`['workspaces', id]` is read by WEB-04 only; no mutation in this card changes it.

## UI contract (routes touched)

| Route                                  | Screen    | Change                                                                            |
| -------------------------------------- | --------- | --------------------------------------------------------------------------------- |
| `/`                                    | WEB-03    | full page                                                                         |
| `/w/:workspaceId`                      | WEB-04    | accessible-board list + sidebar                                                   |
| `/w/:workspaceId/members`, `/settings` | WEB-05/06 | sidebar only (via `WorkspaceLayout`)                                              |
| `/b/:boardId`                          | WEB-07    | records a view on open                                                            |
| `/archived-workspaces`                 | WEB-20    | linked to only; the route itself belongs to the WEB-20 card (→ WEB-13 until then) |
