---
paths:
  - 'src/**/*.{ts,tsx}'
---

# React, routing and data

Structure and the "sources of truth" are in `CLAUDE.md`; this file is how to apply them.

## Feature layout

- `src/features/<feature>/`: `pages/`, `components/`, `api.ts` (request functions), `hooks.ts` (query/mutation hooks). Create a file or folder only when it has content.
- A feature imports another feature only through its public hooks (e.g. `useSession` from `@/features/auth/session`), never its components or internals. Shared UI goes to `src/components/common/`, shared non-UI code to `src/lib/`.
- Each page file starts with its screen ID comment (`// WEB-07 Board`). Dialogs (WEB-D01…D17) are components opened from a page, not routes.

## Routing (react-router)

- All routes live in `src/app/router.tsx`, with the screen ID as a trailing comment. Keep it in sync with the route table in `../docs/frontend-init-plan.md`.
- Auth gating uses the existing guards (`RequireAuth`, `RequireGuest`, `RequireSystemRole`); do not re-check the session inside pages.
- Ids come from the URL (`useParams`); state that should survive reload or be shareable (open card, filters, tab) belongs in the URL, not in component state.
- Missing or forbidden resources show WEB-13 through `RouteError` (403/404 `ApiError` thrown from a query). Do not render a custom "not found" per page.
- Redirect after sign-in only to a same-origin path from `next` (starts with `/`, not `//`).

## Server state (TanStack Query)

- Every request goes through `api()` in `src/lib/api.ts`, wrapped in `useQuery` / `useMutation`. No raw `fetch`, no `useEffect` + `useState` for loading data.
- Query keys are arrays starting with the resource, then ids: `['session']`, `['boards', boardId]`, `['boards', boardId, 'lists']`. Anything for one board sits under `['boards', boardId]` so `useBoardSocket` refreshes it.
- After a mutation, `invalidateQueries` the keys it changed. Optimistic updates only where the spec needs instant feedback (drag and drop); roll back in `onError`.
- Do not copy query data into `useState`. Derive values during render.
- Retry and 403/404 handling are set once in `src/lib/query-client.ts`; do not override per query without a reason in a comment.
- Branch on the backend error code (`{ error: { code } }` in `ApiError.body`), never on the message text or on status alone when the spec has a specific message.

## Client state

- `useState` / `useReducer` for local UI state; lift it only as far as needed. No global store library; if state is shared across distant components, use the URL or a small context in the feature.
- Real-time updates come from `useBoardSocket` (one socket per open board). Do not open more sockets.

## Forms

- `react-hook-form` + `zodResolver` with a zod schema next to the form. Limits (max length, required) match the spec and the backend DTO.
- Disable the submit button while the mutation is pending; show server field errors on the matching field and other errors in the form's error area, using the spec's message.

## Components

- Function components only. Props typed inline or with a `type XProps`.
- Effects only for syncing with something outside React (socket, DOM, timers), always with cleanup. No effect for derived state or for reacting to an event; do it in the handler.
- `useMemo`/`useCallback` only for a measured problem or a stable dependency an effect needs.
- Lists use a stable `key` from the data id, never the array index for reorderable items.
- Each screen handles the states its spec lists: loading, empty, error, and permission-hidden controls.
