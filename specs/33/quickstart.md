# Quickstart: validate #33

Run in `agi-board-frontend-33`:

```sh
pnpm lint && pnpm typecheck && pnpm test   # HomePage.test.tsx "Create workspace" tests
pnpm e2e e2e/home.spec.ts                  # Back / reload
```

Manual (`pnpm dev`, backend running, signed in):

1. Home → `Create workspace`: dialog opens, field focused, `Create` disabled, no visibility option.
2. Type spaces → "Enter a workspace name."; paste 101 characters → "Use 100 characters or fewer."
3. Type "  Acme  " → `Create`: spinner (screen reader: "Creating workspace"), fields locked; WEB-04 of "Acme" opens; Home lists it; Back from WEB-04 returns to Home without the dialog.
4. Open the dialog, press browser Back: dialog closes, still on Home. Open it again and reload: Home without the dialog.
5. Stop the backend, click `Create`: banner shows, name kept; edit the name → banner goes.

States and rules: [data-model.md](data-model.md). API: [contracts/api-client.md](contracts/api-client.md).
