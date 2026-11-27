# Quickstart: validate #23

Run in `agi-board-frontend-23`:

```sh
pnpm lint && pnpm typecheck && pnpm test   # HomePage / WorkspaceBoardsPage "Create board" tests
pnpm e2e e2e/home.spec.ts                  # tile → create → /b/:id
```

Manual (`pnpm dev`, backend #23 running, signed in as a workspace admin):

1. Home: each workspace you administer ends with a `Create new board` tile; Guest workspaces and workspaces where you are a member have none. Same on that workspace's WEB-04, also when it has no boards.
2. Click the tile: `Create board` opens, `Board title` empty and focused, the workspace name read-only, `Workspace` selected, `Create` disabled.
3. Hover or Tab onto `Workspace` / `Private`: tooltip text shows.
4. Type spaces → "Enter a board title.", `Create` disabled. Type " Q4 Planning " → `Create` enabled.
5. Click `Create`: spinner (screen reader: "Creating board"), fields locked, Esc and outside click do nothing; `/b/:id` opens. Back on Home the board is listed as "Q4 Planning" with its visibility.
6. Open the dialog, then `Cancel`, Esc, outside click: closes each time, nothing created.
7. Stop the backend, click `Create`: banner shows, title and visibility kept, `Create` enabled.

States and rules: [data-model.md](data-model.md). API: [contracts/api-client.md](contracts/api-client.md).
