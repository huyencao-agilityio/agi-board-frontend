---
paths:
  - 'src/**/*.{ts,tsx}'
  - 'e2e/**/*.ts'
---

# Code style (TypeScript + React)

Formatting is Prettier's job (`.prettierrc`: no semicolons, single quotes, width 100); the PostToolUse hook runs it after every edit. Do not hand-format or argue with it. Lint is oxlint (`pnpm lint`, `--deny-warnings`), so a warning fails CI.

## Files and names

- Components, pages and layouts: PascalCase `.tsx`, one component per file, file name = component name (`SignInPage.tsx`, `AppLayout.tsx`, `PageNotAvailable.tsx`). Pages end in `Page`, layouts in `Layout`.
- Non-component modules: kebab-case `.ts` (`query-client.ts`, `session.ts`). Hooks are named `useX` and live in the feature's `hooks.ts` or next to the code that owns them.
- `src/components/ui/` keeps shadcn's lowercase file names (`button.tsx`); do not rename them.
- Tests sit next to the file as `*.test.ts(x)`; Playwright tests are `e2e/*.spec.ts`.
- Types and components PascalCase, functions and variables camelCase, module constants UPPER_SNAKE (`CSRF_HEADER`, `SAFE_METHODS`).

## Exports

- Pages, layouts and route-level components: `export default` (the router imports them that way).
- Everything else (`src/lib/`, hooks, feature helpers, shared components used in many places): named exports.
- A `.tsx` file exports components only (`react/only-export-components`). Move constants, hooks and helpers that other files import into a `.ts` file.

## Imports

- Use the `@/` alias for anything outside the current folder (`@/lib/api`); `./` only for siblings.
- `import type` / inline `type` for type-only imports (`verbatimModuleSyntax` is on).
- No file extensions in import paths.

## Types

- `strict` is on. No `any`; use `unknown` and narrow (`e instanceof ApiError`).
- No `!` non-null assertion unless a check right above guarantees the value.
- `type` for object shapes (`type SessionUser = { ... }`), unions for fixed sets (`'USER' | 'SUPPORT' | 'SUPER_ADMIN'`). No `enum` (`erasableSyntaxOnly`).
- Derive types from zod schemas with `z.infer` instead of declaring the same shape twice.
- API shapes are placeholders until the backend publishes OpenAPI types; mark them `// shortcut:` as `session.ts` does.

## Functions and comments

- Small components and functions with early returns. Pure helpers (formatting, sorting, position maths) go in `.ts` files so they are testable without rendering.
- No dead code, commented-out code, `console.log`, or "for later" props/options.
- Comments explain why, not what. One-line JSDoc on exported symbols whose purpose is not obvious from the name.
- Known shortcuts use the form `// shortcut: <the limit>, <when to upgrade>`.
- Code, comments, commit messages: English. UI text: copied verbatim from the spec (see `ui.md`).
