# AGI Board — frontend

React + TypeScript SPA for AGI Board, deployed as static assets on Cloudflare Workers.

## Requirements

- Node 22 (`.nvmrc`)
- pnpm via Corepack: `corepack enable pnpm`

## Getting started

```sh
pnpm install
cp .env.example .env.local   # point to your local API and WebSocket
pnpm dev
```

## Scripts

| Script                              | What it does                                                      |
| ----------------------------------- | ----------------------------------------------------------------- |
| `pnpm dev`                          | Dev server with HMR                                               |
| `pnpm build`                        | Type-check and build to `dist/`                                   |
| `pnpm preview`                      | Serve the built app                                               |
| `pnpm lint`                         | oxlint                                                            |
| `pnpm typecheck`                    | `tsc -b`                                                          |
| `pnpm test` / `pnpm test:watch`     | Vitest unit tests (MSW mocks the API)                             |
| `pnpm e2e`                          | Playwright (first run: `pnpm exec playwright install chromium`)   |
| `pnpm format` / `pnpm format:check` | Prettier                                                          |
| `pnpm deploy:staging`               | `wrangler deploy --env staging` (CI does this on merge to `main`) |

## Stack

Vite · React 19 · React Router · TanStack Query · Tailwind CSS v4 · shadcn/ui (Radix) · react-hook-form + zod · lucide-react · Vitest + Testing Library + MSW · Playwright · Wrangler.

## Structure

```
src/
  app/          router, providers, layouts, guards
  features/     one folder per feature (auth, workspaces, boards, cards, ...)
  components/   ui/ (shadcn, generated) and common/ (shared)
  lib/          api client (cookie + CSRF), WebSocket hook, query client, env
  styles/       tokens.css (from the design) and Tailwind entry
  test/         Vitest setup and MSW server
e2e/            Playwright tests
```

Route ↔ screen table and decisions: `docs/frontend-init-plan.md` in the parent `agi-board` repo.

## Git conventions

- Branches: `<type>/<kebab-slug>` from `develop`, e.g. `feat/init-structure`, `fix/board-404` (`scripts/check-branch-name.sh`, run on `pre-push`).
- Commits: `<type>(<scope>): #<trello-card> <Imperative summary>`, e.g. `feat(boards): #123 Add route guards` (`commitlint.config.mjs`, run on `commit-msg`).
- Hooks are installed by husky on `pnpm install`. CI checks both on every PR.

## CI/CD

`.github/workflows/ci.yml` runs lint, format check, typecheck, unit and E2E tests on every PR. On merge to `main` it builds and deploys to staging. Repository settings needed:

- Secret `CLOUDFLARE_API_TOKEN`
- Variables `CLOUDFLARE_ACCOUNT_ID`, `VITE_API_BASE_URL`, `VITE_WS_BASE_URL` (in the `staging` environment)

Production deploy is manual (`pnpm deploy:production`) and only in the Deployment phase.
