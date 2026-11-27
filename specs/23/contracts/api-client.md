# Contract: API and UI used by #23 (client side)

New endpoint, confirmed by backend card #23 (`../agi-board-backend-23/specs/23/contracts/boards.md`, 2026-11-27).

| Function                                         | Request                                                            | Success                                         | Errors the UI handles                                                                                                                                                                                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createBoard(workspaceId, { name, visibility })` | `POST /workspaces/:workspaceId/boards` body `{ name, visibility }` | 201 `BoardTile` (board empty, 6 default labels) | 401 `SESSION_ENDED` → sign-in (global `MutationCache`); 400 `VALIDATION_FAILED`, 403 `BOARD_CREATE_FORBIDDEN` (no longer admin), 404 `WORKSPACE_NOT_FOUND` (archived / not visible), any other → banner "Something went wrong. Try again." |

Invalidates `['home']` and `['workspaces', workspaceId]`, then navigates to `/b/:id`.

## UI contract

| Route             | Screen           | Change                                                                                 |
| ----------------- | ---------------- | -------------------------------------------------------------------------------------- |
| `/`               | WEB-03 + WEB-D01 | `Create new board` tile in each admin workspace section                                |
| `/w/:workspaceId` | WEB-04 + WEB-D01 | `Create new board` tile for the workspace admin, also when the workspace has no boards |
| `/b/:boardId`     | WEB-07           | target after creation (screen itself unchanged here)                                   |
