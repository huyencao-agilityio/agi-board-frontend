---
paths:
  - 'src/**/*.{ts,tsx}'
  - 'e2e/**/*.ts'
---

# Testing

| Layer     | Files                                  | Command     | API                                                   |
| --------- | -------------------------------------- | ----------- | ----------------------------------------------------- |
| Unit/comp | `src/**/*.test.{ts,tsx}`, next to code | `pnpm test` | MSW (`src/test/server.ts`), unhandled requests fail   |
| E2E       | `e2e/*.spec.ts`                        | `pnpm e2e`  | mocked per test with `page.route` on `http://api.e2e` |

Before saying a task is done: `pnpm lint && pnpm typecheck && pnpm test`, plus `pnpm e2e` when routes, guards or the auth flow changed.

## What each change needs

- **Pure helper** (`src/lib/`, formatting, position maths, validation): unit test with plain inputs.
- **New screen or form**: a component test for the happy path, the server error the spec names (e.g. wrong password, 409), and the loading/empty states the spec lists.
- **Permission-dependent UI**: one test per role that shows or hides the control.
- **Route or guard change**: an e2e test (signed-out redirect, WEB-13 on 403/404, role-gated route).
- **Bug fix**: a test that fails before the fix and passes after.

## Component tests (Vitest + Testing Library)

- Render with a fresh `QueryClient` per test (`retry: false`) and a memory router when the component uses routing; do not share the app's `queryClient`.
- Mock the network with `server.use(http.get(\`${import.meta.env.VITE_API_BASE_URL}/...\`, ...))`, never by mocking `api()`or`fetch`. Return the backend envelope (`{ error: { code, message } }`) for errors.
- Query by role and accessible name (`getByRole('button', { name: 'Create board' })`), then label, then text. No `data-testid` unless nothing accessible exists, no CSS selectors.
- Interact with `userEvent`, not `fireEvent`. Await `findBy*` for async UI; no manual `setTimeout` waits.
- Assert what the user sees and the requests sent (method, body, CSRF header on writes). No snapshot tests.
- Time-dependent code: `vi.useFakeTimers()` or pass the time in.

## E2E (Playwright)

- Mock every API call the page makes with `page.route`; the suite must not need a running backend.
- Use role/label locators and web-first assertions (`await expect(locator).toBeVisible()`); no `waitForTimeout`.
- One user flow per test; tests pass alone and in any order. `test.only` fails CI (`forbidOnly`).

## Reporting

- Run the commands and read the output. A check counts as passed only when its command exited 0 on the current code. If something could not run, say so; never report it as passed.
