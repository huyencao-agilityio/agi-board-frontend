# Contract: API and UI used by #33 (client side)

No new endpoint. Source: `../agi-board-backend-6/specs/6/contracts/http.md`.

| Function                    | Request            | Success             | Errors the UI handles                                                                                         |
| --------------------------- | ------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `createWorkspace({ name })` | `POST /workspaces` | 201 `WorkspaceTile` | 401 `SESSION_ENDED` → sign-in (global `MutationCache`); any other → banner "Something went wrong. Try again." |

Invalidates `['home']`, then navigates to `/w/:id` (replace).

## UI contract

| Route | Screen           | Change                                                                   |
| ----- | ---------------- | ------------------------------------------------------------------------ |
| `/`   | WEB-03 + WEB-D16 | dialog adds one history entry while open (Back closes it); spinner label |
